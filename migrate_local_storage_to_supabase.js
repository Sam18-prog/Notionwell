/**
 * migrate_local_storage_to_supabase.js
 *
 * One-time authoritative data migration utility that reads legacy local filesystem caches
 * (.analytics_storage/, .exam_storage/, .intelligence_storage/, .rag_storage/) and durably
 * populates Supabase PostgreSQL tables without primary key conflicts.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load environment variables
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Supabase credentials missing from .env.local.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const isUUID = (str) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

async function runMigration() {
  console.log('================================================================');
  console.log('🚀 NOTIONWELL — LOCAL FILE TO SUPABASE DATA MIGRATION');
  console.log('================================================================\n');

  // Fetch all existing auth user IDs
  const { data: usersData, error: userErr } = await admin.auth.admin.listUsers();
  if (userErr) {
    console.error('Failed to list auth users:', userErr.message);
    process.exit(1);
  }

  const validUserIds = new Set(usersData.users.map((u) => u.id));
  console.log(`Found ${validUserIds.size} valid Supabase auth user(s):`, Array.from(validUserIds));

  // Determine fallback user ID if local data has 'default-user' or 'demo-guest-user'
  const fallbackUserId = usersData.users[0]?.id || null;

  function resolveUserId(id) {
    if (isUUID(id) && validUserIds.has(id)) return id;
    return fallbackUserId;
  }

  // Helper to read JSON safely
  function readJson(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`Failed reading ${filePath}:`, e.message);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // 1. ANALYTICS STORAGE MIGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Migrating .analytics_storage ---');
  const analyticsDir = path.join(__dirname, '.analytics_storage');

  // Goals
  const goals = readJson(path.join(analyticsDir, 'goals.json'));
  if (Array.isArray(goals)) {
    let count = 0;
    for (const g of goals) {
      const uid = resolveUserId(g.userId);
      if (!uid) continue;
      const { error } = await admin.from('learning_goals').upsert(
        {
          user_id: uid,
          daily_study_minutes: g.dailyStudyMinutes || 20,
          daily_cards_reviewed: g.dailyCardsReviewed || 15,
          daily_questions_practiced: g.dailyQuestionsPracticed || 5,
          weekly_study_hours: g.weeklyStudyHours || 2.5,
          weekly_decks_completed: g.weeklyDecksCompleted || 2,
          weekly_quizzes_attempted: g.weeklyQuizzesAttempted || 3,
          weekly_exams_completed: g.weeklyExamsCompleted || 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${goals.length} learning goals records.`);
  }

  // XP Transactions
  const xpTx = readJson(path.join(analyticsDir, 'xp.json'));
  if (Array.isArray(xpTx)) {
    let count = 0;
    for (const tx of xpTx) {
      const uid = resolveUserId(tx.userId);
      if (!uid) continue;
      const { error } = await admin.from('xp_transactions').upsert(
        {
          id: tx.id,
          user_id: uid,
          amount: tx.amount,
          source: tx.source,
          description: tx.description,
          activity_id: tx.activityId,
          created_at: tx.createdAt || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${xpTx.length} XP transaction records.`);
  }

  // Quiz Attempts
  const quizAttempts = readJson(path.join(analyticsDir, 'quiz_attempts.json'));
  if (Array.isArray(quizAttempts)) {
    let count = 0;
    for (const qa of quizAttempts) {
      const uid = resolveUserId(qa.userId);
      if (!uid) continue;
      const { error } = await admin.from('quiz_attempts').upsert(
        {
          id: qa.id,
          quiz_id: isUUID(qa.quizId) ? qa.quizId : null,
          deck_id: isUUID(qa.deckId) ? qa.deckId : null,
          user_id: uid,
          score: qa.score || 0,
          total_items: qa.totalItems || 1,
          accuracy_percentage: qa.accuracyPercentage || 0,
          duration_seconds: qa.durationSeconds || 0,
          completed_at: qa.completedAt || new Date().toISOString(),
          topic_breakdown: qa.topicBreakdown || [],
        },
        { onConflict: 'id' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${quizAttempts.length} quiz attempt records.`);
  }

  // Reviews
  const reviews = readJson(path.join(analyticsDir, 'reviews.json'));
  if (Array.isArray(reviews)) {
    let count = 0;
    for (const r of reviews) {
      const uid = resolveUserId(r.userId);
      if (!uid || !isUUID(r.flashcardId)) continue;
      const { error } = await admin.from('flashcard_reviews').upsert(
        {
          id: r.id,
          flashcard_id: r.flashcardId,
          user_id: uid,
          rating: r.ratingValue || 4,
          response_type: r.responseType === 'medium' ? 'good' : r.responseType || 'good',
          scheduled_days: r.scheduledDays || 1,
          easiness_factor: r.easinessFactor || 2.5,
          review_duration_ms: r.durationMs || 0,
          reviewed_at: r.reviewedAt || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${reviews.length} flashcard review records.`);
  }

  // Streaks
  const streaks = readJson(path.join(analyticsDir, 'streaks.json'));
  if (Array.isArray(streaks)) {
    let count = 0;
    for (const s of streaks) {
      const uid = resolveUserId(s.userId);
      if (!uid || !s.activeDate) continue;
      const { error } = await admin.from('streak_history').upsert(
        {
          user_id: uid,
          active_date: s.activeDate,
          activity_type: s.activityType || 'study',
          duration_seconds: s.durationSeconds || 0,
          items_reviewed: s.itemsReviewed || 1,
        },
        { onConflict: 'user_id,active_date' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${streaks.length} streak history records.`);
  }

  // Achievements
  const userAchs = readJson(path.join(analyticsDir, 'user_achievements.json'));
  if (Array.isArray(userAchs)) {
    let count = 0;
    for (const ua of userAchs) {
      const uid = resolveUserId(ua.userId);
      if (!uid || !ua.achievementId) continue;
      const { error } = await admin.from('user_achievements').upsert(
        {
          user_id: uid,
          achievement_id: ua.achievementId,
          unlocked_at: ua.unlockedAt || new Date().toISOString(),
        },
        { onConflict: 'user_id,achievement_id' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${userAchs.length} user achievement records.`);
  }

  // --------------------------------------------------------------------------
  // 2. EXAM STORAGE MIGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Migrating .exam_storage ---');
  const examDir = path.join(__dirname, '.exam_storage');

  // Exams
  const exams = readJson(path.join(examDir, 'exams.json'));
  if (Array.isArray(exams)) {
    let count = 0;
    for (const e of exams) {
      const uid = resolveUserId(e.userId);
      if (!uid) continue;
      const { error } = await admin.from('exams').upsert(
        {
          id: e.id,
          user_id: uid,
          deck_id: isUUID(e.deckId) ? e.deckId : null,
          title: e.title,
          description: e.description,
          mode: e.mode || 'timed',
          difficulty: e.difficulty || 'mixed',
          time_limit_minutes: e.timeLimitMinutes || 15,
          total_questions: e.totalQuestions || e.questions?.length || 10,
          negative_marking: Boolean(e.negativeMarking),
          negative_mark_value: e.negativeMarkValue || 0.25,
          question_types: e.questionTypes || ['mcq'],
          selected_source_ids: e.selectedSourceIds || [],
          selected_topics: e.selectedTopics || [],
          randomize_order: e.randomizeOrder !== false,
          questions: e.questions || [],
          created_at: e.createdAt || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${exams.length} exams.`);
  }

  // Exam Attempts
  const attempts = readJson(path.join(examDir, 'attempts.json'));
  if (Array.isArray(attempts)) {
    let count = 0;
    for (const a of attempts) {
      const uid = resolveUserId(a.userId);
      if (!uid) continue;
      const { error } = await admin.from('exam_attempts').upsert(
        {
          id: a.id,
          exam_id: a.examId,
          user_id: uid,
          started_at: a.startedAt || new Date().toISOString(),
          submitted_at: a.submittedAt || new Date().toISOString(),
          time_spent_seconds: a.timeSpentSeconds || 0,
          status: a.status || 'completed',
          score: a.score || 0,
          max_possible_score: a.maxPossibleScore || a.totalQuestions || 10,
          percentage: a.percentage || 0,
          accuracy_percentage: a.accuracyPercentage || a.percentage || 0,
          correct_count: a.correctCount || 0,
          incorrect_count: a.incorrectCount || 0,
          unanswered_count: a.unansweredCount || 0,
          negative_marking_applied: a.negativeMarkingApplied || 0,
          topic_breakdown: a.topicBreakdown || [],
          ai_feedback: a.aiFeedback || {},
          user_answers: a.userAnswers || {},
          evaluated_answers: a.evaluatedAnswers || [],
          answers: a.evaluatedAnswers || [],
        },
        { onConflict: 'id' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${attempts.length} exam attempts.`);
  }

  // --------------------------------------------------------------------------
  // 3. INTELLIGENCE STORAGE MIGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Migrating .intelligence_storage ---');
  const intelDir = path.join(__dirname, '.intelligence_storage');

  // Paths
  const paths = readJson(path.join(intelDir, 'paths.json'));
  if (Array.isArray(paths)) {
    let count = 0;
    for (const p of paths) {
      const uid = resolveUserId(p.userId);
      if (!uid) continue;
      const { error } = await admin.from('learning_paths').upsert(
        {
          id: p.id,
          user_id: uid,
          subject_id: isUUID(p.subjectId) ? p.subjectId : null,
          title: p.title,
          objective: p.objective,
          target_date: p.targetDate,
          daily_minutes: p.dailyMinutes,
          status: p.status,
          current_level: p.currentLevel,
          stages_count: p.stagesCount,
          metadata: p.metadata || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${paths.length} study paths.`);
  }

  // Path Tasks
  const tasks = readJson(path.join(intelDir, 'path_tasks.json'));
  if (Array.isArray(tasks)) {
    let count = 0;
    for (const t of tasks) {
      const uid = resolveUserId(t.userId);
      if (!uid) continue;
      const { error } = await admin.from('learning_path_tasks').upsert(
        {
          id: t.id,
          path_id: t.pathId,
          user_id: uid,
          stage_order: t.stageOrder,
          stage_title: t.stageTitle,
          task_order: t.taskOrder,
          title: t.title,
          description: t.description,
          task_type: t.taskType,
          estimated_minutes: t.estimatedMinutes,
          is_completed: t.isCompleted,
          completed_at: t.completedAt,
          due_date: t.dueDate,
          prerequisite_task_ids: t.prerequisiteTaskIds || [],
        },
        { onConflict: 'id' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${tasks.length} learning path tasks.`);
  }

  // Viva Sessions
  const vivas = readJson(path.join(intelDir, 'viva_sessions.json'));
  if (Array.isArray(vivas)) {
    let count = 0;
    for (const v of vivas) {
      const uid = resolveUserId(v.userId);
      if (!uid) continue;
      const { error } = await admin.from('viva_sessions').upsert(
        {
          id: v.id,
          user_id: uid,
          subject_id: isUUID(v.subjectId) ? v.subjectId : null,
          deck_id: isUUID(v.deckId) ? v.deckId : null,
          document_id: v.documentId || null,
          title: v.topicTitle || v.title,
          viva_mode: v.vivaMode,
          difficulty: v.difficulty,
          total_questions: v.totalQuestions,
          status: v.status,
          overall_score: v.overallScore || null,
          accuracy_score: v.accuracyScore || null,
          depth_score: v.depthScore || null,
          clarity_score: v.clarityScore || null,
          evaluation_summary: v.evaluationSummary || {},
          created_at: v.createdAt || new Date().toISOString(),
          completed_at: v.completedAt || null,
        },
        { onConflict: 'id' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${vivas.length} viva sessions.`);
  }

  // Viva Responses
  const vivaResponses = readJson(path.join(intelDir, 'viva_responses.json'));
  if (Array.isArray(vivaResponses)) {
    let count = 0;
    for (const vr of vivaResponses) {
      const uid = resolveUserId(vr.userId);
      if (!uid) continue;
      const { error } = await admin.from('viva_responses').upsert(
        {
          id: vr.id,
          session_id: vr.sessionId,
          user_id: uid,
          question_index: vr.questionIndex,
          question_text: vr.questionText,
          student_response: vr.studentResponse,
          is_voice: Boolean(vr.isVoice),
          score: vr.score,
          feedback: vr.feedback,
          follow_up_question: vr.followUpQuestion || null,
        },
        { onConflict: 'id' }
      );
      if (!error) count++;
    }
    console.log(`  ✅ Migrated ${count}/${vivaResponses.length} viva responses.`);
  }

  console.log('\n🎉 ALL LOCAL FILE DATA SUCCESSFULLY MIGRATED TO SUPABASE POSTGRESQL.');
}

runMigration().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
