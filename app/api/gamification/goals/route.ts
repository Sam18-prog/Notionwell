import { NextRequest, NextResponse } from 'next/server';
import {
  getLearningGoals,
  saveLearningGoals,
  calculateGoalProgress,
  LearningGoals,
} from '@/lib/analytics';
import { getDecks } from '@/lib/app';
import { getUserExamAttempts } from '@/lib/exam';
import { getUserQuizAttempts } from '@/lib/analytics';
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

    // Security Guard: Prevent accessing another user's goals
    if (requestedUserId && requestedUserId !== session.id && !session.isDemo) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot access another user\'s learning goals.' },
        { status: 403 }
      );
    }

    const userId = session.id;
    const goals = await getLearningGoals(userId);
    const decks = getDecks();
    const quizAttempts = await getUserQuizAttempts(userId);
    const examAttempts = await getUserExamAttempts(userId);

    // Calculate today's activity
    const todayStr = new Date().toISOString().split('T')[0];
    const todayQuizzes = quizAttempts.filter((q) => q.completedAt && q.completedAt.startsWith(todayStr));
    const todayExams = examAttempts.filter((e) => e.submittedAt && e.submittedAt.startsWith(todayStr));

    let todayStudySeconds = 0;
    todayQuizzes.forEach((q) => (todayStudySeconds += q.durationSeconds || 0));
    todayExams.forEach((e) => (todayStudySeconds += e.timeSpentSeconds || 0));

    // Calculate this week's activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString();

    const weekQuizzes = quizAttempts.filter((q) => q.completedAt && q.completedAt >= sevenDaysStr);
    const weekExams = examAttempts.filter((e) => e.submittedAt && e.submittedAt >= sevenDaysStr);

    let weekStudySeconds = 0;
    weekQuizzes.forEach((q) => (weekStudySeconds += q.durationSeconds || 0));
    weekExams.forEach((e) => (weekStudySeconds += e.timeSpentSeconds || 0));

    let todayCardsReviewed = 0;
    decks.forEach((d) => {
      d.flashcards.forEach((c) => {
        if (c.lastReviewedDate && c.lastReviewedDate.startsWith(todayStr)) {
          todayCardsReviewed += 1;
        }
      });
    });

    const progress = calculateGoalProgress(goals, {
      todayStudyMinutes: Math.round(todayStudySeconds / 60),
      todayCardsReviewed,
      todayQuestionsPracticed: todayQuizzes.reduce((s, q) => s + q.totalItems, 0),
      thisWeekStudyHours: Math.round((weekStudySeconds / 3600) * 10) / 10,
      thisWeekDecksCompleted: Math.min(decks.length, weekQuizzes.length),
      thisWeekQuizzesAttempted: weekQuizzes.length,
      thisWeekExamsCompleted: weekExams.length,
    });

    return NextResponse.json({
      success: true,
      userId,
      goals,
      progress,
    });
  } catch (error: any) {
    console.error('[API /gamification/goals GET error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch learning goals.' },
      { status: 500 }
    );
  }
}

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
      dailyStudyMinutes = 20,
      dailyCardsReviewed = 15,
      dailyQuestionsPracticed = 5,
      weeklyStudyHours = 2.5,
      weeklyDecksCompleted = 2,
      weeklyQuizzesAttempted = 3,
      weeklyExamsCompleted = 1,
    } = body;

    const userId = session.id;

    const updatedGoals: LearningGoals = {
      userId,
      dailyStudyMinutes: Math.max(5, parseInt(dailyStudyMinutes, 10) || 20),
      dailyCardsReviewed: Math.max(1, parseInt(dailyCardsReviewed, 10) || 15),
      dailyQuestionsPracticed: Math.max(1, parseInt(dailyQuestionsPracticed, 10) || 5),
      weeklyStudyHours: Math.max(0.5, parseFloat(weeklyStudyHours) || 2.5),
      weeklyDecksCompleted: Math.max(1, parseInt(weeklyDecksCompleted, 10) || 2),
      weeklyQuizzesAttempted: Math.max(1, parseInt(weeklyQuizzesAttempted, 10) || 3),
      weeklyExamsCompleted: Math.max(0, parseInt(weeklyExamsCompleted, 10) || 1),
    };

    await saveLearningGoals(updatedGoals);

    return NextResponse.json({
      success: true,
      userId,
      goals: updatedGoals,
      message: 'Learning goals updated successfully.',
    });
  } catch (error: any) {
    console.error('[API /gamification/goals POST error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save learning goals.' },
      { status: 500 }
    );
  }
}
