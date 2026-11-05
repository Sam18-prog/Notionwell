import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import {
  getUserAdaptiveProfiles,
  recordAdaptiveAttempt,
} from '@/lib/intelligence';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const profiles = getUserAdaptiveProfiles(session.id);
    return NextResponse.json({ success: true, profiles });
  } catch (error: any) {
    console.error('[API /api/study/adaptive GET error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve adaptive profiles.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { topic, correct, total, sourceType = 'quiz', subjectId = null } = body;

    if (!topic || typeof correct !== 'number' || typeof total !== 'number') {
      return NextResponse.json(
        { success: false, error: 'topic, correct, and total numbers are required.' },
        { status: 400 }
      );
    }

    const profile = recordAdaptiveAttempt(
      session.id,
      topic,
      correct,
      total,
      sourceType,
      subjectId
    );

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('[API /api/study/adaptive POST error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update adaptive profile.' },
      { status: 500 }
    );
  }
}
