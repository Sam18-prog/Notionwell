import { NextRequest, NextResponse } from 'next/server';
import { buildComprehensiveAnalytics } from '@/lib/analytics';
import { getDecks, getSubjects } from '@/lib/app';
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

    // Security Guard: Prevent accessing another user's analytics
    if (requestedUserId && requestedUserId !== session.id && !session.isDemo) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot access another user\'s analytics.' },
        { status: 403 }
      );
    }

    const userId = session.id;
    const daysParam = searchParams.get('days') || '30';
    const daysWindow = daysParam === 'all' ? 3650 : parseInt(daysParam, 10) || 30;

    const decks = getDecks();
    const subjects = getSubjects();

    const report = buildComprehensiveAnalytics(userId, decks, subjects, daysWindow);

    return NextResponse.json({
      success: true,
      report,
      data: report,
      userId,
    });
  } catch (error: any) {
    console.error('[API /analytics error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate analytics report.' },
      { status: 500 }
    );
  }
}
