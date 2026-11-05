import { NextRequest, NextResponse } from 'next/server';
import { searchRelevantChunks } from '@/lib/rag/vectorStore';
import { getAIClientAndModel } from '@/lib/app';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import { checkRateLimit, withAiRetry, MAX_CHAT_PROMPT_CHARS } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const rateCheck = checkRateLimit(session.id, 'rag_chat');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Hourly AI query limit reached (${rateCheck.limit}/hr). Please wait ${rateCheck.resetMinutes}m.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      message,
      conversationId = 'default-chat',
      deckId,
      documentIds,
      history = [],
    } = body;
    const userId = session.id;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'A message query is required.' },
        { status: 400 }
      );
    }

    if (message.length > MAX_CHAT_PROMPT_CHARS) {
      return NextResponse.json(
        { success: false, error: `Message exceeds maximum character length (${MAX_CHAT_PROMPT_CHARS} characters).` },
        { status: 400 }
      );
    }

    // 1. Retrieve relevant chunks from vector store using hybrid similarity
    const retrievedChunks = await searchRelevantChunks({
      userId,
      query: message,
      deckId,
      documentIds,
      topK: 5,
      minSimilarity: 0.35,
    });

    // 2. Strict Grounding Guard: If no chunks pass similarity threshold, refuse answer
    if (!retrievedChunks || retrievedChunks.length === 0) {
      return NextResponse.json({
        success: true,
        answer:
          "I could not find information regarding that in your selected study materials. Please verify that the relevant document is uploaded and selected in the Sources panel.",
        citations: [],
        conversationId,
      });
    }

    // 3. Format citations for response
    const citations = retrievedChunks.map((item, idx) => ({
      index: idx + 1,
      documentName: item.documentName,
      heading: item.chunk.heading || 'General Section',
      excerpt: item.chunk.content.slice(0, 240) + (item.chunk.content.length > 240 ? '...' : ''),
      similarity: Math.round(item.combinedScore * 100),
    }));

    // 4. Construct grounded prompt with retrieved chunks
    const contextBlocks = retrievedChunks
      .map(
        (item, idx) =>
          `[${idx + 1}] Source: "${item.documentName}" | Section: "${item.chunk.heading || 'Overview'}"\n${item.chunk.content}`
      )
      .join('\n\n---\n\n');

    const systemPrompt = `You are Notionwell AI Study Assistant, an expert academic tutor and retrieval-augmented study companion.
Your mission is to provide accurate, pedagogical, and well-structured answers derived STRICTLY from the provided Source Excerpts.

MANDATORY GROUNDING RULES:
1. Base all facts, dates, explanations, and equations STRICTLY on the Source Excerpts below.
2. DO NOT hallucinate facts, invent external claims, or extrapolate beyond what is stated in the excerpts.
3. If an answer cannot be deduced from the excerpts, state clearly: "The provided study materials do not contain sufficient information to answer this question."
4. When stating a fact or concept that originates from an excerpt, cite it immediately using bracketed notation like [1], [2], etc., matching the excerpt number.
5. Format your response cleanly using GitHub-flavored Markdown:
   - Use bold for key terms.
   - Use bullet points for steps or breakdowns.
   - Use markdown code blocks for code or mathematical formulas.
6. Maintain an encouraging, clear, and academic tone suitable for college and university students.

=== RETRIEVED SOURCE EXCERPTS ===
${contextBlocks}
=== END OF SOURCE EXCERPTS ===`;

    const aiConfig = getAIClientAndModel();

    if (!aiConfig) {
      // Fallback deterministic grounded response if AI key is absent
      const topChunk = retrievedChunks[0];
      return NextResponse.json({
        success: true,
        answer: `According to **${topChunk.documentName}** [1]:\n\n> "${topChunk.chunk.content.slice(0, 300)}..."\n\n*(Note: Configure \`GEMINI_API_KEY\` in .env.local to enable real-time generative tutoring.)*`,
        citations,
        conversationId,
      });
    }

    const { client, model } = aiConfig;

    // Build chat message sequence
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Include recent history (up to last 6 messages) for multi-turn context
    const recentHistory = (history || []).slice(-6);
    for (const h of recentHistory) {
      if (h.role === 'user' || h.role === 'assistant') {
        messages.push({ role: h.role, content: h.content });
      }
    }

    // Add current query
    messages.push({ role: 'user', content: message });

    const completion = await withAiRetry(() =>
      client.chat.completions.create({
        model,
        messages,
        temperature: 0.2, // Low temperature for high factual accuracy and strict grounding
        max_tokens: 1500,
      })
    );

    const answer = completion.choices[0]?.message?.content || 'No response generated.';

    // 5. Asynchronously persist message in Supabase if session exists
    try {
      const admin = createAdminClient();
      if (userId && userId !== 'default-user') {
        await admin.from('study_chat_messages').insert([
          {
            session_id: conversationId,
            user_id: userId,
            role: 'user',
            content: message,
          },
          {
            session_id: conversationId,
            user_id: userId,
            role: 'assistant',
            content: answer,
            citations: JSON.stringify(citations),
          },
        ]);
      }
    } catch (e) {
      // Non-blocking background log
    }

    return NextResponse.json({
      success: true,
      answer,
      citations,
      conversationId,
    });
  } catch (error: any) {
    console.error('[API /assistant/chat error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An error occurred while answering your question.',
      },
      { status: 500 }
    );
  }
}
