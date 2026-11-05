/**
 * scripts/verify_production_endpoints.js
 * Comprehensive acceptance test for the 4 critical production endpoints.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function run() {
  console.log('================================================================');
  console.log('🔍 VERIFYING CRITICAL VERCEL PRODUCTION ENDPOINTS OVER HTTP');
  console.log(`Target: ${BASE_URL}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${testName} ${details ? '- ' + details : ''}`);
    }
  }

  // 1. UNAUTHENTICATED GUARD (HTTP 401)
  console.log('--- 1. Testing Unauthenticated Guards (401 Rejection) ---');
  const targetRoutes = [
    { name: 'XP Balance', path: '/api/gamification/xp' },
    { name: 'Learning Goals', path: '/api/gamification/goals' },
    { name: 'Recommendations', path: '/api/study/recommendations' },
    { name: 'Exam History', path: '/api/exam/history' },
  ];

  for (const r of targetRoutes) {
    try {
      const res = await fetch(`${BASE_URL}${r.path}`);
      assert(res.status === 401, `${r.name} rejects unauthenticated request with HTTP 401 (got ${res.status})`);
    } catch (e) {
      assert(false, `${r.name} unauthenticated check`, e.message);
    }
  }

  // 2. AUTHENTICATED REQUESTS (HTTP 200 & VALID PAYLOAD)
  console.log('\n--- 2. Testing Authenticated Requests (HTTP 200 & Valid Schema) ---');
  const demoCookie = 'notionwell_demo_session=1';

  // 2a. /api/gamification/xp
  try {
    const res = await fetch(`${BASE_URL}/api/gamification/xp`, {
      headers: { Cookie: demoCookie },
    });
    const data = await res.json();
    assert(res.status === 200, 'GET /api/gamification/xp returns HTTP 200');
    assert(data.success === true, 'GET /api/gamification/xp reports success: true');
    assert(typeof data.totalXP === 'number', `GET /api/gamification/xp returns numeric totalXP (${data.totalXP})`);
    assert(data.levelInfo && typeof data.levelInfo.currentLevel === 'number', `GET /api/gamification/xp returns valid levelInfo (Level ${data.levelInfo?.currentLevel} - ${data.levelInfo?.title})`);
  } catch (e) {
    assert(false, 'GET /api/gamification/xp', e.message);
  }

  // 2b. /api/gamification/goals
  try {
    const res = await fetch(`${BASE_URL}/api/gamification/goals`, {
      headers: { Cookie: demoCookie },
    });
    const data = await res.json();
    assert(res.status === 200, 'GET /api/gamification/goals returns HTTP 200');
    assert(data.success === true, 'GET /api/gamification/goals reports success: true');
    assert(data.goals && typeof data.goals.dailyStudyMinutes === 'number', `GET /api/gamification/goals returns daily target minutes (${data.goals?.dailyStudyMinutes}m)`);
    assert(data.progress && (data.progress.daily || data.progress.items), 'GET /api/gamification/goals returns goal progress breakdown');
  } catch (e) {
    assert(false, 'GET /api/gamification/goals', e.message);
  }

  // 2c. /api/study/recommendations
  try {
    const res = await fetch(`${BASE_URL}/api/study/recommendations`, {
      headers: { Cookie: demoCookie },
    });
    const data = await res.json();
    assert(res.status === 200, 'GET /api/study/recommendations returns HTTP 200');
    assert(data.success === true, 'GET /api/study/recommendations reports success: true');
    assert(Array.isArray(data.recommendations), `GET /api/study/recommendations returns array of recommendations (${data.recommendations?.length || 0} items)`);
    assert(typeof data.source === 'string', `GET /api/study/recommendations returns source attribution (${data.source})`);
  } catch (e) {
    assert(false, 'GET /api/study/recommendations', e.message);
  }

  // 2d. /api/exam/history
  try {
    const res = await fetch(`${BASE_URL}/api/exam/history`, {
      headers: { Cookie: demoCookie },
    });
    const data = await res.json();
    assert(res.status === 200, 'GET /api/exam/history returns HTTP 200');
    assert(data.success === true, 'GET /api/exam/history reports success: true');
    assert(Array.isArray(data.exams), `GET /api/exam/history returns exams array (${data.exams?.length || 0} exams)`);
    assert(Array.isArray(data.attempts), `GET /api/exam/history returns attempts array (${data.attempts?.length || 0} attempts)`);
    assert(data.stats && typeof data.stats.examsCompleted === 'number', `GET /api/exam/history returns calculated dashboard stats (Completed: ${data.stats?.examsCompleted}, Avg: ${data.stats?.averageScore}%)`);
  } catch (e) {
    assert(false, 'GET /api/exam/history', e.message);
  }

  // 3. ZERO LOCAL STORAGE CALLS VERIFICATION
  console.log('\n--- 3. Codebase Storage Audit (Zero /var/task or Local Storage Filesystem Calls) ---');
  const codeFiles = [
    path.join(__dirname, '..', 'lib', 'analytics.ts'),
    path.join(__dirname, '..', 'lib', 'exam.ts'),
    path.join(__dirname, '..', 'lib', 'intelligence.ts'),
    path.join(__dirname, '..', 'lib', 'rag', 'vectorStore.ts'),
  ];

  for (const f of codeFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const base = path.basename(f);
    assert(!content.includes("from 'fs'") && !content.includes('require(\'fs\')') && !content.includes('require("fs")'), `${base} has ZERO fs module imports`);
    assert(!content.includes('.analytics_storage') || content.includes('Eliminates /var/task/.analytics_storage'), `${base} has NO .analytics_storage filesystem path access`);
    assert(!content.includes('.exam_storage') || content.includes('Eliminates /var/task/.exam_storage'), `${base} has NO .exam_storage filesystem path access`);
  }

  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
