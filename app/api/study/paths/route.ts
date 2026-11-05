import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import {
  generatePersonalizedStudyPath,
  getUserStudyPaths,
} from '@/lib/intelligence';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const paths = getUserStudyPaths(session.id);
    return NextResponse.json({ success: true, paths });
  } catch (error: any) {
    console.error('[API /api/study/paths GET error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve study paths.' },
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
      title,
      objective,
      targetDate,
      dailyMinutes,
      initialLevel,
      subjectId,
      subjectName,
      deckIds,
      documentIds,
    } = body;

    if (!targetDate) {
      return NextResponse.json(
        { success: false, error: 'Target completion date is required.' },
        { status: 400 }
      );
    }

    const result = await generatePersonalizedStudyPath({
      userId: session.id,
      title: title || 'Custom Mastery Path',
      objective: objective || 'Master all topics for upcoming exams',
      targetDate,
      dailyMinutes: Number(dailyMinutes) || 30,
      initialLevel: initialLevel || 'intermediate',
      subjectId,
      subjectName,
      deckIds,
      documentIds,
    });

    return NextResponse.json({
      success: true,
      path: result.path,
      tasks: result.tasks,
    });
  } catch (error: any) {
    console.error('[API /api/study/paths POST error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate study path.' },
      { status: 500 }
    );
  }
}
