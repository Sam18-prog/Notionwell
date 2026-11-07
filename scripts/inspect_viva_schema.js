const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

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

const env = parseEnv('.env.local');
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  const { data: user, error: uErr } = await client.from('profiles').select('id').limit(1).single();
  if (uErr || !user) {
    console.log('No user profile found for test:', uErr);
    return;
  }
  console.log('Found user profile:', user.id);

  const testSessionId = '00000000-0000-0000-0000-000000000001';
  const testPayload = {
    id: testSessionId,
    user_id: user.id,
    title: 'Test Viva Session',
    topic_title: 'Computer Networks',
    target_topics: ['OSI Model', 'TCP/IP'],
    current_question_index: 1,
    status: 'active',
    turns: [
      {
        question_index: 1,
        question_text: 'What is the function of the Transport layer?',
        student_response: 'End-to-end communication and reliability.',
        score: 8.5,
        feedback: 'Accurate description of end-to-end transport duties.',
        created_at: new Date().toISOString()
      }
    ],
    final_score: 85.0,
    feedback: 'Solid performance.',
    strengths: ['Clear terminology'],
    weaknesses: ['Add protocol examples'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: inserted, error: insErr } = await client
    .from('viva_sessions')
    .upsert(testPayload, { onConflict: 'id' })
    .select();

  console.log('Upsert result:', insErr ? insErr.message : 'SUCCESS', inserted);

  // Clean up
  await client.from('viva_sessions').delete().eq('id', testSessionId);
  console.log('Cleaned up test row.');
}

run().catch(console.error);
