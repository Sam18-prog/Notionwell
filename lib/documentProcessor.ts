import { extractTextWithVisionOcr } from './app';

// ============================================================================
// TYPES & INTERFACES FOR MULTIMODAL DOCUMENT PROCESSING
// ============================================================================

export interface PageTranscription {
  pageNumber: number;
  contentType: 'handwritten' | 'typed' | 'mixed';
  confidence: 'high' | 'medium' | 'low';
  transcription: string;
  equations: string[];
  diagrams: string[];
  unclearSections: string[];
}

export interface ProcessedDocumentResult {
  success: boolean;
  documentType: 'handwritten_notes' | 'typed_document' | 'scanned_document' | 'mixed_document' | 'image_note';
  quality: 'high' | 'medium' | 'low';
  combinedText: string;
  pages: PageTranscription[];
  hasUnclearSections: boolean;
  unclearCount: number;
  isScannedOcr: boolean;
}

export interface TextQualityResult {
  isHighQuality: boolean;
  score: number;
  reason: string;
}

// ============================================================================
// 1. TEXT QUALITY EVALUATOR GATE
// ============================================================================
export function evaluateTextQuality(text: string, pageCount = 1): TextQualityResult {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { isHighQuality: false, score: 0, reason: 'Text is empty' };
  }

  const charCount = trimmed.length;
  const expectedMinChars = Math.max(150, pageCount * 100);

  if (charCount < expectedMinChars) {
    return {
      isHighQuality: false,
      score: charCount / expectedMinChars,
      reason: `Text length (${charCount} chars) is below expected threshold (${expectedMinChars} chars)`,
    };
  }

  // Calculate readable word ratio
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 20) {
    return { isHighQuality: false, score: 0.2, reason: 'Word count is too low (< 20 words)' };
  }

  const alphaWords = words.filter((w) => /^[a-zA-Z0-9\+\-\*\/=><,.:;()\[\]\{\}\$#\\_]+$/.test(w));
  const readableRatio = alphaWords.length / words.length;

  if (readableRatio < 0.65) {
    return {
      isHighQuality: false,
      score: readableRatio,
      reason: `High ratio of non-readable or corrupted characters (${Math.round((1 - readableRatio) * 100)}%)`,
    };
  }

  // Check for repeated garbage symbol patterns (e.g. "" or "....")
  const garbageSymbols = (trimmed.match(/[\uFFFD\u0000-\u0008\u000E-\u001F]/g) || []).length;
  if (garbageSymbols > 10) {
    return {
      isHighQuality: false,
      score: 0.1,
      reason: 'Contains unprintable or corrupted PDF encoding symbols',
    };
  }

  return { isHighQuality: true, score: 0.95, reason: 'High quality text extraction' };
}

// ============================================================================
// 2. TWO-PASS MULTIMODAL VISION PROCESSOR
// ============================================================================

/**
 * Pass 1: Visual Transcription using Gemini 1.5/2.5 Multimodal Vision API
 */
export async function pass1VisualTranscription(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return await extractTextWithVisionOcr(buffer, mimeType);
  }

  const base64Data = buffer.toString('base64');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  const prompt = `You are an expert multimodal document reader and OCR vision specialist.
Carefully examine this document/image visually. Perform a complete, highly accurate visual transcription of ALL content.

INSTRUCTIONS:
1. READ HANDWRITING: Read handwritten study notes, marginalia, annotations, arrows, and emphasis.
2. PRESERVE STRUCTURE: Keep original headings (#, ##), bullet points, numbered lists, and layout hierarchy.
3. MATHEMATICAL EQUATIONS: Format all mathematical formulas and equations into clean LaTeX ($...$ for inline, $$...$$ for block equations). Recognize powers, roots, fractions, integrals, matrices, summations, and Greek symbols.
4. PROGRAMMING CODE: Preserve code snippets (Python, C, C++, Java, JS, HTML, CSS, SQL, 8085 Assembly). Keep exact brackets, indentation, syntax, and variable names.
5. DIAGRAMS & SCHEMATICS: If a diagram, flowchart, block diagram, or circuit is present, describe it clearly inside a block tagged [DIAGRAM] ... [/DIAGRAM], detailing components, labels, and relationships.
6. TABLES: Convert handwritten or printed tables into clean Markdown tables (| Header 1 | Header 2 |).
7. UNCLEAR SECTIONS: Do NOT hallucinate or guess text. If a section or word is genuinely unreadable or smudged, mark it explicitly as [UNCLEAR].

Output ONLY the structured transcription text.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType === 'pdf' || mimeType.endsWith('/pdf') ? 'application/pdf' : mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (text.length >= 20) {
        return text;
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('[Pass 1 Vision]: Timed out after 50s');
    } else {
      console.warn('[Pass 1 Vision Error]:', err);
    }
  }

  // Fallback to extractTextWithVisionOcr
  return await extractTextWithVisionOcr(buffer, mimeType);
}

/**
 * Pass 2: Contextual Verification & Fix Character Ambiguities
 */
export async function pass2ContextualVerification(rawTranscription: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || !rawTranscription || rawTranscription.length < 50) {
    return rawTranscription;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a context verification AI for handwritten OCR transcriptions.
Review the following visual transcription text and perform lightweight contextual corrections:
- Fix obvious OCR character confusion where context makes it 100% unambiguous (e.g. '0' vs 'O', '1' vs 'l' vs 'I', '5' vs 'S', '2' vs 'Z').
- Ensure programming syntax (e.g. for loops, brackets) and LaTeX equations are validly formatted.
- CRITICAL: Do NOT change uncertain content or guess words. Preserve [UNCLEAR] markers exactly. Preserve all LaTeX ($...$) and [DIAGRAM] blocks.

Transcription to verify:
\n\n${rawTranscription}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (response.ok) {
      const json = await response.json();
      const verified = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (verified && verified.length >= 20) {
        return verified;
      }
    }
  } catch (err) {
    console.warn('[Pass 2 Verification Error]:', err);
  }

  return rawTranscription;
}

// ============================================================================
// 3. MAIN MULTIMODAL DOCUMENT PROCESSING ENGINE
// ============================================================================
export async function processDocumentMultimodal(
  buffer: Buffer,
  fileType: string,
  fileName: string
): Promise<ProcessedDocumentResult> {
  const lowerName = fileName.toLowerCase();

  let nativeText = '';
  let sourceType: 'pdf' | 'docx' | 'text' | 'image' = 'text';

  // Step A: Native Text Extraction Attempt
  if (lowerName.endsWith('.pdf')) {
    sourceType = 'pdf';
    try {
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(buffer);
      nativeText = parsed.text || '';
    } catch (e) {
      console.warn('[Multimodal Processor]: pdf-parse failed, will use Vision:', e);
      nativeText = '';
    }
  } else if (lowerName.endsWith('.docx')) {
    sourceType = 'docx';
    try {
      const mammoth = require('mammoth');
      const res = await mammoth.extractRawText({ buffer });
      nativeText = res.value || '';
    } catch (e) {
      nativeText = '';
    }
  } else if (lowerName.endsWith('.txt')) {
    sourceType = 'text';
    nativeText = buffer.toString('utf-8');
  } else if (
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp')
  ) {
    sourceType = 'image';
    nativeText = ''; // Images always go to Vision engine for quality check
  }

  // Step B: Text Quality Evaluation Gate
  const qualityResult = evaluateTextQuality(nativeText);
  console.log(
    `[Multimodal Quality Gate]: File=${fileName}, NativeChars=${nativeText.length}, HighQuality=${qualityResult.isHighQuality}, Reason="${qualityResult.reason}"`
  );

  let finalCombinedText = nativeText;
  let isScannedOcr = false;
  let docType: ProcessedDocumentResult['documentType'] = 'typed_document';

  if (sourceType === 'image') {
    docType = 'image_note';
  }

  // Step C: Trigger Multimodal Vision Processing if Quality Check Fails or Image
  if (!qualityResult.isHighQuality || sourceType === 'image') {
    isScannedOcr = true;
    docType = sourceType === 'image' ? 'image_note' : 'handwritten_notes';

    console.log(`[Multimodal Engine]: Triggering Two-Pass Multimodal Vision for ${fileName}...`);
    const mimeType = lowerName.endsWith('.png')
      ? 'image/png'
      : lowerName.endsWith('.webp')
      ? 'image/webp'
      : lowerName.endsWith('.pdf')
      ? 'application/pdf'
      : 'image/jpeg';

    const pass1Text = await pass1VisualTranscription(buffer, mimeType, fileName);

    if (pass1Text && pass1Text.trim().length >= 20) {
      console.log(`[Pass 1 Complete]: Transcribed ${pass1Text.length} chars. Running Pass 2 Verification...`);
      finalCombinedText = await pass2ContextualVerification(pass1Text);
    } else {
      console.warn(`[Vision Processing Warning]: Pass 1 returned insufficient text for ${fileName}.`);
    }
  }

  const trimmedText = (finalCombinedText || '').trim();

  if (!trimmedText || trimmedText.length < 150) {
    return {
      success: false,
      documentType: docType,
      quality: 'low',
      combinedText: '',
      pages: [],
      hasUnclearSections: false,
      unclearCount: 0,
      isScannedOcr,
    };
  }

  // Extract equations, diagrams, and unclear markers metadata
  const equations = (trimmedText.match(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+\$)/g) || []);
  const diagrams = (trimmedText.match(/\[DIAGRAM\][\s\S]*?\[\/DIAGRAM\]/gi) || []);
  const unclearMatches = (trimmedText.match(/\[UNCLEAR\]/gi) || []);
  const hasUnclear = unclearMatches.length > 0;

  const pageEntry: PageTranscription = {
    pageNumber: 1,
    contentType: isScannedOcr ? 'handwritten' : 'typed',
    confidence: hasUnclear ? 'medium' : 'high',
    transcription: trimmedText,
    equations,
    diagrams,
    unclearSections: unclearMatches,
  };

  return {
    success: true,
    documentType: docType,
    quality: isScannedOcr ? (hasUnclear ? 'medium' : 'high') : 'high',
    combinedText: trimmedText,
    pages: [pageEntry],
    hasUnclearSections: hasUnclear,
    unclearCount: unclearMatches.length,
    isScannedOcr,
  };
}
