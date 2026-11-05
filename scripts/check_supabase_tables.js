const fs = require('fs');
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

async function checkTables() {
  const commonTables = [
    'profiles',
    'decks',
    'flashcards',
    'documents',
    'document_chunks',
    'study_chat_messages',
    'exams',
    'exam_questions',
    'exam_attempts',
    'exam_answers',
    'flashcard_reviews',
    'quiz_attempts',
    'learning_goals',
    'user_achievements',
    'achievements',
    'xp_transactions',
    'streak_history',
    'learning_paths',
    'learning_path_tasks',
    'adaptive_learning_profiles',
    'knowledge_connections',
    'viva_sessions',
    'viva_responses',
  ];

  console.log('Checking existence of tables in public schema:');
  for (const table of commonTables) {
    const { data, error } = await admin.from(table).select('*').limit(1);
    if (error) {
      console.log(`  ❌ ${table}: ${error.code} - ${error.message}`);
    } else {
      console.log(`  ✅ ${table}: table exists! (rows: ${data ? data.length : 0})`);
    }
  }
}

checkTables().catch(console.error);
