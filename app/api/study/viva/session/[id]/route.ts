import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import { getVivaSessionDetails } from '@/lib/intelligence';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const details = getVivaSessionDetails(params.id, session.id);
    if (!details) {
      return NextResponse.json({ success: false, error: 'Viva session not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...details });
  } catch (error: any) {
    console.error('[API /api/study/viva/session/[id] GET error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve viva session details.' },
      { status: 500 }
    );
  }
}
