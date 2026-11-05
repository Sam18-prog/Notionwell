import { NextRequest, NextResponse } from 'next/server';
import {
  getUserExamAttempts,
  getExamAttemptById,
  calculateExamDashboardStats,
  getAllExams,
} from '@/lib/exam';
import { getAuthenticatedUserSession } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const requestedUserId = req.nextUrl.searchParams.get('userId');
    if (requestedUserId && requestedUserId !== session.id && !session.isDemo) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot access exam history for another user.' },
        { status: 403 }
      );
    }

    const userId = session.id;
    const attemptId = req.nextUrl.searchParams.get('attemptId');

    if (attemptId) {
      const attempt = getExamAttemptById(attemptId);
      if (!attempt || (attempt.userId !== userId && !session.isDemo)) {
        return NextResponse.json({ success: false, error: 'Attempt not found or access denied.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, attempt });
    }

    const attempts = getUserExamAttempts(userId);
    const stats = calculateExamDashboardStats(userId);
    const exams = getAllExams(userId);

    return NextResponse.json({
      success: true,
      attempts,
      stats,
      exams,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
