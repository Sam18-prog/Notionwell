import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import { detectWeakTopics } from '@/lib/intelligence';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const weakTopics = await detectWeakTopics(session.id);
    return NextResponse.json({
      success: true,
      weakTopics,
      summary: {
        totalAnalyzed: weakTopics.length,
        needsImprovement: weakTopics.filter(w => w.status === 'needs_improvement').length,
        improving: weakTopics.filter(w => w.status === 'improving').length,
        insufficientData: weakTopics.filter(w => w.status === 'insufficient_data').length,
        strong: weakTopics.filter(w => w.status === 'strong').length,
      },
    });
  } catch (error: any) {
    console.error('[API /api/study/weak-topics GET error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to detect weak topics.' },
      { status: 500 }
    );
  }
}
