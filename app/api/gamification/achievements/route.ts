import { NextRequest, NextResponse } from 'next/server';
import { getUserAchievements, calculateStreaks, getUserQuizAttempts } from '@/lib/analytics';
import { getDecks } from '@/lib/app';
import { getUserExamAttempts } from '@/lib/exam';
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

    // Security Guard: Prevent accessing another user's badges
    if (requestedUserId && requestedUserId !== session.id && !session.isDemo) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot access another user\'s achievements.' },
        { status: 403 }
      );
    }

    const userId = session.id;
    const decks = getDecks();
    const streakInfo = calculateStreaks(userId);
    const quizAttempts = getUserQuizAttempts(userId);
    const examAttempts = getUserExamAttempts(userId);

    let cardsReviewed = 0;
    let masteredCardsCount = 0;
    decks.forEach((d) => {
      d.flashcards.forEach((c) => {
        cardsReviewed += c.timesReviewed || 0;
        if (c.masteryLevel === 'mastered') masteredCardsCount += 1;
      });
    });

    const hasPerfectQuiz = quizAttempts.some((q) => q.accuracyPercentage === 100);
    const hasExamDistinction = examAttempts.some((e) => e.percentage >= 90);
    const hasSubjectCompleted = decks.some(
      (d) => d.flashcards.length > 0 && d.flashcards.every((c) => c.masteryLevel === 'mastered')
    );

    const achievements = getUserAchievements(userId, {
      totalSessions: streakInfo.activeDates.length,
      streakDays: streakInfo.currentStreak,
      cardsReviewed,
      quizzesCompleted: quizAttempts.length,
      hasPerfectQuiz,
      examsCompleted: examAttempts.length,
      hasExamDistinction,
      decksCount: decks.length,
      masteredCardsCount,
      hasSubjectCompleted,
    });

    const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

    return NextResponse.json({
      success: true,
      userId,
      achievements,
      unlockedCount,
      totalCount: achievements.length,
    });
  } catch (error: any) {
    console.error('[API /gamification/achievements error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch achievements.' },
      { status: 500 }
    );
  }
}
