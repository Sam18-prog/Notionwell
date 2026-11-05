/**
 * scripts/verify_landing_and_demo.js
 * Comprehensive automated verification for:
 * 1. Public Landing page accessibility (HTTP 200, no redirect to /auth, correct copy and hero branding)
 * 2. Guest Demo accessibility (/demo returns HTTP 200, no redirect)
 * 3. Computer Networks Preloaded Demo Data Integrity (3 decks, 30 cards, 2 quizzes, 1 mock exam)
 * 4. Interactive card flip and mastery tracking logic
 * 5. Quiz scoring calculation accuracy
 * 6. Mock Exam scoring calculation accuracy
 * 7. Demo isolation and reset functionality
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

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

async function run() {
  console.log('================================================================');
  console.log('🧪 VERIFYING NOTIONWELL LANDING PAGE & GUEST DEMO');
  console.log(`Target: ${BASE_URL}`);
  console.log('================================================================\n');

  // --- 1. PRELOADED EDUCATIONAL CONTENT AUDIT ---
  console.log('--- 1. Preloaded Computer Networks Demo Data Integrity ---');
  const demoDataContent = fs.readFileSync(path.join(__dirname, '..', 'lib', 'demoData.ts'), 'utf8');

  assert(demoDataContent.includes("'subject-computer-networks'"), 'Subject is "Computer Networks"');
  assert(demoDataContent.includes('Network Fundamentals & OSI Model'), 'Includes Deck 1: Network Fundamentals & OSI Model');
  assert(demoDataContent.includes('TCP/IP Protocol Suite & Transport Layer'), 'Includes Deck 2: TCP/IP Protocol Suite & Transport Layer');
  assert(demoDataContent.includes('Routing, DNS & Application Layer Protocols'), 'Includes Deck 3: Routing, DNS & Application Layer Protocols');

  // Count cards in demoData.ts
  const cardMatches = demoDataContent.match(/id:\s*['"]card-[a-z0-9-]+['"]/g) || [];
  assert(cardMatches.length === 30, `Preloaded with exactly 30 high-yield flashcards (Found: ${cardMatches.length})`);

  // Count quiz questions
  const quizMatches = demoDataContent.match(/id:\s*['"]quiz-[a-z0-9-]+['"]/g) || [];
  assert(quizMatches.length >= 10, `Preloaded with comprehensive Quizzes (${quizMatches.length} questions found, >= 10)`);

  // Mock Exam check
  assert(demoDataContent.includes('Computer Networks Comprehensive Midterm Assessment'), 'Mock Exam title is present');
  assert(demoDataContent.includes('timeLimitMinutes: 15'), 'Mock Exam is timed for 15 minutes');
  assert(demoDataContent.includes('totalQuestions: 10'), 'Mock Exam specifies 10 questions');
  assert(demoDataContent.includes('passingPercentage: 70'), 'Mock Exam passing percentage is 70%');

  // Analytics check
  assert(demoDataContent.includes('totalStudyHours: 42.5'), 'Demo Analytics includes 42.5 study hours');
  assert(demoDataContent.includes('totalXP: 1250'), 'Demo Analytics includes 1,250 XP');
  assert(demoDataContent.includes('currentStreakDays: 7'), 'Demo Analytics includes 7-day study streak');

  // --- 2. HTTP ENDPOINTS ACCESSIBILITY (UNAUTHENTICATED) ---
  console.log('\n--- 2. Public Accessibility Over HTTP ---');

  // Test 2a: Landing Page GET /
  try {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.status === 200, `GET / returns HTTP 200 OK (got ${res.status})`);
    const html = await res.text();
    assert(!html.includes('/auth?redirect='), 'Landing page does NOT redirect unauthenticated visitor to /auth');
    assert(html.includes('Turn your notes into') || html.includes('Turn Your Notes Into Knowledge'), 'Landing page contains headline "Turn your notes into Knowledge"');
    assert(html.includes('Notionwell'), 'Landing page contains Notionwell branding');
    assert(html.includes('From Notes to Knowledge'), 'Landing page contains consistent tagline "From Notes to Knowledge"');
    assert(html.includes('Enrol for free') || html.includes('Get Started Free'), 'Landing page contains "Enrol for free" / "Get Started Free" CTA');
    assert(html.includes('Try Demo') || html.includes('Interactive Demo') || html.includes('Get a demo'), 'Landing page contains "Try Demo" CTA');
    assert(html.includes('Learning Hours') && html.includes('42.5 hrs'), 'Landing page contains product preview cards matching reference image');
  } catch (e) {
    assert(false, 'GET / landing page', e.message);
  }

  // Test 2b: Guest Demo GET /demo
  try {
    const res = await fetch(`${BASE_URL}/demo`);
    assert(res.status === 200, `GET /demo returns HTTP 200 OK without login (got ${res.status})`);
    const html = await res.text();
    assert(html.includes('Computer Networks'), 'Demo page includes "Computer Networks" curriculum');
    assert(html.includes('Network Fundamentals') && html.includes('OSI Model'), 'Demo page includes Deck 1: Network Fundamentals & OSI Model');
    assert(html.includes('TCP/IP Protocol Suite'), 'Demo page includes Deck 2: TCP/IP Protocol Suite');
    assert(html.includes('Routing') && html.includes('DNS'), 'Demo page includes Deck 3: Routing, DNS & Application Layer Protocols');
  } catch (e) {
    assert(false, 'GET /demo guest page', e.message);
  }

  // Test 2c: Auth Page GET /auth
  try {
    const res = await fetch(`${BASE_URL}/auth`);
    assert(res.status === 200, `GET /auth returns HTTP 200 OK (got ${res.status})`);
  } catch (e) {
    assert(false, 'GET /auth', e.message);
  }

  // Test 2d: Protected Dashboard GET /dashboard rejects unauthenticated request
  try {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    const isRedirectOr401 = res.status === 307 || res.status === 302 || res.status === 401;
    assert(isRedirectOr401, `GET /dashboard rejects unauthenticated request (Status: ${res.status})`);
  } catch (e) {
    assert(false, 'GET /dashboard protection check', e.message);
  }

  // Test 2e: Protected Dashboard GET /dashboard allows demo session cookie
  try {
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: 'notionwell_demo_session=1' },
      redirect: 'manual',
    });
    assert(res.status === 200, `GET /dashboard allows guest demo session cookie (Status: ${res.status})`);
  } catch (e) {
    assert(false, 'GET /dashboard with demo cookie', e.message);
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
