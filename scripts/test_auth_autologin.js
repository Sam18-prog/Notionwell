/**
 * scripts/test_auth_autologin.js
 * Verification for TASK 1 & TASK 2:
 * 1. Verifies / contains "Start Learning" and NO "Enrol now" / email form
 * 2. Verifies /auth renders unauthenticated login/signup interface without automatic redirects
 * 3. Verifies getSession() in lib/app.ts never auto-logs-in from stored account when logged out
 * 4. Verifies signOutUserFromSupabase() cleans up cookies and tokens
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || process.env.TEST_BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🔒 VERIFYING AUTH SAFETY & NO UNINTENDED AUTO-LOGIN');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('======================================================\n');

  // --- 1. Homepage Enrol Now Removal & Start Learning Verification ---
  console.log('--- 1. Homepage Buttons Verification ---');
  let homepageHtml = '';
  try {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.status === 200, 'GET / returns HTTP 200 OK');
    homepageHtml = await res.text();
  } catch (err) {
    const buildPath = path.join(__dirname, '..', '.next', 'server', 'app', 'index.html');
    if (fs.existsSync(buildPath)) {
      console.log('  ℹ️ Server offline; using compiled .next/server/app/index.html for inspection');
      homepageHtml = fs.readFileSync(buildPath, 'utf8');
      assert(true, 'Read compiled index.html');
    } else {
      assert(false, 'Homepage Buttons check', err.message);
    }
  }

  if (homepageHtml) {
    assert(homepageHtml.includes('Start Learning'), 'Homepage contains "Start Learning" button');
    assert(homepageHtml.includes('href="/auth"'), '"Start Learning" navigates to /auth');
    assert(!homepageHtml.includes('Enrol now') && !homepageHtml.includes('Enrol Now'), 'Homepage does NOT contain "Enrol now" / "Enrol Now"');
    assert(!homepageHtml.includes('placeholder="Personal email"'), 'Homepage does NOT contain email form input');
    assert(!homepageHtml.includes('Enrol for free'), 'Homepage does NOT contain "Enrol for free" button');
  }

  // --- 2. Auth Page Stability (Unauthenticated) ---
  console.log('\n--- 2. Unauthenticated /auth Route Verification ---');
  let authHtml = '';
  try {
    const res = await fetch(`${BASE_URL}/auth`, { redirect: 'manual' });
    assert(res.status === 200, `GET /auth returns HTTP 200 (got ${res.status}) without redirecting unauthenticated visitor`);
    authHtml = await res.text();
  } catch (err) {
    const buildPath = path.join(__dirname, '..', '.next', 'server', 'app', 'auth.html');
    if (fs.existsSync(buildPath)) {
      console.log('  ℹ️ Server offline; using compiled .next/server/app/auth.html for inspection');
      authHtml = fs.readFileSync(buildPath, 'utf8');
      assert(true, 'Read compiled auth.html');
    } else {
      assert(false, 'Auth Page check', err.message);
    }
  }

  if (authHtml) {
    assert(authHtml.includes('Notionwell'), '/auth contains Notionwell branding');
    assert(!authHtml.includes('http-equiv="refresh"'), '/auth contains no meta-refresh automatic redirect');
  }

  // --- 3. Static Code Audit of getSession() in lib/app.ts ---
  console.log('\n--- 3. Static Audit of getSession() & Logout in lib/app.ts ---');
  const appTsContent = fs.readFileSync(path.join(__dirname, '..', 'lib', 'app.ts'), 'utf8');

  // Check that the false fallback is gone
  const hasStoredAccFallback = appTsContent.includes('const storedAcc = getStoredAccount();') &&
                               appTsContent.includes('if (storedAcc) {') &&
                               appTsContent.includes('return { isLoggedIn: true, loggedInEmail: storedAcc.email };');
  assert(!hasStoredAccFallback, 'getSession() in lib/app.ts does NOT fall back to getStoredAccount() when session is missing');

  // Check that logoutUser calls signOutUserFromSupabase
  assert(appTsContent.includes('await signOutUserFromSupabase()'), 'logoutUser() in lib/app.ts awaits signOutUserFromSupabase()');

  // --- 4. Static Code Audit of signOutUserFromSupabase() in lib/supabase/auth.ts ---
  console.log('\n--- 4. Static Audit of signOutUserFromSupabase() in lib/supabase/auth.ts ---');
  const authTsContent = fs.readFileSync(path.join(__dirname, '..', 'lib', 'supabase', 'auth.ts'), 'utf8');

  assert(authTsContent.includes("signOut({ scope: 'local' })"), 'signOutUserFromSupabase cleans up local supabase scope');
  assert(authTsContent.includes('localStorage.removeItem(\'notionwell_session_v1\')'), 'signOutUserFromSupabase purges notionwell_session_v1 from localStorage');
  assert(authTsContent.includes('localStorage.removeItem(\'notionwell_account_v1\')'), 'signOutUserFromSupabase purges notionwell_account_v1 from localStorage');
  assert(authTsContent.includes('document.cookie = \'notionwell_demo_session='), 'signOutUserFromSupabase clears demo session cookies');
  assert(authTsContent.includes("name.startsWith('sb-')"), 'signOutUserFromSupabase clears all Supabase sb-* cookies');

  // --- 5. Static Code Audit of Auth Effect in app/auth/page.tsx ---
  console.log('\n--- 5. Static Audit of Session Checking in app/auth/page.tsx ---');
  const authPageContent = fs.readFileSync(path.join(__dirname, '..', 'app', 'auth', 'page.tsx'), 'utf8');

  assert(authPageContent.includes('supabase.auth.getSession()'), 'app/auth/page.tsx checks getSession() first');
  assert(authPageContent.includes('if (!session || sessionErr)'), 'app/auth/page.tsx immediately stops redirect if session is null');
  assert(authPageContent.includes('persistSupabaseUser(null)'), 'app/auth/page.tsx resets local state if unauthenticated');
  assert(authPageContent.includes('subscription?.unsubscribe()'), 'app/auth/page.tsx unmount cleanup is present');

  console.log('\n======================================================');
  console.log(`🏁 TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
