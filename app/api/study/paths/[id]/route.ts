import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import {
  getStudyPathDetails,
  toggleStudyPathTask,
  rescheduleStudyPath,
} from '@/lib/intelligence';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const details = getStudyPathDetails(params.id, session.id);
    if (!details) {
      return NextResponse.json({ success: false, error: 'Study path not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...details });
  } catch (error: any) {
    console.error('[API /api/study/paths/[id] GET error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve study path details.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'toggle_task') {
      const { taskId } = body;
      if (!taskId) {
        return NextResponse.json({ success: false, error: 'taskId is required.' }, { status: 400 });
      }

      const res = toggleStudyPathTask(taskId, session.id);
      if (!res.success) {
        return NextResponse.json({ success: false, error: 'Task not found or unauthorized.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, task: res.task });
    }

    if (action === 'reschedule') {
      const { newTargetDate, dailyMinutes } = body;
      if (!newTargetDate) {
        return NextResponse.json({ success: false, error: 'newTargetDate is required.' }, { status: 400 });
      }

      const res = rescheduleStudyPath(params.id, session.id, newTargetDate, dailyMinutes);
      if (!res.success) {
        return NextResponse.json({ success: false, error: 'Path not found or unauthorized.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        path: res.path,
        rescheduledCount: res.rescheduledCount,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action provided.' }, { status: 400 });
  } catch (error: any) {
    console.error('[API /api/study/paths/[id] PATCH error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update study path.' },
      { status: 500 }
    );
  }
}
