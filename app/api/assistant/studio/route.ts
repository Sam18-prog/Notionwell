import { NextRequest, NextResponse } from 'next/server';
import { getStoredDocuments } from '@/lib/rag/vectorStore';
import { getAIClientAndModel } from '@/lib/app';
import { getAuthenticatedUserSession } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      type = 'study_guide', // 'study_guide' | 'briefing_doc' | 'faq' | 'timeline' | 'mcqs'
      documentIds = [],
      deckId,
    } = body;
    const userId = session.id;

    // 1. Gather text from the selected documents belonging to this user
    const docs = await getStoredDocuments(userId, deckId);
    const selectedDocs = documentIds.length > 0
      ? docs.filter((d) => documentIds.includes(d.id))
      : docs;

    if (selectedDocs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please upload or select at least one document in the Sources panel first.',
        },
        { status: 400 }
      );
    }

    const aiConfig = getAIClientAndModel();
    if (!aiConfig) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service not configured. Please check your GEMINI_API_KEY.',
        },
        { status: 500 }
      );
    }

    const { client, model } = aiConfig;

    // Build specialized prompt depending on studio artifact type
    let promptInstruction = '';
    switch (type) {
      case 'study_guide':
        promptInstruction = `Generate a comprehensive, beautifully structured Study Guide based on the selected study materials.
Structure:
# Comprehensive Study Guide
## 1. Executive Summary & Core Purpose
(2-3 paragraphs explaining the core discipline and practical importance)
## 2. Key Terminology & Core Definitions
(Bulleted glossary with bold terms and precise definitions)
## 3. Fundamental Theories & Methodologies
(Deep dive into the main topics, equations, or concepts)
## 4. Practical Applications & Real-World Examples
(Concrete instances or scenarios illustrating the principles)
## 5. High-Yield Exam Checklist & Study Tips
(Key questions students must know before taking an assessment)`;
        break;

      case 'briefing_doc':
        promptInstruction = `Generate a concise, high-impact Executive Briefing Document based on the selected materials.
Structure:
# Executive Briefing Document
## High-Level Abstract
## Key Strategic Takeaways (Top 5 bullet points)
## Critical Findings & Essential Data
## Actionable Next Steps / Summary`;
        break;

      case 'faq':
        promptInstruction = `Generate an exhaustive FAQ (Frequently Asked Questions) document containing 6 to 8 of the most critical conceptual questions a student or researcher would ask about these materials.
Format each item as:
### Q: [Specific, insightful question]
**Answer:** [Clear, in-depth explanation with examples and nuances]`;
        break;

      case 'timeline':
        promptInstruction = `Generate a chronological Timeline or Process Flow Diagram based on these study materials.
Structure:
# Chronological & Conceptual Progression
Include numbered stages or time periods:
- **Phase / Milestone 1**: Detail what happens, key discoveries or initial conditions.
- **Phase / Milestone 2**: Development, progression, and intermediate mechanics.
- **Phase / Milestone 3**: Culmination, modern state, or final outcomes.
Provide a summary table comparing each phase.`;
        break;

      case 'mcqs':
        promptInstruction = `Generate 5 challenging multiple-choice practice questions (MCQs) strictly based on the study materials.
For each question:
### Question [N]: [Question text]
- A) [Option A]
- B) [Option B]
- C) [Option C]
- D) [Option D]

**Correct Answer:** [Letter and option text]
**Explanation:** [Detailed rationale explaining why this option is correct and why others are incorrect]
**Source Citation:** [Relevant concept or section title]`;
        break;

      default:
        promptInstruction = 'Generate a structured study summary based on the materials.';
    }

    const sourcesSummary = selectedDocs.map((d) => `Document: "${d.fileName}"`).join(', ');

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an elite academic curriculum designer and textbook author.
You produce rigorous, beautifully formatted, comprehensive study materials using clean Markdown.
Base your content on the user's provided study documents (${sourcesSummary}).
Ensure clean formatting with headings, bullet points, and code/quote blocks where appropriate.`,
        },
        {
          role: 'user',
          content: `${promptInstruction}\n\nSelected Sources: ${sourcesSummary}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2500,
    });

    const content = completion.choices[0]?.message?.content || 'Failed to generate study artifact.';

    return NextResponse.json({
      success: true,
      type,
      title:
        type === 'study_guide'
          ? 'Comprehensive Study Guide'
          : type === 'briefing_doc'
          ? 'Executive Briefing'
          : type === 'faq'
          ? 'Study FAQ & Solutions'
          : type === 'timeline'
          ? 'Conceptual Timeline'
          : 'High-Yield Practice MCQs',
      content,
      sourcesCount: selectedDocs.length,
    });
  } catch (error: any) {
    console.error('[API /assistant/studio error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate studio material.' },
      { status: 500 }
    );
  }
}
