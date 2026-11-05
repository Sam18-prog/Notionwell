import { NextRequest, NextResponse } from 'next/server';
import { getAIClientAndModel, getDecks, getSubjects } from '@/lib/app';
import {
  calculateStreaks,
  getUserQuizAttempts,
} from '@/lib/analytics';
import { calculateReviewWorkload } from '@/lib/review-workload';
import { getUserExamAttempts } from '@/lib/exam';

export interface AIStudyRecommendation {
  id: string;
  type: 'review_overdue' | 'revise_weak_topic' | 'attempt_mock_exam' | 'practice_quiz' | 'maintain_streak';
  title: string;
  rationale: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionUrl: string;
  targetRoute: string;
  topic?: string;
  deckName?: string;
}

import { getAuthenticatedUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId');

    // Security Guard: Prevent accessing another user's recommendations
    if (requestedUserId && requestedUserId !== session.id && !session.isDemo) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot access another user\'s recommendations.' },
        { status: 403 }
      );
    }

    const userId = session.id;

    const decks = getDecks();
    const subjects = getSubjects();
    const workload = calculateReviewWorkload(decks, subjects);
    const streakInfo = await calculateStreaks(userId);
    const quizAttempts = await getUserQuizAttempts(userId);
    const examAttempts = await getUserExamAttempts(userId);

    // Collect verified academic performance signals
    const weakTopics: Array<{ topic: string; missCount: number; source: string }> = [];

    // From flashcards
    const topicMisses: Record<string, number> = {};
    decks.forEach((d) => {
      d.flashcards.forEach((c) => {
        if ((c.timesIncorrect || 0) > 0 && c.topic) {
          topicMisses[c.topic] = (topicMisses[c.topic] || 0) + (c.timesIncorrect || 0);
        }
      });
    });

    Object.entries(topicMisses)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .forEach(([topic, count]) => {
        weakTopics.push({ topic, missCount: count, source: 'Flashcard reviews' });
      });

    // From exams
    examAttempts.forEach((ea) => {
      if (ea.topicBreakdown) {
        ea.topicBreakdown
          .filter((t) => t.percentage < 60)
          .forEach((t) => {
            if (!weakTopics.some((w) => w.topic.toLowerCase() === t.topic.toLowerCase())) {
              weakTopics.push({ topic: t.topic, missCount: t.total - t.correct, source: 'Exam simulation' });
            }
          });
      }
    });

    // Fallback baseline recommendations if AI fails or data is fresh
    const baselineRecs: AIStudyRecommendation[] = [];

    if (workload.overdueCount > 0) {
      const rat = `You have ${workload.overdueCount} cards that have passed their SM-2 scheduled review date. Reviewing today prevents memory decay.`;
      baselineRecs.push({
        id: 'rec-overdue',
        type: 'review_overdue',
        title: `Clear ${workload.overdueCount} Overdue Flashcard${workload.overdueCount === 1 ? '' : 's'}`,
        rationale: rat,
        reason: rat,
        priority: 'high',
        actionLabel: 'Review Due Cards',
        actionUrl: '/review',
        targetRoute: '/review',
      });
    }

    if (weakTopics.length > 0) {
      const rat = `Identified ${weakTopics[0].missCount} misses on "${weakTopics[0].topic}" from your verified study sessions and assessments.`;
      baselineRecs.push({
        id: 'rec-weak-topic',
        type: 'revise_weak_topic',
        title: `Target Weak Concept: ${weakTopics[0].topic}`,
        rationale: rat,
        reason: rat,
        priority: 'high',
        actionLabel: 'Ask AI Study Assistant',
        actionUrl: `/assistant`,
        targetRoute: '/assistant',
        topic: weakTopics[0].topic,
      });
    }

    if (examAttempts.length === 0 && decks.length > 0) {
      const rat = 'Take a timed assessment to measure retention across all your uploaded study materials with automated diagnostics.';
      baselineRecs.push({
        id: 'rec-exam',
        type: 'attempt_mock_exam',
        title: 'Benchmark Your Knowledge with a Mock Exam',
        rationale: rat,
        reason: rat,
        priority: 'medium',
        actionLabel: 'Launch Exam Simulator',
        actionUrl: '/exam',
        targetRoute: '/exam',
      });
    } else if (decks.length > 0) {
      const rat = 'Active recall via practice testing yields higher long-term retention than passive reading.';
      baselineRecs.push({
        id: 'rec-practice',
        type: 'practice_quiz',
        title: `Practice Quiz on "${decks[0].name}"`,
        rationale: rat,
        reason: rat,
        priority: 'medium',
        actionLabel: 'Start Practice Quiz',
        actionUrl: `/deck/${decks[0].id}?mode=quiz`,
        targetRoute: `/deck/${decks[0].id}?mode=quiz`,
        deckName: decks[0].name,
      });
    }

    if (!streakInfo.todayCompleted) {
      const rat = 'Complete any 5-minute study activity today to lock in your daily study habit and earn streak XP bonus.';
      baselineRecs.push({
        id: 'rec-streak',
        type: 'maintain_streak',
        title: `Extend Your ${streakInfo.currentStreak}-Day Study Streak`,
        rationale: rat,
        reason: rat,
        priority: 'medium',
        actionLabel: 'Start Study Session',
        actionUrl: decks[0] ? `/deck/${decks[0].id}?mode=study` : '/create',
        targetRoute: decks[0] ? `/deck/${decks[0].id}?mode=study` : '/create',
      });
    }

    // Always ensure at least 2 strong baseline recommendations
    if (baselineRecs.length < 2) {
      const ratExam = 'Benchmark your mastery of study concepts with realistic timed test conditions and diagnostic grading.';
      baselineRecs.push({
        id: 'rec-default-exam',
        type: 'attempt_mock_exam',
        title: 'Simulate an AI Exam',
        rationale: ratExam,
        reason: ratExam,
        priority: 'medium',
        actionLabel: 'Go to Exam Simulator',
        actionUrl: '/exam',
        targetRoute: '/exam',
      });

      const ratRev = 'Spaced repetition reinforces neural pathways right before memory decay occurs.';
      baselineRecs.push({
        id: 'rec-default-review',
        type: 'review_overdue',
        title: 'Check Your Spaced Repetition Workload',
        rationale: ratRev,
        reason: ratRev,
        priority: 'medium',
        actionLabel: 'Open Review Hub',
        actionUrl: '/review',
        targetRoute: '/review',
      });
    }

    // Try Gemini AI enhancement if available
    try {
      const aiConfig = getAIClientAndModel();
      if (aiConfig && decks.length > 0) {
        const promptContext = `
Student Academic Profile (Strict Facts):
- Decks Available: ${decks.map((d) => d.name).join(', ')}
- Overdue Flashcards Count: ${workload.overdueCount}
- Due Today Count: ${workload.dueTodayCount}
- Verified Weak Topics: ${weakTopics.map((w) => `"${w.topic}" (${w.missCount} misses)`).join(', ') || 'None identified yet'}
- Recent Quiz Attempts: ${quizAttempts.length}
- Recent Exam Attempts: ${examAttempts.length} (Latest average: ${examAttempts[0]?.percentage || 'N/A'}%)
- Current Study Streak: ${streakInfo.currentStreak} days
- Today Completed: ${streakInfo.todayCompleted ? 'Yes' : 'No'}
`;

        const systemPrompt = `You are Notionwell's Chief Academic Advisor.
Generate 3 to 4 personalized, highly actionable study recommendations grounded ONLY in the student's factual data.
Every recommendation must explain the pedagogical rationale and link directly to an existing action.

Allowed types: "review_overdue", "revise_weak_topic", "attempt_mock_exam", "practice_quiz", "maintain_streak".
Allowed priorities: "high", "medium", "low".
Allowed action URLs:
- "/review" (for overdue/due cards)
- "/assistant" (to discuss weak topics with AI tutor)
- "/exam" (for mock exam simulation)
- "/deck/${decks[0]?.id || ''}?mode=quiz" (for quiz)
- "/deck/${decks[0]?.id || ''}?mode=study" (for flashcards)

Output valid JSON matching:
[
  {
    "type": "review_overdue" | "revise_weak_topic" | "attempt_mock_exam" | "practice_quiz" | "maintain_streak",
    "title": "Short directive title",
    "rationale": "Clear scientific or pedagogical reason grounded in their specific study stats",
    "priority": "high" | "medium" | "low",
    "actionLabel": "Button text",
    "actionUrl": "/review" | "/assistant" | "/exam" | ...
  }
]`;

        const completion = await aiConfig.client.chat.completions.create({
          model: aiConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this student learning data and synthesize recommendations:\n${promptContext}` },
          ],
          temperature: 0.2,
          max_tokens: 1200,
        });

        const raw = completion.choices[0]?.message?.content || '[]';
        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const aiRecs: AIStudyRecommendation[] = parsed.map((item, idx) => ({
            id: `ai-rec-${idx + 1}`,
            type: item.type || 'revise_weak_topic',
            title: item.title,
            rationale: item.rationale || item.reason || '',
            reason: item.rationale || item.reason || '',
            priority: item.priority || 'medium',
            actionLabel: item.actionLabel || 'Get Started',
            actionUrl: item.actionUrl || item.targetRoute || '/review',
            targetRoute: item.actionUrl || item.targetRoute || '/review',
            topic: item.topic,
          }));

          return NextResponse.json({
            success: true,
            recommendations: aiRecs,
            source: 'gemini_ai',
          });
        }
      }
    } catch (aiErr) {
      // Non-blocking fallback to verified baseline recommendations
    }

    return NextResponse.json({
      success: true,
      recommendations: baselineRecs.slice(0, 4),
      source: 'baseline_analytics',
    });
  } catch (error: any) {
    console.error('[API /study/recommendations error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate study recommendations.' },
      { status: 500 }
    );
  }
}
