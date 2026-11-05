// test_phase6_gamification_analytics.js
// Automated verification script for Phase 6: Advanced Analytics, Spaced Repetition & Gamification

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
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 6 VERIFICATION TEST SUITE (AUTHENTICATED)');
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
    // Obtain real Supabase JWT for test session
    const { data: signin, error: signinErr } = await anon.auth.signInWithPassword({
      email: 'audit.user1@notionwell.internal',
      password: 'TestPassword123!@#',
    });
    if (signinErr || !signin?.session?.access_token) {
      throw new Error('Failed to authenticate test user: ' + signinErr?.message);
    }
    const token = signin.session.access_token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // -------------------------------------------------------------
    // TEST 1: SM-2 Spaced Repetition Engine via /api/study/review/record
    // -------------------------------------------------------------
    console.log('📌 Test 1: SM-2 Spaced Repetition Algorithm & Review Recording');

    const testCardId = 'test-card-' + Date.now();
    const testDeckId = 'test-deck-phase6';

    // 1a. Test "again" rating (quality 1)
    const resAgain = await fetch(`${BASE_URL}/api/study/review/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        cardId: testCardId,
        deckId: testDeckId,
        rating: 'again',
        responseTimeMs: 3200,
      }),
    });
    const dataAgain = await resAgain.json();
    assert(dataAgain.success === true, 'Review with "again" succeeded');
    assert(dataAgain.sm2Result.intervalDays === 1, '"again" resets interval to 1 day');
    assert(dataAgain.sm2Result.repetitionCount === 0, '"again" resets repetitionCount to 0');
    assert(dataAgain.sm2Result.easinessFactor < 2.5, '"again" reduces easinessFactor below initial 2.5');
    assert(dataAgain.xpEarned === 5, '"again" awards 5 XP for effort');

    // Small delay to prevent debounce trigger
    await new Promise((r) => setTimeout(r, 900));

    // 1b. Test "good" rating (quality 4) on a new card
    const goodCardId = 'test-good-card-' + Date.now();
    const resGood1 = await fetch(`${BASE_URL}/api/study/review/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        cardId: goodCardId,
        deckId: testDeckId,
        rating: 'good',
        responseTimeMs: 2500,
      }),
    });
    const dataGood1 = await resGood1.json();
    assert(dataGood1.success === true, 'First "good" review succeeded');
    assert(dataGood1.sm2Result.intervalDays === 1, 'First "good" review interval is 1 day');
    assert(dataGood1.sm2Result.repetitionCount === 1, 'First "good" review repetitionCount is 1');
    assert(dataGood1.xpEarned === 10, '"good" awards 10 XP');

    await new Promise((r) => setTimeout(r, 900));

    // 1c. Test "easy" rating (quality 5)
    const easyCardId = 'test-easy-card-' + Date.now();
    const resEasy = await fetch(`${BASE_URL}/api/study/review/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        cardId: easyCardId,
        deckId: testDeckId,
        rating: 'easy',
        responseTimeMs: 1800,
      }),
    });
    const dataEasy = await resEasy.json();
    assert(dataEasy.success === true, 'Review with "easy" succeeded');
    assert(dataEasy.sm2Result.intervalDays >= 3, '"easy" awards accelerated interval (>=3 days)');
    assert(dataEasy.sm2Result.easinessFactor > 2.5, '"easy" increases easinessFactor above 2.5');
    assert(dataEasy.xpEarned === 15, '"easy" awards 15 XP');

    // -------------------------------------------------------------
    // TEST 2: Gamification XP Awarding & Server-Side Idempotency
    // -------------------------------------------------------------
    console.log('\n📌 Test 2: Server-Side XP Awarding & Idempotency Protection');

    const activityId = 'unique-activity-test-' + Date.now();

    // 2a. First award
    const resXp1 = await fetch(`${BASE_URL}/api/gamification/award-xp`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        activityType: 'quiz_completed',
        activityId: activityId,
        amount: 50,
        metadata: { test: true },
      }),
    });
    const dataXp1 = await resXp1.json();
    assert(dataXp1.success === true && dataXp1.awarded === true, 'First XP award succeeds');
    assert(dataXp1.amountAwarded === 50, 'Correct XP amount (50) is awarded');
    const xpAfterFirst = dataXp1.newTotalXP;

    // 2b. Duplicate award with identical activityId
    const resXp2 = await fetch(`${BASE_URL}/api/gamification/award-xp`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        activityType: 'quiz_completed',
        activityId: activityId,
        amount: 50,
        metadata: { test: true },
      }),
    });
    const dataXp2 = await resXp2.json();
    assert(dataXp2.success === true && dataXp2.awarded === false, 'Duplicate activityId is safely rejected (awarded: false)');
    assert(dataXp2.newTotalXP === xpAfterFirst, 'Duplicate XP request does NOT inflate totalXP');

    // -------------------------------------------------------------
    // TEST 3: Level & Progression Information
    // -------------------------------------------------------------
    console.log('\n📌 Test 3: Level & Progression Calculations');

    const resLevel = await fetch(`${BASE_URL}/api/gamification/xp`, {
      headers: authHeaders,
    });
    const dataLevel = await resLevel.json();
    assert(dataLevel.success === true, 'Successfully fetched level & XP profile');
    assert(typeof dataLevel.levelInfo.currentLevel === 'number' && dataLevel.levelInfo.currentLevel >= 1, 'Current level is a valid number >= 1');
    assert(dataLevel.levelInfo.totalXP >= 50, 'Total XP reflects previously awarded activities');
    const expectedLevel = Math.floor(Math.sqrt(dataLevel.levelInfo.totalXP / 50)) + 1;
    assert(dataLevel.levelInfo.currentLevel === expectedLevel, `Level matches formula Math.floor(Math.sqrt(totalXP / 50)) + 1 (${expectedLevel})`);
    assert(dataLevel.levelInfo.progressPercentage >= 0 && dataLevel.levelInfo.progressPercentage <= 100, 'Level progress percentage is between 0 and 100%');

    // -------------------------------------------------------------
    // TEST 4: Quiz Attempt Recording & Topic Accuracy
    // -------------------------------------------------------------
    console.log('\n📌 Test 4: Quiz Attempt Recording & Topic Accuracy');

    const quizAttemptId = 'test-quiz-' + Date.now();
    const resQuiz = await fetch(`${BASE_URL}/api/study/quiz/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        quizId: quizAttemptId,
        deckId: 'test-deck-phase6',
        totalQuestions: 10,
        correctAnswers: 9,
        topicScores: {
          'Cell Biology': { total: 5, correct: 5 },
          'Genetics': { total: 5, correct: 4 },
        },
        timeSpentSeconds: 120,
      }),
    });
    const dataQuiz = await resQuiz.json();
    assert(dataQuiz.success === true, 'Quiz attempt recorded successfully');
    assert(dataQuiz.attempt.scorePercentage === 90, 'Calculated accuracy percentage is 90%');
    assert(dataQuiz.xpEarned === 40, 'Earned 40 XP for completing quiz with high score');

    // -------------------------------------------------------------
    // TEST 5: Daily & Weekly Learning Goals
    // -------------------------------------------------------------
    console.log('\n📌 Test 5: Daily & Weekly Learning Goals');

    const resGoalsGet = await fetch(`${BASE_URL}/api/gamification/goals`, {
      headers: authHeaders,
    });
    const dataGoalsGet = await resGoalsGet.json();
    assert(dataGoalsGet.success === true, 'Successfully retrieved learning goals');
    assert(dataGoalsGet.goals.dailyStudyMinutes > 0, 'Daily study minutes target exists');
    assert(dataGoalsGet.progress.dailyCompletionPercentage !== undefined, 'Completion percentage is computed');

    // Update goals
    const resGoalsPost = await fetch(`${BASE_URL}/api/gamification/goals`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        dailyStudyMinutes: 45,
        dailyCardsReviewed: 25,
      }),
    });
    const dataGoalsPost = await resGoalsPost.json();
    assert(dataGoalsPost.success === true, 'Goals updated successfully');
    assert(dataGoalsPost.goals.dailyStudyMinutes === 45, 'Updated daily study minutes target persisted');
    assert(dataGoalsPost.goals.dailyCardsReviewed === 25, 'Updated daily cards target persisted');

    // -------------------------------------------------------------
    // TEST 6: Achievements System & Badge Evaluation
    // -------------------------------------------------------------
    console.log('\n📌 Test 6: Gamification Achievements & Progress Tracking');

    const resAch = await fetch(`${BASE_URL}/api/gamification/achievements`, {
      headers: authHeaders,
    });
    const dataAch = await resAch.json();
    assert(dataAch.success === true, 'Successfully retrieved achievements');
    assert(Array.isArray(dataAch.achievements) && dataAch.achievements.length === 16, `Contains exactly 16 canonical achievements (found ${dataAch.achievements.length})`);
    
    // Check categories exist
    const categories = new Set(dataAch.achievements.map((a) => a.category));
    assert(categories.has('consistency'), 'Consistency category exists');
    assert(categories.has('flashcards'), 'Flashcards category exists');
    assert(categories.has('quizzes'), 'Quizzes category exists');
    assert(categories.has('exams'), 'Exams category exists');
    assert(categories.has('milestones'), 'Milestones category exists');

    // First session badge check
    const firstSessionBadge = dataAch.achievements.find(
      (a) => a.achievementId === 'first_session' || a.id.includes('first_session')
    );
    assert(firstSessionBadge !== undefined, '"First Step" achievement exists');
    assert(firstSessionBadge.isUnlocked === true, '"First Step" is unlocked after our card reviews');

    // -------------------------------------------------------------
    // TEST 7: Advanced Analytics Aggregation (7d, 30d, 90d, All Time)
    // -------------------------------------------------------------
    console.log('\n📌 Test 7: Advanced Analytics Reports & Window Filtering');

    const resAnalytics7 = await fetch(`${BASE_URL}/api/analytics?days=7`, {
      headers: authHeaders,
    });
    const dataAnalytics7 = await resAnalytics7.json();
    const rep7 = dataAnalytics7.report || dataAnalytics7.data;
    assert(dataAnalytics7.success === true, 'Analytics for 7 days retrieved successfully');
    assert(rep7.overview !== undefined, 'Overview section is present');
    assert(rep7.overview.totalFlashcardsReviewed >= 1, `Records flashcard reviews (found ${rep7.overview.totalFlashcardsReviewed})`);
    assert(rep7.overview.quizzesCompleted >= 1, `Records quiz completion (found ${rep7.overview.quizzesCompleted})`);
    assert(rep7.performance !== undefined, 'Performance breakdown is calculated');
    assert(rep7.retention !== undefined, 'Retention statistics are computed');
    assert(Array.isArray(rep7.learningActivity.dailyActivity), 'Daily activity array is populated');

    const resAnalytics30 = await fetch(`${BASE_URL}/api/analytics?days=30`, {
      headers: authHeaders,
    });
    const dataAnalytics30 = await resAnalytics30.json();
    assert(dataAnalytics30.success === true, 'Analytics for 30 days retrieved successfully');

    // -------------------------------------------------------------
    // TEST 8: Grounded AI Study Recommendations
    // -------------------------------------------------------------
    console.log('\n📌 Test 8: Personalized AI Study Recommendations');

    const resRecs = await fetch(`${BASE_URL}/api/study/recommendations`, {
      headers: authHeaders,
    });
    const dataRecs = await resRecs.json();
    assert(dataRecs.success === true, 'AI Study recommendations API responded successfully');
    assert(Array.isArray(dataRecs.recommendations) && dataRecs.recommendations.length > 0, `Generated ${dataRecs.recommendations?.length || 0} actionable study recommendations`);
    const firstRec = dataRecs.recommendations[0];
    assert(firstRec.title && firstRec.reason && firstRec.targetRoute, 'Recommendation contains title, pedagogical reason, and actionable target route');

    // -------------------------------------------------------------
    // TEST 9: Frontend Pages Verification
    // -------------------------------------------------------------
    console.log('\n📌 Test 9: Frontend Route Accessibility');

    const routes = ['/', '/insights', '/review', '/exam', '/assistant'];
    for (const route of routes) {
      const res = await fetch(`${BASE_URL}${route}`);
      assert(res.status === 200, `Page route ${route} returned HTTP 200 OK`);
    }

    console.log('\n================================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Test suite execution error:', err);
    process.exit(1);
  }
}

runTests();
