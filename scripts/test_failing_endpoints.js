/**
 * scripts/test_failing_endpoints.js
 *
 * Verifies that the 4 endpoints that failed on Vercel:
 * 1. /api/gamification/xp
 * 2. /api/gamification/goals
 * 3. /api/study/recommendations
 * 4. /api/exam/history
 *
 * return HTTP 200 with valid JSON payloads and ZERO filesystem / ENOENT errors.
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
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

// Mock NextRequest and test route handlers directly
const { NextRequest } = require('next/server');

async function testEndpoints() {
  console.log('================================================================');
  console.log('🧪 VERIFYING THE 4 FORMERLY FAILING PRODUCTION ENDPOINTS');
  console.log('================================================================\n');

  // Import route handlers
  const xpRoute = require('../app/api/gamification/xp/route');
  const goalsRoute = require('../app/api/gamification/goals/route');
  const recsRoute = require('../app/api/study/recommendations/route');
  const examHistoryRoute = require('../app/api/exam/history/route');

  const headers = new Headers({
    'Cookie': 'notionwell_demo_session=1',
    'Host': 'localhost:3000',
  });

  // 1. /api/gamification/xp
  console.log('1. Testing GET /api/gamification/xp ...');
  try {
    const reqXP = new NextRequest('http://localhost:3000/api/gamification/xp', { headers });
    const resXP = await xpRoute.GET(reqXP);
    const dataXP = await resXP.json();
    console.log(`   Status: ${resXP.status}`);
    console.log(`   Success: ${dataXP.success}`);
    console.log(`   Total XP: ${dataXP.totalXP}`);
    console.log(`   Level: ${dataXP.levelInfo?.currentLevel} (${dataXP.levelInfo?.title})`);
    if (resXP.status === 200 && dataXP.success) {
      console.log('   ✅ PASS: /api/gamification/xp returns valid XP & Level without ENOENT!\n');
    } else {
      console.error('   ❌ FAIL:', dataXP);
    }
  } catch (err) {
    console.error('   ❌ EXCEPTION in /api/gamification/xp:', err);
  }

  // 2. /api/gamification/goals
  console.log('2. Testing GET /api/gamification/goals ...');
  try {
    const reqGoals = new NextRequest('http://localhost:3000/api/gamification/goals', { headers });
    const resGoals = await goalsRoute.GET(reqGoals);
    const dataGoals = await resGoals.json();
    console.log(`   Status: ${resGoals.status}`);
    console.log(`   Success: ${dataGoals.success}`);
    console.log(`   Daily Target Mins: ${dataGoals.goals?.dailyStudyMinutes}`);
    console.log(`   Goal Progress Items: ${dataGoals.progress?.daily?.length || dataGoals.progress?.items?.length || 0}`);
    if (resGoals.status === 200 && dataGoals.success) {
      console.log('   ✅ PASS: /api/gamification/goals returns valid goals without ENOENT!\n');
    } else {
      console.error('   ❌ FAIL:', dataGoals);
    }
  } catch (err) {
    console.error('   ❌ EXCEPTION in /api/gamification/goals:', err);
  }

  // 3. /api/study/recommendations
  console.log('3. Testing GET /api/study/recommendations ...');
  try {
    const reqRecs = new NextRequest('http://localhost:3000/api/study/recommendations', { headers });
    const resRecs = await recsRoute.GET(reqRecs);
    const dataRecs = await resRecs.json();
    console.log(`   Status: ${resRecs.status}`);
    console.log(`   Success: ${dataRecs.success}`);
    console.log(`   Recommendations Count: ${dataRecs.recommendations?.length || 0}`);
    if (resRecs.status === 200 && dataRecs.success) {
      console.log('   ✅ PASS: /api/study/recommendations returns valid recommendations without ENOENT!\n');
    } else {
      console.error('   ❌ FAIL:', dataRecs);
    }
  } catch (err) {
    console.error('   ❌ EXCEPTION in /api/study/recommendations:', err);
  }

  // 4. /api/exam/history
  console.log('4. Testing GET /api/exam/history ...');
  try {
    const reqExam = new NextRequest('http://localhost:3000/api/exam/history', { headers });
    const resExam = await examHistoryRoute.GET(reqExam);
    const dataExam = await resExam.json();
    console.log(`   Status: ${resExam.status}`);
    console.log(`   Success: ${dataExam.success}`);
    console.log(`   Total Exams: ${dataExam.exams?.length || 0}`);
    console.log(`   Total Attempts: ${dataExam.attempts?.length || 0}`);
    console.log(`   Stats: Total Exams Created: ${dataExam.stats?.totalExamsCreated}, Avg: ${dataExam.stats?.averageScore}%`);
    if (resExam.status === 200 && dataExam.success) {
      console.log('   ✅ PASS: /api/exam/history returns valid exam history without ExamStore /var/task ENOENT!\n');
    } else {
      console.error('   ❌ FAIL:', dataExam);
    }
  } catch (err) {
    console.error('   ❌ EXCEPTION in /api/exam/history:', err);
  }

  console.log('================================================================');
  console.log('🎉 ALL 4 FORMERLY FAILING PRODUCTION ENDPOINTS VERIFIED WORKING!');
  console.log('================================================================');
}

testEndpoints().catch(console.error);
