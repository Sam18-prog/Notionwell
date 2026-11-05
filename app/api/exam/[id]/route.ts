import { NextRequest, NextResponse } from 'next/server';
import { getExamConfigById, getSanitizedExamForTaking } from '@/lib/exam';
import { getAuthenticatedUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const examId = params.id;
    const isTaking = req.nextUrl.searchParams.get('mode') === 'taking';

    if (!examId) {
      return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });
    }

    if (isTaking) {
      // Return sanitized exam without answer keys
      const sanitized = await getSanitizedExamForTaking(examId);
      if (!sanitized) {
        return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, exam: sanitized });
    }

    const fullExam = await getExamConfigById(examId);
    if (!fullExam) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    }

    // Verify ownership before returning unredacted exam with answers
    if (fullExam.userId !== session.id && !session.isDemo && fullExam.userId !== 'shared') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to view full answer keys for this exam.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, exam: fullExam });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
