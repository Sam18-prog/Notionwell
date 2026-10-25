if (typeof window === 'undefined') {
  try {
    const nodeReq = eval('require');
    nodeReq('dns')?.setDefaultResultOrder?.('ipv4first');
  } catch {}
}

import { v4 as uuidv4 } from 'uuid';
import { Flashcard, QuizQuestion, GeneratedStudyMaterial, getTodayDateString, getAIClientAndModel } from './app';

// ============================================================================
// CONFIGURATION CONSTANTS & TARGET SCALING
// ============================================================================

export const DEFAULT_FLASHCARD_COUNT = 20;
export const DEFAULT_QUIZ_COUNT = 10;

export const MIN_FLASHCARDS = 10;
export const MAX_FLASHCARDS = 30;

export const MIN_QUIZ = 5;
export const MAX_QUIZ = 15;

export const BLACKLISTED_OPENINGS = [
  'what does the study text state regarding',
  'what does the study text state',
  'what does the study text say about',
  'what does the study text say',
  'what does the document state regarding',
  'what does the document state about',
  'what does the document say about',
  'what does the document say regarding',
  'what does the passage state regarding',
  'what does the passage state about',
  'what does the passage say about',
  'what does the passage say regarding',
  'according to the study text',
  'according to the document',
  'according to the passage',
  'according to the text',
  'what is mentioned regarding',
  'what is mentioned about',
  'what is stated regarding',
  'what is stated about',
  'based on the provided text',
  'based on the text',
  'as stated in the text',
  'the study text states',
  'the passage states',
  'key concept',
];

export interface GroundedFlashcardDraft {
  concept_tested: string;
  source_quote: string;
  question: string;
  answer: string;
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionType?: 'definition' | 'explanation' | 'cause_effect' | 'comparison' | 'application' | 'mechanism';
}

export interface GroundedQuizDraft {
  concept_tested: string;
  source_quote: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionType?: 'concept' | 'understanding' | 'cause_effect' | 'application' | 'comparison';
}

/**
 * Calculates target counts dynamically based on document volume and information density.
 */
export function calculateTargetItemCounts(text: string): { targetFlashcards: number; targetQuiz: number } {
  const charLength = text.trim().length;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  if (charLength < 1400 && wordCount < 200) {
    // Very short excerpt (e.g. 1-2 concise pages)
    return { targetFlashcards: 12, targetQuiz: 5 };
  } else if (charLength > 7000 || wordCount > 1000) {
    // Large document
    const extraCards = Math.floor((charLength - 7000) / 3000);
    const extraQuiz = Math.floor((charLength - 7000) / 4500);
    return {
      targetFlashcards: Math.min(MAX_FLASHCARDS, 25 + extraCards),
      targetQuiz: Math.min(MAX_QUIZ, 12 + extraQuiz),
    };
  } else {
    // Normal lecture / study document
    return { targetFlashcards: DEFAULT_FLASHCARD_COUNT, targetQuiz: DEFAULT_QUIZ_COUNT };
  }
}

/**
 * Checks if a question starts with a blacklisted generic opening.
 */
export function isBlacklistedOpening(q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase().trim();
  for (const prefix of BLACKLISTED_OPENINGS) {
    if (lower.startsWith(prefix) || lower.includes(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Normalizes text for reliable matching and quote verification.
 */
export function normalizeForSearch(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes a string into meaningful key words.
 */
export function getTokens(str: string): Set<string> {
  const stopwords = new Set([
    'what', 'which', 'where', 'when', 'who', 'how', 'why', 'does', 'with', 'this',
    'that', 'from', 'have', 'were', 'been', 'about', 'role', 'main', 'primary',
    'statement', 'accurately', 'reflects', 'the', 'and', 'for', 'are', 'is', 'a', 'an'
  ]);
  const words = normalizeForSearch(str)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w));
  return new Set(words);
}

/**
 * Evaluates semantic token overlap between two strings (0.0 to 1.0).
 */
export function getSemanticSimilarity(str1: string, str2: string): number {
  const tokens1 = getTokens(str1);
  const tokens2 = getTokens(str2);
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let overlap = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) overlap++;
  }
  return overlap / Math.min(tokens1.size, tokens2.size);
}

// ============================================================================
// SEMANTIC OVERLAPPING CHUNKER
// ============================================================================

/**
 * Splits document text into overlapping semantic chunks (preserving cross-boundary context and headings).
 */
export function splitTextIntoSemanticChunks(
  cleanedText: string,
  chunkSize = 4500,
  overlapSize = 800
): Array<{ title: string; content: string }> {
  const trimmed = cleanedText.trim();
  if (trimmed.length <= chunkSize) {
    return [{ title: 'Overview', content: trimmed }];
  }

  const rawParagraphs = trimmed.split(/\n\s*\n/);
  const chunks: Array<{ title: string; content: string }> = [];

  let currentChunkText = '';
  let activeHeading = 'Core Section';

  for (let i = 0; i < rawParagraphs.length; i++) {
    const para = rawParagraphs[i].trim();
    if (!para) continue;

    // Detect section heading
    if (para.length < 80 && !/[.!?]$/.test(para) && (/^[A-Z0-9#]/.test(para) || /^\d+(\.\d+)*\s+[A-Z]/.test(para))) {
      activeHeading = para.replace(/^#+\s*/, '').trim();
    }

    if ((currentChunkText + '\n\n' + para).length > chunkSize && currentChunkText.length > 0) {
      chunks.push({
        title: activeHeading,
        content: currentChunkText.trim(),
      });

      // Maintain overlap by retaining the tail of current chunk
      const tailWords = currentChunkText.slice(-overlapSize);
      currentChunkText = `[Context Continued from ${activeHeading}]\n${tailWords}\n\n${para}`;
    } else {
      currentChunkText = currentChunkText ? currentChunkText + '\n\n' + para : para;
    }
  }

  if (currentChunkText.trim()) {
    chunks.push({
      title: activeHeading,
      content: currentChunkText.trim(),
    });
  }

  return chunks.length > 0 ? chunks : [{ title: 'Main', content: trimmed }];
}

// ============================================================================
// VERIFICATION GATE (STAGE 2)
// ============================================================================

/**
 * Verifies that a generated source quote is genuinely grounded in the source chunk text.
 */
export function verifyQuoteGrounding(quote: string, chunkText: string): boolean {
  if (!quote || quote.length < 10) return false;
  const normQuote = normalizeForSearch(quote);
  const normChunk = normalizeForSearch(chunkText);

  // Exact substring check
  if (normChunk.includes(normQuote)) return true;

  // Partial phrase / sliding window match for minor OCR spacing differences
  const quoteTokens = normQuote.split(' ');
  if (quoteTokens.length >= 4) {
    const subSnippet = quoteTokens.slice(0, 4).join(' ');
    if (normChunk.includes(subSnippet)) return true;
  }

  // Token density check: at least 75% of quote key terms exist in the chunk
  const qTokens = getTokens(quote);
  const cTokens = getTokens(chunkText);
  if (qTokens.size === 0) return false;

  let present = 0;
  for (const t of qTokens) {
    if (cTokens.has(t)) present++;
  }
  return present / qTokens.size >= 0.75;
}

/**
 * Verifies flashcard quality, interrogative structure, answer substance, and source grounding.
 */
export function verifyFlashcard(
  card: GroundedFlashcardDraft,
  chunkText: string
): { isValid: boolean; reason?: string } {
  const q = (card.question || '').trim();
  const a = (card.answer || '').trim();

  if (q.length < 15) return { isValid: false, reason: 'Question too short (<15 chars)' };
  if (a.length < 5) return { isValid: false, reason: 'Answer too short (<5 chars)' };
  if (!/[?]$/.test(q)) return { isValid: false, reason: 'Question does not end with question mark' };
  if (isBlacklistedOpening(q)) return { isValid: false, reason: 'Blacklisted robotic opening' };

  // Answer must not be a bare list of comma-separated items without an active verb
  const hasVerb = /\b(is|are|was|were|can|could|will|uses|used|provides|enables|helps|allows|improves|applies|functions|supports|requires|includes|creates|generates|means|refers|occurs)\b/i.test(a);
  if (!hasVerb && a.split(',').length >= 3) {
    return { isValid: false, reason: 'Answer is a comma list without explanatory sentence' };
  }

  // Check grounding against chunk text
  if (!verifyQuoteGrounding(card.source_quote, chunkText)) {
    return { isValid: false, reason: 'Source quote not found in source text' };
  }

  return { isValid: true };
}

/**
 * Verifies multiple-choice question integrity: exactly 4 distinct options, unambiguous correct answer,
 * plausible non-colliding distractors, and source quote grounding.
 */
export function verifyQuizQuestion(
  item: GroundedQuizDraft,
  chunkText: string
): { isValid: boolean; normalizedCorrectAnswer?: string; reason?: string } {
  const q = (item.question || '').trim();
  if (q.length < 15) return { isValid: false, reason: 'Question too short' };
  if (isBlacklistedOpening(q)) return { isValid: false, reason: 'Blacklisted robotic opening' };
  if (!Array.isArray(item.options) || item.options.length !== 4) {
    return { isValid: false, reason: 'Must have exactly 4 options' };
  }

  const cleanedOptions = item.options.map((opt) => String(opt || '').trim());
  if (cleanedOptions.some((opt) => opt.length === 0 || opt.length > 150)) {
    return { isValid: false, reason: 'Option empty or excessively long' };
  }

  // Distinctness: all 4 options must be mutually exclusive
  const normOptions = cleanedOptions.map((opt) => normalizeForSearch(opt));
  const uniqueNorms = new Set(normOptions);
  if (uniqueNorms.size !== 4) {
    return { isValid: false, reason: 'Duplicate or overlapping options within question' };
  }

  // Correct answer resolution
  const normCorrect = normalizeForSearch(item.correctAnswer);
  let matchedIdx = normOptions.findIndex((opt) => opt === normCorrect);

  // If exact normalized match wasn't found, try matching by letter prefix e.g. "A) Answer"
  if (matchedIdx === -1 && /^[a-d][\.\)\:\s]+/i.test(item.correctAnswer.trim())) {
    const letter = item.correctAnswer.trim().charAt(0).toUpperCase();
    const letterIdx = letter.charCodeAt(0) - 65;
    if (letterIdx >= 0 && letterIdx < 4) {
      matchedIdx = letterIdx;
    }
  }

  if (matchedIdx === -1) {
    return { isValid: false, reason: 'correctAnswer does not match any of the 4 options' };
  }

  const exactCorrectAnswer = cleanedOptions[matchedIdx];

  // Distractors must not be placeholder phrases
  const placeholderRegex = /\b(option [a-d]|all of the above|none of the above|not mentioned|unknown|n\/a)\b/i;
  if (cleanedOptions.some((opt) => placeholderRegex.test(opt))) {
    return { isValid: false, reason: 'Contains generic placeholder options' };
  }

  // Check source quote grounding
  if (!verifyQuoteGrounding(item.source_quote, chunkText)) {
    return { isValid: false, reason: 'Source quote not found in source text' };
  }

  return { isValid: true, normalizedCorrectAnswer: exactCorrectAnswer };
}

// ============================================================================
// AI API CALLER WITH RESILIENT FALLBACKS
// ============================================================================

/**
 * Invokes Gemini or OpenAI client with structured JSON response guarantees.
 */
export async function callAIStructured(
  prompt: string,
  systemPrompt: string
): Promise<{ flashcards?: GroundedFlashcardDraft[]; quiz?: GroundedQuizDraft[] } | null> {
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Native Gemini REST API (Supports full schema adherence and high speed)
  if (geminiKey) {
    const models = [
      process.env.AI_MODEL || 'gemini-3.5-flash',
      'gemini-flash-lite-latest',
      'gemini-flash-latest'
    ];

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

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
                    { text: `${systemPrompt}\n\n${prompt}` }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json'
              }
            })
          }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          const parsed = JSON.parse(rawText);
          if (parsed && (Array.isArray(parsed.flashcards) || Array.isArray(parsed.quiz))) {
            return parsed;
          }
        }
      } catch {
        // Continue to fallback model
      }
    }
  }

  // 2. OpenAI / Groq / OpenRouter Fallback Client
  const aiInfo = getAIClientAndModel();
  if (aiInfo) {
    try {
      const response = await aiInfo.client.chat.completions.create({
        model: aiInfo.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4
      });

      const raw = response.choices[0]?.message?.content?.trim() || '';
      const parsed = JSON.parse(raw);
      if (parsed && (Array.isArray(parsed.flashcards) || Array.isArray(parsed.quiz))) {
        return parsed;
      }
    } catch {
      // Continue to fail
    }
  }

  return null;
}

// ============================================================================
// MAIN REWRITTEN GROUNDED STUDY GENERATION PIPELINE
// ============================================================================

export async function generateGroundedStudyMaterial(
  cleanedText: string,
  deckId: string,
  customFlashcards?: number,
  customQuiz?: number
): Promise<GeneratedStudyMaterial> {
  const { targetFlashcards: defaultFC, targetQuiz: defaultQuiz } = calculateTargetItemCounts(cleanedText);
  const targetFlashcards = customFlashcards || defaultFC;
  const targetQuiz = customQuiz || defaultQuiz;

  const chunks = splitTextIntoSemanticChunks(cleanedText, 4500, 800);
  const flashcardsPerChunk = Math.max(4, Math.ceil((targetFlashcards + 4) / chunks.length));
  const quizPerChunk = Math.max(3, Math.ceil((targetQuiz + 2) / chunks.length));

  const validFlashcards: Flashcard[] = [];
  const validQuiz: QuizQuestion[] = [];
  const seenQuestionNorms = new Set<string>();
  const opening3WordCounts = new Map<string, number>();
  const today = getTodayDateString();

  const systemPrompt = `You are a university academic examiner and instructional designer creating strictly source-grounded active-recall study materials.

CRITICAL GENERATION REQUIREMENTS:
1. STRICT SOURCE GROUNDING: Every question, answer, and distractor MUST be 100% grounded in the provided source text. Never invent outside facts, unmentioned examples, or speculative claims.
2. SOURCE QUOTE ANCHOR: For EVERY flashcard and quiz item, you must provide a "source_quote" containing the exact, verbatim sentence from the source text that proves the answer.
3. CLEAR, NATURAL QUESTIONS: Write natural questions testing understanding, mechanism, cause & effect, comparison, or application. NEVER use robotic template prefixes (such as "What does the study text state regarding...", "According to the passage...", "What is mentioned about...").
4. SINGLE-CONCEPT FLASHCARDS: Each flashcard must test exactly ONE clear concept with a concise, definitive answer (1-3 clear sentences).
5. PEDAGOGICALLY RIGOROUS MCQS:
   - Exactly 4 distinct, mutually exclusive options.
   - Exactly ONE correct answer matching the source.
   - Exactly THREE plausible distractors that belong to the same technical domain but are demonstrably FALSE based on the source text.
   - Never use "All of the above", "None of the above", or placeholder labels.
   - Provide a clear explanation citing the source evidence.

REQUIRED JSON FORMAT:
{
  "flashcards": [
    {
      "concept_tested": "Concept Name",
      "source_quote": "Exact verbatim quote from the text",
      "question": "Clear, natural question",
      "answer": "Concise, definitive answer (1-3 sentences)",
      "topic": "Topic Name",
      "difficulty": "easy" | "medium" | "hard",
      "questionType": "definition" | "explanation" | "cause_effect" | "comparison" | "application" | "mechanism"
    }
  ],
  "quiz": [
    {
      "concept_tested": "Concept Name",
      "source_quote": "Exact verbatim quote from the text",
      "question": "Natural multiple choice question",
      "options": ["Correct Option", "Plausible Distractor 1", "Plausible Distractor 2", "Plausible Distractor 3"],
      "correctAnswer": "Correct Option",
      "explanation": "Clear pedagogical explanation referencing source",
      "topic": "Topic Name",
      "difficulty": "easy" | "medium" | "hard",
      "questionType": "concept" | "understanding" | "cause_effect" | "application" | "comparison"
    }
  ]
}`;

  // Process chunks and apply Stage 2 Verification Gate
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const userPrompt = `SOURCE MATERIAL (Section: ${chunk.title}):\n\n${chunk.content}\n\nTASK: Generate exactly ${flashcardsPerChunk} flashcards and ${quizPerChunk} multiple-choice quiz questions strictly from this section. Return JSON only.`;

    const rawOutput = await callAIStructured(userPrompt, systemPrompt);

    if (rawOutput) {
      // 1. Verify and filter Flashcards from this chunk
      if (Array.isArray(rawOutput.flashcards)) {
        for (const card of rawOutput.flashcards) {
          const verification = verifyFlashcard(card, chunk.content);
          if (!verification.isValid) continue;

          const normQ = normalizeForSearch(card.question);
          if (seenQuestionNorms.has(normQ)) continue;

          // Diversity: check max repeated 3-word opening
          const words = normQ.split(/\s+/).filter(Boolean);
          const openingKey = words.slice(0, 3).join(' ');
          const openingCount = opening3WordCounts.get(openingKey) || 0;
          if (openingCount >= 2) continue;

          // Semantic duplicate check against already accepted questions
          if (validFlashcards.some((existing) => getSemanticSimilarity(existing.question, card.question) >= 0.70)) {
            continue;
          }

          seenQuestionNorms.add(normQ);
          opening3WordCounts.set(openingKey, openingCount + 1);

          validFlashcards.push({
            id: uuidv4(),
            deckId,
            question: card.question.trim(),
            answer: card.answer.trim(),
            difficulty: card.difficulty || null,
            intervalDays: 0,
            nextReviewDate: today,
            timesReviewed: 0,
            timesIncorrect: 0,
            topic: card.topic?.trim() || card.concept_tested?.trim() || chunk.title,
            isBookmarked: false,
            masteryLevel: 'new',
            correctReviewCount: 0,
            lastReviewedDate: null,
            isWeakTopicReviewed: false,
          });
        }
      }

      // 2. Verify and filter Quiz Questions from this chunk
      if (Array.isArray(rawOutput.quiz)) {
        for (const quizItem of rawOutput.quiz) {
          const verification = verifyQuizQuestion(quizItem, chunk.content);
          if (!verification.isValid || !verification.normalizedCorrectAnswer) continue;

          const normQ = normalizeForSearch(quizItem.question);
          if (seenQuestionNorms.has(normQ)) continue;

          const words = normQ.split(/\s+/).filter(Boolean);
          const openingKey = words.slice(0, 3).join(' ');
          const openingCount = opening3WordCounts.get(openingKey) || 0;
          if (openingCount >= 2) continue;

          if (validQuiz.some((existing) => getSemanticSimilarity(existing.question, quizItem.question) >= 0.70)) {
            continue;
          }

          seenQuestionNorms.add(normQ);
          opening3WordCounts.set(openingKey, openingCount + 1);

          validQuiz.push({
            id: uuidv4(),
            question: quizItem.question.trim(),
            options: quizItem.options.map((opt) => opt.trim()),
            correctAnswer: verification.normalizedCorrectAnswer,
            explanation: quizItem.explanation.trim(),
            topic: quizItem.topic?.trim() || quizItem.concept_tested?.trim() || chunk.title,
          });
        }
      }
    }
  }

  // STAGE 3: Targeted Item Replenishment Pass if below target count
  const neededFC = targetFlashcards - validFlashcards.length;
  const neededQuiz = targetQuiz - validQuiz.length;

  if ((neededFC > 0 || neededQuiz > 0) && cleanedText.length >= 200) {
    const existingQuestions = [...validFlashcards.map((f) => f.question), ...validQuiz.map((q) => q.question)];
    const regenPrompt = `We already generated and verified ${validFlashcards.length} flashcards and ${validQuiz.length} quiz questions.
We need ${Math.max(0, neededFC)} MORE flashcards and ${Math.max(0, neededQuiz)} MORE quiz questions on UNCOVERED concepts.

DO NOT REPEAT OR DUPLICATE ANY OF THESE CONCEPTS OR QUESTIONS:
${existingQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}

SOURCE DOCUMENT:
${cleanedText.slice(0, 7000)}

Generate strictly source-grounded items on different concepts. Return JSON only.`;

    const regenOutput = await callAIStructured(regenPrompt, systemPrompt);
    if (regenOutput) {
      if (Array.isArray(regenOutput.flashcards) && validFlashcards.length < targetFlashcards) {
        for (const card of regenOutput.flashcards) {
          if (validFlashcards.length >= targetFlashcards) break;
          const verification = verifyFlashcard(card, cleanedText);
          if (!verification.isValid) continue;

          const normQ = normalizeForSearch(card.question);
          if (seenQuestionNorms.has(normQ)) continue;

          const words = normQ.split(/\s+/).filter(Boolean);
          const openingKey = words.slice(0, 3).join(' ');
          const openingCount = opening3WordCounts.get(openingKey) || 0;
          if (openingCount >= 2) continue;

          if (validFlashcards.some((existing) => getSemanticSimilarity(existing.question, card.question) >= 0.70)) continue;

          seenQuestionNorms.add(normQ);
          opening3WordCounts.set(openingKey, openingCount + 1);
          validFlashcards.push({
            id: uuidv4(),
            deckId,
            question: card.question.trim(),
            answer: card.answer.trim(),
            difficulty: card.difficulty || null,
            intervalDays: 0,
            nextReviewDate: today,
            timesReviewed: 0,
            timesIncorrect: 0,
            topic: card.topic?.trim() || card.concept_tested?.trim() || 'General',
            isBookmarked: false,
            masteryLevel: 'new',
            correctReviewCount: 0,
            lastReviewedDate: null,
            isWeakTopicReviewed: false,
          });
        }
      }

      if (Array.isArray(regenOutput.quiz) && validQuiz.length < targetQuiz) {
        for (const quizItem of regenOutput.quiz) {
          if (validQuiz.length >= targetQuiz) break;
          const verification = verifyQuizQuestion(quizItem, cleanedText);
          if (!verification.isValid || !verification.normalizedCorrectAnswer) continue;

          const normQ = normalizeForSearch(quizItem.question);
          if (seenQuestionNorms.has(normQ)) continue;

          const words = normQ.split(/\s+/).filter(Boolean);
          const openingKey = words.slice(0, 3).join(' ');
          const openingCount = opening3WordCounts.get(openingKey) || 0;
          if (openingCount >= 2) continue;

          if (validQuiz.some((existing) => getSemanticSimilarity(existing.question, quizItem.question) >= 0.70)) continue;

          seenQuestionNorms.add(normQ);
          opening3WordCounts.set(openingKey, openingCount + 1);
          validQuiz.push({
            id: uuidv4(),
            question: quizItem.question.trim(),
            options: quizItem.options.map((opt) => opt.trim()),
            correctAnswer: verification.normalizedCorrectAnswer,
            explanation: quizItem.explanation.trim(),
            topic: quizItem.topic?.trim() || quizItem.concept_tested?.trim() || 'General',
          });
        }
      }
    }
  }

  return {
    flashcards: validFlashcards.slice(0, targetFlashcards),
    quiz: validQuiz.slice(0, targetQuiz),
    totalChunks: chunks.length,
  };
}
