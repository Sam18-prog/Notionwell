/**
 * Notionwell RAG — Vector Store & Similarity Retrieval Layer
 * Authoritative Supabase PostgreSQL Persistence with Zero Filesystem Dependencies.
 * Eliminates /var/task/.rag_storage runtime crashes on Vercel Serverless.
 */

import { v4 as uuidv4 } from 'uuid';
import { chunkDocumentText } from './chunker';
import { generateEmbedding, generateBatchEmbeddings, cosineSimilarity } from './embeddings';
import { createAdminClient } from '@/lib/supabase/admin';

export interface StoredDocument {
  id: string;
  userId: string;
  deckId?: string | null;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'image' | 'notes';
  characterCount: number;
  chunkCount: number;
  createdAt: string;
}

export interface StoredChunk {
  id: string;
  documentId: string;
  userId: string;
  deckId?: string | null;
  chunkIndex: number;
  heading?: string;
  content: string;
  embedding: number[];
  createdAt: string;
}

export interface ScoredChunk {
  chunk: StoredChunk;
  documentName: string;
  similarity: number;
  keywordScore: number;
  combinedScore: number;
}

export interface VectorSearchOptions {
  userId: string;
  query: string;
  deckId?: string | null;
  documentIds?: string[];
  topK?: number;
  minSimilarity?: number;
}

// In-memory runtime cache for fast response within active instance
const globalForRAG = globalThis as unknown as {
  __notionwell_runtimeDocs?: Map<string, StoredDocument>;
  __notionwell_runtimeChunks?: Map<string, StoredChunk[]>;
};

const runtimeDocuments: Map<string, StoredDocument> =
  globalForRAG.__notionwell_runtimeDocs ?? (globalForRAG.__notionwell_runtimeDocs = new Map());
const runtimeChunks: Map<string, StoredChunk[]> =
  globalForRAG.__notionwell_runtimeChunks ?? (globalForRAG.__notionwell_runtimeChunks = new Map());

function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Keyword overlap matching score (0 to 1) with special academic weighting
 */
function calculateKeywordScore(query: string, content: string, heading?: string): number {
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['what', 'when', 'where', 'which', 'explain', 'tell', 'about', 'the', 'and', 'for', 'are'].includes(w));

  if (queryTerms.length === 0) return 0;

  const contentLower = content.toLowerCase();
  const headingLower = (heading || '').toLowerCase();

  let matchPoints = 0;
  for (const term of queryTerms) {
    if (headingLower.includes(term)) {
      matchPoints += 3; // strong heading relevance
    }
    if (contentLower.includes(term)) {
      matchPoints += 1;
    }
  }

  const maxPossible = queryTerms.length * 4;
  return Math.min(1.0, matchPoints / maxPossible);
}

/**
 * Ingests, chunks, embeds and persists a document with its chunks into Supabase.
 */
export async function storeDocumentWithChunks(options: {
  documentId?: string;
  userId: string;
  deckId?: string | null;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'image' | 'notes';
  rawText: string;
}): Promise<{ document: StoredDocument; chunks: StoredChunk[] }> {
  const { userId, deckId, fileName, fileType, rawText } = options;
  const documentId = options.documentId || uuidv4();
  const now = new Date().toISOString();

  // 1. Text chunking
  const chunkDrafts = chunkDocumentText(rawText);

  // 2. Batch embedding generation (Gemini text-embedding-004)
  const chunkTexts = chunkDrafts.map((c) => (c.heading ? `${c.heading}\n${c.content}` : c.content));
  const embeddings = await generateBatchEmbeddings(chunkTexts);

  // 3. Construct stored records
  const storedDoc: StoredDocument = {
    id: documentId,
    userId,
    deckId: isUUID(deckId) ? deckId : null,
    fileName,
    fileType,
    characterCount: rawText.length,
    chunkCount: chunkDrafts.length,
    createdAt: now,
  };

  const storedChunks: StoredChunk[] = chunkDrafts.map((draft, idx) => ({
    id: uuidv4(),
    documentId,
    userId,
    deckId: isUUID(deckId) ? deckId : null,
    chunkIndex: draft.chunkIndex,
    heading: draft.heading,
    content: draft.content,
    embedding: embeddings[idx] || [],
    createdAt: now,
  }));

  // Update in-memory runtime cache
  runtimeDocuments.set(documentId, storedDoc);
  runtimeChunks.set(documentId, storedChunks);

  // Authoritative persistence in Supabase PostgreSQL
  try {
    const admin = createAdminClient();
    await admin.from('documents').upsert({
      id: documentId,
      user_id: userId,
      deck_id: isUUID(deckId) ? deckId : null,
      file_name: fileName,
      storage_path: `documents/${userId}/${documentId}`,
      mime_type: fileType,
      file_size_bytes: rawText.length,
      parsed_text: rawText.slice(0, 10000),
      is_processed: true,
    }, { onConflict: 'id' });

    if (storedChunks.length > 0) {
      const chunkInserts = storedChunks.map((c) => ({
        id: c.id,
        document_id: documentId,
        user_id: userId,
        chunk_index: c.chunkIndex,
        heading: c.heading || null,
        content: c.content,
        embedding: c.embedding && c.embedding.length === 768 ? c.embedding : null,
      }));
      await admin.from('document_chunks').upsert(chunkInserts, { onConflict: 'id' });
    }
  } catch (err: any) {
    console.warn('[VectorStore] Supabase DB write notice:', err?.message);
  }

  return { document: storedDoc, chunks: storedChunks };
}

/**
 * Searches for the most relevant document chunks matching a user question.
 * Uses hybrid scoring: 70% semantic vector similarity + 30% keyword match.
 */
export async function searchRelevantChunks(
  options: VectorSearchOptions
): Promise<ScoredChunk[]> {
  const {
    userId,
    query,
    deckId,
    documentIds,
    topK = 5,
    minSimilarity = 0.35,
  } = options;

  if (!query || query.trim().length === 0) return [];

  // 1. Generate query embedding vector (768-dim)
  const queryEmbedding = await generateEmbedding(query);

  // 2. Fetch candidate chunks from Supabase or runtime cache
  let candidateChunks: Array<{ chunk: StoredChunk; docName: string }> = [];

  try {
    const admin = createAdminClient();
    let queryBuilder = admin
      .from('document_chunks')
      .select('id, document_id, user_id, chunk_index, heading, content, embedding, created_at, documents(file_name)')
      .eq('user_id', userId);

    if (documentIds && documentIds.length > 0) {
      const validDocUuids = documentIds.filter((id) => isUUID(id));
      if (validDocUuids.length > 0) {
        queryBuilder = queryBuilder.in('document_id', validDocUuids);
      }
    }

    const { data: dbChunks, error: dbErr } = await queryBuilder;

    if (!dbErr && Array.isArray(dbChunks) && dbChunks.length > 0) {
      candidateChunks = dbChunks.map((row: any) => ({
        chunk: {
          id: row.id,
          documentId: row.document_id,
          userId: row.user_id,
          deckId: null,
          chunkIndex: row.chunk_index,
          heading: row.heading || undefined,
          content: row.content,
          embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : (Array.isArray(row.embedding) ? row.embedding : []),
          createdAt: row.created_at,
        },
        docName: row.documents?.file_name || 'Uploaded Document',
      }));
    }
  } catch (dbErr: any) {
    console.warn('[searchRelevantChunks] Supabase query notice:', dbErr?.message);
  }

  // Fallback to runtime memory cache if db was empty
  if (candidateChunks.length === 0) {
    for (const [docId, doc] of runtimeDocuments.entries()) {
      const isOwner =
        doc.userId === userId ||
        doc.userId === 'shared' ||
        (doc.userId === 'default-user' && userId === 'default-user');
      if (!isOwner) continue;

      if (documentIds && documentIds.length > 0) {
        const matchesDoc = documentIds.includes(docId) || documentIds.includes(doc.fileName);
        if (!matchesDoc) continue;
      } else if (deckId && doc.deckId && doc.deckId !== deckId) {
        continue;
      }

      const chunks = runtimeChunks.get(docId) || [];
      for (const chunk of chunks) {
        candidateChunks.push({ chunk, docName: doc.fileName });
      }
    }
  }

  // 3. Compute vector similarities and hybrid scores
  const scoredChunks: ScoredChunk[] = [];

  for (const { chunk, docName } of candidateChunks) {
    const similarity = chunk.embedding && chunk.embedding.length > 0
      ? cosineSimilarity(queryEmbedding, chunk.embedding)
      : 0;
    const keywordScore = calculateKeywordScore(query, chunk.content, chunk.heading);
    const combinedScore = similarity * 0.70 + keywordScore * 0.30;

    if (similarity >= minSimilarity || keywordScore >= 0.20 || combinedScore >= minSimilarity) {
      scoredChunks.push({
        chunk,
        documentName: docName,
        similarity,
        keywordScore,
        combinedScore,
      });
    }
  }

  scoredChunks.sort((a, b) => b.combinedScore - a.combinedScore);
  return scoredChunks.slice(0, topK);
}

/**
 * Retrieves all stored documents belonging to a user (and optionally a deck).
 */
export async function getStoredDocuments(userId: string, deckId?: string | null): Promise<StoredDocument[]> {
  if (!userId) return [];

  // Query Supabase documents table
  try {
    const admin = createAdminClient();
    let queryBuilder = admin
      .from('documents')
      .select('id, user_id, deck_id, file_name, mime_type, file_size_bytes, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (deckId && isUUID(deckId)) {
      queryBuilder = queryBuilder.eq('deck_id', deckId);
    }

    const { data, error } = await queryBuilder;
    if (!error && Array.isArray(data) && data.length > 0) {
      const docs: StoredDocument[] = data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        deckId: d.deck_id,
        fileName: d.file_name,
        fileType: (d.mime_type as any) || 'pdf',
        characterCount: Number(d.file_size_bytes) || 0,
        chunkCount: 1,
        createdAt: d.created_at,
      }));

      // Cache in memory for quick reuse
      docs.forEach((doc) => runtimeDocuments.set(doc.id, doc));
      return docs;
    }
  } catch (err: any) {
    console.warn('[getStoredDocuments] Supabase query notice:', err?.message);
  }

  // Fallback to runtime memory cache
  const list: StoredDocument[] = [];
  for (const doc of runtimeDocuments.values()) {
    const isUserMatch =
      doc.userId === userId ||
      doc.userId === 'shared' ||
      (doc.userId === 'default-user' && userId === 'default-user');

    if (isUserMatch) {
      if (!deckId || doc.deckId === deckId) {
        list.push(doc);
      }
    }
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Deletes a document and its chunks from vector store and Supabase.
 */
export async function deleteStoredDocument(documentId: string, userId: string): Promise<boolean> {
  runtimeDocuments.delete(documentId);
  runtimeChunks.delete(documentId);

  try {
    const admin = createAdminClient();
    await admin.from('documents').delete().eq('id', documentId).eq('user_id', userId);
    return true;
  } catch (err: any) {
    console.warn('[deleteStoredDocument] Supabase deletion notice:', err?.message);
    return false;
  }
}

/**
 * Purges all vector store documents and chunks belonging to a user (GDPR / account deletion).
 */
export async function purgeUserRAGData(userId: string): Promise<void> {
  for (const [id, doc] of Array.from(runtimeDocuments.entries())) {
    if (doc.userId === userId) {
      runtimeDocuments.delete(id);
      runtimeChunks.delete(id);
    }
  }

  try {
    const admin = createAdminClient();
    await admin.from('documents').delete().eq('user_id', userId);
  } catch (err: any) {
    console.warn('[purgeUserRAGData] Supabase purge notice:', err?.message);
  }
}

/**
 * Helper to index a document for RAG.
 */
export async function indexDocumentForRAG(params: {
  documentId?: string;
  userId: string;
  fileName: string;
  rawText: string;
  fileType?: 'pdf' | 'docx' | 'txt' | 'image' | 'notes';
  deckId?: string | null;
}): Promise<{ document: StoredDocument; chunks: StoredChunk[] }> {
  return storeDocumentWithChunks({
    documentId: params.documentId,
    userId: params.userId,
    fileName: params.fileName,
    rawText: params.rawText,
    fileType: params.fileType || 'pdf',
    deckId: params.deckId,
  });
}
