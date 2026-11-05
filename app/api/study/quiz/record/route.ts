import { NextRequest, NextResponse } from 'next/server';
import { recordQuizAttempt } from '@/lib/analytics';
import { getAuthenticatedUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

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
      deckId = 'study-quiz',
      deckName = 'Study Quiz',
      score,
      correctAnswers,
      totalItems,
      totalQuestions,
      durationSeconds = 0,
      timeSpentSeconds = 0,
      topicScores,
      topicBreakdown: initialBreakdown,
    } = body;

    const rawTotal = typeof totalItems === 'number' ? totalItems : (typeof totalQuestions === 'number' ? totalQuestions : 0);
    const rawScore = typeof score === 'number' ? score : (typeof correctAnswers === 'number' ? correctAnswers : 0);

    if (rawTotal <= 0) {
      return NextResponse.json(
        { success: false, error: 'totalItems must be greater than 0.' },
        { status: 400 }
      );
    }

    // Security validation: score cannot exceed total items or be negative
    const finalTotal = Math.max(1, rawTotal);
    const finalScore = Math.max(0, Math.min(finalTotal, rawScore));
    const finalDuration = Math.max(0, durationSeconds || timeSpentSeconds || 0);

    let finalBreakdown = Array.isArray(initialBreakdown) ? initialBreakdown : [];
    if (topicScores && typeof topicScores === 'object' && finalBreakdown.length === 0) {
      finalBreakdown = Object.entries(topicScores).map(([topic, stats]: [string, any]) => ({
        topic,
        correct: Math.min(stats.total || 0, Math.max(0, stats.correct || 0)),
        total: Math.max(0, stats.total || 0),
      }));
    }

    const userId = session.id;

    const attempt = await recordQuizAttempt(
      userId,
      deckId,
      deckName,
      finalScore,
      finalTotal,
      finalDuration,
      finalBreakdown
    );

    const xpEarned = attempt.accuracyPercentage >= 80 ? 40 : 25;

    return NextResponse.json({
      success: true,
      userId,
      attempt: {
        ...attempt,
        scorePercentage: attempt.accuracyPercentage,
      },
      xpEarned,
      message: 'Quiz attempt recorded and XP awarded.',
    });
  } catch (error: any) {
    console.error('[API /study/quiz/record error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to record quiz attempt.' },
      { status: 500 }
    );
  }
}
