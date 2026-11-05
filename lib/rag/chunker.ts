/**
 * Notionwell RAG — Intelligent Document Chunker
 * Splits extracted document text into semantically cohesive, overlapping chunks
 * while preserving sentence boundaries, section headings, and structural context.
 */

export interface ChunkOptions {
  maxChunkSize?: number; // Target chunk size in characters (~150-200 words)
  overlapSize?: number;  // Overlap between adjacent chunks to maintain context
  minChunkSize?: number; // Minimum useful chunk size
}

export interface DocumentChunkDraft {
  chunkIndex: number;
  content: string;
  heading?: string;
  characterCount: number;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxChunkSize: 750,
  overlapSize: 120,
  minChunkSize: 100,
};

/**
 * Detects if a line looks like an academic heading or section title.
 */
export function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 2 || trimmed.length > 90) return false;

  // Markdown headers (# Heading, ## Subheading)
  if (/^#{1,6}\s+/.test(trimmed)) return true;

  // Section numbering: "1. Introduction", "2. Machine Learning", "2.1 Regression"
  if (/^\d+(\.\d+)*\.?\s+[A-Z]/.test(trimmed)) return true;

  // Structural labels: "Chapter 1", "Section A", "Unit 3", "Appendix B"
  if (/^(chapter|section|part|unit|module|appendix|topic|lesson)\s+\w+/i.test(trimmed)) return true;

  // All-caps headings: "ARTIFICIAL INTELLIGENCE"
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.length < 60) return true;

  // Common academic subheadings
  const commonSubheadings = [
    'core concept', 'meaning and development', 'importance and uses',
    'main types', 'neural networks', 'applications and limitations',
    'what is an llm?', 'training and prompting', 'practical applications',
    'retrieval-augmented generation', 'challenges', 'responsible use',
    'skills for students', 'conclusion', 'summary', 'overview', 'key facts'
  ];
  if (commonSubheadings.includes(trimmed.toLowerCase())) return true;

  // General subheadings: short line (<= 40 chars), title case without terminal punctuation
  if (
    trimmed.length <= 40 &&
    /^[A-Z][A-Za-z0-9\s—–:-]+$/.test(trimmed) &&
    !/[.,;]$/.test(trimmed)
  ) {
    return true;
  }

  return false;
}

/**
 * Clean and normalize text before chunking, ensuring single newlines
 * before academic headings are promoted to structural paragraph breaks.
 */
function cleanTextForChunking(rawText: string): string {
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \t]+/g, ' ');

  const lines = normalized.split('\n');
  const separatedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isHeadingLine(line)) {
      separatedLines.push('');
      separatedLines.push(line.trim());
      separatedLines.push('');
    } else {
      separatedLines.push(line);
    }
  }

  return separatedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Splits document text into clean, overlapping chunks with heading awareness.
 */
export function chunkDocumentText(
  rawText: string,
  userOptions: ChunkOptions = {}
): DocumentChunkDraft[] {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };
  const cleaned = cleanTextForChunking(rawText);

  if (!cleaned || cleaned.length < options.minChunkSize) {
    if (cleaned.length > 0) {
      return [
        {
          chunkIndex: 0,
          content: cleaned,
          characterCount: cleaned.length,
        },
      ];
    }
    return [];
  }

  // Split into structural blocks (paragraphs)
  const paragraphs = cleaned.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: DocumentChunkDraft[] = [];

  let currentChunkText = '';
  let currentHeading = 'Introduction';
  let chunkIndex = 0;

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const trimmedPara = paragraphs[pIdx].trim();

    // Check if paragraph is or starts with a heading
    const firstLine = trimmedPara.split('\n')[0].trim();
    if (isHeadingLine(firstLine)) {
      const cleanH = firstLine.replace(/^#{1,6}\s+/, '').trim();
      // Check if next paragraph is a direct sub-heading (e.g. "2. Machine Learning" followed by "Core Concept")
      const nextPara = paragraphs[pIdx + 1]?.trim();
      if (nextPara && isHeadingLine(nextPara) && nextPara.length < 35) {
        currentHeading = `${cleanH} — ${nextPara.replace(/^#{1,6}\s+/, '').trim()}`;
        pIdx++; // Skip next subheading since it merged into currentHeading
      } else {
        currentHeading = cleanH;
      }
    }

    // If adding this paragraph exceeds maxChunkSize, flush current chunk
    if (currentChunkText.length + trimmedPara.length > options.maxChunkSize) {
      if (currentChunkText.trim().length >= options.minChunkSize) {
        chunks.push({
          chunkIndex: chunkIndex++,
          content: currentChunkText.trim(),
          heading: currentHeading,
          characterCount: currentChunkText.trim().length,
        });

        // Retain overlap from end of current chunk
        const words = currentChunkText.trim().split(/\s+/);
        const overlapWords = words.slice(-Math.min(25, Math.floor(words.length / 3))).join(' ');
        currentChunkText = overlapWords.length > 0 ? `${overlapWords}\n\n` : '';
      }
    }

    // If single paragraph itself is larger than maxChunkSize, split carefully
    if (trimmedPara.length > options.maxChunkSize) {
      // Split on sentences, without splitting on abbreviations like e.g., i.e., or numbers 1., 2.
      const sentences = trimmedPara.match(/(?:[^.!?]+|(?<=\b(?:e\.g|i\.e|\d))\.)+[.!?]+(?:\s|$)|.+$/g) || [trimmedPara];
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        if (currentChunkText.length + trimmedSentence.length > options.maxChunkSize) {
          if (currentChunkText.trim().length >= options.minChunkSize) {
            chunks.push({
              chunkIndex: chunkIndex++,
              content: currentChunkText.trim(),
              heading: currentHeading,
              characterCount: currentChunkText.trim().length,
            });
            const words = currentChunkText.trim().split(/\s+/);
            const overlapWords = words.slice(-Math.min(20, Math.floor(words.length / 3))).join(' ');
            currentChunkText = overlapWords ? `${overlapWords} ` : '';
          }
        }
        currentChunkText += `${trimmedSentence} `;
      }
    } else {
      currentChunkText += `${trimmedPara}\n\n`;
    }
  }

  // Push final remaining chunk
  if (currentChunkText.trim().length >= Math.min(options.minChunkSize, 50)) {
    chunks.push({
      chunkIndex: chunkIndex++,
      content: currentChunkText.trim(),
      heading: currentHeading,
      characterCount: currentChunkText.trim().length,
    });
  }

  return chunks;
}
