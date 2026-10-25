if (typeof window === 'undefined') {
  try {
    const nodeReq = eval('require');
    nodeReq('dns')?.setDefaultResultOrder?.('ipv4first');
  } catch {}
}

import zlib from 'zlib';
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

  // Explicit check for PDF internal metadata, C2PA content credentials, SSL root certs, UUIDs
  const lower = trimmed.toLowerCase();
  const isMetadataStream =
    lower.includes('c2pa') ||
    lower.includes('content credentials') ||
    lower.includes('root ca') ||
    lower.includes('ssl.com') ||
    lower.includes('intermediate certificate authority') ||
    lower.includes('adobe:ns') ||
    lower.includes('xmpmeta') ||
    lower.includes('/flatedecode') ||
    lower.includes('/xref') ||
    lower.includes('uuid:');

  if (isMetadataStream) {
    return {
      isHighQuality: false,
      score: 0.1,
      reason: 'Contains internal PDF structural metadata or C2PA/SSL certificate streams instead of readable text',
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
  const prompt = `You are an expert multimodal document reader and OCR transcription specialist.
Transcribe and extract ALL readable text, headings, bullet points, numbered lists, definitions, tables, and study notes from this document with high fidelity.
Output ONLY the clean transcribed study text. Do not invent metadata or summaries.`;

  const visionModels = [
    process.env.AI_MODEL || 'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-flash-latest'
  ];

  for (const model of visionModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
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
                    inline_data: {
                      mime_type: mimeType === 'pdf' || mimeType.endsWith('/pdf') ? 'application/pdf' : mimeType,
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
      // Continue to fallback vision model
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
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.AI_MODEL || 'gemini-3.5-flash'}:generateContent?key=${geminiKey}`,
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

/**
 * Direct /FlateDecode Stream Decompressor fallback for PDFs that fail in standard parsers
 * (e.g. bad XRef table, corrupted object streams, or C2PA metadata blocks).
 */
export function extractRawPdfStreamFallback(buffer: Buffer): string {
  const textParts: string[] = [];
  const binary = buffer.toString('latin1');
  const fullRaw = buffer.toString('utf-8') + '\n' + binary;

  const isPdfMetadataArtifact = (s: string) => {
    const l = s.toLowerCase();
    return (
      l.includes('c2pa') ||
      l.includes('content credentials') ||
      l.includes('root ca') ||
      l.includes('ssl.com') ||
      l.includes('intermediate certificate') ||
      l.includes('xmpmeta') ||
      l.includes('adobe:ns') ||
      l.includes('uuid:') ||
      /\bd:\d{14}\b/i.test(s)
    );
  };

  const parenMatches = fullRaw.match(/\(([^()]{2,500})\)/g) || [];
  for (const m of parenMatches) {
    const raw = m.slice(1, -1).replace(/\\([()\\])/g, '$1');
    if (
      /[a-zA-Z0-9]{2,}/.test(raw) &&
      !isPdfMetadataArtifact(raw) &&
      !/^(Font|Catalog|Page|Parent|ProcSet|Encoding|FontDescriptor|Metadata|Type|Filter|FlateDecode|FontName|Subtype|Widths|FontMatrix|FontBBox|Stream|XObject|Root|Info|Size)/i.test(raw)
    ) {
      textParts.push(raw);
    }
  }

  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/gi;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(binary)) !== null) {
    try {
      const streamData = Buffer.from(match[1], 'latin1');
      let decompressed = '';
      try {
        decompressed = zlib.inflateSync(streamData).toString('utf-8');
      } catch {
        try {
          decompressed = zlib.unzipSync(streamData).toString('utf-8');
        } catch {
          decompressed = '';
        }
      }

      if (decompressed) {
        const streamParens = decompressed.match(/\(([^()]{2,500})\)/g) || [];
        for (const m of streamParens) {
          const raw = m.slice(1, -1).replace(/\\([()\\])/g, '$1');
          if (
            /[a-zA-Z0-9]{2,}/.test(raw) &&
            !isPdfMetadataArtifact(raw) &&
            !/^(Font|Catalog|Page|Parent|ProcSet|Encoding|FontDescriptor|Metadata|Type|Filter|FlateDecode|FontName|Subtype|Widths|FontMatrix|FontBBox|Stream|XObject|Root|Info|Size)/i.test(raw)
          ) {
            textParts.push(raw);
          }
        }
        const streamTjs = decompressed.match(/\[\s*(\([^)]+\)\s*[-0-9\s]*)+\s*\]\s*TJ/gi) || [];
        for (const tj of streamTjs) {
          const parts = tj.match(/\(([^)]+)\)/g) || [];
          const joined = parts.map((p) => p.slice(1, -1)).join('');
          if (joined.length > 2 && !isPdfMetadataArtifact(joined)) {
            textParts.push(joined);
          }
        }
      }
    } catch {
      // Ignore corrupted stream
    }
  }

  return Array.from(new Set(textParts)).join(' ').replace(/\s+/g, ' ').trim();
}

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
      console.warn('[Multimodal Processor]: pdf-parse failed, attempting stream recovery fallback:', e);
      try {
        nativeText = extractRawPdfStreamFallback(buffer);
      } catch (streamErr) {
        nativeText = '';
      }
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
