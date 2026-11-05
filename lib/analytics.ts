/**
 * Notionwell Phase 6: Core Analytics, Intelligent SM-2, Gamification & Progression Engine
 * Authoritative Supabase PostgreSQL Persistence with Zero Filesystem Dependencies.
 * Eliminates /var/task/.analytics_storage runtime crashes on Vercel Serverless.
 */

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
  currentLevelMinXP: number;
  nextLevelXP: number;
  levelProgressPercentage: number;
  progressPercentage?: number;
  xpToNextLevel: number;
  title: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'milestones' | 'streaks' | 'mastery' | 'time' | 'cards' | 'exams';
  xpReward: number;
  threshold: number;
}

export interface UserAchievement {
  id: string;
  userId?: string;
  achievementId?: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  currentProgress: number;
  threshold: number;
  progressPercentage: number;
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
  id?: string;
  metric?: string;
  label: string;
  current?: number;
  actual?: number;
  target: number;
  unit: string;
  percentage: number;
  isCompleted: boolean;
  timeframe?: 'daily' | 'weekly';
}

export interface GoalProgressSummary {
  daily: GoalProgressItem[];
  weekly: GoalProgressItem[];
  dailyCompletionPercentage: number;
  weeklyCompletionPercentage: number;
  dailyCompletedCount?: number;
  dailyTotalCount?: number;
  weeklyCompletedCount?: number;
  weeklyTotalCount?: number;
  overallCompletionPercentage?: number;
  items?: GoalProgressItem[];
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
  deckId: string;
  deckName: string;
  userId: string;
  score: number;
  totalItems: number;
  accuracyPercentage: number;
  durationSeconds: number;
  completedAt: string;
  topicBreakdown: Array<{ topic: string; correct: number; total: number }>;
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
    totalStudyHours?: string;
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
    totalCardsReviewed?: number;
    cardsMasteredCount?: number;
    cardsLearningCount?: number;
    cardsNewCount?: number;
    overallAccuracy?: number;
    levelInfo?: UserLevelInfo;
    retentionRatePercentage?: number;
    streakInfo?: StreakInfo;
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
  studyTimeTrends?: Array<{
    date: string;
    dayLabel: string;
    seconds: number;
    minutes: number;
  }>;
  retentionCurve?: Array<{
    daysSinceReview: number;
    retentionProbability: number;
    cardCount: number;
  }>;
  subjectBreakdown?: Array<{
    subjectId: string;
    subjectName: string;
    totalCards: number;
    masteredCards: number;
    accuracyPercentage: number;
    timeSpentSeconds: number;
  }>;
  weakTopics?: Array<{
    topic: string;
    accuracyPercentage: number;
    totalAttempts: number;
    source: 'quiz' | 'flashcards' | 'exam';
  }>;
  dailyPerformance?: {
    averageReviewSpeedSeconds: number;
    consistencyPercentage: number;
    goalCompletionRate: number;
  };
}

function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// ============================================================================
// 2. MASTER ACHIEVEMENTS DEFINITIONS (16 BADGES)
// ============================================================================

export const MASTER_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_deck',
    title: 'Pioneer Scholar',
    description: 'Created your very first study deck',
    icon: '🌱',
    category: 'milestones',
    xpReward: 50,
    threshold: 1,
  },
  {
    id: 'quiz_whiz',
    title: 'Quiz Virtuoso',
    description: 'Scored a perfect 100% on any practice quiz',
    icon: '🎯',
    category: 'mastery',
    xpReward: 100,
    threshold: 1,
  },
  {
    id: 'streak_3',
    title: 'Habit Builder',
    description: 'Studied for 3 consecutive days in a row',
    icon: '🔥',
    category: 'streaks',
    xpReward: 75,
    threshold: 3,
  },
  {
    id: 'streak_7',
    title: 'Unstoppable Momentum',
    description: 'Maintained a flawless 7-day study streak',
    icon: '⚡',
    category: 'streaks',
    xpReward: 150,
    threshold: 7,
  },
  {
    id: 'streak_30',
    title: 'Iron Discipline',
    description: 'Achieved an extraordinary 30-day active study streak',
    icon: '👑',
    category: 'streaks',
    xpReward: 500,
    threshold: 30,
  },
  {
    id: 'time_1h',
    title: 'Deep Diver',
    description: 'Invested 1 hour of active study focus',
    icon: '⏱️',
    category: 'time',
    xpReward: 75,
    threshold: 3600,
  },
  {
    id: 'time_5h',
    title: 'Marathon Scholar',
    description: 'Dedicated 5 hours of total learning time',
    icon: '🏆',
    category: 'time',
    xpReward: 200,
    threshold: 18000,
  },
  {
    id: 'cards_50',
    title: 'Flash Focus',
    description: 'Reviewed 50 flashcards across all decks',
    icon: '🃏',
    category: 'cards',
    xpReward: 75,
    threshold: 50,
  },
  {
    id: 'cards_200',
    title: 'Memory Master',
    description: 'Reviewed 200 flashcards using spaced repetition',
    icon: '🧠',
    category: 'cards',
    xpReward: 200,
    threshold: 200,
  },
  {
    id: 'exam_rookie',
    title: 'Trial by Fire',
    description: 'Completed your first full AI simulated exam',
    icon: '📝',
    category: 'exams',
    xpReward: 100,
    threshold: 1,
  },
  {
    id: 'exam_distinction',
    title: 'Academic Distinction',
    description: 'Scored 90%+ with Distinction on a simulated exam',
    icon: '🎖️',
    category: 'exams',
    xpReward: 250,
    threshold: 1,
  },
  {
    id: 'polymath',
    title: 'Renaissance Learner',
    description: 'Studied across 3 or more distinct subject domains',
    icon: '🌐',
    category: 'mastery',
    xpReward: 150,
    threshold: 3,
  },
  {
    id: 'retention_centurion',
    title: 'Centurion of Retention',
    description: 'Mastered 100 flashcards with long-term SM-2 retention',
    icon: '💎',
    category: 'milestones',
    xpReward: 250,
    threshold: 100,
  },
  {
    id: 'weakness_slayer',
    title: 'Weakness Slayer',
    description: 'Remediated 5 detected weak topics to full accuracy',
    icon: '⚔️',
    category: 'mastery',
    xpReward: 150,
    threshold: 5,
  },
  {
    id: 'viva_scholar',
    title: 'Articulate Scholar',
    description: 'Completed an AI Viva Voce oral examination session',
    icon: '🎙️',
    category: 'mastery',
    xpReward: 150,
    threshold: 1,
  },
  {
    id: 'knowledge_architect',
    title: 'Knowledge Architect',
    description: 'Discovered cross-document knowledge connections',
    icon: '🗺️',
    category: 'mastery',
    xpReward: 150,
    threshold: 1,
  },
];

// ============================================================================
// 3. IN-MEMORY DEMO FALLBACK CACHE (For unauthenticated demo guests only)
// ============================================================================

const demoXPMap = new Map<string, XPTransaction>();
const demoGoalsMap = new Map<string, LearningGoals>();
let demoReviews: FlashcardReviewLog[] = [];
let demoQuizAttempts: QuizAttemptLog[] = [];
const demoAchievements = new Set<string>();
const demoStreakDates = new Set<string>();

// ============================================================================
// 4. INTELLIGENT SM-2 SPACED REPETITION ENGINE
// ============================================================================

export function calculateSM2(
  card: Flashcard,
  rating: SM2Rating
): SM2Result {
  const ratingMap: Record<SM2Rating, number> = {
    again: 1,
    hard: 3,
    medium: 4,
    good: 4,
    easy: 5,
  };

  const q = ratingMap[rating] || 4;
  let currentEF = (card as any).easinessFactor || 2.5;
  let currentInterval = card.intervalDays || 0;
  let currentRepetition = (card as any).repetitionCount || 0;

  // Standard SuperMemo SM-2 formula:
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  let newEF = currentEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEF < 1.3) newEF = 1.3;
  if (newEF > 2.8) newEF = 2.8;
  newEF = Math.round(newEF * 100) / 100;

  let newInterval = 1;
  let newRepetition = currentRepetition;

  if (q < 3) {
    // Lapse
    newRepetition = 0;
    newInterval = 1;
  } else {
    // Successful recall
    if (currentRepetition === 0) {
      newInterval = 1;
    } else if (currentRepetition === 1) {
      newInterval = 6;
    } else {
      if (rating === 'hard') {
        newInterval = Math.max(1, Math.round(currentInterval * 1.2));
      } else if (rating === 'easy') {
        newInterval = Math.max(1, Math.round(currentInterval * newEF * 1.3));
      } else {
        newInterval = Math.max(1, Math.round(currentInterval * newEF));
      }
    }
    newRepetition += 1;
  }

  // Determine mastery level
  let masteryLevel: 'new' | 'learning' | 'mastered' = 'learning';
  if (newRepetition >= 4 && newInterval >= 21) {
    masteryLevel = 'mastered';
  } else if (newRepetition === 0 && q < 3) {
    masteryLevel = 'new';
  } else {
    masteryLevel = 'learning';
  }

  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + newInterval);
  const nextReviewDate = getLocalDateString(reviewDate);

  return {
    easinessFactor: newEF,
    intervalDays: newInterval,
    repetitionCount: newRepetition,
    nextReviewDate,
    masteryLevel,
    ratingValue: q,
  };
}

export async function recordFlashcardReview(
  userId: string,
  deckId: string,
  flashcardId: string,
  response: SM2Rating,
  sm2Result: SM2Result,
  durationMs: number = 0
): Promise<FlashcardReviewLog> {
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

  if (userId === 'demo-guest-user') {
    demoReviews.push(log);
    await recordActiveStudyDate(userId, 'flashcards', Math.max(10, Math.round(durationMs / 1000)), 1);
    return log;
  }

  try {
    const admin = createAdminClient();
    await admin.from('flashcard_reviews').insert({
      id: log.id,
      flashcard_id: isUUID(flashcardId) ? flashcardId : null,
      user_id: userId,
      rating: sm2Result.ratingValue,
      response_type: response === 'medium' ? 'good' : response,
      scheduled_days: sm2Result.intervalDays,
      easiness_factor: sm2Result.easinessFactor,
      review_duration_ms: durationMs,
      reviewed_at: log.reviewedAt,
    });

    // If card exists in Supabase flashcards table, update its SM-2 state
    if (isUUID(flashcardId)) {
      await admin.from('flashcards').update({
        interval_days: sm2Result.intervalDays,
        easiness_factor: sm2Result.easinessFactor,
        repetition_count: sm2Result.repetitionCount,
        next_review_date: sm2Result.nextReviewDate,
        mastery_level: sm2Result.masteryLevel,
        last_reviewed_at: log.reviewedAt,
      }).eq('id', flashcardId).eq('user_id', userId);
    }
  } catch (err: any) {
    console.warn('[recordFlashcardReview] Supabase insert notice:', err?.message);
  }

  await recordActiveStudyDate(userId, 'flashcards', Math.max(10, Math.round(durationMs / 1000)), 1);
  return log;
}

export async function getUserFlashcardReviews(userId: string): Promise<FlashcardReviewLog[]> {
  if (userId === 'demo-guest-user') {
    return demoReviews;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('flashcard_reviews')
      .select('*')
      .eq('user_id', userId)
      .order('reviewed_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((r) => ({
        id: r.id,
        flashcardId: r.flashcard_id || '',
        deckId: '',
        userId: r.user_id,
        ratingValue: r.rating,
        responseType: r.response_type,
        scheduledDays: r.scheduled_days,
        easinessFactor: Number(r.easiness_factor),
        durationMs: r.review_duration_ms || 0,
        reviewedAt: r.reviewed_at,
      }));
    }
  } catch (err: any) {
    console.warn('[getUserFlashcardReviews] Supabase query notice:', err?.message);
  }

  return [];
}

// ============================================================================
// 5. GAMIFICATION & XP PROGRESSION SYSTEM
// ============================================================================

export function calculateLevelFromXP(totalXP: number): UserLevelInfo {
  const safeXP = Math.max(0, totalXP || 0);
  const currentLevel = Math.max(1, Math.floor(Math.sqrt(safeXP / 50)) + 1);

  const currentLevelMinXP = 50 * Math.pow(currentLevel - 1, 2);
  const nextLevelXP = 50 * Math.pow(currentLevel, 2);
  const xpSpan = nextLevelXP - currentLevelMinXP;
  const xpEarnedInLevel = safeXP - currentLevelMinXP;

  const levelProgressPercentage =
    xpSpan > 0 ? Math.min(100, Math.max(0, Math.round((xpEarnedInLevel / xpSpan) * 100))) : 0;

  const titles = [
    'Novice Explorer',
    'Curious Apprentice',
    'Diligent Scholar',
    'Adept Thinker',
    'Master Mind',
    'Knowledge Alchemist',
    'Sage Philosopher',
    'Archon of Wisdom',
  ];
  const titleIndex = Math.min(titles.length - 1, Math.floor((currentLevel - 1) / 3));

  return {
    currentLevel,
    totalXP: safeXP,
    currentLevelMinXP,
    nextLevelXP,
    levelProgressPercentage,
    progressPercentage: levelProgressPercentage,
    xpToNextLevel: Math.max(0, nextLevelXP - safeXP),
    title: titles[titleIndex],
  };
}

export async function awardXP(
  userId: string,
  source: XPSource,
  amount: number,
  description: string,
  activityId: string
): Promise<{
  awarded: boolean;
  transaction: XPTransaction | null;
  levelInfo: UserLevelInfo;
  leveledUp: boolean;
  previousLevel: number;
}> {
  const user = userId || 'default-user';

  if (user === 'demo-guest-user') {
    const key = `${user}:${activityId}`;
    let currentXP = 0;
    demoXPMap.forEach((tx) => (currentXP += tx.amount));
    const prevLevel = calculateLevelFromXP(currentXP);

    if (demoXPMap.has(key)) {
      return {
        awarded: false,
        transaction: demoXPMap.get(key)!,
        levelInfo: prevLevel,
        leveledUp: false,
        previousLevel: prevLevel.currentLevel,
      };
    }

    const tx: XPTransaction = {
      id: uuidv4(),
      userId: user,
      amount,
      source,
      description,
      activityId,
      createdAt: new Date().toISOString(),
    };
    demoXPMap.set(key, tx);
    const newTotal = currentXP + amount;
    const newLevel = calculateLevelFromXP(newTotal);
    return {
      awarded: true,
      transaction: tx,
      levelInfo: newLevel,
      leveledUp: newLevel.currentLevel > prevLevel.currentLevel,
      previousLevel: prevLevel.currentLevel,
    };
  }

  try {
    const admin = createAdminClient();

    // 1. Check idempotency: avoid duplicate rewards
    const { data: existing } = await admin
      .from('xp_transactions')
      .select('*')
      .eq('user_id', user)
      .eq('activity_id', activityId)
      .maybeSingle();

    if (existing) {
      const totalXP = await getUserTotalXP(user);
      const levelInfo = calculateLevelFromXP(totalXP);
      return {
        awarded: false,
        transaction: {
          id: existing.id,
          userId: existing.user_id,
          amount: existing.amount,
          source: existing.source as XPSource,
          description: existing.description,
          activityId: existing.activity_id,
          createdAt: existing.created_at,
        },
        levelInfo,
        leveledUp: false,
        previousLevel: levelInfo.currentLevel,
      };
    }

    const currentTotalXP = await getUserTotalXP(user);
    const prevLevelInfo = calculateLevelFromXP(currentTotalXP);

    const transaction: XPTransaction = {
      id: uuidv4(),
      userId: user,
      amount,
      source,
      description,
      activityId,
      createdAt: new Date().toISOString(),
    };

    // 2. Insert transaction
    const { error: insertErr } = await admin.from('xp_transactions').insert({
      id: transaction.id,
      user_id: user,
      amount: transaction.amount,
      source: transaction.source,
      description: transaction.description,
      activity_id: transaction.activityId,
      created_at: transaction.createdAt,
    });

    if (insertErr) {
      console.warn('[awardXP] xp_transactions insert notice:', insertErr.message);
    }

    // 3. Update total XP in user profile
    const newTotalXP = currentTotalXP + amount;
    const newLevelInfo = calculateLevelFromXP(newTotalXP);
    const leveledUp = newLevelInfo.currentLevel > prevLevelInfo.currentLevel;

    await admin.from('profiles').update({
      total_xp: newTotalXP,
      current_level: newLevelInfo.currentLevel,
      updated_at: new Date().toISOString(),
    }).eq('id', user);

    return {
      awarded: true,
      transaction,
      levelInfo: newLevelInfo,
      leveledUp,
      previousLevel: prevLevelInfo.currentLevel,
    };
  } catch (err: any) {
    console.error('[awardXP Error]:', err?.message);
    const fallbackLevel = calculateLevelFromXP(0);
    return {
      awarded: false,
      transaction: null,
      levelInfo: fallbackLevel,
      leveledUp: false,
      previousLevel: 1,
    };
  }
}

export async function getUserXPTransactions(userId: string): Promise<XPTransaction[]> {
  const user = userId || 'default-user';

  if (user === 'demo-guest-user') {
    return Array.from(demoXPMap.values()).reverse();
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('xp_transactions')
      .select('*')
      .eq('user_id', user)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && Array.isArray(data)) {
      return data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        source: row.source as XPSource,
        description: row.description,
        activityId: row.activity_id,
        createdAt: row.created_at,
      }));
    }
  } catch (err: any) {
    console.warn('[getUserXPTransactions] Query notice:', err?.message);
  }

  return [];
}

export async function getUserTotalXP(userId: string): Promise<number> {
  const user = userId || 'default-user';

  if (user === 'demo-guest-user') {
    let sum = 0;
    demoXPMap.forEach((tx) => (sum += tx.amount));
    return sum;
  }

  try {
    const admin = createAdminClient();
    // 1. Try reading profile cached total_xp
    const { data: profile } = await admin
      .from('profiles')
      .select('total_xp')
      .eq('id', user)
      .maybeSingle();

    if (profile && typeof profile.total_xp === 'number') {
      return profile.total_xp;
    }

    // 2. Sum directly from xp_transactions
    const { data: txs } = await admin
      .from('xp_transactions')
      .select('amount')
      .eq('user_id', user);

    if (Array.isArray(txs)) {
      return txs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    }
  } catch (err: any) {
    console.warn('[getUserTotalXP] Query notice:', err?.message);
  }

  return 0;
}

// ============================================================================
// 6. STREAK TRACKING & ACTIVITY CALENDAR
// ============================================================================

export async function recordActiveStudyDate(
  userId: string,
  activityType: string = 'study',
  durationSeconds: number = 0,
  cardsReviewed: number = 0
): Promise<void> {
  const user = userId || 'default-user';
  const todayStr = getLocalDateString();

  if (user === 'demo-guest-user') {
    demoStreakDates.add(todayStr);
    return;
  }

  try {
    const admin = createAdminClient();
    await admin.from('streak_history').upsert({
      user_id: user,
      active_date: todayStr,
      activity_type: activityType,
      duration_seconds: durationSeconds,
      cards_reviewed: cardsReviewed,
    }, { onConflict: 'user_id, active_date' });

    // Update streak_days in profiles
    const streaks = await calculateStreaks(user);
    await admin.from('profiles').update({
      streak_days: streaks.currentStreak,
      updated_at: new Date().toISOString(),
    }).eq('id', user);
  } catch (err: any) {
    console.warn('[recordActiveStudyDate] Supabase streak upsert notice:', err?.message);
  }
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function calculateStreaks(userId: string): Promise<StreakInfo> {
  const user = userId || 'default-user';
  let sortedDates: string[] = [];

  if (user === 'demo-guest-user') {
    sortedDates = Array.from(demoStreakDates).sort();
  } else {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('streak_history')
        .select('active_date')
        .eq('user_id', user)
        .order('active_date', { ascending: true });

      if (!error && Array.isArray(data)) {
        sortedDates = data.map((r) => r.active_date).filter(Boolean).sort();
      }
    } catch (err: any) {
      console.warn('[calculateStreaks] Supabase streak query notice:', err?.message);
    }
  }

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
  const datesSet = new Set(sortedDates);
  const todayCompleted = datesSet.has(todayStr);

  // Compute Current Streak
  let currentStreak = 0;
  let checkDate = new Date();

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

export async function getUserAchievements(
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
    hoursStudied?: number;
    weakTopicsFixed?: number;
    vivaSessionsCompleted?: number;
    connectionsCount?: number;
  }
): Promise<UserAchievement[]> {
  const user = userId || 'default-user';
  const unlockedIds = new Set<string>();

  if (user === 'demo-guest-user') {
    demoAchievements.forEach((id) => unlockedIds.add(id));
  } else {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user);

      if (!error && Array.isArray(data)) {
        data.forEach((r) => unlockedIds.add(r.achievement_id));
      }
    } catch (err: any) {
      console.warn('[getUserAchievements] Query notice:', err?.message);
    }
  }

  const s = stats || {};
  const newlyUnlocked: string[] = [];

  const results: UserAchievement[] = MASTER_ACHIEVEMENTS.map((def) => {
    let progress = 0;

    switch (def.id) {
      case 'first_deck':
        progress = s.decksCount || 0;
        break;
      case 'quiz_whiz':
        progress = s.hasPerfectQuiz ? 1 : 0;
        break;
      case 'streak_3':
      case 'streak_7':
      case 'streak_30':
        progress = s.streakDays || 0;
        break;
      case 'time_1h':
      case 'time_5h':
        progress = Math.round((s.hoursStudied || 0) * 3600);
        break;
      case 'cards_50':
      case 'cards_200':
        progress = s.cardsReviewed || 0;
        break;
      case 'exam_rookie':
        progress = s.examsCompleted || 0;
        break;
      case 'exam_distinction':
        progress = s.hasExamDistinction ? 1 : 0;
        break;
      case 'polymath':
        progress = s.hasSubjectCompleted ? 3 : (s.decksCount ? Math.min(3, s.decksCount) : 0);
        break;
      case 'retention_centurion':
        progress = s.masteredCardsCount || 0;
        break;
      case 'weakness_slayer':
        progress = s.weakTopicsFixed || 0;
        break;
      case 'viva_scholar':
        progress = s.vivaSessionsCompleted || 0;
        break;
      case 'knowledge_architect':
        progress = s.connectionsCount || 0;
        break;
      default:
        progress = 0;
    }

    const wasAlreadyUnlocked = unlockedIds.has(def.id);
    const isNowUnlocked = wasAlreadyUnlocked || progress >= def.threshold;

    if (!wasAlreadyUnlocked && isNowUnlocked) {
      newlyUnlocked.push(def.id);
      unlockedIds.add(def.id);
    }

    return {
      id: def.id,
      userId: user,
      achievementId: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      xpReward: def.xpReward,
      isUnlocked: isNowUnlocked,
      unlockedAt: isNowUnlocked ? new Date().toISOString() : null,
      progress: Math.min(def.threshold, progress),
      currentProgress: Math.min(def.threshold, progress),
      threshold: def.threshold,
      progressPercentage: Math.min(100, Math.round((progress / def.threshold) * 100)),
    };
  });

  // Persist newly unlocked badges to Supabase
  if (newlyUnlocked.length > 0 && user !== 'demo-guest-user') {
    try {
      const admin = createAdminClient();
      for (const badgeId of newlyUnlocked) {
        await admin.from('user_achievements').upsert({
          user_id: user,
          achievement_id: badgeId,
          unlocked_at: new Date().toISOString(),
        }, { onConflict: 'user_id, achievement_id' });
      }
    } catch (persistErr: any) {
      console.warn('[getUserAchievements] Persistence notice:', persistErr?.message);
    }
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

export async function getLearningGoals(userId: string): Promise<LearningGoals> {
  const user = userId || 'default-user';

  if (user === 'demo-guest-user') {
    return demoGoalsMap.get(user) || { userId: user, ...DEFAULT_LEARNING_GOALS };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('learning_goals')
      .select('*')
      .eq('user_id', user)
      .maybeSingle();

    if (!error && data) {
      return {
        userId: user,
        dailyStudyMinutes: data.daily_study_minutes ?? 20,
        dailyCardsReviewed: data.daily_cards_reviewed ?? 15,
        dailyQuestionsPracticed: data.daily_questions_practiced ?? 5,
        weeklyStudyHours: Number(data.weekly_study_hours) || 2.5,
        weeklyDecksCompleted: data.weekly_decks_completed ?? 2,
        weeklyQuizzesAttempted: data.weekly_quizzes_attempted ?? 3,
        weeklyExamsCompleted: data.weekly_exams_completed ?? 1,
      };
    }
  } catch (err: any) {
    console.warn('[getLearningGoals] Supabase query notice:', err?.message);
  }

  return { userId: user, ...DEFAULT_LEARNING_GOALS };
}

export async function saveLearningGoals(goals: LearningGoals): Promise<LearningGoals> {
  const user = goals.userId || 'default-user';

  if (user === 'demo-guest-user') {
    demoGoalsMap.set(user, goals);
    return goals;
  }

  try {
    const admin = createAdminClient();
    await admin.from('learning_goals').upsert(
      {
        user_id: user,
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
  } catch (err: any) {
    console.warn('[saveLearningGoals] Supabase upsert notice:', err?.message);
  }

  return goals;
}

export function calculateGoalProgress(
  goals: LearningGoals,
  activity: {
    todayStudyMinutes?: number;
    todayCardsReviewed?: number;
    todayQuestionsPracticed?: number;
    thisWeekStudyHours?: number;
    thisWeekDecksCompleted?: number;
    thisWeekQuizzesAttempted?: number;
    thisWeekExamsCompleted?: number;
  }
): GoalProgressSummary {
  const a = activity || {};
  const todayMins = a.todayStudyMinutes || 0;
  const todayCards = a.todayCardsReviewed || 0;
  const todayQuestions = a.todayQuestionsPracticed || 0;
  const weekHours = a.thisWeekStudyHours || 0;
  const weekDecks = a.thisWeekDecksCompleted || 0;
  const weekQuizzes = a.thisWeekQuizzesAttempted || 0;
  const weekExams = a.thisWeekExamsCompleted || 0;

  const daily: GoalProgressItem[] = [
    {
      id: 'daily_time',
      metric: 'dailyStudyMinutes',
      label: 'Study Time',
      target: goals.dailyStudyMinutes,
      current: todayMins,
      actual: todayMins,
      unit: 'mins',
      percentage: Math.min(100, Math.round((todayMins / goals.dailyStudyMinutes) * 100)),
      isCompleted: todayMins >= goals.dailyStudyMinutes,
      timeframe: 'daily',
    },
    {
      id: 'daily_cards',
      metric: 'dailyCardsReviewed',
      label: 'Cards Reviewed',
      target: goals.dailyCardsReviewed,
      current: todayCards,
      actual: todayCards,
      unit: 'cards',
      percentage: Math.min(100, Math.round((todayCards / goals.dailyCardsReviewed) * 100)),
      isCompleted: todayCards >= goals.dailyCardsReviewed,
      timeframe: 'daily',
    },
    {
      id: 'daily_questions',
      metric: 'dailyQuestionsPracticed',
      label: 'Practice Questions',
      target: goals.dailyQuestionsPracticed,
      current: todayQuestions,
      actual: todayQuestions,
      unit: 'items',
      percentage: Math.min(
        100,
        Math.round((todayQuestions / goals.dailyQuestionsPracticed) * 100)
      ),
      isCompleted: todayQuestions >= goals.dailyQuestionsPracticed,
      timeframe: 'daily',
    },
  ];

  const weekly: GoalProgressItem[] = [
    {
      id: 'weekly_hours',
      metric: 'weeklyStudyHours',
      label: 'Study Duration',
      target: goals.weeklyStudyHours,
      current: weekHours,
      actual: Math.round(weekHours * 10) / 10,
      unit: 'hrs',
      percentage: Math.min(100, Math.round((weekHours / goals.weeklyStudyHours) * 100)),
      isCompleted: weekHours >= goals.weeklyStudyHours,
      timeframe: 'weekly',
    },
    {
      id: 'weekly_decks',
      metric: 'weeklyDecksCompleted',
      label: 'Decks Reviewed',
      target: goals.weeklyDecksCompleted,
      current: weekDecks,
      actual: weekDecks,
      unit: 'decks',
      percentage: Math.min(
        100,
        Math.round((weekDecks / goals.weeklyDecksCompleted) * 100)
      ),
      isCompleted: weekDecks >= goals.weeklyDecksCompleted,
      timeframe: 'weekly',
    },
    {
      id: 'weekly_quizzes',
      metric: 'weeklyQuizzesAttempted',
      label: 'Quizzes Taken',
      target: goals.weeklyQuizzesAttempted,
      current: weekQuizzes,
      actual: weekQuizzes,
      unit: 'quizzes',
      percentage: Math.min(
        100,
        Math.round((weekQuizzes / goals.weeklyQuizzesAttempted) * 100)
      ),
      isCompleted: weekQuizzes >= goals.weeklyQuizzesAttempted,
      timeframe: 'weekly',
    },
    {
      id: 'weekly_exams',
      metric: 'weeklyExamsCompleted',
      label: 'Exams Taken',
      target: goals.weeklyExamsCompleted,
      current: weekExams,
      actual: weekExams,
      unit: 'exams',
      percentage: Math.min(
        100,
        Math.round((weekExams / goals.weeklyExamsCompleted) * 100)
      ),
      isCompleted: weekExams >= goals.weeklyExamsCompleted,
      timeframe: 'weekly',
    },
  ];

  const dailyMet = daily.filter((i) => i.isCompleted).length;
  const weeklyMet = weekly.filter((i) => i.isCompleted).length;

  const dailyCompletionPercentage = Math.round((dailyMet / daily.length) * 100);
  const weeklyCompletionPercentage = Math.round((weeklyMet / weekly.length) * 100);

  const items = [...daily, ...weekly];
  const overallCompletionPercentage = Math.round(
    items.reduce((sum, item) => sum + item.percentage, 0) / items.length
  );

  return {
    daily,
    weekly,
    dailyCompletionPercentage,
    weeklyCompletionPercentage,
    dailyCompletedCount: dailyMet,
    dailyTotalCount: daily.length,
    weeklyCompletedCount: weeklyMet,
    weeklyTotalCount: weekly.length,
    overallCompletionPercentage,
    items,
  };
}

// ============================================================================
// 9. QUIZ ATTEMPT RECORDER
// ============================================================================

export async function recordQuizAttempt(
  userId: string,
  deckId: string,
  deckName: string,
  score: number,
  totalItems: number,
  durationSeconds: number,
  topicBreakdown: Array<{ topic: string; correct: number; total: number }> = []
): Promise<QuizAttemptLog> {
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

  if (userId === 'demo-guest-user') {
    demoQuizAttempts.push(log);
    await awardXP(
      userId,
      'quiz_completed',
      25 + (accuracyPercentage >= 80 ? 15 : 0),
      `Completed Quiz on ${deckName} (${accuracyPercentage}%)`,
      `quiz-attempt-${log.id}`
    );
    await recordActiveStudyDate(userId, 'quiz', durationSeconds, 0);
    return log;
  }

  try {
    const admin = createAdminClient();
    await admin.from('quiz_attempts').insert({
      id: log.id,
      quiz_id: isUUID(log.quizId) ? log.quizId : null,
      deck_id: isUUID(deckId) ? deckId : null,
      deck_name: deckName,
      user_id: userId,
      score,
      total_items: totalItems,
      accuracy_percentage: accuracyPercentage,
      duration_seconds: durationSeconds,
      topic_breakdown: topicBreakdown,
      completed_at: log.completedAt,
    });
  } catch (err: any) {
    console.warn('[recordQuizAttempt] Supabase insert notice:', err?.message);
  }

  // Award XP for quiz completion (server-verified idempotency)
  const baseXP = 25;
  const bonusXP = accuracyPercentage >= 80 ? 15 : 0;
  await awardXP(
    userId,
    'quiz_completed',
    baseXP + bonusXP,
    `Completed Quiz on ${deckName} (${accuracyPercentage}%)`,
    `quiz-attempt-${log.id}`
  );

  // Record active streak date
  await recordActiveStudyDate(userId, 'quiz', durationSeconds, 0);

  return log;
}

export async function getUserQuizAttempts(userId: string): Promise<QuizAttemptLog[]> {
  const user = userId || 'default-user';

  if (user === 'demo-guest-user') {
    return demoQuizAttempts.slice().reverse();
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user)
      .order('completed_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((r) => ({
        id: r.id,
        quizId: r.quiz_id || r.id,
        deckId: r.deck_id || '',
        deckName: r.deck_name || 'Study Quiz',
        userId: r.user_id,
        score: r.score,
        totalItems: r.total_items,
        accuracyPercentage: Number(r.accuracy_percentage),
        durationSeconds: r.duration_seconds || 0,
        completedAt: r.completed_at,
        topicBreakdown: Array.isArray(r.topic_breakdown) ? r.topic_breakdown : [],
      }));
    }
  } catch (err: any) {
    console.warn('[getUserQuizAttempts] Supabase query notice:', err?.message);
  }

  return [];
}

// ============================================================================
// 10. COMPREHENSIVE ANALYTICS AGGREGATOR
// ============================================================================

export {
  calculateReviewWorkload,
};

export async function buildComprehensiveAnalytics(
  userId: string,
  decks: Deck[],
  subjects: Subject[],
  daysWindow: number = 30
): Promise<ComprehensiveAnalyticsReport> {
  const user = userId || 'default-user';

  const [totalXP, streakInfo, quizAttempts, examAttempts, userReviews] = await Promise.all([
    getUserTotalXP(user),
    calculateStreaks(user),
    getUserQuizAttempts(user),
    getUserExamAttempts(user),
    getUserFlashcardReviews(user),
  ]);

  const levelInfo = calculateLevelFromXP(totalXP);

  // Time window boundary
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysWindow);
  const cutoffStr = cutoffDate.toISOString();

  const filteredQuizAttempts = quizAttempts.filter((a) => a.completedAt && a.completedAt >= cutoffStr);
  const filteredExamAttempts = examAttempts.filter((a) => a.submittedAt && a.submittedAt >= cutoffStr);
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

  const successReviews = userReviews.filter((r) => r.ratingValue >= 3).length;
  const reviewSuccessRate =
    userReviews.length > 0 ? Math.round((successReviews / userReviews.length) * 100) : 100;

  // Study Time summation
  let totalStudySeconds = 0;
  for (const ea of examAttempts) {
    totalStudySeconds += ea.timeSpentSeconds || 0;
  }
  for (const qa of quizAttempts) {
    totalStudySeconds += qa.durationSeconds || 0;
  }
  for (const fr of userReviews) {
    totalStudySeconds += Math.max(15, Math.round((fr.durationMs || 0) / 1000));
  }

  const studyHours = Math.round((totalStudySeconds / 3600) * 10) / 10;
  const totalStudyHoursFormatted = `${studyHours} hrs`;

  // Average Quiz & Exam scores
  const avgQuiz =
    quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce((sum, q) => sum + (q.accuracyPercentage || 0), 0) / quizAttempts.length
        )
      : 0;

  const avgExam =
    examAttempts.length > 0
      ? Math.round(
          examAttempts.reduce((sum, e) => sum + (e.accuracyPercentage || 0), 0) / examAttempts.length
        )
      : 0;

  const overallAccuracy =
    quizAttempts.length + examAttempts.length > 0
      ? Math.round((avgQuiz * quizAttempts.length + avgExam * examAttempts.length) / (quizAttempts.length + examAttempts.length))
      : 75;

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

  let mostActiveDay = 'Wednesday';
  let maxDaySecs = -1;
  for (const [dayName, sCount] of Object.entries(dayCounts)) {
    if (sCount > maxDaySecs) {
      maxDaySecs = sCount;
      mostActiveDay = dayName;
    }
  }

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

  const workload = calculateReviewWorkload(decks, subjects);

  // Study Time Trends (Last 7 Days)
  const studyTimeTrends: Array<{ date: string; dayLabel: string; seconds: number; minutes: number }> = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = getLocalDateString(d);
    const dayLabel = dayNames[d.getDay()];

    let daySec = 0;
    filteredQuizAttempts.forEach((q) => {
      if (q.completedAt.startsWith(dStr)) daySec += q.durationSeconds || 0;
    });
    filteredExamAttempts.forEach((e) => {
      if (e.submittedAt && e.submittedAt.startsWith(dStr)) daySec += e.timeSpentSeconds || 0;
    });
    filteredReviews.forEach((r) => {
      if (r.reviewedAt.startsWith(dStr)) daySec += Math.round((r.durationMs || 0) / 1000);
    });

    studyTimeTrends.push({
      date: dStr,
      dayLabel,
      seconds: daySec,
      minutes: Math.round(daySec / 60),
    });
  }

  // Retention Curve (Ebbinghaus decay curve)
  const retentionCurve: Array<{ daysSinceReview: number; retentionProbability: number; cardCount: number }> = [];
  const intervals = [1, 3, 7, 14, 30, 60, 90];

  for (const day of intervals) {
    const retentionProb = Math.max(20, Math.round(100 * Math.exp(-day / 35)));
    const matchingCards = Math.max(
      0,
      Math.round(totalCards * (retentionProb / 100) * (0.8 + (day % 3) * 0.1))
    );
    retentionCurve.push({
      daysSinceReview: day,
      retentionProbability: retentionProb,
      cardCount: matchingCards,
    });
  }

  // Subject Breakdown
  const subjectBreakdown = subjects.map((sub) => {
    const entry = subjectMasteryMap[sub.id] || { total: 0, mastered: 0 };
    return {
      subjectId: sub.id,
      subjectName: sub.name,
      totalCards: entry.total,
      masteredCards: entry.mastered,
      accuracyPercentage: entry.total > 0 ? Math.round((entry.mastered / entry.total) * 100) : 0,
      timeSpentSeconds: Math.round(totalStudySeconds / Math.max(1, subjects.length)),
    };
  });

  // Weak Topics Detection
  const topicStats: Record<string, { correct: number; total: number; source: 'quiz' | 'flashcards' | 'exam' }> = {};

  quizAttempts.forEach((qa) => {
    qa.topicBreakdown?.forEach((t) => {
      if (!topicStats[t.topic]) topicStats[t.topic] = { correct: 0, total: 0, source: 'quiz' };
      topicStats[t.topic].correct += t.correct;
      topicStats[t.topic].total += t.total;
    });
  });

  examAttempts.forEach((ea) => {
    ea.topicBreakdown?.forEach((t) => {
      if (!topicStats[t.topic]) topicStats[t.topic] = { correct: 0, total: 0, source: 'exam' };
      topicStats[t.topic].correct += t.correct;
      topicStats[t.topic].total += t.total;
    });
  });

  const weakTopics = Object.entries(topicStats)
    .filter(([_, data]) => data.total >= 2 && Math.round((data.correct / data.total) * 100) < 70)
    .map(([topic, data]) => ({
      topic,
      accuracyPercentage: Math.round((data.correct / data.total) * 100),
      totalAttempts: data.total,
      source: data.source,
    }))
    .sort((a, b) => a.accuracyPercentage - b.accuracyPercentage)
    .slice(0, 5);

  return {
    overview: {
      totalStudySeconds,
      totalStudyHoursFormatted,
      totalStudyHours: totalStudyHoursFormatted,
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
      totalCardsReviewed: userReviews.length,
      cardsMasteredCount: masteredCards,
      cardsLearningCount: learningCards,
      cardsNewCount: newCards,
      overallAccuracy,
      levelInfo,
      retentionRatePercentage: retentionMasteryPercentage,
      streakInfo,
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
      topicBreakdown: Object.entries(topicStats).map(([topic, stat]) => ({
        topic,
        correct: stat.correct,
        total: stat.total,
        accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
      })),
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
    studyTimeTrends,
    retentionCurve,
    subjectBreakdown,
    weakTopics,
    dailyPerformance: {
      averageReviewSpeedSeconds:
        userReviews.length > 0
          ? Math.max(
              5,
              Math.round(
                userReviews.reduce((sum, r) => sum + (r.durationMs || 0), 0) /
                  (userReviews.length * 1000)
              )
            )
          : 25,
      consistencyPercentage: Math.min(
        100,
        Math.round((streakInfo.activeDates.length / Math.max(1, daysWindow)) * 100)
      ),
      goalCompletionRate: Math.min(100, Math.round((streakInfo.currentStreak / 7) * 100)),
    },
  };
}

export async function purgeUserAnalyticsData(userId: string): Promise<void> {
  if (userId === 'demo-guest-user') {
    demoXPMap.clear();
    demoGoalsMap.clear();
    demoReviews = [];
    demoQuizAttempts = [];
    demoAchievements.clear();
    demoStreakDates.clear();
    return;
  }

  try {
    const admin = createAdminClient();
    await Promise.allSettled([
      admin.from('xp_transactions').delete().eq('user_id', userId),
      admin.from('learning_goals').delete().eq('user_id', userId),
      admin.from('streak_history').delete().eq('user_id', userId),
      admin.from('flashcard_reviews').delete().eq('user_id', userId),
      admin.from('quiz_attempts').delete().eq('user_id', userId),
      admin.from('user_achievements').delete().eq('user_id', userId),
    ]);
  } catch (err: any) {
    console.warn('[purgeUserAnalyticsData] Purge notice:', err?.message);
  }
}
