import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import { getStoredDocuments } from '@/lib/rag/vectorStore';
import { getAllExams, getUserExamAttempts } from '@/lib/exam';
import {
  getUserFlashcardReviews,
  getUserQuizAttempts,
  getUserXPTransactions,
  getUserTotalXP,
  calculateStreaks,
  getUserAchievements,
  getLearningGoals,
  buildComprehensiveAnalytics,
} from '@/lib/analytics';
import {
  getUserStudyPaths,
  getUserAdaptiveProfiles,
  detectWeakTopics,
  getUserVivaHistory,
  getUnifiedLearningProfile,
} from '@/lib/intelligence';
import { getDecks, getSubjects } from '@/lib/app';
import { createClient } from '@/lib/supabase/server';
import { logInfo, logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session || !session.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be logged in to export user data' },
        { status: 401 }
      );
    }

    const userId = session.id;
    logInfo('User data export requested', { userId });

    // Gather Supabase-stored decks & cards if Supabase is connected
    let cloudDecks: any[] = [];
    let cloudCards: any[] = [];
    try {
      const supabase = createClient();
      const { data: decks } = await supabase.from('decks').select('*').eq('user_id', userId);
      if (decks) cloudDecks = decks;

      const { data: cards } = await supabase.from('flashcards').select('*').eq('user_id', userId);
      if (cards) cloudCards = cards;
    } catch (dbErr) {
      // Non-blocking: local/mock or unconfigured DB
    }

    // Gather all user data asynchronously from Supabase
    const [
      totalXP,
      streaks,
      unifiedProfile,
      indexedDocuments,
      exams,
      attempts,
      goals,
      achievements,
      xpTransactions,
      analyticsSummary,
      flashcardReviews,
      quizAttempts,
      studyPaths,
      adaptiveProfiles,
      weakTopics,
      vivaSessions,
    ] = await Promise.all([
      getUserTotalXP(userId),
      calculateStreaks(userId),
      getUnifiedLearningProfile(userId),
      getStoredDocuments(userId),
      getAllExams(userId),
      getUserExamAttempts(userId),
      getLearningGoals(userId),
      getUserAchievements(userId),
      getUserXPTransactions(userId),
      buildComprehensiveAnalytics(userId, getDecks(), getSubjects(), 30),
      getUserFlashcardReviews(userId),
      getUserQuizAttempts(userId),
      getUserStudyPaths(userId),
      getUserAdaptiveProfiles(userId),
      detectWeakTopics(userId),
      getUserVivaHistory(userId),
    ]);

    // Assemble unified export payload
    const exportData = {
      exportMetadata: {
        platform: 'Notionwell — From Notes to Knowledge',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        userId: session.id,
        userEmail: session.email || null,
        schemaVersion: '2026.11',
      },
      profile: {
        userId: session.id,
        email: session.email || null,
        isDemo: Boolean(session.isDemo),
        totalXP,
        streaks,
        unifiedProfile,
      },
      studyDecks: {
        decks: cloudDecks,
        flashcards: cloudCards,
      },
      studyMaterials: {
        indexedDocuments,
      },
      examinations: {
        exams,
        attempts,
      },
      gamificationAndProgress: {
        goals,
        achievements,
        xpTransactions,
        analyticsSummary,
      },
      activityLogs: {
        flashcardReviews,
        quizAttempts,
      },
      learningIntelligence: {
        studyPaths,
        adaptiveProfiles,
        weakTopics,
        vivaSessions,
      },
    };

    const fileName = `notionwell-data-export-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, private',
      },
    });
  } catch (error: any) {
    console.error('[API /api/user/export full error]:', error?.stack || error);
    logError('Failed to generate user data export', error);
    return NextResponse.json(
      { error: 'Internal Server Error: Unable to compile user data export', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
