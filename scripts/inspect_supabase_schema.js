const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple parser for .env.local
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const envConfig = parseEnv('.env.local');
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function inspectSchema() {
  console.log('Connecting to Supabase at:', supabaseUrl.replace(/https?:\/\//, '').split('.')[0] + '.supabase.co');
  
  const tablesToCheck = [
    'profiles',
    'study_decks',
    'flashcards',
    'quizzes',
    'quiz_questions',
    'documents',
    'document_chunks',
    'xp_transactions',
    'learning_goals',
    'streak_history',
    'flashcard_reviews',
    'quiz_attempts',
    'achievements',
    'user_achievements',
    'exams',
    'exam_attempts',
    'exam_questions',
    'exam_answers',
    'viva_sessions'
  ];

  console.log('\n--- Checking Tables Existence via SELECT limit 0 ---');
  const tableStatus = {};
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(0);
      if (error) {
        tableStatus[table] = { exists: false, error: error.message, code: error.code };
      } else {
        tableStatus[table] = { exists: true };
      }
    } catch (err) {
      tableStatus[table] = { exists: false, error: err.message };
    }
  }

  for (const [table, status] of Object.entries(tableStatus)) {
    if (status.exists) {
      console.log(`  ✅ Table '${table}' EXISTS`);
    } else {
      console.log(`  ❌ Table '${table}' DOES NOT EXIST or errored: ${status.error} (Code: ${status.code})`);
    }
  }

  // Specifically check critical columns on public.exams
  console.log('\n--- Checking Specific Columns on public.exams ---');
  const examColsToCheck = ['id', 'user_id', 'title', 'subject', 'status', 'questions', 'selected_topics', 'question_types', 'subject_name', 'deck_name'];
  for (const col of examColsToCheck) {
    try {
      const { error } = await supabase.from('exams').select(col).limit(0);
      if (error) {
        console.log(`  ❌ Column 'exams.${col}' error: ${error.message}`);
      } else {
        console.log(`  ✅ Column 'exams.${col}' exists`);
      }
    } catch (err) {
      console.log(`  ❌ Column 'exams.${col}' exception: ${err.message}`);
    }
  }

  // Specifically check critical columns on public.exam_attempts
  console.log('\n--- Checking Specific Columns on public.exam_attempts ---');
  const attemptColsToCheck = ['id', 'exam_id', 'user_id', 'answers', 'score', 'exam_title', 'exam_mode'];
  for (const col of attemptColsToCheck) {
    try {
      const { error } = await supabase.from('exam_attempts').select(col).limit(0);
      if (error) {
        console.log(`  ❌ Column 'exam_attempts.${col}' error: ${error.message}`);
      } else {
        console.log(`  ✅ Column 'exam_attempts.${col}' exists`);
      }
    } catch (err) {
      console.log(`  ❌ Column 'exam_attempts.${col}' exception: ${err.message}`);
    }
  }

  // Specifically check critical columns on public.quiz_attempts
  console.log('\n--- Checking Specific Columns on public.quiz_attempts ---');
  const quizAttemptColsToCheck = ['id', 'quiz_id', 'user_id', 'score', 'total_items', 'accuracy_percentage', 'topic_breakdown', 'answers'];
  for (const col of quizAttemptColsToCheck) {
    try {
      const { error } = await supabase.from('quiz_attempts').select(col).limit(0);
      if (error) {
        console.log(`  ❌ Column 'quiz_attempts.${col}' error: ${error.message}`);
      } else {
        console.log(`  ✅ Column 'quiz_attempts.${col}' exists`);
      }
    } catch (err) {
      console.log(`  ❌ Column 'quiz_attempts.${col}' exception: ${err.message}`);
    }
  }

  // Check achievements table rows
  console.log('\n--- Checking Achievements Catalog Row Count ---');
  try {
    const { data: achievements, error: achErr } = await supabase.from('achievements').select('id, title').limit(30);
    if (achErr) {
      console.log(`  ❌ Error fetching achievements: ${achErr.message}`);
    } else {
      console.log(`  ✅ Achievements count in DB: ${achievements ? achievements.length : 0}`);
      if (achievements && achievements.length > 0) {
        console.log('     Badges present:', achievements.map(a => a.id).join(', '));
      }
    }
  } catch (err) {
    console.log(`  ❌ Achievements check exception: ${err.message}`);
  }
}

inspectSchema().catch(console.error);
