const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testUpsert() {
  const { data: users } = await admin.auth.admin.listUsers();
  const uid = users.users[0]?.id;
  console.log('Testing with user ID:', uid);

  // Test learning_goals
  const { data: gData, error: gErr } = await admin.from('learning_goals').upsert({
    user_id: uid,
    daily_study_minutes: 20,
    daily_cards_reviewed: 15,
    daily_questions_practiced: 5,
    weekly_study_hours: 2.5,
    weekly_decks_completed: 2,
    weekly_quizzes_attempted: 3,
    weekly_exams_completed: 1,
  }, { onConflict: 'user_id' });
  console.log('learning_goals upsert error:', gErr);

  // Test xp_transactions
  const { data: xData, error: xErr } = await admin.from('xp_transactions').upsert({
    id: '00000000-0000-0000-0000-000000000001',
    user_id: uid,
    amount: 10,
    source: 'flashcard_review',
    description: 'Test migration',
    activity_id: 'test-mig-1',
  }, { onConflict: 'id' });
  console.log('xp_transactions upsert error:', xErr);

  // Test exams
  const { data: eData, error: eErr } = await admin.from('exams').upsert({
    id: '00000000-0000-0000-0000-000000000002',
    user_id: uid,
    title: 'Test Exam',
    mode: 'timed',
    difficulty: 'medium',
    time_limit_minutes: 15,
    total_questions: 1,
    questions: [],
  }, { onConflict: 'id' });
  console.log('exams upsert error:', eErr);
}

testUpsert().catch(console.error);
