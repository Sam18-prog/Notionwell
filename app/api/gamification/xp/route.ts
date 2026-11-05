import { NextRequest, NextResponse } from 'next/server';
import {
  getUserTotalXP,
  calculateLevelFromXP,
  getUserXPTransactions,
} from '@/lib/analytics';
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

    // Security Guard: Prevent accessing another user's XP profile
    if (requestedUserId && requestedUserId !== session.id && !session.isDemo) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot access another user\'s XP balance.' },
        { status: 403 }
      );
    }

    const userId = session.id;
    const totalXP = await getUserTotalXP(userId);
    const levelInfo = calculateLevelFromXP(totalXP);
    const transactions = await getUserXPTransactions(userId);

    return NextResponse.json({
      success: true,
      userId,
      totalXP,
      levelInfo,
      transactions: transactions.slice(0, 50),
    });
  } catch (error: any) {
    console.error('[API /gamification/xp error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch XP info.' },
      { status: 500 }
    );
  }
}
