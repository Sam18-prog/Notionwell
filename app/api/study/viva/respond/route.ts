import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import { evaluateVivaTurn } from '@/lib/intelligence';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      sessionId,
      questionIndex,
      questionText,
      studentResponse,
      isVoice = false,
    } = body;

    if (!sessionId || !questionText || typeof questionIndex !== 'number' || !studentResponse) {
      return NextResponse.json(
        { success: false, error: 'sessionId, questionIndex, questionText, and studentResponse are required.' },
        { status: 400 }
      );
    }

    const result = await evaluateVivaTurn({
      sessionId,
      userId: session.id,
      questionIndex,
      questionText,
      studentResponse,
      isVoice: Boolean(isVoice),
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[API /api/study/viva/respond POST error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to evaluate viva turn.' },
      { status: 500 }
    );
  }
}
