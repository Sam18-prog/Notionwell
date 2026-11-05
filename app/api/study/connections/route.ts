import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import { discoverCrossDocumentConnections } from '@/lib/intelligence';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await discoverCrossDocumentConnections(session.id);
    return NextResponse.json({ success: true, connections });
  } catch (error: any) {
    console.error('[API /api/study/connections GET error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve connections.' },
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
    const { documentIds, subjectId } = body;

    const connections = await discoverCrossDocumentConnections(
      session.id,
      documentIds,
      subjectId
    );

    return NextResponse.json({ success: true, connections });
  } catch (error: any) {
    console.error('[API /api/study/connections POST error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to discover cross-document connections.' },
      { status: 500 }
    );
  }
}
