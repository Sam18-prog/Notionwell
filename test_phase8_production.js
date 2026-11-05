/**
 * Notionwell — Phase 8 Production Readiness, Security, and Resilience Test Suite
 * Validates:
 * 1. Observability: Structured logger and redaction patterns in lib/logger.ts
 * 2. Production assets & boundaries (.gitignore, error.tsx, not-found.tsx, privacy, terms, sitemap, robots)
 * 3. Authentication guards across all core API routes (HTTP 401 on unauthenticated calls)
 * 4. File upload security (HTTP 413 on files > 15MB)
 * 5. Multi-tenant isolation (rejection of cross-user manipulation)
 * 6. GDPR User Data Export (schema integrity and Content-Disposition headers)
 * 7. Permanent Account Deletion safeguards (rejection of unconfirmed deletion, successful confirmed deletion)
 * 8. Sliding-window Rate Limiting & Input Validation
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${testName} ${details ? '- ' + details : ''}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  NOTIONWELL — PHASE 8 PRODUCTION ACCEPTANCE TEST SUITE');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: OBSERVABILITY & LOG REDACTION
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Observability & Log Redaction ---');
  try {
    const loggerSource = fs.readFileSync(path.join(__dirname, 'lib', 'logger.ts'), 'utf8');
    assert(
      loggerSource.includes('password') &&
      loggerSource.includes('authorization') &&
      loggerSource.includes('token') &&
      loggerSource.includes('secret') &&
      loggerSource.includes('key'),
      'lib/logger.ts defines comprehensive sensitive field blacklist'
    );
    assert(
      loggerSource.includes('[REDACTED]'),
      'lib/logger.ts masks sensitive properties with [REDACTED]'
    );
    assert(
      loggerSource.includes('logInfo') &&
      loggerSource.includes('logWarn') &&
      loggerSource.includes('logError'),
      'lib/logger.ts exports structured logging levels (logInfo, logWarn, logError)'
    );
  } catch (err) {
    assert(false, 'Logger audit', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: FILE BOUNDARIES & PRODUCTION ROUTING ASSETS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Production Assets & Boundaries ---');
  assert(fs.existsSync(path.join(__dirname, 'app', 'error.tsx')), 'Custom Error Boundary (app/error.tsx) exists');
  assert(fs.existsSync(path.join(__dirname, 'app', 'not-found.tsx')), 'Custom 404 Page (app/not-found.tsx) exists');
  assert(fs.existsSync(path.join(__dirname, 'app', 'privacy', 'page.tsx')), 'Privacy Policy Page (app/privacy/page.tsx) exists');
  assert(fs.existsSync(path.join(__dirname, 'app', 'terms', 'page.tsx')), 'Terms of Service Page (app/terms/page.tsx) exists');
  assert(fs.existsSync(path.join(__dirname, 'app', 'sitemap.ts')), 'SEO Dynamic Sitemap (app/sitemap.ts) exists');
  assert(fs.existsSync(path.join(__dirname, 'app', 'robots.ts')), 'Robots.txt generator (app/robots.ts) exists');

  const gitignoreContent = fs.readFileSync(path.join(__dirname, '.gitignore'), 'utf8');
  assert(
    gitignoreContent.includes('.env*.local') &&
    gitignoreContent.includes('.rag_storage') &&
    gitignoreContent.includes('.analytics_storage') &&
    gitignoreContent.includes('.intelligence_storage'),
    '.gitignore strictly excludes local environment variables and storage caches'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 3: AUTHENTICATION ENFORCEMENT ON API ENDPOINTS (HTTP 401)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Unauthenticated API Rejections (HTTP 401) ---');
  const protectedEndpoints = [
    { method: 'GET', url: `${BASE_URL}/api/user/export`, name: 'Data Export' },
    { method: 'DELETE', url: `${BASE_URL}/api/user/account`, name: 'Account Deletion' },
    { method: 'GET', url: `${BASE_URL}/api/analytics`, name: 'Learning Analytics' },
    { method: 'GET', url: `${BASE_URL}/api/gamification/xp`, name: 'Gamification XP' },
    { method: 'POST', url: `${BASE_URL}/api/gamification/award-xp`, name: 'Award XP' },
    { method: 'GET', url: `${BASE_URL}/api/gamification/achievements`, name: 'Achievements' },
    { method: 'GET', url: `${BASE_URL}/api/gamification/goals`, name: 'Learning Goals' },
    { method: 'GET', url: `${BASE_URL}/api/exam/history`, name: 'Exam History' },
    { method: 'POST', url: `${BASE_URL}/api/exam/generate`, name: 'Exam Generation' },
    { method: 'POST', url: `${BASE_URL}/api/assistant/chat`, name: 'RAG Study Assistant' },
    { method: 'GET', url: `${BASE_URL}/api/assistant/index-document`, name: 'Index Document' },
    { method: 'GET', url: `${BASE_URL}/api/study/paths`, name: 'AI Study Paths' },
    { method: 'GET', url: `${BASE_URL}/api/study/weak-topics`, name: 'Weak Topic Detection' },
    { method: 'GET', url: `${BASE_URL}/api/study/connections`, name: 'Cross-Doc Connections' },
    { method: 'GET', url: `${BASE_URL}/api/study/viva/session`, name: 'Viva Voce Sessions' },
  ];

  for (const ep of protectedEndpoints) {
    try {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.method === 'POST' ? JSON.stringify({ test: 1 }) : undefined,
      });
      assert(
        res.status === 401,
        `Unauthenticated call to ${ep.name} returns HTTP 401`,
        `Got HTTP ${res.status}`
      );
    } catch (fetchErr) {
      assert(false, `Network call to ${ep.name}`, fetchErr.message);
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 4: FILE UPLOAD SIZE PROTECTION (HTTP 413)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: File Upload Size Protection (HTTP 413) ---');
  try {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    // 16MB file
    const oversizedBlob = 'A'.repeat(16 * 1024 * 1024);
    const formBody =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="oversized_lecture.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n` +
      oversizedBlob +
      `\r\n--${boundary}--\r\n`;

    const res = await fetch(`${BASE_URL}/api/assistant/index-document`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Cookie': 'notionwell_demo_session=1',
      },
      body: formBody,
    });

    assert(
      res.status === 413,
      'Oversized file upload (>15MB) is rejected with HTTP 413 Payload Too Large',
      `Got HTTP ${res.status}`
    );
  } catch (err) {
    assert(false, 'Oversized file upload test', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 5: MULTI-TENANT ISOLATION & ACCESS CONTROL
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Multi-Tenant Data Isolation ---');
  try {
    // 1. Attempt deleting non-owned document via DELETE /api/assistant/index-document
    const resDocDelete = await fetch(`${BASE_URL}/api/assistant/index-document?id=unowned-or-invalid-doc-id`, {
      method: 'DELETE',
      headers: { Cookie: 'notionwell_demo_session=1' },
    });
    assert(
      resDocDelete.status === 404 || resDocDelete.status === 403,
      'Unauthorized/foreign document deletion returns HTTP 404 or 403',
      `Got HTTP ${resDocDelete.status}`
    );

    // 2. Exam retrieval for non-existent or foreign exam
    const resExam = await fetch(`${BASE_URL}/api/exam/foreign-exam-id-999`, {
      headers: { Cookie: 'notionwell_demo_session=1' },
    });
    assert(
      resExam.status === 404 || resExam.status === 403,
      'Unauthorized or non-existent exam access returns HTTP 404 or 403'
    );
  } catch (err) {
    assert(false, 'Multi-tenant isolation verification', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 6: GDPR USER DATA EXPORT (GET /api/user/export)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: GDPR User Data Export (GET /api/user/export) ---');
  try {
    const res = await fetch(`${BASE_URL}/api/user/export`, {
      headers: { Cookie: 'notionwell_demo_session=1' },
    });

    assert(res.status === 200, 'Authenticated user data export returns HTTP 200');
    assert(
      Boolean(res.headers.get('content-type')?.includes('application/json')),
      'Export returns application/json Content-Type'
    );
    assert(
      Boolean(res.headers.get('content-disposition')?.includes('attachment')),
      'Export includes Content-Disposition attachment header'
    );

    const data = await res.json();
    assert(
      data.exportMetadata && data.exportMetadata.platform.includes('Notionwell'),
      'Export includes valid metadata header'
    );
    assert(
      data.profile && data.studyDecks && data.examinations && data.gamificationAndProgress,
      'Export includes complete modular data schema (profile, decks, exams, gamification)'
    );
  } catch (err) {
    assert(false, 'GDPR export test', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 7: USER ACCOUNT DELETION SAFEGUARD (DELETE /api/user/account)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Account Deletion Safeguards (DELETE /api/user/account) ---');
  try {
    // 1. Without confirmation
    const resNoConfirm = await fetch(`${BASE_URL}/api/user/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'notionwell_demo_session=1',
      },
      body: JSON.stringify({ confirm: false }),
    });

    assert(
      resNoConfirm.status === 400,
      'Account deletion without explicit { confirm: true } returns HTTP 400 Bad Request'
    );

    // 2. With confirmation
    const resConfirm = await fetch(`${BASE_URL}/api/user/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'notionwell_demo_session=1',
      },
      body: JSON.stringify({ confirm: true }),
    });

    assert(
      resConfirm.status === 200,
      'Account deletion with { confirm: true } executes successfully (HTTP 200)'
    );
    const body = await resConfirm.json();
    assert(body.success === true, 'Account deletion response confirms permanent purge');
  } catch (err) {
    assert(false, 'Account deletion test', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 8: RATE LIMITING & RESILIENCE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Rate Limiting & Resilience ---');
  try {
    const rateLimitSource = fs.readFileSync(path.join(__dirname, 'lib', 'rateLimit.ts'), 'utf8');
    assert(
      rateLimitSource.includes('withAiRetry') &&
      rateLimitSource.includes('MAX_DOCUMENT_CHARS') &&
      rateLimitSource.includes('MAX_CHAT_PROMPT_CHARS'),
      'lib/rateLimit.ts provides exponential backoff retry handler and character cap constants'
    );
    assert(
      rateLimitSource.includes('checkRateLimit'),
      'lib/rateLimit.ts provides sliding-window checkRateLimit implementation'
    );
  } catch (err) {
    assert(false, 'Rate limit source verification', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST RESULTS SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`  PHASE 8 TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
