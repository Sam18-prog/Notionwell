import { NextRequest, NextResponse } from 'next/server';
import { awardXP, XPSource } from '@/lib/analytics';
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
      source,
      activityType,
      amount = 10,
      description = 'Study activity completed',
      activityId,
    } = body;

    if (!activityId || typeof activityId !== 'string' || !activityId.trim()) {
      return NextResponse.json(
        { success: false, error: 'A valid activityId idempotency key is required to award XP.' },
        { status: 400 }
      );
    }

    const finalSource = (source || activityType || 'flashcard_review') as XPSource;
    const requestedAmount = parseInt(amount, 10) || 10;

    // Server-side XP amount caps per activity type (prevents arbitrary client inflation)
    const MAX_XP_LIMITS: Record<XPSource, number> = {
      flashcard_review: 15,
      quiz_completed: 50,
      exam_completed: 75,
      daily_goal: 25,
      streak_milestone: 50,
      topic_mastered: 25,
      achievement_unlocked: 500,
    };

    const maxAllowed = MAX_XP_LIMITS[finalSource] || 25;
    const validatedAmount = Math.max(1, Math.min(maxAllowed, requestedAmount));

    const userId = session.id;
    const result = awardXP(userId, finalSource, validatedAmount, description, activityId.trim());

    return NextResponse.json({
      success: true,
      userId,
      awarded: result.awarded,
      amountAwarded: result.awarded ? validatedAmount : 0,
      newTotalXP: result.levelInfo.totalXP,
      transaction: result.transaction,
      levelInfo: result.levelInfo,
      leveledUp: result.leveledUp,
      previousLevel: result.previousLevel,
    });
  } catch (error: any) {
    console.error('[API /gamification/award-xp error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to award XP.' },
      { status: 500 }
    );
  }
}
