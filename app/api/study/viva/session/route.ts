import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import {
  startVivaSession,
  getUserVivaHistory,
} from '@/lib/intelligence';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const history = await getUserVivaHistory(session.id);
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    console.error('[API /api/study/viva/session GET error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve viva history.' },
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
    const {
      topicTitle,
      vivaMode,
      difficulty,
      totalQuestions,
      subjectId,
      deckId,
      documentId,
      sourceType,
      sourceTitle,
    } = body;

    if (!topicTitle || !topicTitle.trim()) {
      return NextResponse.json(
        { success: false, error: 'topicTitle is required.' },
        { status: 400 }
      );
    }

    const result = await startVivaSession({
      userId: session.id,
      topicTitle,
      vivaMode: vivaMode || 'comprehensive',
      difficulty: difficulty || 'intermediate',
      totalQuestions: Number(totalQuestions) || 5,
      subjectId,
      deckId,
      documentId,
      sourceType,
      sourceTitle,
    });

    return NextResponse.json({
      success: true,
      session: result.session,
      firstQuestion: result.firstQuestion,
    });
  } catch (error: any) {
    console.error('[API /api/study/viva/session POST error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to initiate viva session.' },
      { status: 500 }
    );
  }
}
