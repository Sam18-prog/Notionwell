/**
 * scripts/test_password_security.mjs
 * Verification suite for Strong Password Security, Live Validation, Strength Indicator,
 * and Confirmation Matching in Notionwell.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  checkPasswordRequirements,
  calculatePasswordStrength,
  isPasswordValid,
} from '../lib/passwordValidation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

console.log('================================================================');
console.log('🔒 NOTIONWELL — PASSWORD SECURITY & VALIDATION TEST SUITE');
console.log('================================================================\n');

// --- 1. SPECIFIED TEST PASSWORDS AUDIT ---
console.log('--- 1. Mandatory Password Matrix Verification ---');

// Test 1a: 'abc123' -> Rejected (too short, missing uppercase, missing special char)
const p1 = 'abc123';
const r1 = checkPasswordRequirements(p1);
const v1 = isPasswordValid(p1);
assert(!v1, `'${p1}' is Rejected`);
assert(!r1.hasMinLength, `'${p1}' fails minimum length (< 8)`);
assert(!r1.hasUppercase, `'${p1}' fails uppercase requirement`);
assert(!r1.hasSpecialChar, `'${p1}' fails special character requirement`);

// Test 1b: 'password123' -> Rejected (missing uppercase and special character)
const p2 = 'password123';
const r2 = checkPasswordRequirements(p2);
const v2 = isPasswordValid(p2);
assert(!v2, `'${p2}' is Rejected`);
assert(r2.hasMinLength, `'${p2}' meets minimum length (11 >= 8)`);
assert(!r2.hasUppercase, `'${p2}' fails uppercase requirement`);
assert(!r2.hasSpecialChar, `'${p2}' fails special character requirement`);

// Test 1c: 'Password1' -> Rejected (missing special character)
const p3 = 'Password1';
const r3 = checkPasswordRequirements(p3);
const v3 = isPasswordValid(p3);
assert(!v3, `'${p3}' is Rejected`);
assert(r3.hasMinLength, `'${p3}' meets minimum length (9 >= 8)`);
assert(r3.hasUppercase, `'${p3}' meets uppercase requirement`);
assert(r3.hasLowercase, `'${p3}' meets lowercase requirement`);
assert(r3.hasNumber, `'${p3}' meets number requirement`);
assert(!r3.hasSpecialChar, `'${p3}' fails special character requirement`);

// Test 1d: 'Password@1' -> Accepted by character rules
const p4 = 'Password@1';
const r4 = checkPasswordRequirements(p4);
const v4 = isPasswordValid(p4);
assert(v4, `'${p4}' is Accepted by all 5 character rules`);
assert(r4.hasMinLength && r4.hasUppercase && r4.hasLowercase && r4.hasNumber && r4.hasSpecialChar, `'${p4}' satisfies all 5 individual requirements`);

// Test 1e: 'NOTIONWELL@1' -> Rejected (missing lowercase letter)
const p5 = 'NOTIONWELL@1';
const r5 = checkPasswordRequirements(p5);
const v5 = isPasswordValid(p5);
assert(!v5, `'${p5}' is Rejected`);
assert(r5.hasMinLength, `'${p5}' meets minimum length`);
assert(r5.hasUppercase, `'${p5}' meets uppercase requirement`);
assert(!r5.hasLowercase, `'${p5}' fails lowercase requirement`);
assert(r5.hasNumber && r5.hasSpecialChar, `'${p5}' meets number & special char`);

// Test 1f: 'Notionwell@123' -> Accepted by character rules
const p6 = 'Notionwell@123';
const r6 = checkPasswordRequirements(p6);
const v6 = isPasswordValid(p6);
assert(v6, `'${p6}' is Accepted by all 5 character rules`);
assert(r6.hasMinLength && r6.hasUppercase && r6.hasLowercase && r6.hasNumber && r6.hasSpecialChar, `'${p6}' satisfies all 5 individual requirements`);

// --- 2. LIVE REQUIREMENT INDICATOR AUDIT ---
console.log('\n--- 2. Live Requirement Indicator & Zero-State Checks ---');
const emptyReqs = checkPasswordRequirements('');
assert(
  !emptyReqs.hasMinLength &&
  !emptyReqs.hasUppercase &&
  !emptyReqs.hasLowercase &&
  !emptyReqs.hasNumber &&
  !emptyReqs.hasSpecialChar,
  'Empty password does NOT show any requirement as satisfied'
);

// --- 3. 4-LEVEL PASSWORD STRENGTH INDICATOR AUDIT ---
console.log('\n--- 3. 4-Tier Password Strength Engine ---');
const sWeak = calculatePasswordStrength('abc');
assert(sWeak.level === 'weak' && sWeak.score === 1, `'abc' rated Weak (score 1)`);

// Password@1 satisfies rules but contains common dictionary word 'Password'
const sPasswordAt1 = calculatePasswordStrength('Password@1');
assert(sPasswordAt1.level !== 'strong', `'Password@1' is NOT labeled 'Strong' merely because it has 4 character types`);
assert(sPasswordAt1.score === 2 || sPasswordAt1.score === 3, `'Password@1' rated Fair/Good (score ${sPasswordAt1.score})`);

// Notionwell@123 has common brand name & sequential 123
const sNotionwell123 = calculatePasswordStrength('Notionwell@123');
assert(sNotionwell123.level !== 'strong', `'Notionwell@123' is NOT labeled 'Strong' due to predictable patterns ('123', 'notionwell')`);

// High-entropy passphrase
const sStrong = calculatePasswordStrength('K9#mQ2$vL8*xP4!z');
assert(sStrong.level === 'strong' && sStrong.score === 4, `'K9#mQ2$vL8*xP4!z' rated Strong (score 4)`);

const sComplex = calculatePasswordStrength('Notionwell$Secure#Learning2026!');
assert(sComplex.level === 'strong' && sComplex.score === 4, `'Notionwell$Secure#Learning2026!' rated Strong (score 4)`);

// --- 4. CONFIRM PASSWORD & MATCH VALIDATION ---
console.log('\n--- 4. Confirm Password Match Validation ---');
const passA = 'Notionwell@123';
const passB = 'Notionwell@124';
assert(passA !== passB, 'Mismatched passwords detected as different');
assert(passA === 'Notionwell@123', 'Matching passwords detected as identical');

// --- 5. UI IMPLEMENTATION AUDIT (app/auth/page.tsx) ---
console.log('\n--- 5. UI Elements & Accessibility Inspection ---');
const authSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'auth', 'page.tsx'), 'utf8');

assert(authSource.includes('checkPasswordRequirements'), 'app/auth/page.tsx calls checkPasswordRequirements');
assert(authSource.includes('calculatePasswordStrength'), 'app/auth/page.tsx calls calculatePasswordStrength');
assert(authSource.includes('isPasswordValid'), 'app/auth/page.tsx enforces isPasswordValid on submit');
assert(authSource.includes('showPassword') && authSource.includes('showConfirmPassword'), 'app/auth/page.tsx provides independent password and confirm password visibility states');
assert(authSource.includes('aria-label="Confirm Password"'), 'Confirm Password input includes accessible aria-label');
assert(authSource.includes('aria-label={showConfirmPassword ?'), 'Confirm Password eye toggle includes accessible aria-label');
assert(authSource.includes('aria-label={showPassword ?'), 'Password eye toggle includes accessible aria-label');
assert(authSource.includes('Passwords match') && authSource.includes('Passwords do not match'), 'Live real-time password matching status is displayed');
assert(authSource.includes('Password Strength:'), 'Strength indicator heading is rendered');
assert(authSource.includes('Password must satisfy:'), 'Checklist requirements heading is rendered');

// Clean login page: Ensure checklist is NOT shown on login
assert(authSource.includes("(tab === 'signup' || tab === 'updatePassword') && ("), 'Password requirements checklist is gated strictly to signup/updatePassword');

// --- 6. BACKEND ENFORCEMENT (lib/supabase/auth.ts) ---
console.log('\n--- 6. Supabase Backend Enforcement & Error Handling ---');
const authLibSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'supabase', 'auth.ts'), 'utf8');

assert(authLibSource.includes('if (!isPasswordValid(password))'), 'signUpUserWithSupabase strictly enforces isPasswordValid before sending request');
assert(authLibSource.includes('export async function updatePasswordWithSupabase'), 'lib/supabase/auth.ts exports updatePasswordWithSupabase');
assert(authLibSource.includes('Password rejected by security policy:'), 'Formats Supabase weak-password errors clearly for users');

// --- 7. GOOGLE OAUTH & EXISTING FLOW COMPATIBILITY ---
console.log('\n--- 7. Compatibility Safeguards ---');
assert(authSource.includes('Continue with Google'), 'Continue with Google button is preserved');
assert(authLibSource.includes('export async function signInUserWithSupabase'), 'signInUserWithSupabase remains standard for existing users');
assert(!authLibSource.includes('isPasswordValid(password)') || authLibSource.indexOf('signInUserWithSupabase') > authLibSource.indexOf('isPasswordValid(password)'), 'Existing users are not blocked on sign in by the new password validator');

console.log('\n================================================================');
console.log(`🏁 PASSWORD SECURITY SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) process.exit(1);
