// test_phase7_intelligence.js
// Automated verification suite for Notionwell Phase 7: Advanced AI Learning Intelligence

const fs = require('fs');

// Load environment variables from .env.local
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = val;
  }
});

const { createClient } = require('@supabase/supabase-js');
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const BASE_URL = 'http://localhost:3000';

async function runPhase7Tests() {
  console.log('================================================================');
  console.log('🧠 NOTIONWELL PHASE 7: ADVANCED AI LEARNING INTELLIGENCE VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: AUTHENTICATION ENFORCEMENT ON ALL PHASE 7 ENDPOINTS
    // -------------------------------------------------------------------------
    console.log('📌 Section 1: Authentication Guard on All Phase 7 Endpoints (Rejecting Unauthenticated)');

    const unauthEndpoints = [
      { url: `${BASE_URL}/api/study/paths`, method: 'GET' },
      { url: `${BASE_URL}/api/study/paths`, method: 'POST', body: { targetDate: '2026-12-01' } },
      { url: `${BASE_URL}/api/study/adaptive`, method: 'GET' },
      { url: `${BASE_URL}/api/study/adaptive`, method: 'POST', body: { topic: 'ML', correct: 1, total: 1 } },
      { url: `${BASE_URL}/api/study/weak-topics`, method: 'GET' },
      { url: `${BASE_URL}/api/study/connections`, method: 'GET' },
      { url: `${BASE_URL}/api/study/connections`, method: 'POST', body: {} },
      { url: `${BASE_URL}/api/study/viva/session`, method: 'GET' },
      { url: `${BASE_URL}/api/study/viva/session`, method: 'POST', body: { topicTitle: 'Viva test' } },
      { url: `${BASE_URL}/api/study/viva/respond`, method: 'POST', body: { sessionId: 'xyz' } },
      { url: `${BASE_URL}/api/study/profile`, method: 'GET' },
    ];

    for (const ep of unauthEndpoints) {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert(res.status === 401, `Unauthenticated ${ep.method} ${ep.url.replace(BASE_URL, '')} rejected with HTTP 401`);
    }

    // -------------------------------------------------------------------------
    // SECTION 2: ACQUIRE AUTHENTICATED SESSIONS FOR TEST USERS
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 2: Supabase Session Authentication for Multi-Tenant Testing');

    const email1 = 'audit.user1@notionwell.internal';
    const email2 = 'audit.user2@notionwell.internal';
    const pwd = 'TestPassword123!@#';

    let login1 = await anon.auth.signInWithPassword({ email: email1, password: pwd });
    if (login1.error) {
      console.log('User 1 sign in error:', login1.error.message, '- attempting creation via admin client...');
      await admin.auth.admin.createUser({ email: email1, password: pwd, email_confirm: true });
      login1 = await anon.auth.signInWithPassword({ email: email1, password: pwd });
    }
    const token1 = login1.data?.session?.access_token;
    const user1Id = login1.data?.user?.id;
    assert(!!token1 && !!user1Id, `User 1 authenticated: ${user1Id?.slice(0, 8)}...`);

    let login2 = await anon.auth.signInWithPassword({ email: email2, password: pwd });
    if (login2.error) {
      console.log('User 2 sign in error:', login2.error.message, '- attempting creation via admin client...');
      await admin.auth.admin.createUser({ email: email2, password: pwd, email_confirm: true });
      login2 = await anon.auth.signInWithPassword({ email: email2, password: pwd });
    }
    const token2 = login2.data?.session?.access_token;
    const user2Id = login2.data?.user?.id;
    assert(!!token2 && !!user2Id, `User 2 authenticated: ${user2Id?.slice(0, 8)}...`);

    const authHeaders1 = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    };
    const authHeaders2 = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`,
    };

    // -------------------------------------------------------------------------
    // SECTION 3: PERSONALIZED AI STUDY PATHS
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 3: Personalized AI Study Paths Generation & Dynamic Rescheduling');

    const createPathRes = await fetch(`${BASE_URL}/api/study/paths`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        title: 'Deep Learning & Neural Networks Roadmap',
        objective: 'Master backpropagation, loss functions, and CNN architectures for finals',
        targetDate: '2026-11-25',
        dailyMinutes: 30,
        initialLevel: 'intermediate',
        subjectName: 'Computer Science',
      }),
    });
    const createPathData = await createPathRes.json();
    assert(createPathRes.status === 200 && createPathData.success, 'Study path generated successfully');
    assert(!!createPathData.path && createPathData.path.stagesCount === 4, 'Study path has 4 structured stages');
    assert(Array.isArray(createPathData.tasks) && createPathData.tasks.length >= 4, `Study path generated ${createPathData.tasks?.length} actionable tasks`);

    const pathId = createPathData.path.id;
    const firstTask = createPathData.tasks[0];

    // Retrieve user study paths
    const listPathsRes = await fetch(`${BASE_URL}/api/study/paths`, {
      method: 'GET',
      headers: authHeaders1,
    });
    const listPathsData = await listPathsRes.json();
    assert(listPathsData.success && listPathsData.paths.some(p => p.id === pathId), 'User 1 retrieved their study path');

    // Toggle task completion
    const toggleRes = await fetch(`${BASE_URL}/api/study/paths/${pathId}`, {
      method: 'PATCH',
      headers: authHeaders1,
      body: JSON.stringify({
        action: 'toggle_task',
        taskId: firstTask.id,
      }),
    });
    const toggleData = await toggleRes.json();
    assert(toggleData.success && toggleData.task.isCompleted === true, 'Study path task marked completed');

    // Dynamic rescheduling
    const rescheduleRes = await fetch(`${BASE_URL}/api/study/paths/${pathId}`, {
      method: 'PATCH',
      headers: authHeaders1,
      body: JSON.stringify({
        action: 'reschedule',
        newTargetDate: '2026-12-15',
        dailyMinutes: 45,
      }),
    });
    const rescheduleData = await rescheduleRes.json();
    assert(rescheduleData.success && rescheduleData.path.targetDate === '2026-12-15', 'Study path dynamically rescheduled with new deadline');

    // Multi-tenant check: User 2 cannot access User 1's path
    const crossPathRes = await fetch(`${BASE_URL}/api/study/paths/${pathId}`, {
      method: 'GET',
      headers: authHeaders2,
    });
    assert(crossPathRes.status === 404, 'Multi-tenant isolation: User 2 cannot access User 1 study path (HTTP 404)');

    // -------------------------------------------------------------------------
    // SECTION 4: ADAPTIVE LEARNING & DIFFICULTY ADJUSTMENT
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 4: Adaptive Learning & Multi-Factor Difficulty Calibration');

    // Record 3 strong sessions for topic "Neural Networks"
    await fetch(`${BASE_URL}/api/study/adaptive`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({ topic: 'Neural Networks', correct: 9, total: 10, sourceType: 'quiz' }),
    });
    await fetch(`${BASE_URL}/api/study/adaptive`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({ topic: 'Neural Networks', correct: 10, total: 10, sourceType: 'quiz' }),
    });
    const adaptRes1 = await fetch(`${BASE_URL}/api/study/adaptive`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({ topic: 'Neural Networks', correct: 9, total: 10, sourceType: 'quiz' }),
    });
    const adaptData1 = await adaptRes1.json();
    assert(adaptData1.success && adaptData1.profile.currentDifficulty === 'advanced', 'Consistent high accuracy elevated difficulty to "advanced"');
    assert(adaptData1.profile.rollingAccuracy >= 85, `Rolling accuracy correctly tracked: ${adaptData1.profile.rollingAccuracy}%`);
    assert(typeof adaptData1.profile.reason === 'string' && adaptData1.profile.reason.includes('Advanced'), 'Pedagogical explanation provides clear justification');

    // Record 2 struggling sessions for topic "Quantum Gates"
    await fetch(`${BASE_URL}/api/study/adaptive`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({ topic: 'Quantum Gates', correct: 3, total: 10, sourceType: 'quiz' }),
    });
    const adaptRes2 = await fetch(`${BASE_URL}/api/study/adaptive`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({ topic: 'Quantum Gates', correct: 4, total: 10, sourceType: 'quiz' }),
    });
    const adaptData2 = await adaptRes2.json();
    assert(adaptData2.success && adaptData2.profile.currentDifficulty === 'beginner', 'Low accuracy calibrated difficulty to "beginner"');

    // -------------------------------------------------------------------------
    // SECTION 5: INTELLIGENT WEAK-TOPIC DETECTION
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 5: Intelligent Weak-Topic Detection & Actionable Taxonomy');

    const weakRes = await fetch(`${BASE_URL}/api/study/weak-topics`, {
      method: 'GET',
      headers: authHeaders1,
    });
    const weakData = await weakRes.json();
    assert(weakRes.status === 200 && weakData.success, 'Weak topics retrieved successfully');
    assert(Array.isArray(weakData.weakTopics), 'Weak topics array returned');
    assert(!!weakData.summary && typeof weakData.summary.totalAnalyzed === 'number', 'Summary metrics returned');

    // Check classification validity
    const validStatuses = ['needs_improvement', 'improving', 'insufficient_data', 'strong'];
    const allStatusesValid = weakData.weakTopics.every(w => validStatuses.includes(w.status));
    assert(allStatusesValid, 'All topics categorized into valid diagnostic taxonomy');

    // -------------------------------------------------------------------------
    // SECTION 6: CROSS-DOCUMENT KNOWLEDGE CONNECTIONS
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 6: Cross-Document Knowledge Connections & Concept Discovery');

    const connRes = await fetch(`${BASE_URL}/api/study/connections`, {
      method: 'GET',
      headers: authHeaders1,
    });
    const connData = await connRes.json();
    assert(connRes.status === 200 && connData.success, 'Cross-document connections retrieved');
    assert(Array.isArray(connData.connections), 'Connections array returned');

    const discRes = await fetch(`${BASE_URL}/api/study/connections`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({}),
    });
    const discData = await discRes.json();
    assert(discRes.status === 200 && discData.success, 'Discovery scan executed successfully');

    // -------------------------------------------------------------------------
    // SECTION 7: AI VIVA VOCE ORAL EXAM PREPARATION
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 7: AI Viva Voce Preparation & Oral Evaluation Loop');

    // Start viva session with 3 questions for quick end-to-end evaluation
    const vivaStartRes = await fetch(`${BASE_URL}/api/study/viva/session`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        topicTitle: 'Operating Systems: Virtual Memory & Paging',
        vivaMode: 'technical',
        difficulty: 'intermediate',
        totalQuestions: 3,
      }),
    });
    const vivaStartData = await vivaStartRes.json();
    assert(vivaStartRes.status === 200 && vivaStartData.success, 'Viva session initiated');
    assert(!!vivaStartData.session && vivaStartData.session.totalQuestions === 3, 'Viva session metadata recorded');
    assert(typeof vivaStartData.firstQuestion === 'string' && vivaStartData.firstQuestion.length > 10, 'Examiner opening question generated');

    const vivaSessionId = vivaStartData.session.id;

    // Turn 1: Respond to Question 1
    const turn1Res = await fetch(`${BASE_URL}/api/study/viva/respond`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        sessionId: vivaSessionId,
        questionIndex: 1,
        questionText: vivaStartData.firstQuestion,
        studentResponse: 'Virtual memory separates user logical memory from physical memory via page tables and TLB caches.',
        isVoice: true,
      }),
    });
    const turn1Data = await turn1Res.json();
    assert(turn1Data.success && typeof turn1Data.evaluation.score === 'number', 'Turn 1 evaluated with numeric score');
    assert(turn1Data.evaluation.isComplete === false, 'Session remains in progress');
    assert(typeof turn1Data.evaluation.feedback === 'string', 'Examiner feedback returned');

    // Turn 2: Respond to Question 2
    const turn2Res = await fetch(`${BASE_URL}/api/study/viva/respond`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        sessionId: vivaSessionId,
        questionIndex: 2,
        questionText: turn1Data.evaluation.followUpQuestion || 'Explain page faults.',
        studentResponse: 'A page fault occurs when a requested page is not in physical RAM, triggering an OS trap to fetch it from disk.',
        isVoice: false,
      }),
    });
    const turn2Data = await turn2Res.json();
    assert(turn2Data.success, 'Turn 2 evaluated');

    // Turn 3 (Final Question): Complete session
    const turn3Res = await fetch(`${BASE_URL}/api/study/viva/respond`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        sessionId: vivaSessionId,
        questionIndex: 3,
        questionText: turn2Data.evaluation.followUpQuestion || 'What is thrashing?',
        studentResponse: 'Thrashing is when the system spends more time servicing page faults and paging than executing actual instructions.',
        isVoice: true,
      }),
    });
    const turn3Data = await turn3Res.json();
    assert(turn3Data.success && turn3Data.evaluation.isComplete === true, 'Final turn completed viva session');
    assert(!!turn3Data.evaluation.finalSummary, 'Diagnostic Viva Report generated');
    assert(typeof turn3Data.evaluation.finalSummary.overallScore === 'number', `Final viva grade computed: ${turn3Data.evaluation.finalSummary.overallScore}%`);
    assert(Array.isArray(turn3Data.evaluation.finalSummary.strengths), 'Report includes strengths breakdown');
    assert(Array.isArray(turn3Data.evaluation.finalSummary.improvements), 'Report includes areas for improvement');

    // Retrieve single viva session details
    const vivaDetailsRes = await fetch(`${BASE_URL}/api/study/viva/session/${vivaSessionId}`, {
      method: 'GET',
      headers: authHeaders1,
    });
    const vivaDetailsData = await vivaDetailsRes.json();
    assert(vivaDetailsData.success && vivaDetailsData.responses.length === 3, 'Full 3-question viva transcript stored and retrievable');

    // Cross-account check: User 2 cannot access User 1 viva session
    const crossVivaRes = await fetch(`${BASE_URL}/api/study/viva/session/${vivaSessionId}`, {
      method: 'GET',
      headers: authHeaders2,
    });
    assert(crossVivaRes.status === 404, 'Multi-tenant isolation: User 2 cannot view User 1 viva session (HTTP 404)');

    // -------------------------------------------------------------------------
    // SECTION 8: UNIFIED AI LEARNING PROFILE
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 8: Unified AI Learning Profile');

    const profileRes = await fetch(`${BASE_URL}/api/study/profile`, {
      method: 'GET',
      headers: authHeaders1,
    });
    const profileData = await profileRes.json();
    assert(profileRes.status === 200 && profileData.success, 'Unified AI learning profile retrieved');
    assert(typeof profileData.profile.retentionRatePercentage === 'number', `Retention rate calculated: ${profileData.profile.retentionRatePercentage}%`);
    assert(Array.isArray(profileData.profile.recommendedNextActions) && profileData.profile.recommendedNextActions.length > 0, 'Personalized next action recommendations provided');

    // -------------------------------------------------------------------------
    // FINAL RESULTS SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`📊 PHASE 7 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during test run:', error);
    process.exit(1);
  }
}

runPhase7Tests();
