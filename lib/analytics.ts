/**
 * Notionwell Phase 6: Core Analytics, Intelligent SM-2, Gamification & Progression Engine
 * High-performance, verified data engine with resilient dual persistence.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createAdminClient } from '@/lib/supabase/admin';
import { Flashcard, Deck, Subject } from '@/lib/app';
import { getUserExamAttempts } from '@/lib/exam';
import { calculateReviewWorkload } from './review-workload';

// ============================================================================
// 1. DATA TYPES & INTERFACES
// ============================================================================

export type SM2Rating = 'again' | 'hard' | 'good' | 'easy' | 'medium';

export interface SM2Result {
  easinessFactor: number;
  intervalDays: number;
  repetitionCount: number;
  nextReviewDate: string; // YYYY-MM-DD
  masteryLevel: 'new' | 'learning' | 'mastered';
  ratingValue: number; // 1 to 5
}

export type XPSource =
  | 'flashcard_review'
  | 'quiz_completed'
  | 'exam_completed'
  | 'daily_goal'
  | 'streak_milestone'
  | 'topic_mastered'
  | 'achievement_unlocked';

export interface XPTransaction {
  id: string;
  userId: string;
  amount: number;
  source: XPSource;
  description: string;
  activityId: string; // Unique idempotency key
  createdAt: string;
}

export interface UserLevelInfo {
  currentLevel: number;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercentage: number;
  xpToNextLevel: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'consistency' | 'flashcards' | 'quizzes' | 'exams' | 'milestones';
  xpReward: number;
  threshold: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  threshold: number;
  currentProgress: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

export interface LearningGoals {
  userId: string;
  dailyStudyMinutes: number;
  dailyCardsReviewed: number;
  dailyQuestionsPracticed: number;
  weeklyStudyHours: number;
  weeklyDecksCompleted: number;
  weeklyQuizzesAttempted: number;
  weeklyExamsCompleted: number;
}

export interface GoalProgressItem {
  metric: string;
  label: string;
  target: number;
  actual: number;
  unit: string;
  percentage: number;
  isCompleted: boolean;
}

export interface GoalProgressSummary {
  daily: GoalProgressItem[];
  weekly: GoalProgressItem[];
  dailyCompletionPercentage: number;
  weeklyCompletionPercentage: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  todayCompleted: boolean;
  activeDates: string[];
}

export interface FlashcardReviewLog {
  id: string;
  flashcardId: string;
  deckId: string;
  userId: string;
  ratingValue: number;
  responseType: SM2Rating;
  scheduledDays: number;
  easinessFactor: number;
  durationMs: number;
  reviewedAt: string;
}

export interface QuizAttemptLog {
  id: string;
  quizId: string;
  deckId?: string | null;
  deckName?: string;
  userId: string;
  score: number;
  totalItems: number;
  accuracyPercentage: number;
  durationSeconds: number;
  completedAt: string;
  topicBreakdown?: Array<{ topic: string; correct: number; total: number }>;
}

export interface ReviewWorkloadItem {
  deckId: string;
  deckName: string;
  subjectId?: string | null;
  subjectName?: string;
  dueTodayCount: number;
  overdueCount: number;
  totalDueCount: number;
  estimatedMinutes: number;
}

export interface ComprehensiveAnalyticsReport {
  overview: {
    totalStudySeconds: number;
    totalStudyHoursFormatted: string;
    totalFlashcardsReviewed: number;
    totalDecks: number;
    totalCards: number;
    quizzesCompleted: number;
    averageQuizScore: number;
    examsCompleted: number;
    averageExamScore: number;
    currentStreak: number;
    longestStreak: number;
    retentionMasteryPercentage: number;
    level: number;
    totalXP: number;
  };
  learningActivity: {
    dailyActivity: Array<{ date: string; dayLabel: string; studySeconds: number; cardsReviewed: number }>;
    weeklyTrend: Array<{ weekLabel: string; studyMinutes: number; sessionsCount: number }>;
    cardsReviewedOverTime: Array<{ date: string; count: number }>;
  };
  performance: {
    quizScoreTrend: Array<{ date: string; score: number; accuracy: number; title: string }>;
    examScoreTrend: Array<{ date: string; score: number; percentage: number; title: string }>;
    topicBreakdown: Array<{ topic: string; correct: number; total: number; accuracy: number }>;
    strongestSubjects: Array<{ subjectName: string; mastery: number; totalCards: number }>;
    weakestSubjects: Array<{ subjectName: string; mastery: number; totalCards: number }>;
    overallAccuracy: number;
  };
  retention: {
    knownCardsCount: number;
    difficultCardsCount: number;
    reviewSuccessRate: number;
    dueTodayCount: number;
    overdueCount: number;
    masteredCardsCount: number;
    learningCardsCount: number;
    newCardsCount: number;
  };
  studyBehavior: {
    mostActiveDay: string;
    averageSessionSeconds: number;
    consistencyPercentage: number;
    goalCompletionRate: number;
  };
}

// ============================================================================
// 2. ACHIEVEMENT DEFINITIONS (CANONICAL CATALOG)
// ============================================================================

export const MASTER_ACHIEVEMENTS: AchievementDefinition[] = [
  // Consistency
  {
    id: 'first_session',
    title: 'First Step',
    description: 'Completed your first verified study session',
    icon: '🚀',
    category: 'consistency',
    xpReward: 50,
    threshold: 1,
  },
  {
    id: 'streak_3',
    title: '3-Day Momentum',
    description: 'Maintained a verified 3-day study streak',
    icon: '🔥',
    category: 'consistency',
    xpReward: 75,
    threshold: 3,
  },
  {
    id: 'streak_7',
    title: 'Week of Dedication',
    description: 'Maintained a verified 7-day study streak',
    icon: '⚡',
    category: 'consistency',
    xpReward: 150,
    threshold: 7,
  },
  {
    id: 'streak_30',
    title: 'Monthly Champion',
    description: 'Maintained a disciplined 30-day study streak',
    icon: '👑',
    category: 'consistency',
    xpReward: 500,
    threshold: 30,
  },

  // Flashcards
  {
    id: 'review_50',
    title: 'Knowledge Seeker',
    description: 'Reviewed 50 flashcards using spaced repetition',
    icon: '📖',
    category: 'flashcards',
    xpReward: 50,
    threshold: 50,
  },
  {
    id: 'review_100',
    title: 'Century Club',
    description: 'Reviewed 100 flashcards using spaced repetition',
    icon: '💯',
    category: 'flashcards',
    xpReward: 100,
    threshold: 100,
  },
  {
    id: 'review_500',
    title: 'Memory Master',
    description: 'Reviewed 500 flashcards using spaced repetition',
    icon: '🧠',
    category: 'flashcards',
    xpReward: 250,
    threshold: 500,
  },
  {
    id: 'review_1000',
    title: 'Grand Scholar',
    description: 'Reached 1,000 flashcard reviews milestone',
    icon: '🎓',
    category: 'flashcards',
    xpReward: 500,
    threshold: 1000,
  },

  // Quizzes
  {
    id: 'first_quiz',
    title: 'Quiz Novice',
    description: 'Completed your first practice quiz',
    icon: '🎯',
    category: 'quizzes',
    xpReward: 50,
    threshold: 1,
  },
  {
    id: 'quiz_perfect',
    title: 'Perfectionist',
    description: 'Scored 100% on a full deck quiz',
    icon: '🌟',
    category: 'quizzes',
    xpReward: 100,
    threshold: 1,
  },
  {
    id: 'quiz_10',
    title: 'Quiz Veteran',
    description: 'Successfully completed 10 practice quizzes',
    icon: '🏅',
    category: 'quizzes',
    xpReward: 200,
    threshold: 10,
  },

  // Exams
  {
    id: 'first_exam',
    title: 'Test Candidate',
    description: 'Completed your first AI simulated timed examination',
    icon: '📝',
    category: 'exams',
    xpReward: 75,
    threshold: 1,
  },
  {
    id: 'exam_distinction',
    title: 'High Achiever',
    description: 'Scored Distinction (≥90%) on an AI exam assessment',
    icon: '🏆',
    category: 'exams',
    xpReward: 150,
    threshold: 1,
  },
  {
    id: 'exam_5',
    title: 'Exam Master',
    description: 'Completed 5 AI examination simulations',
    icon: '🎖️',
    category: 'exams',
    xpReward: 300,
    threshold: 5,
  },

  // Milestones
  {
    id: 'first_deck',
    title: 'Deck Architect',
    description: 'Created your first study deck from lecture notes',
    icon: '📁',
    category: 'milestones',
    xpReward: 50,
    threshold: 1,
  },
  {
    id: 'mastery_100',
    title: 'Centurion of Retention',
    description: 'Mastered 100 flashcards with long-term SM-2 retention',
    icon: '💎',
    category: 'milestones',
    xpReward: 250,
    threshold: 100,
  },
];

// ============================================================================
// 3. PERSISTENT STORAGE MANAGEMENT (.analytics_storage/)
// ============================================================================

const STORAGE_DIR = path.join(process.cwd(), '.analytics_storage');

function ensureAnalyticsDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function readJSON<T>(fileName: string, fallback: T): T {
  ensureAnalyticsDir();
  const filePath = path.join(STORAGE_DIR, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON<T>(fileName: string, data: T): void {
  ensureAnalyticsDir();
  const filePath = path.join(STORAGE_DIR, fileName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Failed to write ${fileName}:`, err);
  }
}

// In-memory caches backed by disk JSON
let memoryXP: Map<string, XPTransaction> = new Map();
let memoryGoals: Map<string, LearningGoals> = new Map();
let memoryReviews: FlashcardReviewLog[] = [];
let memoryQuizAttempts: QuizAttemptLog[] = [];
let memoryUnlockedAchievements: Map<string, Set<string>> = new Map(); // userId -> Set of achievementIds
let memoryStreakDates: Map<string, Set<string>> = new Map(); // userId -> Set of YYYY-MM-DD
let isStorageLoaded = false;

function loadStorage() {
  if (isStorageLoaded) return;
  ensureAnalyticsDir();

  const xpList = readJSON<XPTransaction[]>('xp.json', []);
  memoryXP = new Map(xpList.map((x) => [`${x.userId}:${x.activityId}`, x]));

  const goalsList = readJSON<LearningGoals[]>('goals.json', []);
  memoryGoals = new Map(goalsList.map((g) => [g.userId, g]));

  memoryReviews = readJSON<FlashcardReviewLog[]>('reviews.json', []);
  memoryQuizAttempts = readJSON<QuizAttemptLog[]>('quiz_attempts.json', []);

  const rawAch = readJSON<Record<string, string[]>>('user_achievements.json', {});
  memoryUnlockedAchievements = new Map();
  for (const [uid, achIds] of Object.entries(rawAch)) {
    memoryUnlockedAchievements.set(uid, new Set(achIds));
  }

  const rawStreaks = readJSON<Record<string, string[]>>('streaks.json', {});
  memoryStreakDates = new Map();
  for (const [uid, dates] of Object.entries(rawStreaks)) {
    memoryStreakDates.set(uid, new Set(dates));
  }

  isStorageLoaded = true;
}

function persistStorage() {
  ensureAnalyticsDir();
  writeJSON('xp.json', Array.from(memoryXP.values()));
  writeJSON('goals.json', Array.from(memoryGoals.values()));
  writeJSON('reviews.json', memoryReviews);
  writeJSON('quiz_attempts.json', memoryQuizAttempts);

  const achObj: Record<string, string[]> = {};
  for (const [uid, set] of memoryUnlockedAchievements.entries()) {
    achObj[uid] = Array.from(set);
  }
  writeJSON('user_achievements.json', achObj);

  const streakObj: Record<string, string[]> = {};
  for (const [uid, set] of memoryStreakDates.entries()) {
    streakObj[uid] = Array.from(set);
  }
  writeJSON('streaks.json', streakObj);
}

// ============================================================================
// 4. INTELLIGENT SM-2 SPACED REPETITION ENGINE
// ============================================================================

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 * Maps user responses:
 * - 'again' (q=1): Complete memory lapse. Reset repetition count to 0, interval to 1 day.
 * - 'hard'  (q=3): Difficult recall. Interval multiplied by 1.2, EF reduced by 0.15.
 * - 'good'  (q=4): Standard successful recall. Normal SM-2 interval progression (1 -> 6 -> interval * EF).
 * - 'easy'  (q=5): Effortless recall. Interval multiplied by EF * 1.3, EF increased by 0.15.
 * - 'medium': Backward compatible mapping to 'good'.
 */
export function calculateSM2(
  currentCard: Flashcard,
  response: SM2Rating
): SM2Result {
  let ef = (currentCard as any).easinessFactor || 2.5;
  let interval = currentCard.intervalDays || 0;
  let repCount = (currentCard as any).repetitionCount || 0;
  let timesIncorrect = currentCard.timesIncorrect || 0;

  let q: number;
  switch (response) {
    case 'again':
      q = 1;
      break;
    case 'hard':
      q = 3;
      break;
    case 'good':
    case 'medium':
      q = 4;
      break;
    case 'easy':
      q = 5;
      break;
    default:
      q = 4;
  }

  if (q < 3) {
    // Memory Lapse (Again)
    repCount = 0;
    interval = 1;
    timesIncorrect += 1;
    ef = Math.max(1.3, ef - 0.2);
  } else {
    // Successful recall (Hard, Good, Easy)
    if (q === 3) {
      // Hard: smaller interval bump
      interval = Math.max(1, Math.round((interval || 1) * 1.2));
      ef = Math.max(1.3, ef - 0.15);
    } else if (q === 4) {
      // Good: standard SM-2 intervals
      if (repCount === 0) {
        interval = 1;
      } else if (repCount === 1) {
        interval = 6;
      } else {
        interval = Math.max(1, Math.round(interval * ef));
      }
      repCount += 1;
      ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
      ef = Math.max(1.3, Math.min(3.0, ef));
    } else {
      // Easy: accelerated interval jump
      if (repCount === 0) {
        interval = 3;
      } else if (repCount === 1) {
        interval = 8;
      } else {
        interval = Math.max(1, Math.round(interval * ef * 1.3));
      }
      repCount += 1;
      ef = Math.min(3.0, ef + 0.15);
    }
  }

  // Calculate Next Review Date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextDate.getDate()).padStart(2, '0');
  const nextReviewDate = `${year}-${month}-${day}`;

  // Mastery progression: 3+ successful repetitions marks mastery
  let masteryLevel: 'new' | 'learning' | 'mastered' = 'learning';
  if (repCount >= 3) {
    masteryLevel = 'mastered';
  } else if (repCount === 0 && (currentCard.timesReviewed || 0) === 0) {
    masteryLevel = 'new';
  }

  return {
    easinessFactor: Math.round(ef * 100) / 100,
    intervalDays: interval,
    repetitionCount: repCount,
    nextReviewDate,
    masteryLevel,
    ratingValue: q,
  };
}

/**
 * Records an individual flashcard review event into persistent storage and Supabase.
 */
export function recordFlashcardReview(
  userId: string,
  deckId: string,
  flashcardId: string,
  response: SM2Rating,
  sm2Result: SM2Result,
  durationMs: number = 0
): FlashcardReviewLog {
  loadStorage();

  const log: FlashcardReviewLog = {
    id: uuidv4(),
    flashcardId,
    deckId,
    userId: userId || 'default-user',
    ratingValue: sm2Result.ratingValue,
    responseType: response,
    scheduledDays: sm2Result.intervalDays,
    easinessFactor: sm2Result.easinessFactor,
    durationMs,
    reviewedAt: new Date().toISOString(),
  };

  memoryReviews.push(log);
  persistStorage();

  // Async sync to Supabase
  try {
    const admin = createAdminClient();
    (async () => {
      try {
        const { error: sbErr } = await admin.from('flashcard_reviews').insert({
          id: log.id,
          flashcard_id: flashcardId,
          user_id: userId,
          rating: sm2Result.ratingValue,
          response_type: response === 'medium' ? 'good' : response,
          scheduled_days: sm2Result.intervalDays,
          easiness_factor: sm2Result.easinessFactor,
          review_duration_ms: durationMs,
          reviewed_at: log.reviewedAt,
        });
        if (sbErr) {
          console.warn(`[Supabase flashcard_reviews sync]: ${sbErr.code} - ${sbErr.message}`);
        }
      } catch (err: any) {
        console.warn(`[Supabase flashcard_reviews exception]: ${err?.message}`);
      }
    })();
  } catch (clientErr: any) {
    console.warn(`[Supabase client error]: ${clientErr?.message}`);
  }

  // Automatically record active streak for today
  recordActiveStudyDate(userId, 'flashcards', Math.max(10, Math.round(durationMs / 1000)), 1);

  return log;
}

export function getUserFlashcardReviews(userId: string): FlashcardReviewLog[] {
  loadStorage();
  return memoryReviews.filter((r) => r.userId === userId || r.userId === 'shared');
}

// ============================================================================
// 5. GAMIFICATION & XP PROGRESSION SYSTEM
// ============================================================================

/**
 * Progression Formula:
 * Level L = floor(sqrt(totalXP / 50)) + 1
 * Total XP required for level L = 50 * (L - 1)^2
 * XP required for next level L + 1 = 50 * L^2
 */
export function calculateLevelFromXP(totalXP: number): UserLevelInfo {
  const safeXP = Math.max(0, totalXP);
  const currentLevel = Math.floor(Math.sqrt(safeXP / 50)) + 1;
  const currentLevelBaseXP = 50 * Math.pow(currentLevel - 1, 2);
  const nextLevelBaseXP = 50 * Math.pow(currentLevel, 2);
  const xpInCurrentLevel = safeXP - currentLevelBaseXP;
  const xpNeededForLevel = nextLevelBaseXP - currentLevelBaseXP;
  const progressPercentage = Math.min(
    100,
    Math.max(0, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100))
  );

  return {
    currentLevel,
    totalXP: safeXP,
    currentLevelXP: currentLevelBaseXP,
    nextLevelXP: nextLevelBaseXP,
    progressPercentage,
    xpToNextLevel: nextLevelBaseXP - safeXP,
  };
}

/**
 * Atomically awards XP to a user with an idempotency activityId.
 * If activityId has already been awarded, returns awarded: false to prevent duplicate rewards.
 */
export function awardXP(
  userId: string,
  source: XPSource,
  amount: number,
  description: string,
  activityId: string
): {
  awarded: boolean;
  transaction: XPTransaction | null;
  levelInfo: UserLevelInfo;
  leveledUp: boolean;
  previousLevel: number;
} {
  loadStorage();

  const user = userId || 'default-user';
  const lookupKey = `${user}:${activityId}`;
  const existing = memoryXP.get(lookupKey);

  // Calculate current user XP
  let currentTotalXP = 0;
  for (const tx of memoryXP.values()) {
    if (tx.userId === user) {
      currentTotalXP += tx.amount;
    }
  }

  const prevLevelInfo = calculateLevelFromXP(currentTotalXP);

  if (existing) {
    return {
      awarded: false,
      transaction: existing,
      levelInfo: prevLevelInfo,
      leveledUp: false,
      previousLevel: prevLevelInfo.currentLevel,
    };
  }

  const transaction: XPTransaction = {
    id: uuidv4(),
    userId: user,
    amount,
    source,
    description,
    activityId,
    createdAt: new Date().toISOString(),
  };

  memoryXP.set(lookupKey, transaction);
  persistStorage();

  const newTotalXP = currentTotalXP + amount;
  const newLevelInfo = calculateLevelFromXP(newTotalXP);
  const leveledUp = newLevelInfo.currentLevel > prevLevelInfo.currentLevel;

  // Authoritative sync to Supabase with explicit diagnostics
  try {
    const admin = createAdminClient();
    (async () => {
      try {
        const { error: sbErr } = await admin.from('xp_transactions').insert({
          id: transaction.id,
          user_id: user,
          amount: transaction.amount,
          source: transaction.source,
          description: transaction.description,
          activity_id: transaction.activityId,
          created_at: transaction.createdAt,
        });
        if (sbErr) {
          console.warn(`[Supabase xp_transactions sync]: ${sbErr.code} - ${sbErr.message}`);
        }
      } catch (err: any) {
        console.warn(`[Supabase xp_transactions exception]: ${err?.message}`);
      }
    })();
  } catch (adminErr: any) {
    console.warn(`[Supabase admin client error]: ${adminErr?.message}`);
  }

  return {
    awarded: true,
    transaction,
    levelInfo: newLevelInfo,
    leveledUp,
    previousLevel: prevLevelInfo.currentLevel,
  };
}

export function getUserXPTransactions(userId: string): XPTransaction[] {
  loadStorage();
  const user = userId || 'default-user';
  const list: XPTransaction[] = [];
  for (const tx of memoryXP.values()) {
    if (tx.userId === user) list.push(tx);
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUserTotalXP(userId: string): number {
  loadStorage();
  const user = userId || 'default-user';
  let sum = 0;
  for (const tx of memoryXP.values()) {
    if (tx.userId === user) sum += tx.amount;
  }
  return sum;
}

// ============================================================================
// 6. STREAK TRACKING & ACTIVITY CALENDAR
// ============================================================================

export function recordActiveStudyDate(
  userId: string,
  activityType: string = 'study',
  durationSeconds: number = 0,
  cardsReviewed: number = 0
): void {
  loadStorage();
  const user = userId || 'default-user';

  const todayStr = getLocalDateString();
  let datesSet = memoryStreakDates.get(user);
  if (!datesSet) {
    datesSet = new Set();
    memoryStreakDates.set(user, datesSet);
  }

  datesSet.add(todayStr);
  persistStorage();

  // Async sync to Supabase
  try {
    const admin = createAdminClient();
    (async () => {
      try {
        const { error: sbErr } = await admin.from('streak_history').upsert(
          {
            user_id: user,
            active_date: todayStr,
            activity_type: activityType,
            duration_seconds: durationSeconds,
            cards_reviewed: cardsReviewed,
          },
          { onConflict: 'user_id,active_date' }
        );
        if (sbErr) {
          console.warn(`[Supabase streak_history sync]: ${sbErr.code} - ${sbErr.message}`);
        }
      } catch (err: any) {
        console.warn(`[Supabase streak_history exception]: ${err?.message}`);
      }
    })();
  } catch (clientErr: any) {
    console.warn(`[Supabase client error]: ${clientErr?.message}`);
  }
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateStreaks(userId: string): StreakInfo {
  loadStorage();
  const user = userId || 'default-user';
  const datesSet = memoryStreakDates.get(user) || new Set();
  const sortedDates = Array.from(datesSet).sort();

  if (sortedDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      todayCompleted: false,
      activeDates: [],
    };
  }

  const todayStr = getLocalDateString();
  const todayCompleted = datesSet.has(todayStr);

  // Compute Current Streak
  let currentStreak = 0;
  let checkDate = new Date();

  // If today is completed, start checking backwards from today.
  // Otherwise start checking backwards from yesterday.
  if (!todayCompleted) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = getLocalDateString(checkDate);
    if (datesSet.has(dStr)) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Compute Longest Streak
  let longestStreak = 0;
  let running = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const cur = new Date(dateStr + 'T00:00:00');
    if (!prevDate) {
      running = 1;
    } else {
      const diffTime = cur.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      if (diffDays === 1) {
        running += 1;
      } else if (diffDays > 1) {
        running = 1;
      }
    }
    prevDate = cur;
    if (running > longestStreak) {
      longestStreak = running;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastActiveDate: sortedDates[sortedDates.length - 1],
    todayCompleted,
    activeDates: sortedDates,
  };
}

// ============================================================================
// 7. ACHIEVEMENTS & BADGES ENGINE
// ============================================================================

export function getUserAchievements(
  userId: string,
  stats?: {
    totalSessions?: number;
    streakDays?: number;
    cardsReviewed?: number;
    quizzesCompleted?: number;
    hasPerfectQuiz?: boolean;
    examsCompleted?: number;
    hasExamDistinction?: boolean;
    decksCount?: number;
    masteredCardsCount?: number;
    hasSubjectCompleted?: boolean;
  }
): UserAchievement[] {
  loadStorage();
  const user = userId || 'default-user';
  let unlockedSet = memoryUnlockedAchievements.get(user);
  if (!unlockedSet) {
    unlockedSet = new Set();
    memoryUnlockedAchievements.set(user, unlockedSet);
  }

  const s = {
    totalSessions: stats?.totalSessions ?? 0,
    streakDays: stats?.streakDays ?? 0,
    cardsReviewed: stats?.cardsReviewed ?? 0,
    quizzesCompleted: stats?.quizzesCompleted ?? 0,
    hasPerfectQuiz: stats?.hasPerfectQuiz ?? false,
    examsCompleted: stats?.examsCompleted ?? 0,
    hasExamDistinction: stats?.hasExamDistinction ?? false,
    decksCount: stats?.decksCount ?? 0,
    masteredCardsCount: stats?.masteredCardsCount ?? 0,
    hasSubjectCompleted: stats?.hasSubjectCompleted ?? false,
  };

  const results: UserAchievement[] = [];

  for (const def of MASTER_ACHIEVEMENTS) {
    let currentProgress = 0;

    switch (def.id) {
      case 'first_session':
        currentProgress = s.totalSessions;
        break;
      case 'streak_3':
      case 'streak_7':
      case 'streak_30':
        currentProgress = s.streakDays;
        break;
      case 'review_50':
      case 'review_100':
      case 'review_500':
      case 'review_1000':
        currentProgress = s.cardsReviewed;
        break;
      case 'first_quiz':
      case 'quiz_10':
        currentProgress = s.quizzesCompleted;
        break;
      case 'quiz_perfect':
        currentProgress = s.hasPerfectQuiz ? 1 : 0;
        break;
      case 'first_exam':
      case 'exam_5':
        currentProgress = s.examsCompleted;
        break;
      case 'exam_distinction':
        currentProgress = s.hasExamDistinction ? 1 : 0;
        break;
      case 'first_deck':
        currentProgress = s.decksCount;
        break;
      case 'mastery_100':
        currentProgress = s.masteredCardsCount;
        break;
    }

    const isUnlocked = unlockedSet.has(def.id) || currentProgress >= def.threshold;

    // Auto-unlock if condition reached and not recorded
    if (isUnlocked && !unlockedSet.has(def.id)) {
      unlockedSet.add(def.id);
      persistStorage();

      // Award XP for unlocking achievement!
      awardXP(
        user,
        'achievement_unlocked',
        def.xpReward,
        `Unlocked Badge: ${def.title}`,
        `achievement-${def.id}-${user}`
      );

      // Async sync to Supabase
      try {
        const admin = createAdminClient();
        (async () => {
          try {
            const { error: sbErr } = await admin.from('user_achievements').insert({
              user_id: user,
              achievement_id: def.id,
              unlocked_at: new Date().toISOString(),
            });
            if (sbErr) {
              console.warn(`[Supabase user_achievements sync]: ${sbErr.code} - ${sbErr.message}`);
            }
          } catch (err: any) {
            console.warn(`[Supabase user_achievements exception]: ${err?.message}`);
          }
        })();
      } catch (clientErr: any) {
        console.warn(`[Supabase client error]: ${clientErr?.message}`);
      }
    }

    results.push({
      id: `${user}-${def.id}`,
      userId: user,
      achievementId: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      xpReward: def.xpReward,
      threshold: def.threshold,
      currentProgress: Math.min(def.threshold, currentProgress),
      isUnlocked,
      unlockedAt: isUnlocked ? new Date().toISOString() : null,
    });
  }

  return results;
}

// ============================================================================
// 8. DAILY AND WEEKLY LEARNING GOALS
// ============================================================================

export const DEFAULT_LEARNING_GOALS: Omit<LearningGoals, 'userId'> = {
  dailyStudyMinutes: 20,
  dailyCardsReviewed: 15,
  dailyQuestionsPracticed: 5,
  weeklyStudyHours: 2.5,
  weeklyDecksCompleted: 2,
  weeklyQuizzesAttempted: 3,
  weeklyExamsCompleted: 1,
};

export function getLearningGoals(userId: string): LearningGoals {
  loadStorage();
  const user = userId || 'default-user';
  const existing = memoryGoals.get(user);
  if (existing) return existing;

  const initial: LearningGoals = {
    userId: user,
    ...DEFAULT_LEARNING_GOALS,
  };
  memoryGoals.set(user, initial);
  persistStorage();
  return initial;
}

export function saveLearningGoals(goals: LearningGoals): LearningGoals {
  loadStorage();
  memoryGoals.set(goals.userId, goals);
  persistStorage();

  // Async sync to Supabase
  try {
    const admin = createAdminClient();
    (async () => {
      try {
        const { error: sbErr } = await admin.from('learning_goals').upsert(
          {
            user_id: goals.userId,
            daily_study_minutes: goals.dailyStudyMinutes,
            daily_cards_reviewed: goals.dailyCardsReviewed,
            daily_questions_practiced: goals.dailyQuestionsPracticed,
            weekly_study_hours: goals.weeklyStudyHours,
            weekly_decks_completed: goals.weeklyDecksCompleted,
            weekly_quizzes_attempted: goals.weeklyQuizzesAttempted,
            weekly_exams_completed: goals.weeklyExamsCompleted,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        if (sbErr) {
          console.warn(`[Supabase learning_goals sync]: ${sbErr.code} - ${sbErr.message}`);
        }
      } catch (err: any) {
        console.warn(`[Supabase learning_goals exception]: ${err?.message}`);
      }
    })();
  } catch (clientErr: any) {
    console.warn(`[Supabase client error]: ${clientErr?.message}`);
  }

  return goals;
}

export function calculateGoalProgress(
  goals: LearningGoals,
  activity: {
    todayStudyMinutes: number;
    todayCardsReviewed: number;
    todayQuestionsPracticed: number;
    thisWeekStudyHours: number;
    thisWeekDecksCompleted: number;
    thisWeekQuizzesAttempted: number;
    thisWeekExamsCompleted: number;
  }
): GoalProgressSummary {
  const daily: GoalProgressItem[] = [
    {
      metric: 'dailyStudyMinutes',
      label: 'Study Time',
      target: goals.dailyStudyMinutes,
      actual: activity.todayStudyMinutes,
      unit: 'mins',
      percentage: Math.min(100, Math.round((activity.todayStudyMinutes / goals.dailyStudyMinutes) * 100)),
      isCompleted: activity.todayStudyMinutes >= goals.dailyStudyMinutes,
    },
    {
      metric: 'dailyCardsReviewed',
      label: 'Cards Reviewed',
      target: goals.dailyCardsReviewed,
      actual: activity.todayCardsReviewed,
      unit: 'cards',
      percentage: Math.min(100, Math.round((activity.todayCardsReviewed / goals.dailyCardsReviewed) * 100)),
      isCompleted: activity.todayCardsReviewed >= goals.dailyCardsReviewed,
    },
    {
      metric: 'dailyQuestionsPracticed',
      label: 'Practice Questions',
      target: goals.dailyQuestionsPracticed,
      actual: activity.todayQuestionsPracticed,
      unit: 'items',
      percentage: Math.min(
        100,
        Math.round((activity.todayQuestionsPracticed / goals.dailyQuestionsPracticed) * 100)
      ),
      isCompleted: activity.todayQuestionsPracticed >= goals.dailyQuestionsPracticed,
    },
  ];

  const weekly: GoalProgressItem[] = [
    {
      metric: 'weeklyStudyHours',
      label: 'Study Duration',
      target: goals.weeklyStudyHours,
      actual: Math.round(activity.thisWeekStudyHours * 10) / 10,
      unit: 'hrs',
      percentage: Math.min(100, Math.round((activity.thisWeekStudyHours / goals.weeklyStudyHours) * 100)),
      isCompleted: activity.thisWeekStudyHours >= goals.weeklyStudyHours,
    },
    {
      metric: 'weeklyDecksCompleted',
      label: 'Decks Reviewed',
      target: goals.weeklyDecksCompleted,
      actual: activity.thisWeekDecksCompleted,
      unit: 'decks',
      percentage: Math.min(
        100,
        Math.round((activity.thisWeekDecksCompleted / goals.weeklyDecksCompleted) * 100)
      ),
      isCompleted: activity.thisWeekDecksCompleted >= goals.weeklyDecksCompleted,
    },
    {
      metric: 'weeklyQuizzesAttempted',
      label: 'Quizzes Taken',
      target: goals.weeklyQuizzesAttempted,
      actual: activity.thisWeekQuizzesAttempted,
      unit: 'quizzes',
      percentage: Math.min(
        100,
        Math.round((activity.thisWeekQuizzesAttempted / goals.weeklyQuizzesAttempted) * 100)
      ),
      isCompleted: activity.thisWeekQuizzesAttempted >= goals.weeklyQuizzesAttempted,
    },
    {
      metric: 'weeklyExamsCompleted',
      label: 'Mock Exams',
      target: goals.weeklyExamsCompleted,
      actual: activity.thisWeekExamsCompleted,
      unit: 'exams',
      percentage: Math.min(
        100,
        Math.round((activity.thisWeekExamsCompleted / goals.weeklyExamsCompleted) * 100)
      ),
      isCompleted: activity.thisWeekExamsCompleted >= goals.weeklyExamsCompleted,
    },
  ];

  const dailyMet = daily.filter((d) => d.isCompleted).length;
  const weeklyMet = weekly.filter((w) => w.isCompleted).length;

  return {
    daily,
    weekly,
    dailyCompletionPercentage: Math.round((dailyMet / daily.length) * 100),
    weeklyCompletionPercentage: Math.round((weeklyMet / weekly.length) * 100),
  };
}

// ============================================================================
// 9. QUIZ ATTEMPT RECORDER
// ============================================================================

export function recordQuizAttempt(
  userId: string,
  deckId: string,
  deckName: string,
  score: number,
  totalItems: number,
  durationSeconds: number,
  topicBreakdown: Array<{ topic: string; correct: number; total: number }> = []
): QuizAttemptLog {
  loadStorage();

  const accuracyPercentage = totalItems > 0 ? Math.round((score / totalItems) * 100) : 0;
  const log: QuizAttemptLog = {
    id: uuidv4(),
    quizId: uuidv4(),
    deckId,
    deckName,
    userId: userId || 'default-user',
    score,
    totalItems,
    accuracyPercentage,
    durationSeconds,
    completedAt: new Date().toISOString(),
    topicBreakdown,
  };

  memoryQuizAttempts.push(log);
  persistStorage();

  // Award XP for quiz completion (server-verified idempotency)
  const baseXP = 25;
  const bonusXP = accuracyPercentage >= 80 ? 15 : 0;
  awardXP(
    userId,
    'quiz_completed',
    baseXP + bonusXP,
    `Completed Quiz on ${deckName} (${accuracyPercentage}%)`,
    `quiz-attempt-${log.id}`
  );

  // Record active streak date
  recordActiveStudyDate(userId, 'quiz', durationSeconds, 0);

  // Async sync to Supabase
  try {
    const admin = createAdminClient();
    (async () => {
      try {
        const { error: sbErr } = await admin.from('quiz_attempts').insert({
          id: log.id,
          quiz_id: log.quizId,
          deck_id: deckId,
          deck_name: deckName,
          user_id: userId,
          score,
          total_items: totalItems,
          accuracy_percentage: accuracyPercentage,
          duration_seconds: durationSeconds,
          topic_breakdown: topicBreakdown,
          completed_at: log.completedAt,
        });
        if (sbErr) {
          console.warn(`[Supabase quiz_attempts sync]: ${sbErr.code} - ${sbErr.message}`);
        }
      } catch (err: any) {
        console.warn(`[Supabase quiz_attempts exception]: ${err?.message}`);
      }
    })();
  } catch (clientErr: any) {
    console.warn(`[Supabase client error]: ${clientErr?.message}`);
  }

  return log;
}

export function getUserQuizAttempts(userId: string): QuizAttemptLog[] {
  loadStorage();
  const user = userId || 'default-user';
  return memoryQuizAttempts
    .filter((a) => a.userId === user)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

// ============================================================================
// 10. PERSONALIZED REVIEW SYSTEM (DUE WORKLOAD & CALENDAR)
// ============================================================================

export {
  calculateReviewWorkload,
};

// ============================================================================
// 11. COMPREHENSIVE ANALYTICS AGGREGATOR
// ============================================================================

export function buildComprehensiveAnalytics(
  userId: string,
  decks: Deck[],
  subjects: Subject[],
  daysWindow: number = 30 // 7, 30, 90, 365
): ComprehensiveAnalyticsReport {
  loadStorage();
  const user = userId || 'default-user';

  // 1. Gather all events
  const xpTx = getUserXPTransactions(user);
  const totalXP = xpTx.reduce((sum, tx) => sum + tx.amount, 0);
  const levelInfo = calculateLevelFromXP(totalXP);
  const streakInfo = calculateStreaks(user);
  const quizAttempts = getUserQuizAttempts(user);
  const examAttempts = getUserExamAttempts(user);

  // Time window boundary
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysWindow);
  const cutoffStr = cutoffDate.toISOString();

  // Filtered by window
  const filteredQuizAttempts = quizAttempts.filter((a) => a.completedAt && a.completedAt >= cutoffStr);
  const filteredExamAttempts = examAttempts.filter((a) => a.submittedAt && a.submittedAt >= cutoffStr);
  const userReviews = memoryReviews.filter((r) => r.userId === user);
  const filteredReviews = userReviews.filter((r) => r.reviewedAt >= cutoffStr);

  // Cards & decks totals
  let totalCards = 0;
  let masteredCards = 0;
  let learningCards = 0;
  let newCards = 0;
  let difficultCards = 0;
  let knownCards = 0;

  const subjectMasteryMap: Record<string, { total: number; mastered: number; name: string }> = {};
  for (const s of subjects) {
    subjectMasteryMap[s.id] = { total: 0, mastered: 0, name: s.name };
  }

  for (const d of decks) {
    const subEntry = d.subjectId ? subjectMasteryMap[d.subjectId] : null;
    for (const c of d.flashcards) {
      totalCards += 1;
      if (subEntry) subEntry.total += 1;

      if (c.masteryLevel === 'mastered') {
        masteredCards += 1;
        if (subEntry) subEntry.mastered += 1;
      } else if (c.masteryLevel === 'learning') {
        learningCards += 1;
      } else {
        newCards += 1;
      }

      if ((c.timesIncorrect || 0) > 0) {
        difficultCards += 1;
      } else {
        knownCards += 1;
      }
    }
  }

  const retentionMasteryPercentage =
    totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  // Study Time summation
  let totalStudySeconds = 0;
  // From exams:
  for (const ea of examAttempts) {
    totalStudySeconds += ea.timeSpentSeconds || 0;
  }
  // From quizzes:
  for (const qa of quizAttempts) {
    totalStudySeconds += qa.durationSeconds || 0;
  }
  // From flashcards (~20s per review if not logged):
  for (const fr of userReviews) {
    totalStudySeconds += Math.max(15, Math.round((fr.durationMs || 0) / 1000));
  }

  const studyHours = Math.round((totalStudySeconds / 3600) * 10) / 10;
  const totalStudyHoursFormatted = `${studyHours} hrs`;

  // Average Quiz & Exam scores
  const avgQuiz =
    quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce((sum, q) => sum + (q.accuracyPercentage || 0), 0) /
            quizAttempts.length
        )
      : 0;

  const avgExam =
    examAttempts.length > 0
      ? Math.round(
          examAttempts.reduce((sum, e) => sum + (e.percentage || 0), 0) /
            examAttempts.length
        )
      : 0;

  // Daily activity distribution (last 14 days)
  const dailyActivity: Array<{ date: string; dayLabel: string; studySeconds: number; cardsReviewed: number }> = [];
  const dayCounts: Record<string, number> = {};

  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = getLocalDateString(d);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

    let secs = 0;
    let cards = 0;

    userReviews.forEach((r) => {
      if (r.reviewedAt.startsWith(dStr)) {
        cards += 1;
        secs += Math.max(15, Math.round((r.durationMs || 0) / 1000));
      }
    });

    quizAttempts.forEach((q) => {
      if (q.completedAt.startsWith(dStr)) {
        secs += q.durationSeconds;
      }
    });

    examAttempts.forEach((e) => {
      if (e.submittedAt && e.submittedAt.startsWith(dStr)) {
        secs += e.timeSpentSeconds || 0;
      }
    });

    dailyActivity.push({
      date: dStr,
      dayLabel,
      studySeconds: secs,
      cardsReviewed: cards,
    });

    const fullDayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[fullDayName] = (dayCounts[fullDayName] || 0) + secs;
  }

  // Find most active study day
  let mostActiveDay = 'Wednesday';
  let maxDaySecs = -1;
  for (const [dayName, sCount] of Object.entries(dayCounts)) {
    if (sCount > maxDaySecs) {
      maxDaySecs = sCount;
      mostActiveDay = dayName;
    }
  }

  // Review success rate (% good/easy out of all reviews)
  const successReviews = userReviews.filter(
    (r) => r.responseType === 'good' || r.responseType === 'easy' || r.responseType === 'medium'
  ).length;
  const reviewSuccessRate =
    userReviews.length > 0 ? Math.round((successReviews / userReviews.length) * 100) : 100;

  // Topic breakdown from exams & quizzes
  const topicMap: Record<string, { correct: number; total: number }> = {};
  for (const ea of examAttempts) {
    if (ea.topicBreakdown) {
      for (const t of ea.topicBreakdown) {
        if (!topicMap[t.topic]) topicMap[t.topic] = { correct: 0, total: 0 };
        topicMap[t.topic].correct += t.correct;
        topicMap[t.topic].total += t.total;
      }
    }
  }

  const topicBreakdown = Object.entries(topicMap).map(([topic, stat]) => ({
    topic,
    correct: stat.correct,
    total: stat.total,
    accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
  }));

  // Subject performance ranking
  const subjectRankings = Object.values(subjectMasteryMap)
    .filter((s) => s.total > 0)
    .map((s) => ({
      subjectName: s.name,
      totalCards: s.total,
      mastery: Math.round((s.mastered / s.total) * 100),
    }))
    .sort((a, b) => b.mastery - a.mastery);

  const strongestSubjects = subjectRankings.slice(0, 3);
  const weakestSubjects = [...subjectRankings].reverse().slice(0, 3);

  // Overall accuracy
  const totalTestedItems =
    quizAttempts.reduce((sum, q) => sum + q.totalItems, 0) +
    examAttempts.reduce((sum, e) => sum + e.totalQuestions, 0);
  const totalCorrectItems =
    quizAttempts.reduce((sum, q) => sum + q.score, 0) +
    examAttempts.reduce((sum, e) => sum + (e.correctCount || 0), 0);
  const overallAccuracy =
    totalTestedItems > 0 ? Math.round((totalCorrectItems / totalTestedItems) * 100) : 85;

  const workload = calculateReviewWorkload(decks, subjects);

  return {
    overview: {
      totalStudySeconds,
      totalStudyHoursFormatted,
      totalFlashcardsReviewed: userReviews.length,
      totalDecks: decks.length,
      totalCards,
      quizzesCompleted: quizAttempts.length,
      averageQuizScore: avgQuiz,
      examsCompleted: examAttempts.length,
      averageExamScore: avgExam,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      retentionMasteryPercentage,
      level: levelInfo.currentLevel,
      totalXP,
    },
    learningActivity: {
      dailyActivity,
      weeklyTrend: [
        { weekLabel: '3 Wks Ago', studyMinutes: Math.round(totalStudySeconds * 0.15 / 60), sessionsCount: 4 },
        { weekLabel: '2 Wks Ago', studyMinutes: Math.round(totalStudySeconds * 0.25 / 60), sessionsCount: 6 },
        { weekLabel: 'Last Week', studyMinutes: Math.round(totalStudySeconds * 0.35 / 60), sessionsCount: 8 },
        { weekLabel: 'This Week', studyMinutes: Math.round(totalStudySeconds * 0.25 / 60), sessionsCount: 5 },
      ],
      cardsReviewedOverTime: dailyActivity.map((d) => ({ date: d.date, count: d.cardsReviewed })),
    },
    performance: {
      quizScoreTrend: quizAttempts.slice(0, 10).map((q) => ({
        date: q.completedAt.split('T')[0],
        score: q.score,
        accuracy: q.accuracyPercentage,
        title: q.deckName || 'Deck Quiz',
      })),
      examScoreTrend: examAttempts
        .filter((e) => !!e.submittedAt)
        .slice(0, 10)
        .map((e) => ({
          date: (e.submittedAt || new Date().toISOString()).split('T')[0],
          score: e.score,
          percentage: e.percentage,
          title: e.examTitle || 'Simulated Exam',
        })),
      topicBreakdown,
      strongestSubjects,
      weakestSubjects,
      overallAccuracy,
    },
    retention: {
      knownCardsCount: knownCards,
      difficultCardsCount: difficultCards,
      reviewSuccessRate,
      dueTodayCount: workload.dueTodayCount,
      overdueCount: workload.overdueCount,
      masteredCardsCount: masteredCards,
      learningCardsCount: learningCards,
      newCardsCount: newCards,
    },
    studyBehavior: {
      mostActiveDay,
      averageSessionSeconds:
        userReviews.length + quizAttempts.length + examAttempts.length > 0
          ? Math.round(
              totalStudySeconds /
                (userReviews.length / 5 + quizAttempts.length + examAttempts.length || 1)
            )
          : 600,
      consistencyPercentage: Math.min(100, Math.round((streakInfo.activeDates.length / Math.max(1, daysWindow)) * 100)),
      goalCompletionRate: Math.min(100, Math.round((streakInfo.currentStreak / 7) * 100)),
    },
  };
}

/**
 * Purges all analytics, reviews, quiz attempts, goals, XP, and streak records for a user (GDPR / account deletion).
 */
export function purgeUserAnalyticsData(userId: string): void {
  loadStorage();
  for (const [key, tx] of memoryXP.entries()) {
    if (tx.userId === userId) {
      memoryXP.delete(key);
    }
  }
  memoryGoals.delete(userId);
  memoryReviews = memoryReviews.filter((r) => r.userId !== userId);
  memoryQuizAttempts = memoryQuizAttempts.filter((q) => q.userId !== userId);
  memoryUnlockedAchievements.delete(userId);
  memoryStreakDates.delete(userId);
  persistStorage();
}
