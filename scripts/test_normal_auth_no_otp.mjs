/**
 * Comprehensive Test Suite: Normal Email/Password Authentication Without OTP
 * Verifies:
 * 1. Minimum password length >= 8 characters.
 * 2. Mandatory uppercase, lowercase, numbers, and symbols.
 * 3. Absence of email OTP login, OTP inputs, and OTP screens.
 * 4. Zero automatic OTP sends during signup/login.
 * 5. Uses standard signUp and signInWithPassword methods.
 * 6. Google OAuth authentication is preserved and functioning.
 * 7. When email confirmation is disabled in Supabase, signup proceeds immediately without verification.
 * 8. Password reset flow preserved with secure Supabase reset.
 * 9. Logout session cleanup and cookie clearing.
 * 10. Security integrity maintained without exposed credentials.
 */

import fs from 'fs';
import path from 'path';
import {
  checkPasswordRequirements,
  isPasswordValid,
  calculatePasswordStrength,
} from '../lib/passwordValidation.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🔒 NOTIONWELL — NORMAL AUTHENTICATION (NO OTP) TEST SUITE');
console.log('================================================================');

// 1. Password Policy & Complexity Requirements
console.log('\n--- 1. Password Policy Enforcement (8+ chars, upper, lower, digit, symbol) ---');
assert(checkPasswordRequirements('short1!').hasMinLength === false, 'Rejects password shorter than 8 characters');
assert(checkPasswordRequirements('lowercase123!').hasUppercase === false, 'Rejects password missing uppercase letter');
assert(checkPasswordRequirements('UPPERCASE123!').hasLowercase === false, 'Rejects password missing lowercase letter');
assert(checkPasswordRequirements('NoDigitsAllowed!').hasNumber === false, 'Rejects password missing number');
assert(checkPasswordRequirements('NoSpecial12345').hasSpecialChar === false, 'Rejects password missing special character');
assert(isPasswordValid('Notionwell@2026') === true, 'Accepts password satisfying all 5 security criteria');
assert(isPasswordValid('MySecure#StudyDeck99') === true, 'Accepts long passphrase with diverse characters');

// 2. Verified Absence of Email OTP Login & OTP Inputs
console.log('\n--- 2. Absence of Email OTP Login & OTP Inputs ---');
const authPageContent = fs.readFileSync('app/auth/page.tsx', 'utf8');
const authLibContent = fs.readFileSync('lib/supabase/auth.ts', 'utf8');

// Check that signInWithOtp or verifyOtp are NOT imported or called
assert(!authPageContent.includes('signInWithOtp'), 'app/auth/page.tsx does NOT use signInWithOtp');
assert(!authPageContent.includes('verifyOtp'), 'app/auth/page.tsx does NOT use verifyOtp');
assert(!authLibContent.includes('signInWithOtp'), 'lib/supabase/auth.ts does NOT use signInWithOtp');
assert(!authLibContent.includes('verifyOtp'), 'lib/supabase/auth.ts does NOT use verifyOtp');

// Check that no OTP input fields exist in auth page
assert(!/placeholder=["'].*otp/i.test(authPageContent), 'No OTP placeholder inputs in app/auth/page.tsx');
assert(!/enter (one-time|otp|verification code)/i.test(authPageContent), 'No OTP prompt text in app/auth/page.tsx');
assert(!authPageContent.includes('otp'), 'No OTP references in app/auth/page.tsx');

// Check across all app pages and components for OTP login flows
let foundOtpInComponents = false;
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (/\.(tsx|jsx|ts|js)$/.test(entry.name)) {
      const src = fs.readFileSync(fullPath, 'utf8');
      if (/\b(signInWithOtp|verifyOtp)\b/i.test(src)) {
        foundOtpInComponents = true;
        console.error(`Found OTP in ${fullPath}`);
      }
    }
  }
}
scanDirectory('app');
scanDirectory('components');
assert(!foundOtpInComponents, 'Zero occurrences of signInWithOtp or verifyOtp across entire app and components');

// 3. Normal Email/Password SignUp Implementation
console.log('\n--- 3. Standard Supabase Email/Password SignUp ---');
assert(authLibContent.includes('supabase.auth.signUp'), 'signUpUserWithSupabase uses supabase.auth.signUp');
assert(authLibContent.includes('email: trimmedEmail'), 'signUp passes sanitized email');
assert(authLibContent.includes('password,'), 'signUp passes password');
assert(authLibContent.includes('full_name: trimmedName'), 'signUp includes student name metadata');

// 4. Immediate Entry When Email Confirmation is Disabled in Supabase
console.log('\n--- 4. Direct Entry If Email Confirmation Is Disabled in Supabase ---');
assert(authLibContent.includes('if (data.session)'), 'Checks for immediate session from signUp');
assert(authLibContent.includes('persistSupabaseUser(appUser)'), 'Persists user session immediately');
assert(authLibContent.includes('signInWithPassword'), 'Provides direct signInWithPassword fallback if confirmation is disabled in Supabase');
assert(authPageContent.includes('router.push(redirectTarget)'), 'Redirects directly to dashboard when confirmation is disabled');

// 5. Normal Email/Password SignIn Implementation
console.log('\n--- 5. Standard Supabase Email/Password SignIn ---');
assert(authLibContent.includes('supabase.auth.signInWithPassword'), 'signInUserWithSupabase uses supabase.auth.signInWithPassword');
assert(authPageContent.includes('signInUserWithSupabase(email, password)'), 'Auth form invokes signInUserWithSupabase on login submit');
assert(!authPageContent.includes('sendOtp'), 'No sendOtp invocation on login form');

// 6. Google OAuth Preservation
console.log('\n--- 6. Google OAuth Sign-In Preservation ---');
assert(authLibContent.includes('provider: \'google\''), 'signInWithGoogle configures google provider');
assert(authLibContent.includes('supabase.auth.signInWithOAuth'), 'Uses supabase.auth.signInWithOAuth');
assert(authPageContent.includes('Continue with Google'), 'Continue with Google button is present in UI');
assert(authPageContent.includes('handleGoogleSignIn'), 'Google sign-in button triggers handleGoogleSignIn');

// 7. Password Reset & Update Flow
console.log('\n--- 7. Password Reset Preservation ---');
assert(authLibContent.includes('resetPasswordWithSupabase'), 'Exports resetPasswordWithSupabase');
assert(authLibContent.includes('resetPasswordForEmail'), 'Uses supabase.auth.resetPasswordForEmail');
assert(authLibContent.includes('updatePasswordWithSupabase'), 'Exports updatePasswordWithSupabase');
assert(authLibContent.includes('updateUser'), 'Uses supabase.auth.updateUser for new password');
assert(authPageContent.includes('tab === \'forgot\''), 'Forgot password tab is present in UI');
assert(authPageContent.includes('tab === \'updatePassword\''), 'Update password tab is present for recovery links');

// 8. Sign Out & Session Cleanup
console.log('\n--- 8. Sign Out & Token Purging ---');
assert(authLibContent.includes('signOutUserFromSupabase'), 'Exports signOutUserFromSupabase');
assert(authLibContent.includes('localStorage.removeItem(\'notionwell_user_v1\')'), 'Purges user profile on sign out');
assert(authLibContent.includes('notionwell_demo_session=;'), 'Clears demo session cookie');
assert(authLibContent.includes('notionwell_auth_user=;'), 'Clears auth user cookie');

// 9. Security & Credential Hygiene
console.log('\n--- 9. Security & Credential Protection ---');
assert(!authPageContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'No service role key in auth page');
assert(!authLibContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'No service role key in client auth helper');
assert(authPageContent.includes('allRequirementsMet'), 'Enforces password validation before submission');
assert(authPageContent.includes('passwordsMatch'), 'Enforces password confirmation match before submission');

console.log('\n================================================================');
console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
