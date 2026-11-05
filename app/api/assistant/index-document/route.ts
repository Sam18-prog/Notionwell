import { NextRequest, NextResponse } from 'next/server';
import { indexDocumentForRAG, getStoredDocuments, deleteStoredDocument } from '@/lib/rag/vectorStore';
import { processDocumentMultimodal } from '@/lib/documentProcessor';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUserSession } from '@/lib/auth-server';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB maximum file size

// ---------------------------------------------------------------------------
// GET: List all indexed documents for authenticated user
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const userId = session.id;
    const deckId = req.nextUrl.searchParams.get('deckId') || undefined;

    // Retrieve from vector store for this specific user
    let docs = getStoredDocuments(userId, deckId);

    // If cache is empty, attempt to hydrate from Supabase
    if (docs.length === 0) {
      try {
        const admin = createAdminClient();
        let query = admin.from('documents').select('*');
        if (userId && !session.isDemo) {
          query = query.or(`user_id.eq.${userId},user_id.eq.shared`);
        }
        if (deckId) {
          query = query.eq('deck_id', deckId);
        }
        const { data } = await query.order('created_at', { ascending: false });
        if (data && data.length > 0) {
          for (const item of data) {
            docs.push({
              id: item.id,
              userId: item.user_id,
              deckId: item.deck_id,
              fileName: item.file_name,
              fileType: (item.mime_type as any) || 'txt',
              characterCount: item.file_size_bytes || 0,
              chunkCount: 1,
              createdAt: item.created_at,
            });
          }
        }
      } catch (e) {
        // PostgREST or connection fallback
      }
    }

    return NextResponse.json({ success: true, documents: docs });
  } catch (error: any) {
    console.error('[API /assistant/index-document GET error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST: Index a new document (File or Raw Text)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const userId = session.id;
    const contentType = req.headers.get('content-type') || '';
    let rawText = '';
    let fileName = 'Untitled Document';
    let fileType: 'pdf' | 'docx' | 'txt' | 'image' | 'notes' = 'txt';
    let deckId: string | undefined = undefined;
    let documentId: string | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const textParam = formData.get('text') as string | null;
      const fileNameParam = formData.get('fileName') as string | null;
      const deckParam = formData.get('deckId') as string | null;
      const idParam = (formData.get('documentId') || formData.get('id')) as string | null;

      if (deckParam) deckId = deckParam;
      if (idParam) documentId = idParam;

      if (file) {
        // Enforce maximum file size check
        if (file.size > MAX_UPLOAD_BYTES) {
          return NextResponse.json(
            { success: false, error: `File exceeds maximum upload limit of 15MB (${Math.round(file.size / (1024 * 1024))}MB uploaded).` },
            { status: 413 }
          );
        }

        fileName = file.name;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (fileName.toLowerCase().endsWith('.pdf')) {
          fileType = 'pdf';
        } else if (fileName.toLowerCase().endsWith('.docx')) {
          fileType = 'docx';
        } else if (/\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
          fileType = 'image';
        } else {
          fileType = 'txt';
        }

        // Process document with multimodal pipeline
        const processed = await processDocumentMultimodal(buffer, fileType as any, fileName);
        if (!processed.success || !processed.combinedText || processed.combinedText.trim().length < 50) {
          return NextResponse.json(
            { success: false, error: 'Could not extract sufficient text from the uploaded document.' },
            { status: 400 }
          );
        }
        rawText = processed.combinedText;
      } else if (textParam) {
        rawText = textParam;
        if (fileNameParam) fileName = fileNameParam;
        fileType = 'notes';
      }
    } else {
      const body = await req.json();
      rawText = body.text || '';
      fileName = body.fileName || 'Pasted Notes';
      fileType = body.fileType || 'notes';
      if (body.deckId) deckId = body.deckId;
      if (body.documentId || body.id) documentId = body.documentId || body.id;
    }

    if (!rawText.trim() || rawText.trim().length < 40) {
      return NextResponse.json(
        { success: false, error: 'Document content is too short to index (minimum 40 characters required).' },
        { status: 400 }
      );
    }

    // Index into vector store for authenticated user
    const result = await indexDocumentForRAG({
      documentId,
      userId,
      deckId,
      fileName,
      fileType,
      rawText,
    });

    return NextResponse.json({
      success: true,
      document: result.document,
      chunkCount: result.chunks.length,
      message: `Indexed "${fileName}" into ${result.chunks.length} semantic chunks.`,
    });
  } catch (error: any) {
    console.error('[API /assistant/index-document POST error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to index document.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE: Remove an indexed document (Strict User Ownership Enforced)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const documentId = req.nextUrl.searchParams.get('id');
    if (!documentId) {
      return NextResponse.json({ success: false, error: 'Document ID required.' }, { status: 400 });
    }

    // Verify ownership before deleting
    const userDocs = getStoredDocuments(session.id);
    const existingDoc = userDocs.find(d => d.id === documentId);
    if (!existingDoc && !session.isDemo) {
      // Check Supabase
      const admin = createAdminClient();
      const { data: dbDoc } = await admin.from('documents').select('user_id').eq('id', documentId).maybeSingle();
      if (!dbDoc || dbDoc.user_id !== session.id) {
        return NextResponse.json({ success: false, error: 'Document not found or access denied.' }, { status: 404 });
      }
    }

    const deleted = deleteStoredDocument(documentId, session.id);
    if (!deleted && !existingDoc) {
      return NextResponse.json({ success: false, error: 'Document not found or access denied.' }, { status: 404 });
    }

    // Also remove from Supabase
    try {
      const admin = createAdminClient();
      await admin.from('document_chunks').delete().eq('document_id', documentId).eq('user_id', session.id);
      await admin.from('documents').delete().eq('id', documentId).eq('user_id', session.id);
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'Document deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
