import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import { getUnifiedLearningProfile } from '@/lib/intelligence';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const profile = getUnifiedLearningProfile(session.id);
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('[API /api/study/profile GET error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve unified learning profile.' },
      { status: 500 }
    );
  }
}
