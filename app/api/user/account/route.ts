import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/auth-server';
import { purgeUserRAGData } from '@/lib/rag/vectorStore';
import { purgeUserExamData } from '@/lib/exam';
import { purgeUserAnalyticsData } from '@/lib/analytics';
import { purgeUserIntelligenceData } from '@/lib/intelligence';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { logInfo, logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthenticatedUserSession(req);
    if (!session || !session.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to delete account' },
        { status: 401 }
      );
    }

    const userId = session.id;

    // Check request body for confirmation
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body might be empty or invalid JSON
    }

    if (body.confirm !== true) {
      return NextResponse.json(
        { error: 'Bad Request: Confirmation required. Pass { confirm: true } to permanently delete account.' },
        { status: 400 }
      );
    }

    logInfo('User initiated permanent account deletion', { userId });

    // 1. Purge storage and Supabase user records
    await Promise.allSettled([
      purgeUserRAGData(userId),
      purgeUserExamData(userId),
      purgeUserAnalyticsData(userId),
      purgeUserIntelligenceData(userId),
    ]);

    // 2. Cascade delete from Supabase PostgreSQL tables if connected
    try {
      const supabase = createClient();
      await supabase.from('study_chat_messages').delete().eq('user_id', userId);
      await supabase.from('document_chunks').delete().eq('user_id', userId);
      await supabase.from('documents').delete().eq('user_id', userId);
      await supabase.from('exam_attempts').delete().eq('user_id', userId);
      await supabase.from('exams').delete().eq('user_id', userId);
      await supabase.from('flashcard_reviews').delete().eq('user_id', userId);
      await supabase.from('quiz_attempts').delete().eq('user_id', userId);
      await supabase.from('user_achievements').delete().eq('user_id', userId);
      await supabase.from('user_xp_transactions').delete().eq('user_id', userId);
      await supabase.from('learning_goals').delete().eq('user_id', userId);
      await supabase.from('flashcards').delete().eq('user_id', userId);
      await supabase.from('decks').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
    } catch (dbErr: any) {
      logInfo('Supabase database purge notice (non-fatal)', { error: dbErr?.message });
    }

    // 3. Delete Supabase Auth user if not demo user and admin client is available
    if (userId !== 'demo-guest-user') {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.deleteUser(userId);
      } catch (authErr: any) {
        logInfo('Supabase Auth user delete notice (non-fatal)', { error: authErr?.message });
      }
    }

    logInfo('User account and all associated records permanently purged', { userId });

    return NextResponse.json(
      { success: true, message: 'Account and all associated study data deleted permanently.' },
      { status: 200 }
    );
  } catch (error: any) {
    logError('Error deleting user account', { error: error.message });
    return NextResponse.json(
      { error: 'Internal Server Error: Failed to complete account deletion' },
      { status: 500 }
    );
  }
}
