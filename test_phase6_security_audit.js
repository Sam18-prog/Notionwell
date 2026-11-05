// test_phase6_security_audit.js
// Deep security, reliability, and isolation audit test suite for Phase 6

const fs = require('fs');
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

async function runAudit() {
  console.log('================================================================');
  console.log('🛡️  NOTIONWELL PHASE 6: SECURITY & RELIABILITY AUDIT SUITE');
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
    // -------------------------------------------------------------
    // SECTION 1: AUTHENTICATION ENFORCEMENT & UNAUTHENTICATED REJECTION
    // -------------------------------------------------------------
    console.log('📌 Section 1: Authentication Guard on Protected Endpoints');

    const protectedEndpoints = [
      { url: `${BASE_URL}/api/analytics`, method: 'GET' },
      { url: `${BASE_URL}/api/gamification/xp`, method: 'GET' },
      { url: `${BASE_URL}/api/gamification/award-xp`, method: 'POST', body: { activityId: 'unauth-test' } },
      { url: `${BASE_URL}/api/gamification/achievements`, method: 'GET' },
      { url: `${BASE_URL}/api/gamification/goals`, method: 'GET' },
      { url: `${BASE_URL}/api/study/review/record`, method: 'POST', body: { deckId: 'd', cardId: 'c' } },
      { url: `${BASE_URL}/api/study/quiz/record`, method: 'POST', body: { totalItems: 5, score: 4 } },
      { url: `${BASE_URL}/api/study/recommendations`, method: 'GET' },
    ];

    for (const ep of protectedEndpoints) {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert(res.status === 401, `Unauthenticated request to ${ep.method} ${ep.url.replace(BASE_URL, '')} rejected with HTTP 401`);
    }

    // -------------------------------------------------------------
    // SECTION 2: AUTHENTICATED TEST SESSIONS (SUPABASE REAL USERS)
    // -------------------------------------------------------------
    console.log('\n📌 Section 2: Real Supabase Authenticated Sessions');

    const email1 = 'audit.user1@notionwell.internal';
    const email2 = 'audit.user2@notionwell.internal';
    const password = 'TestPassword123!@#';

    // Sign in User 1
    const { data: signin1, error: signinErr1 } = await anon.auth.signInWithPassword({
      email: email1,
      password: password,
    });
    assert(!signinErr1 && !!signin1?.session?.access_token, 'Successfully obtained real Supabase JWT for User 1');
    const token1 = signin1.session.access_token;
    const user1Id = signin1.user.id;

    // Sign in User 2
    const { data: signin2, error: signinErr2 } = await anon.auth.signInWithPassword({
      email: email2,
      password: password,
    });
    assert(!signinErr2 && !!signin2?.session?.access_token, 'Successfully obtained real Supabase JWT for User 2');
    const token2 = signin2.session.access_token;
    const user2Id = signin2.user.id;

    assert(user1Id !== user2Id, `User 1 (${user1Id}) and User 2 (${user2Id}) are distinct accounts`);

    // -------------------------------------------------------------
    // SECTION 3: USER ISOLATION & FORBIDDEN ACCESS PREVENTION
    // -------------------------------------------------------------
    console.log('\n📌 Section 3: User Isolation & Cross-Account Access Prevention');

    // User 2 attempts to request User 1's analytics by passing user1Id
    const resSpoofAnalytics = await fetch(`${BASE_URL}/api/analytics?userId=${user1Id}`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(resSpoofAnalytics.status === 403, 'User 2 forbidden (HTTP 403) from reading User 1\'s analytics');

    // User 2 attempts to request User 1's XP balance
    const resSpoofXP = await fetch(`${BASE_URL}/api/gamification/xp?userId=${user1Id}`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(resSpoofXP.status === 403, 'User 2 forbidden (HTTP 403) from reading User 1\'s XP');

    // User 2 attempts to request User 1's achievements
    const resSpoofAch = await fetch(`${BASE_URL}/api/gamification/achievements?userId=${user1Id}`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(resSpoofAch.status === 403, 'User 2 forbidden (HTTP 403) from reading User 1\'s achievements');

    // User 2 attempts to request User 1's goals
    const resSpoofGoals = await fetch(`${BASE_URL}/api/gamification/goals?userId=${user1Id}`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(resSpoofGoals.status === 403, 'User 2 forbidden (HTTP 403) from reading User 1\'s goals');

    // -------------------------------------------------------------
    // SECTION 4: SERVER-VERIFIED XP, PROGRESSION & IDEMPOTENCY
    // -------------------------------------------------------------
    console.log('\n📌 Section 4: Server-Side XP Validation & Idempotency');

    // Fetch initial XP for User 1
    const resInitXP = await fetch(`${BASE_URL}/api/gamification/xp`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const dataInitXP = await resInitXP.json();
    assert(dataInitXP.success === true, 'Successfully fetched User 1 XP balance');
    const startXP1 = dataInitXP.totalXP || 0;

    // Test server-side XP clamping (client requests 9999 XP, server must cap based on activity limit)
    const testActivityId = 'audit-xp-cap-' + Date.now();
    const resCap = await fetch(`${BASE_URL}/api/gamification/award-xp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        activityType: 'quiz_completed',
        activityId: testActivityId,
        amount: 9999, // Malicious client attempt
      }),
    });
    const dataCap = await resCap.json();
    assert(dataCap.success === true && dataCap.awarded === true, 'XP awarded successfully');
    assert(dataCap.amountAwarded <= 50, `XP amount clamped to server maximum (50) instead of client request (9999), awarded: ${dataCap.amountAwarded}`);

    // Test duplicate activityId rejection
    const resDup = await fetch(`${BASE_URL}/api/gamification/award-xp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        activityType: 'quiz_completed',
        activityId: testActivityId,
        amount: 50,
      }),
    });
    const dataDup = await resDup.json();
    assert(dataDup.success === true && dataDup.awarded === false, 'Duplicate activityId safely rejected with awarded: false');
    assert(dataDup.newTotalXP === dataCap.newTotalXP, 'Total XP did NOT increase on duplicate request');

    // Verify User 2's XP was NOT altered by User 1's activities
    const resXP2 = await fetch(`${BASE_URL}/api/gamification/xp`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const dataXP2 = await resXP2.json();
    assert(dataXP2.success === true, 'User 2 XP fetched cleanly');
    assert(dataXP2.userId === user2Id, `XP response belongs to User 2 (${user2Id})`);
    assert(dataXP2.totalXP !== dataCap.newTotalXP, 'User 2 XP is completely isolated from User 1');

    // -------------------------------------------------------------
    // SECTION 5: SM-2 ALGORITHM BOUNDS & DEBOUNCE REJECTION
    // -------------------------------------------------------------
    console.log('\n📌 Section 5: SM-2 Calculation Invariants & Rapid Click Debouncing');

    const testCardId = 'audit-card-' + Date.now();
    const testDeckId = 'audit-deck-1';

    // 5a. Rapid duplicate click rejection (<800ms)
    const p1 = fetch(`${BASE_URL}/api/study/review/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        deckId: testDeckId,
        cardId: testCardId,
        rating: 'good',
        durationMs: 2000,
      }),
    });

    const p2 = fetch(`${BASE_URL}/api/study/review/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        deckId: testDeckId,
        cardId: testCardId,
        rating: 'good',
        durationMs: 2000,
      }),
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    const d1 = await r1.json();
    const d2 = await r2.json();

    const hasOneSuccess = d1.success === true || d2.success === true;
    const hasOneRejected = r1.status === 429 || r2.status === 429 || d1.success === false || d2.success === false;
    assert(hasOneSuccess, 'At least one review in double-click succeeded');
    assert(hasOneRejected, 'Rapid duplicate double-click review (<800ms) was rejected');

    // -------------------------------------------------------------
    // SECTION 6: ACHIEVEMENTS CATALOG COUNT RECONCILIATION
    // -------------------------------------------------------------
    console.log('\n📌 Section 6: Canonical Achievements Catalog Reconciliation');

    const resAch = await fetch(`${BASE_URL}/api/gamification/achievements`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const dataAch = await resAch.json();
    assert(dataAch.success === true, 'Successfully fetched canonical achievements');
    assert(dataAch.totalCount === 16, `Achievements catalog count reconciled to exactly 16 (found ${dataAch.totalCount})`);

    const categories = new Set(dataAch.achievements.map((a) => a.category));
    assert(categories.size === 5, 'Exactly 5 categories exist (consistency, flashcards, quizzes, exams, milestones)');

    const countByCategory = {};
    for (const a of dataAch.achievements) {
      countByCategory[a.category] = (countByCategory[a.category] || 0) + 1;
    }
    assert(countByCategory['consistency'] === 4, 'Consistency category has 4 badges');
    assert(countByCategory['flashcards'] === 4, 'Flashcards category has 4 badges');
    assert(countByCategory['quizzes'] === 3, 'Quizzes category has 3 badges');
    assert(countByCategory['exams'] === 3, 'Exams category has 3 badges');
    assert(countByCategory['milestones'] === 2, 'Milestones category has 2 badges (Deck Architect, Centurion of Retention)');

    // -------------------------------------------------------------
    // SECTION 7: GOAL PERSISTENCE & USER ISOLATION
    // -------------------------------------------------------------
    console.log('\n📌 Section 7: Goal Target Persistence & Isolation');

    // User 1 updates daily targets to 42 minutes, 28 cards
    const resSaveGoal1 = await fetch(`${BASE_URL}/api/gamification/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        dailyStudyMinutes: 42,
        dailyCardsReviewed: 28,
      }),
    });
    const dataSaveGoal1 = await resSaveGoal1.json();
    assert(dataSaveGoal1.success === true, 'User 1 updated learning goals');
    assert(dataSaveGoal1.goals.dailyStudyMinutes === 42, 'User 1 daily study minutes is 42');

    // User 2 gets goals (must NOT see User 1's 42 minutes)
    const resGetGoal2 = await fetch(`${BASE_URL}/api/gamification/goals`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const dataGetGoal2 = await resGetGoal2.json();
    assert(dataGetGoal2.success === true, 'User 2 fetched own goals');
    assert(dataGetGoal2.goals.dailyStudyMinutes !== 42, `User 2 goals are isolated from User 1 (expected default 20, got ${dataGetGoal2.goals.dailyStudyMinutes})`);

    // -------------------------------------------------------------
    // SECTION 8: AI STUDY RECOMMENDATIONS GROUNDING & AUTH
    // -------------------------------------------------------------
    console.log('\n📌 Section 8: AI Study Recommendations Grounding');

    const resRecs1 = await fetch(`${BASE_URL}/api/study/recommendations`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const dataRecs1 = await resRecs1.json();
    assert(dataRecs1.success === true, 'AI recommendations returned successfully for authenticated user');
    assert(Array.isArray(dataRecs1.recommendations) && dataRecs1.recommendations.length > 0, 'Contains prioritized recommendations');

    console.log('\n================================================================');
    console.log(`📊 AUDIT SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Audit suite execution error:', err);
    process.exit(1);
  }
}

runAudit();
