import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAIClientAndModel } from '@/lib/app';
import { getStoredDocuments } from '@/lib/rag/vectorStore';
import { getDeckById, getDeckSources } from '@/lib/app';
import {
  ExamConfig,
  ExamQuestion,
  ExamMode,
  ExamDifficulty,
  QuestionType,
  saveExamConfig,
} from '@/lib/exam';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const userId = session.id;
    const rateCheck = checkRateLimit(userId, 'exam_generation');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Hourly exam generation limit reached (${rateCheck.limit}/hr). Please wait ${rateCheck.resetMinutes}m.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawTotalQuestions = body.totalQuestions ?? body.questionCount ?? 10;
    const rawTimeLimit = body.timeLimitMinutes ?? body.durationMinutes ?? 15;
    const rawSourceIds = body.selectedSourceIds || body.documentIds || [];
    const {
      title = 'AI Simulated Exam',
      description,
      subjectId,
      subjectName,
      deckId,
      deckName,
      mode = 'timed' as ExamMode,
      difficulty = 'mixed' as ExamDifficulty,
      timeLimitMinutes = rawTimeLimit,
      totalQuestions = rawTotalQuestions,
      negativeMarking = false,
      negativeMarkValue = 0.25,
      questionTypes = ['mcq', 'true_false'] as QuestionType[],
      selectedSourceIds = rawSourceIds,
      selectedTopics = [],
      randomizeOrder = true,
    } = body;

    // 1. Gather study material text
    let contextText = '';
    const sourceReferences: string[] = [];

    // Check RAG vector store documents
    const allStoredDocs = await getStoredDocuments(userId);
    const matchedDocs =
      selectedSourceIds.length > 0
        ? allStoredDocs.filter((d) => selectedSourceIds.includes(d.id) || selectedSourceIds.includes(d.fileName))
        : allStoredDocs;

    // Load chunk text from Supabase document_chunks
    const chunksMap: Record<string, any[]> = {};
    if (matchedDocs.length > 0) {
      try {
        const admin = createAdminClient();
        const docIds = matchedDocs.map((d) => d.id);
        const { data: dbChunks } = await admin
          .from('document_chunks')
          .select('document_id, heading, content')
          .in('document_id', docIds)
          .limit(80);

        if (Array.isArray(dbChunks)) {
          for (const c of dbChunks) {
            if (!chunksMap[c.document_id]) chunksMap[c.document_id] = [];
            chunksMap[c.document_id].push(c);
          }
        }
      } catch (err: any) {
        console.warn('[exam/generate] Could not load document_chunks from Supabase:', err?.message);
      }
    }

    for (const doc of matchedDocs) {
      sourceReferences.push(doc.fileName);
      const chunks = chunksMap[doc.id] || [];
      if (chunks.length > 0) {
        contextText += `\n\n=== SOURCE DOCUMENT: "${doc.fileName}" ===\n`;
        contextText += chunks
          .slice(0, 15)
          .map((c) => `[Section: ${c.heading || 'General'}]\n${c.content}`)
          .join('\n\n');
      }
    }

    // Also check deck sources if deckId provided
    if (deckId) {
      const deck = getDeckById(deckId);
      if (deck) {
        sourceReferences.push(deck.name);
        const deckSources = getDeckSources(deckId);
        if (deckSources.length > 0) {
          contextText += `\n\n=== DECK SOURCES: "${deck.name}" ===\n`;
          contextText += deckSources.map((ds) => ds.extractedText).join('\n\n');
        } else if (deck.flashcards.length > 0) {
          contextText += `\n\n=== DECK FLASHCARDS: "${deck.name}" ===\n`;
          contextText += deck.flashcards
            .map((f) => `Q: ${f.question} | A: ${f.answer} | Topic: ${f.topic}`)
            .join('\n');
        }
      }
    }

    if (!contextText.trim() || contextText.length < 80) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Could not extract sufficient study content from the selected sources. Please upload a document or choose a study deck with content.',
        },
        { status: 400 }
      );
    }

    // 2. Configure AI Model
    const aiConfig = getAIClientAndModel();
    if (!aiConfig) {
      return NextResponse.json(
        { success: false, error: 'AI model configuration missing. Please check GEMINI_API_KEY.' },
        { status: 500 }
      );
    }

    const { client, model } = aiConfig;
    const examId = uuidv4();

    // 3. Compose AI Prompt for Question Generation
    const qTypesFormatted = questionTypes.join(', ');
    const systemPrompt = `You are Notionwell's Principal Examination Controller & Academic Assessment Engine.
Your task is to synthesize an authentic, rigorous, high-yield examination strictly grounded in the provided Study Material.

EXAMINATION SPECIFICATIONS:
- Number of Questions to generate: ${totalQuestions}
- Difficulty Level: ${difficulty}
- Permitted Question Types: ${qTypesFormatted}
- Exam Mode: ${mode}
${selectedTopics.length > 0 ? `- Target Topics: ${selectedTopics.join(', ')}` : ''}

PEDAGOGICAL & GROUNDING RULES:
1. Every question MUST be based on verified facts, formulas, or concepts in the Study Material.
2. DO NOT ask superficial or trivial trivia. Focus on deep conceptual understanding, causal relationships, comparisons, and analytical applications.
3. For Multiple Choice Questions ('mcq'):
   - Exactly 4 options labeled: "A) ...", "B) ...", "C) ...", "D) ...".
   - Only ONE unambiguously correct answer.
   - The 3 distractors MUST be plausible academic misconceptions, not ridiculous or obviously fake answers.
4. For True/False Questions ('true_false'):
   - Options MUST be exactly ["True", "False"].
   - Include a concise, rigorous explanation justifying why the statement is true or false.
5. For Short Answer Questions ('short_answer'):
   - Provide a concise model answer (1-3 sentences).
   - Provide 'expectedConcepts': an array of 2-4 critical phrases or technical keywords required for full credit.
6. Provide exact source quotes and section titles in 'sourceQuote' and 'sourceReference'.
7. Output pure JSON matching the schema below. No markdown backticks, no trailing commentary.

REQUIRED JSON FORMAT:
[
  {
    "questionType": "mcq" | "true_false" | "short_answer",
    "question": "Clear, precise academic question text?",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."], // required for mcq and true_false
    "correctAnswer": "A) ...", // exact string of the correct option
    "expectedConcepts": ["keyword 1", "keyword 2"], // required for short_answer
    "explanation": "Detailed explanation explaining why this answer is correct and why other choices are wrong.",
    "topic": "Academic Topic / Section Name",
    "difficulty": "easy" | "medium" | "hard",
    "sourceQuote": "Verbatim excerpt from the study material supporting the answer",
    "sourceReference": "Document Title or Section"
  }
]`;

    const userPrompt = `Generate exactly ${totalQuestions} balanced examination questions from this Study Material:

=== STUDY MATERIAL ===
${contextText.slice(0, 18000)}
=== END OF STUDY MATERIAL ===`;

    let completion: any = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.25, // Lower temperature for high factual rigor and valid JSON output
          max_tokens: 3500,
        });
        if (completion?.choices?.[0]?.message?.content) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[API /exam/generate] Gemini call attempt ${attempt + 1} failed:`, err?.status || err?.message);
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        }
      }
    }

    if (!completion?.choices?.[0]?.message?.content) {
      throw lastError || new Error('Failed to generate examination questions from AI model.');
    }

    const rawResponse = completion.choices[0]?.message?.content || '[]';
    const cleanJson = rawResponse
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let rawQuestions: any[] = [];
    try {
      rawQuestions = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('[API /exam/generate] JSON parse error:', parseErr, cleanJson.slice(0, 300));
      return NextResponse.json(
        { success: false, error: 'AI generated a malformed response. Please try generating again.' },
        { status: 500 }
      );
    }

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate questions from the selected materials.' },
        { status: 500 }
      );
    }

    // 4. Validate and construct finalized questions
    const validatedQuestions: ExamQuestion[] = [];

    rawQuestions.forEach((q, idx) => {
      const qType: QuestionType = ['mcq', 'true_false', 'short_answer'].includes(q.questionType)
        ? q.questionType
        : 'mcq';

      let opts = q.options;
      if (qType === 'true_false') {
        opts = ['True', 'False'];
      } else if (qType === 'mcq') {
        if (!Array.isArray(opts) || opts.length < 2) {
          return; // Skip malformed
        }
      }

      validatedQuestions.push({
        id: uuidv4(),
        examId,
        questionIndex: idx,
        questionType: qType,
        question: q.question || 'Untitled Question',
        options: opts,
        correctAnswer: q.correctAnswer || (opts ? opts[0] : 'Answer'),
        expectedConcepts: Array.isArray(q.expectedConcepts) ? q.expectedConcepts : undefined,
        explanation: q.explanation || 'See study notes for full context.',
        topic: q.topic || 'General',
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
        sourceQuote: q.sourceQuote || undefined,
        sourceReference: q.sourceReference || sourceReferences[0] || 'Selected Study Notes',
      });
    });

    if (validatedQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No questions passed validation. Please try again.' },
        { status: 500 }
      );
    }

    // Shuffle question order if randomized option enabled
    let finalQuestions = validatedQuestions;
    if (randomizeOrder) {
      finalQuestions = [...validatedQuestions].sort(() => Math.random() - 0.5);
      finalQuestions.forEach((q, idx) => {
        q.questionIndex = idx;
      });
    }

    // 5. Construct and Save Final Exam Config
    const examConfig: ExamConfig = {
      id: examId,
      userId,
      title: title.trim() || `${sourceReferences[0] || 'Study'} Mock Exam`,
      description: description || `AI Simulated Assessment across ${sourceReferences.join(', ')}`,
      subjectId: subjectId || null,
      subjectName: subjectName || undefined,
      deckId: deckId || null,
      deckName: deckName || undefined,
      mode,
      difficulty,
      timeLimitMinutes: mode === 'practice' && timeLimitMinutes === 0 ? 0 : timeLimitMinutes,
      totalQuestions: finalQuestions.length,
      negativeMarking,
      negativeMarkValue: Math.abs(negativeMarkValue) || 0.25,
      questionTypes,
      selectedSourceIds,
      selectedTopics,
      randomizeOrder,
      createdAt: new Date().toISOString(),
      questions: finalQuestions,
    };

    await saveExamConfig(examConfig);

    return NextResponse.json({
      success: true,
      exam: examConfig,
      message: `Successfully synthesized ${finalQuestions.length} exam questions.`,
    });
  } catch (error: any) {
    console.error('[API /exam/generate error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal error generating exam.' },
      { status: 500 }
    );
  }
}
