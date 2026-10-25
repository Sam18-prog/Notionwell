import { NextRequest, NextResponse } from 'next/server';
import { generateStudyMaterial, generateEli5, cleanDocumentText } from '@/lib/app';
import { processDocumentMultimodal } from '@/lib/documentProcessor';
import { checkGenerationRateLimit, MAX_DOCUMENT_CHARS } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const actionQuery = req.nextUrl.searchParams.get('action');

    // 1. INGEST ACTION (File upload PDF/DOCX/TXT/IMAGE or pasted text)
    if (actionQuery === 'ingest' || contentType.includes('multipart/form-data')) {
      let text = '';
      let sourceType: 'pdf' | 'docx' | 'text' | 'image' = 'text';
      let imageUrl: string | undefined = undefined;
      let isScannedOcr = false;
      let hasUnclearSections = false;
      let unclearCount = 0;
      let pages: any[] = [];
      let docType = 'typed_document';

      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const rawTextInput = formData.get('text') as string | null;

        if (file) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const fileName = file.name;

          if (fileName.toLowerCase().endsWith('.pdf')) {
            sourceType = 'pdf';
          } else if (fileName.toLowerCase().endsWith('.docx')) {
            sourceType = 'docx';
          } else if (fileName.toLowerCase().endsWith('.txt')) {
            sourceType = 'text';
          } else if (/\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
            sourceType = 'image';
            const mimeType = fileName.toLowerCase().endsWith('.png')
              ? 'image/png'
              : fileName.toLowerCase().endsWith('.webp')
              ? 'image/webp'
              : 'image/jpeg';
            imageUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
          }

          // MULTIMODAL PIPELINE INGESTION
          const processed = await processDocumentMultimodal(buffer, sourceType, fileName);

          if (!processed.success || !processed.combinedText || processed.combinedText.trim().length < 150) {
            return NextResponse.json(
              {
                error:
                  "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option.",
              },
              { status: 400 }
            );
          }

          text = processed.combinedText;
          isScannedOcr = processed.isScannedOcr;
          hasUnclearSections = processed.hasUnclearSections;
          unclearCount = processed.unclearCount;
          pages = processed.pages;
          docType = processed.documentType;
        } else if (rawTextInput) {
          sourceType = 'text';
          text = rawTextInput;
        }
      } else {
        const body = await req.json();
        text = body.text || '';
      }

      const trimmed = text.trim();
      if (!trimmed || trimmed.length < 150) {
        return NextResponse.json(
          {
            error:
              "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option.",
          },
          { status: 400 }
        );
      }

      // PUBLIC DEMO SAFEGUARD: Input size cap (~20,000 chars / 15-20 pages)
      if (trimmed.length > MAX_DOCUMENT_CHARS) {
        return NextResponse.json(
          {
            error:
              'This demo is limited to shorter documents (~15-20 pages) to keep the experience fast and available for everyone. Try a shorter excerpt.',
            isInputTooLarge: true,
          },
          { status: 400 }
        );
      }

      const sanitizedText = cleanDocumentText(trimmed);
      return NextResponse.json({
        success: true,
        text: sanitizedText || trimmed,
        sourceType,
        imageUrl,
        isScannedOcr,
        hasUnclearSections,
        unclearCount,
        documentType: docType,
        pages,
      });
    }

    // JSON PAYLOAD ROUTING
    const body = await req.json();
    const action = actionQuery || body.action || 'generate';

    // 2. ELI5 ACTION
    if (action === 'eli5') {
      const { question, answer } = body;
      const explanation = await generateEli5(question, answer);
      return NextResponse.json({ success: true, explanation });
    }

    // 3. GENERATE ACTION (DEFAULT)
    const { text, deckId } = body;
    const trimmedInput = (text || '').trim();

    if (!trimmedInput || trimmedInput.length < 150) {
      return NextResponse.json(
        {
          error:
            "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option.",
        },
        { status: 400 }
      );
    }

    // PUBLIC DEMO SAFEGUARD 1: Input size cap (~20,000 chars)
    if (trimmedInput.length > MAX_DOCUMENT_CHARS) {
      return NextResponse.json(
        {
          error:
            'This demo is limited to shorter documents (~15-20 pages) to keep the experience fast and available for everyone. Try a shorter excerpt.',
          isInputTooLarge: true,
        },
        { status: 400 }
      );
    }

    // PUBLIC DEMO SAFEGUARD 2: Rate Limiting (5 requests per rolling hour per client IP / session)
    const forwardedHeader = req.headers.get('x-forwarded-for') || '';
    const clientIp = forwardedHeader.split(',')[0].trim() || req.headers.get('x-real-ip') || 'demo-client';
    const rateLimit = checkGenerationRateLimit(clientIp);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            'Demo generation limit reached for this session — please try again in a bit, or explore the Sample Biology Deck in the meantime.',
          isRateLimited: true,
          resetMinutes: rateLimit.resetMinutes,
        },
        { status: 429 }
      );
    }

    const sanitizedInput = cleanDocumentText(trimmedInput);
    console.log(`[AI Generation Input]: Sending ${sanitizedInput.length} chars to AI prompt. Snippet: "${sanitizedInput.slice(0, 120)}..."`);

    const material = await generateStudyMaterial(sanitizedInput, deckId || 'temp-deck-id');
    if (material.flashcards.length === 0 && material.quiz.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not generate high-quality study materials from this text. Please ensure the document contains descriptive explanations, definitions, or conceptual content rather than only lists or syllabus headers.",
        },
        { status: 422 }
      );
    }
    return NextResponse.json({
      success: true,
      flashcards: material.flashcards,
      quiz: material.quiz,
      skippedChunks: material.skippedChunks || 0,
      totalChunks: material.totalChunks || 1,
      quotaNotice: material.quotaNotice
        ? "We've hit our demo usage limit for now — deck generated using our built-in Smart AI engine."
        : undefined,
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error.message || 'Server error processing request.' },
      { status: 500 }
    );
  }
}
