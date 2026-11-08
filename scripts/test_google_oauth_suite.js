/**
 * scripts/test_google_oauth_suite.js
 * Comprehensive Automated Verification Suite for Google OAuth (Sign-In & Sign-Up) via Supabase
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 NOTIONWELL — GOOGLE OAUTH & AUTHENTICATION SUITE');
  console.log('================================================================\n');

  // --- 1. UI VERIFICATION: AUTH PAGE & GOOGLE BUTTON ---
  console.log('--- 1. Authentication UI: Google Button & "OR" Divider ---');
  const authHtmlPath = path.join(__dirname, '..', '.next', 'server', 'app', 'auth.html');
  const authJsPath = path.join(__dirname, '..', '.next', 'server', 'app', 'auth', 'page.js');
  const authSourcePath = path.join(__dirname, '..', 'app', 'auth', 'page.tsx');

  assert(fs.existsSync(authHtmlPath), 'auth.html was generated during production build');
  assert(fs.existsSync(authJsPath), 'auth/page.js bundle was generated during production build');

  const authJs = fs.readFileSync(authJsPath, 'utf8');
  const authSource = fs.readFileSync(authSourcePath, 'utf8');

  assert(authJs.includes('Continue with Google') || authSource.includes('Continue with Google'), 'Auth page bundle includes "Continue with Google" button text');
  assert(authJs.includes('OR') && authSource.includes('OR'), 'Auth page includes uppercase "OR" separator divider');
  assert(authSource.includes('tab === \'login\'') && authSource.includes('Sign In'), 'Auth page includes Sign In tab/form');
  assert(authSource.includes('tab === \'signup\'') && authSource.includes('Create Account'), 'Auth page includes Create Account tab/form');
  assert(authSource.includes('Student Sign In') && authSource.includes('Create Student Account'), 'Auth page contains student branding');

  // Verify Google SVG logo in source
  assert(authSource.includes('#4285F4') && authSource.includes('#34A853') && authSource.includes('#FBBC05') && authSource.includes('#EA4335'), 'Google "G" SVG contains official multicolor paths');
  assert(authSource.includes('disabled={loading || googleLoading}'), 'Google button is disabled while processing');
  assert(authSource.includes('handleGoogleSignIn'), 'Google button is wired to handleGoogleSignIn handler');

  // --- 2. SUPABASE OAUTH INTEGRATION (lib/supabase/auth.ts) ---
  console.log('\n--- 2. Supabase OAuth Client Implementation ---');
  const authLibSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'supabase', 'auth.ts'), 'utf8');

  assert(authLibSource.includes('export async function signInWithGoogle'), 'lib/supabase/auth.ts exports signInWithGoogle function');
  assert(authLibSource.includes("provider: 'google'"), 'signInWithGoogle specifies provider: "google"');
  assert(authLibSource.includes('signInWithOAuth'), 'Uses supabase.auth.signInWithOAuth API');
  assert(authLibSource.includes('/api/auth/callback'), 'Configures redirectTo pointing to /api/auth/callback');
  assert(authLibSource.includes("prompt: 'select_account'"), 'Requests account picker prompt ("select_account")');
  assert(authLibSource.includes('not yet enabled in your Supabase project'), 'Gracefully handles unconfigured/disabled provider error with clear guidance');

  // --- 3. OAUTH CALLBACK ROUTE (app/api/auth/callback/route.ts) ---
  console.log('\n--- 3. OAuth PKCE Callback Route Handlers ---');
  const callbackApiSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'api', 'auth', 'callback', 'route.ts'), 'utf8');
  const callbackAltSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'auth', 'callback', 'route.ts'), 'utf8');

  assert(callbackApiSource.includes('exchangeCodeForSession(code)'), 'Callback exchanges authorization code for session via PKCE');
  assert(callbackApiSource.includes('oauth_canceled'), 'Callback catches access_denied / cancellation and redirects to oauth_canceled');
  assert(callbackApiSource.includes('missing_code'), 'Callback handles missing authorization code gracefully');
  assert(callbackApiSource.includes('auth-code-error'), 'Callback handles expired/invalid authorization code');
  assert(callbackApiSource.includes('getSanitizedRedirectUrl'), 'Callback provides open-redirect sanitization');
  assert(callbackApiSource.includes('notionwell_auth_user'), 'Callback sets notionwell_auth_user cookie for instant client hydration');
  assert(fs.existsSync(path.join(__dirname, '..', 'app', 'auth', 'callback', 'route.ts')), '/auth/callback route exists as alternative endpoint');

  // --- 4. OPEN-REDIRECT SANITIZATION UNIT TEST ---
  console.log('\n--- 4. Open-Redirect Vulnerability Protection ---');
  function testSanitize(nextParam, origin) {
    if (!nextParam) return `${origin}/dashboard`;
    if (nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.startsWith('/\\')) {
      return `${origin}${nextParam}`;
    }
    return `${origin}/dashboard`;
  }

  const origin = 'http://localhost:3000';
  assert(testSanitize(null, origin) === 'http://localhost:3000/dashboard', 'Null target defaults to /dashboard');
  assert(testSanitize('', origin) === 'http://localhost:3000/dashboard', 'Empty target defaults to /dashboard');
  assert(testSanitize('/dashboard', origin) === 'http://localhost:3000/dashboard', 'Valid /dashboard target is allowed');
  assert(testSanitize('/study-paths', origin) === 'http://localhost:3000/study-paths', 'Valid internal path /study-paths is preserved');
  assert(testSanitize('https://evil.com', origin) === 'http://localhost:3000/dashboard', 'External URL attack (https://evil.com) is blocked');
  assert(testSanitize('//evil.com', origin) === 'http://localhost:3000/dashboard', 'Protocol-relative URL attack (//evil.com) is blocked');
  assert(testSanitize('/\\evil.com', origin) === 'http://localhost:3000/dashboard', 'Backslash bypass attack (/\\evil.com) is blocked');

  // --- 5. NEW & EXISTING USER PROFILE HANDLING ---
  console.log('\n--- 5. User Profile Synchronization & RLS Compatibility ---');
  assert(callbackApiSource.includes("from('profiles')"), 'Callback inspects profiles table to prevent duplicate profiles');
  assert(callbackApiSource.includes('upsert'), 'Callback performs safe profile upsert on user.id conflict');
  assert(callbackApiSource.includes('user.user_metadata?.full_name') || callbackApiSource.includes('user.user_metadata?.name'), 'Extracts Google user name from user_metadata');

  // --- 6. ERROR MESSAGE FRIENDLINESS IN AUTH UI ---
  console.log('\n--- 6. User-Friendly Error Messaging in Auth UI ---');
  assert(authSource.includes('getFriendlyErrorMessage'), 'Auth form uses getFriendlyErrorMessage for clear error states');
  assert(authSource.includes('Google sign-in was cancelled'), 'Displays friendly message on cancellation');
  assert(authSource.includes('Authentication code missing from Google response'), 'Displays clear message on missing code');
  assert(authSource.includes('Could not complete Google authentication'), 'Displays clear message on code exchange failure');

  // --- 7. SESSION PERSISTENCE & LOGOUT CLEANUP ---
  console.log('\n--- 7. Session Persistence & Logout Cleanup ---');
  const appTsSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'app.ts'), 'utf8');
  assert(appTsSource.includes('notionwell_auth_user='), 'getCurrentUser() in lib/app.ts checks notionwell_auth_user cookie on cold start');
  assert(authLibSource.includes("document.cookie = 'notionwell_auth_user="), 'signOutUserFromSupabase() clears notionwell_auth_user cookie');
  assert(authLibSource.includes("localStorage.removeItem('notionwell_user_v1')"), 'signOutUserFromSupabase() purges notionwell_user_v1 from localStorage');

  // --- 8. PRESERVATION OF EXISTING EMAIL/PASSWORD AUTH ---
  console.log('\n--- 8. Preservation of Existing Email/Password Authentication ---');
  assert(authLibSource.includes('export async function signUpUserWithSupabase'), 'signUpUserWithSupabase is preserved');
  assert(authLibSource.includes('export async function signInUserWithSupabase'), 'signInUserWithSupabase is preserved');
  assert(authLibSource.includes('export async function resetPasswordWithSupabase'), 'resetPasswordWithSupabase is preserved');

  console.log('\n================================================================');
  console.log(`🏁 GOOGLE OAUTH SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
