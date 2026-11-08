/**
 * lib/passwordValidation.ts
 * Notionwell Centralized Password Policy, Validation, and Strength Evaluation Engine
 */

export interface PasswordRequirements {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrengthResult {
  score: 1 | 2 | 3 | 4;
  level: PasswordStrengthLevel;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  textColor: string;
  feedback: string;
}

/**
 * Checks all 5 mandatory password policy requirements.
 */
export function checkPasswordRequirements(password: string): PasswordRequirements {
  const pwd = password || '';
  return {
    hasMinLength: pwd.length >= 8,
    hasUppercase: /[A-Z]/.test(pwd),
    hasLowercase: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecialChar: /[^A-Za-z0-9]/.test(pwd),
  };
}

/**
 * Returns true if and only if all 5 password policy rules are met.
 */
export function isPasswordValid(password: string): boolean {
  const reqs = checkPasswordRequirements(password);
  return (
    reqs.hasMinLength &&
    reqs.hasUppercase &&
    reqs.hasLowercase &&
    reqs.hasNumber &&
    reqs.hasSpecialChar
  );
}

/**
 * Common weak keywords and keyboard patterns to penalize
 */
const PREDICTABLE_PATTERNS = [
  /password/i,
  /123456/i,
  /qwerty/i,
  /asdfgh/i,
  /admin/i,
  /welcome/i,
  /notionwell/i,
  /letmein/i,
  /student/i,
  /college/i,
  /study/i,
];

/**
 * Evaluates password strength across 4 tiers: Weak, Fair, Good, Strong.
 * Evaluates length, diversity, predictable patterns, repetition, and sequences.
 * Note: Meeting the 5 minimum rules does NOT automatically grant 'Strong'.
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const pwd = password || '';
  if (!pwd) {
    return {
      score: 1,
      level: 'weak',
      label: 'Weak',
      color: 'bg-red-500',
      textColor: 'text-red-500 dark:text-red-400',
      feedback: 'Enter a password to evaluate strength.',
    };
  }

  let points = 0;
  const len = pwd.length;

  // 1. Length scoring
  if (len >= 8) points += 1;
  if (len >= 12) points += 1;
  if (len >= 16) points += 1;

  // 2. Character diversity scoring
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  const diversityCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (diversityCount >= 3) points += 1;
  if (diversityCount === 4) points += 1;

  // Bonus for multiple distinct special characters
  const uniqueSpecials = new Set(pwd.match(/[^A-Za-z0-9]/g) || []).size;
  if (uniqueSpecials >= 2) points += 1;

  // 3. Penalties for predictable patterns
  let hasPredictablePattern = false;
  for (const pattern of PREDICTABLE_PATTERNS) {
    if (pattern.test(pwd)) {
      points -= 1;
      hasPredictablePattern = true;
      break;
    }
  }

  // Penalty for repeated identical characters (e.g. 'aaa', '111')
  if (/(.)\1{2,}/i.test(pwd)) {
    points -= 1;
    hasPredictablePattern = true;
  }

  // Penalty for sequential runs (e.g. '123', 'abc', '789')
  if (/(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi)/i.test(pwd)) {
    points -= 1;
    hasPredictablePattern = true;
  }

  // 4. Determine strength level based on composite score & quality checks
  // Strong: must be >= 12 characters, all 4 character classes, points >= 5.
  // Predictable patterns prevent 'Strong' unless password is a long, high-entropy passphrase (>= 20 chars).
  const isHighEntropyPassphrase = len >= 20 && points >= 5 && diversityCount === 4;
  if ((points >= 5 && len >= 12 && diversityCount === 4 && !hasPredictablePattern) || isHighEntropyPassphrase) {
    return {
      score: 4,
      level: 'strong',
      label: 'Strong',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      feedback: 'Excellent password! Highly resilient against dictionary and brute-force attacks.',
    };
  }

  // Good: at least 8 characters, diverse character set, points >= 3
  if (points >= 3 && len >= 8 && diversityCount >= 3) {
    return {
      score: 3,
      level: 'good',
      label: 'Good',
      color: 'bg-blue-500',
      textColor: 'text-blue-600 dark:text-blue-400',
      feedback: 'Good password. Add more length or extra symbols to make it even stronger.',
    };
  }

  // Fair: meets baseline length with partial diversity or minor pattern penalties
  if (points >= 2 && len >= 8) {
    return {
      score: 2,
      level: 'fair',
      label: 'Fair',
      color: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
      feedback: 'Fair password. Mix uppercase, lowercase, numbers, and symbols to improve security.',
    };
  }

  // Weak: under 8 characters or very low entropy
  return {
    score: 1,
    level: 'weak',
    label: 'Weak',
    color: 'bg-red-500',
    textColor: 'text-red-600 dark:text-red-400',
    feedback: 'Weak password. Use at least 8 characters with a mix of letters, numbers, and symbols.',
  };
}
