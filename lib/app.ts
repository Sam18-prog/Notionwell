import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// DATA MODELS
// ============================================================================
export interface Subject {
  id: string;
  name: string;
  colorTag: string; // e.g. '#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'
  icon: string;     // e.g. 'Atom', 'Calculator', 'Landmark', 'Code', 'BookOpen', 'Palette', 'Music', 'Globe', 'TrendingUp', 'Brain', 'HeartPulse', 'Folder'
  createdAt: string;
}

export interface Flashcard {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  intervalDays: number;
  nextReviewDate: string; // YYYY-MM-DD
  timesReviewed: number;
  timesIncorrect: number;
  topic: string;
  isBookmarked?: boolean; // Bookmark flag for important cards
  masteryLevel?: 'new' | 'learning' | 'mastered';
  correctReviewCount?: number;
  lastReviewedDate?: string | null;
  isWeakTopicReviewed?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
}

export interface DeckSource {
  id: string;
  deckId: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'image';
  extractedText: string;
  addedAt: string;
  cardsGenerated: number;
  imageUrl?: string;
  fileDataUrl?: string | null;
}

export interface Deck {
  id: string;
  subjectId: string; // Subject ID reference
  name: string;
  createdAt: string;
  lastViewedAt?: string | null; // Timestamp of when the deck was last opened
  sourceType: 'pdf' | 'docx' | 'text' | 'image';
  summary?: string[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

export interface SessionLog {
  id: string;
  deckId: string | null;
  startTime: string;
  endTime: string;
  cardsReviewed: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  durationSeconds: number;
}

export interface PlannerTask {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  notes?: string;
  linkedSubjectId: string | null;
  linkedDeckId: string | null;
  isCompleted: boolean;
  createdAt: string;
}

export interface StudyTimeLog {
  id: string;
  date: string; // YYYY-MM-DD
  durationSeconds: number;
  startedAt: string;
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface UserStats {
  lastStudyDate: string | null;
  streakDays: number;
  eli5Cache: Record<string, string>;
}

// ============================================================================
// HIGH-PERFORMANCE IN-MEMORY DATA CACHE LAYER
// ============================================================================
let cachedSubjects: Subject[] | null = null;
let cachedDecks: Deck[] | null = null;
let cachedDeckSources: DeckSource[] | null = null;
let cachedBadges: AchievementBadge[] | null = null;
let cachedSessionLogs: SessionLog[] | null = null;
let cachedPlannerTasks: PlannerTask[] | null = null;
let cachedStudyTimeLogs: StudyTimeLog[] | null = null;
let cachedUserStats: UserStats | null = null;
let hasMigratedStorage = false;

// ============================================================================
// SUBJECT ICON AUTO-DETECTION ENGINE
// ============================================================================
export function detectSubjectIcon(name: string): string {
  const n = (name || '').toLowerCase().trim();
  if (!n) return 'Folder';

  if (n.includes('computer science') || n.includes('programming') || n.includes('coding') || n.includes('cs')) {
    return 'Code';
  }
  if (n.includes('science') || n.includes('biology') || n.includes('chemistry') || n.includes('physics')) {
    return 'Atom';
  }
  if (n.includes('math') || n.includes('mathematics') || n.includes('calculus') || n.includes('algebra')) {
    return 'Calculator';
  }
  if (n.includes('history') || n.includes('humanities')) {
    return 'Landmark';
  }
  if (n.includes('language') || n.includes('spanish') || n.includes('french') || n.includes('english') || n.includes('literature')) {
    return 'BookOpen';
  }
  if (n.includes('art') || n.includes('design')) {
    return 'Palette';
  }
  if (n.includes('music')) {
    return 'Music';
  }
  if (n.includes('geography')) {
    return 'Globe';
  }
  if (n.includes('economics') || n.includes('business') || n.includes('finance')) {
    return 'TrendingUp';
  }
  if (n.includes('psychology')) {
    return 'Brain';
  }
  if (n.includes('medicine') || n.includes('health')) {
    return 'HeartPulse';
  }

  return 'Folder';
}

// ============================================================================
// ACHIEVEMENT BADGES DEFINITIONS & EVALUATION ENGINE
// ============================================================================
const BADGES_KEY = 'notionwell_badges_v1';

export const INITIAL_BADGES: AchievementBadge[] = [
  {
    id: 'first_deck',
    name: 'First Steps',
    description: 'Created your first study deck',
    icon: '🚀',
    isUnlocked: false,
    unlockedAt: null,
  },
  {
    id: 'first_review',
    name: 'First Review',
    description: 'Completed your first flashcard study session',
    icon: '📖',
    isUnlocked: false,
    unlockedAt: null,
  },
  {
    id: 'streak_3',
    name: '3-Day Streak',
    description: 'Maintained a 3-day study streak',
    icon: '🔥',
    isUnlocked: false,
    unlockedAt: null,
  },
  {
    id: 'streak_7',
    name: '7-Day Streak',
    description: 'Maintained a 7-day study streak',
    icon: '⚡',
    isUnlocked: false,
    unlockedAt: null,
  },
  {
    id: 'streak_30',
    name: '30-Day Streak',
    description: 'Maintained a 30-day study streak',
    icon: '👑',
    isUnlocked: false,
    unlockedAt: null,
  },
  {
    id: 'first_mastery',
    name: 'First Mastery',
    description: 'Mastered your first flashcard',
    icon: '✨',
    isUnlocked: false,
    unlockedAt: null,
  },
  {
    id: 'deck_mastered',
    name: 'Deck Mastered',
    description: 'Achieved 100% card mastery on a study deck',
    icon: '🏆',
    isUnlocked: false,
    unlockedAt: null,
  },
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Completed 100 total flashcard reviews',
    icon: '💯',
    isUnlocked: false,
    unlockedAt: null,
  },
  {
    id: 'quiz_whiz',
    name: 'Quiz Whiz',
    description: 'Scored 100% on any practice quiz',
    icon: '🎯',
    isUnlocked: false,
    unlockedAt: null,
  },
  {
    id: 'marathon_studier',
    name: 'Marathon Studier',
    description: 'Logged 5+ cumulative hours of study time',
    icon: '⏱️',
    isUnlocked: false,
    unlockedAt: null,
  },
];

export function getBadges(): AchievementBadge[] {
  if (!isBrowser()) return INITIAL_BADGES;
  if (cachedBadges) return cachedBadges;
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (!raw) {
      localStorage.setItem(BADGES_KEY, JSON.stringify(INITIAL_BADGES));
      cachedBadges = INITIAL_BADGES;
      return cachedBadges;
    }
    const stored: AchievementBadge[] = JSON.parse(raw);

    cachedBadges = INITIAL_BADGES.map((initB) => {
      const found = stored.find((b) => b.id === initB.id);
      return found ? { ...initB, ...found } : initB;
    });
    return cachedBadges;
  } catch (err) {
    cachedBadges = INITIAL_BADGES;
    return cachedBadges;
  }
}

export function saveBadges(badges: AchievementBadge[]): void {
  cachedBadges = badges;
  if (!isBrowser()) return;
  try {
    localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
  } catch (err) {
    console.error('Failed to save badges:', err);
  }
}

export function checkAndUnlockBadges(): void {
  if (!isBrowser()) return;

  const currentBadges = getBadges();
  const decks = getDecks();
  const sessionLogs = getSessionLogs();
  const stats = getStats();
  const totalStudySecs = getTotalStudySeconds();

  let modified = false;

  const updatedBadges = currentBadges.map((badge) => {
    if (badge.isUnlocked) return badge;

    let unlock = false;

    if (badge.id === 'first_deck' && decks.length > 0) {
      unlock = true;
    } else if (badge.id === 'first_review' && sessionLogs.length > 0) {
      unlock = true;
    } else if (badge.id === 'streak_3' && (stats.streakDays || 0) >= 3) {
      unlock = true;
    } else if (badge.id === 'streak_7' && (stats.streakDays || 0) >= 7) {
      unlock = true;
    } else if (badge.id === 'streak_30' && (stats.streakDays || 0) >= 30) {
      unlock = true;
    } else if (badge.id === 'first_mastery') {
      const hasMastered = decks.some((d) =>
        d.flashcards.some((c) => c.masteryLevel === 'mastered')
      );
      if (hasMastered) unlock = true;
    } else if (badge.id === 'deck_mastered') {
      const hasFullyMasteredDeck = decks.some(
        (d) =>
          d.flashcards.length > 0 &&
          d.flashcards.every((c) => c.masteryLevel === 'mastered')
      );
      if (hasFullyMasteredDeck) unlock = true;
    } else if (badge.id === 'century_club') {
      let totalReviews = 0;
      decks.forEach((d) => {
        d.flashcards.forEach((c) => {
          totalReviews += c.timesReviewed || 0;
        });
      });
      if (totalReviews >= 100) unlock = true;
    } else if (badge.id === 'marathon_studier') {
      if (totalStudySecs >= 18000) unlock = true;
    }

    if (unlock) {
      modified = true;
      const unlockedBadge = {
        ...badge,
        isUnlocked: true,
        unlockedAt: new Date().toISOString(),
      };

      window.dispatchEvent(
        new CustomEvent('badge-unlocked', {
          detail: { badge: unlockedBadge },
        })
      );

      return unlockedBadge;
    }

    return badge;
  });

  if (modified) {
    saveBadges(updatedBadges);
  }
}

export function unlockQuizWhizBadge(): void {
  if (!isBrowser()) return;
  const badges = getBadges();
  const quizWhiz = badges.find((b) => b.id === 'quiz_whiz');
  if (quizWhiz && !quizWhiz.isUnlocked) {
    const unlocked = {
      ...quizWhiz,
      isUnlocked: true,
      unlockedAt: new Date().toISOString(),
    };
    const updated = badges.map((b) => (b.id === 'quiz_whiz' ? unlocked : b));
    saveBadges(updated);
    window.dispatchEvent(
      new CustomEvent('badge-unlocked', { detail: { badge: unlocked } })
    );
  }
}

// ============================================================================
// SM-2 SPACED REPETITION LOGIC & PER-CARD MASTERY ENGINE
// ============================================================================
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function updateFlashcardSM2(
  card: Flashcard,
  rating: 'easy' | 'medium' | 'hard'
): Flashcard {
  let newInterval = card.intervalDays || 0;
  let newTimesIncorrect = card.timesIncorrect || 0;
  let correctCount = card.correctReviewCount || 0;
  let weakTopicReviewed = card.isWeakTopicReviewed || false;

  if (rating === 'easy') {
    const doubled = Math.max(1, newInterval * 2);
    newInterval = Math.max(3, doubled);
    correctCount += 1;
  } else if (rating === 'medium') {
    newInterval = newInterval + 1;
    correctCount += 1;
  } else if (rating === 'hard') {
    newInterval = 0;
    newTimesIncorrect += 1;
    weakTopicReviewed = false;
  }

  const reviewDateObj = new Date();
  reviewDateObj.setDate(reviewDateObj.getDate() + newInterval);
  const year = reviewDateObj.getFullYear();
  const month = String(reviewDateObj.getMonth() + 1).padStart(2, '0');
  const day = String(reviewDateObj.getDate()).padStart(2, '0');
  const nextReviewDate = `${year}-${month}-${day}`;

  const currentLevel = card.masteryLevel || 'new';
  let nextLevel: 'new' | 'learning' | 'mastered' = 'learning';
  if (correctCount >= 3) {
    nextLevel = 'mastered';
  } else if (currentLevel === 'new' || card.timesReviewed === 0) {
    nextLevel = 'learning';
  } else {
    nextLevel = 'learning';
  }

  return {
    ...card,
    difficulty: rating,
    intervalDays: newInterval,
    nextReviewDate,
    timesReviewed: (card.timesReviewed || 0) + 1,
    timesIncorrect: newTimesIncorrect,
    correctReviewCount: correctCount,
    masteryLevel: nextLevel,
    lastReviewedDate: new Date().toISOString(),
    isWeakTopicReviewed: weakTopicReviewed,
  };
}

// ============================================================================
// STORAGE ACCESS LAYER & DATA MIGRATION (NON-RECURSIVE & CACHED)
// ============================================================================
const SUBJECTS_KEY = 'notionwell_subjects_v1';
const DECKS_KEY = 'notionwell_decks_v1';
const SOURCES_KEY = 'notionwell_sources_v1';
const STATS_KEY = 'notionwell_stats_v1';
const ELI5_CACHE_KEY = 'notionwell_eli5_v1';
const CURRENT_USER_KEY = 'notionwell_current_user_v1';
const USERS_LIST_KEY = 'notionwell_registered_users_v1';
const THEME_KEY = 'notionwell_theme_v1';
const SESSION_LOGS_KEY = 'notionwell_session_logs_v1';
const PLANNER_TASKS_KEY = 'notionwell_planner_tasks_v1';
const STOPWATCH_LOGS_KEY = 'notionwell_stopwatch_logs_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getStoredTheme(): 'light' | 'dark' {
  if (!isBrowser()) return 'light';
  const saved = localStorage.getItem(THEME_KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

export function setStoredTheme(theme: 'light' | 'dark'): void {
  if (!isBrowser()) return;
  localStorage.setItem(THEME_KEY, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  window.dispatchEvent(new Event('theme-change'));
}

const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'subject-science',
    name: 'Science & Biology',
    colorTag: '#10B981',
    icon: 'Atom',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'subject-history',
    name: 'History & Humanities',
    colorTag: '#F59E0B',
    icon: 'Landmark',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'subject-[#2563EB]',
    name: 'Computer Science',
    colorTag: '#2563EB',
    icon: 'Code',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'subject-uncategorized',
    name: 'Uncategorized',
    colorTag: '#64748B',
    icon: 'Folder',
    createdAt: new Date().toISOString(),
  },
];

export function migrateStorageData(): void {
  if (!isBrowser() || hasMigratedStorage) return;
  hasMigratedStorage = true;

  try {
    let subjects = getRawSubjects();
    if (subjects.length === 0) {
      subjects = DEFAULT_SUBJECTS;
      localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
    } else {
      let subMod = false;
      const updatedSubjects = subjects.map((s) => {
        if (!s.icon || s.icon === 'Folder') {
          const autoIcon = detectSubjectIcon(s.name);
          if (autoIcon !== 'Folder') {
            subMod = true;
            return { ...s, icon: autoIcon };
          }
        }
        return s;
      });
      if (subMod) {
        subjects = updatedSubjects;
        localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
      }
    }
    cachedSubjects = subjects;

    const defaultSubjectId = subjects[0]?.id || 'subject-uncategorized';
    const rawDecksStr = localStorage.getItem(DECKS_KEY) || localStorage.getItem('studypack_decks_v1');
    if (rawDecksStr) {
      const rawDecks = JSON.parse(rawDecksStr);
      let modified = false;
      const updatedDecks = rawDecks.map((d: any) => {
        let deckMod = false;
        let subjectId = d.subjectId || defaultSubjectId;
        if (d.subjectId !== subjectId || d.lastViewedAt === undefined) {
          d.lastViewedAt = d.lastViewedAt || null;
          deckMod = true;
        }

        const flashcards = (d.flashcards || []).map((fc: any) => {
          let cardMod = false;
          let isBookmarked = fc.isBookmarked ?? false;
          let isWeakTopicReviewed = fc.isWeakTopicReviewed ?? false;
          let masteryLevel = fc.masteryLevel;
          let correctReviewCount = fc.correctReviewCount;

          if (!masteryLevel || correctReviewCount === undefined) {
            cardMod = true;
            const reviewed = fc.timesReviewed || 0;
            correctReviewCount = reviewed;
            if (reviewed >= 3 && (fc.timesIncorrect || 0) === 0) {
              masteryLevel = 'mastered';
            } else if (reviewed > 0) {
              masteryLevel = 'learning';
            } else {
              masteryLevel = 'new';
            }
          }

          if (cardMod) deckMod = true;
          return {
            ...fc,
            isBookmarked,
            masteryLevel,
            correctReviewCount,
            lastReviewedDate: fc.lastReviewedDate || null,
            isWeakTopicReviewed,
          };
        });

        if (deckMod) modified = true;
        return { ...d, subjectId, flashcards };
      });

      if (modified) {
        localStorage.setItem(DECKS_KEY, JSON.stringify(updatedDecks));
        cachedDecks = updatedDecks;
      } else {
        cachedDecks = rawDecks;
      }
    }
  } catch (err) {
    console.error('Storage migration failed:', err);
  }
}

function getRawSubjects(): Subject[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(SUBJECTS_KEY) || localStorage.getItem('studypack_subjects_v1');
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function getSubjects(): Subject[] {
  if (!isBrowser()) return DEFAULT_SUBJECTS;
  migrateStorageData();
  if (cachedSubjects) return cachedSubjects;
  const raw = getRawSubjects();
  cachedSubjects = raw.length > 0 ? raw : DEFAULT_SUBJECTS;
  return cachedSubjects;
}

export function getSubjectById(id: string): Subject | null {
  const subjects = getSubjects();
  return subjects.find((s) => s.id === id) || null;
}

export function saveSubject(subject: Subject): void {
  const subjects = getSubjects();
  const idx = subjects.findIndex((s) => s.id === subject.id);
  if (idx >= 0) {
    subjects[idx] = subject;
  } else {
    subjects.push(subject);
  }
  cachedSubjects = [...subjects];
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(cachedSubjects));
  } catch (err) {
    console.error('Failed to save subject:', err);
  }
}

export function deleteSubject(id: string): void {
  const subjects = getSubjects().filter((s) => s.id !== id);
  cachedSubjects = subjects;

  const uncategorizedId = subjects[0]?.id || 'subject-uncategorized';
  const decks = getDecks();
  const updatedDecks = decks.map((d) => (d.subjectId === id ? { ...d, subjectId: uncategorizedId } : d));
  cachedDecks = updatedDecks;

  if (!isBrowser()) return;
  try {
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
    localStorage.setItem(DECKS_KEY, JSON.stringify(updatedDecks));
  } catch (err) {
    console.error('Failed to delete subject:', err);
  }
}

export function getDecks(): Deck[] {
  if (!isBrowser()) return [];
  migrateStorageData();
  if (cachedDecks) return cachedDecks;
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    cachedDecks = raw ? JSON.parse(raw) : [];
    return cachedDecks!;
  } catch (err) {
    return [];
  }
}

// ============================================================================
// MULTI-SOURCE MANAGEMENT ACCESS LAYER
// ============================================================================
function getAllRawDeckSources(): DeckSource[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(SOURCES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function getDeckSources(deckId: string): DeckSource[] {
  if (!isBrowser()) return [];
  let sources = cachedDeckSources;
  if (!sources) {
    sources = getAllRawDeckSources();
    cachedDeckSources = sources;
  }

  const deckSources = sources.filter((s) => s.deckId === deckId);

  // Retroactive fallback for decks created before Multi-Source feature:
  if (deckSources.length === 0) {
    const deck = getDeckById(deckId);
    if (deck) {
      const defaultSource: DeckSource = {
        id: `src-default-${deck.id}`,
        deckId: deck.id,
        fileName: `${deck.name} (Original Upload)`,
        fileType: (deck.sourceType as any) || 'pdf',
        extractedText: '',
        addedAt: deck.createdAt || new Date().toISOString(),
        cardsGenerated: deck.flashcards.length,
      };
      saveDeckSource(defaultSource);
      return [defaultSource];
    }
  }

  return deckSources;
}

export function saveDeckSource(source: DeckSource): void {
  let sources = cachedDeckSources || getAllRawDeckSources();
  const idx = sources.findIndex((s) => s.id === source.id);
  if (idx >= 0) {
    sources[idx] = source;
  } else {
    sources.unshift(source);
  }
  cachedDeckSources = [...sources];
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(cachedDeckSources));
  } catch (err) {
    console.error('Failed to save deck source:', err);
  }
}

export function deleteDeckSource(sourceId: string): void {
  let sources = (cachedDeckSources || getAllRawDeckSources()).filter((s) => s.id !== sourceId);
  cachedDeckSources = sources;
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
  } catch (err) {
    console.error('Failed to delete deck source:', err);
  }
}

export function getRecentlyViewedDecks(subjectId?: string, limit: number = 4): Deck[] {
  let decks = getDecks();
  if (subjectId && subjectId !== 'all') {
    decks = decks.filter((d) => d.subjectId === subjectId);
  }

  // Decks explicitly opened/viewed
  const viewedDecks = decks.filter((d) => Boolean(d.lastViewedAt));
  viewedDecks.sort((a, b) => new Date(b.lastViewedAt!).getTime() - new Date(a.lastViewedAt!).getTime());

  if (viewedDecks.length >= limit) {
    return viewedDecks.slice(0, limit);
  }

  // Backfill with unviewed decks (lastViewedAt is undefined), excluding cleared decks (lastViewedAt === null)
  const unviewedDecks = decks.filter((d) => d.lastViewedAt === undefined);
  unviewedDecks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return [...viewedDecks, ...unviewedDecks].slice(0, limit);
}

export function clearDeckFromRecentlyViewed(deckId: string): void {
  const deck = getDeckById(deckId);
  if (!deck) return;
  saveDeck({
    ...deck,
    lastViewedAt: null,
  });
}

export function touchDeckViewDate(deckId: string): void {
  const deck = getDeckById(deckId);
  if (!deck) return;
  saveDeck({
    ...deck,
    lastViewedAt: new Date().toISOString(),
  });
}

export function getDecksBySubject(subjectId: string): Deck[] {
  return getDecks().filter((d) => d.subjectId === subjectId);
}

export function getDeckById(id: string): Deck | null {
  return getDecks().find((d) => d.id === id) || null;
}

export function getCardsByWeakTopic(topicName: string): Flashcard[] {
  const decks = getDecks();
  const normTopic = topicName.trim().toLowerCase();
  const matchingCards: Flashcard[] = [];

  decks.forEach((d) => {
    d.flashcards.forEach((c) => {
      if (c.topic && c.topic.trim().toLowerCase() === normTopic) {
        matchingCards.push(c);
      }
    });
  });

  const weakCards = matchingCards.filter(
    (c) => (c.timesIncorrect || 0) > 0 && !c.isWeakTopicReviewed
  );
  return weakCards.length > 0 ? weakCards : matchingCards;
}

export function markCardsWeakTopicReviewed(cardsToMark: Array<{ deckId: string; cardId: string }>): void {
  if (cardsToMark.length === 0) return;
  const decks = getDecks();
  const cardIdSet = new Set(cardsToMark.map((c) => c.cardId));

  const updatedDecks = decks.map((d) => {
    let mod = false;
    const updatedCards = d.flashcards.map((c) => {
      if (cardIdSet.has(c.id)) {
        mod = true;
        return { ...c, isWeakTopicReviewed: true };
      }
      return c;
    });

    if (mod) return { ...d, flashcards: updatedCards };
    return d;
  });

  cachedDecks = updatedDecks;
  if (!isBrowser()) return;
  localStorage.setItem(DECKS_KEY, JSON.stringify(updatedDecks));
}

export function recordQuizAnswerPerformance(
  deckId: string,
  topic: string,
  questionText: string,
  isCorrect: boolean
): void {
  const deck = getDeckById(deckId);
  if (!deck) return;

  const normTopic = (topic || '').trim().toLowerCase();
  let updatedAny = false;

  const updatedFlashcards = deck.flashcards.map((fc) => {
    const fcTopic = (fc.topic || '').trim().toLowerCase();
    if (fcTopic && normTopic && fcTopic === normTopic) {
      updatedAny = true;
      let timesReviewed = (fc.timesReviewed || 0) + 1;
      let timesIncorrect = fc.timesIncorrect || 0;
      let correctCount = fc.correctReviewCount || 0;
      let level = fc.masteryLevel || 'new';
      let weakTopicReviewed = fc.isWeakTopicReviewed || false;

      if (isCorrect) {
        correctCount += 1;
        level = correctCount >= 3 ? 'mastered' : 'learning';
      } else {
        timesIncorrect += 1;
        weakTopicReviewed = false;
        if (level === 'mastered') {
          level = 'learning';
          correctCount = 1;
        }
      }

      return {
        ...fc,
        timesReviewed,
        timesIncorrect,
        correctReviewCount: correctCount,
        masteryLevel: level,
        lastReviewedDate: new Date().toISOString(),
        isWeakTopicReviewed: weakTopicReviewed,
      };
    }
    return fc;
  });

  if (updatedAny) {
    saveDeck({
      ...deck,
      flashcards: updatedFlashcards,
    });
    logStudyActivity();
    checkAndUnlockBadges();
  }
}

export function saveDeck(deck: Deck): void {
  const subjects = getSubjects();
  const validSubjectId = deck.subjectId || subjects[0]?.id || 'subject-uncategorized';
  const finalDeck = { ...deck, subjectId: validSubjectId };

  const decks = getDecks();
  const index = decks.findIndex((d) => d.id === finalDeck.id);
  if (index >= 0) {
    decks[index] = finalDeck;
  } else {
    decks.unshift(finalDeck);
  }

  cachedDecks = [...decks];
  if (!isBrowser()) return;
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(cachedDecks));
    checkAndUnlockBadges();
  } catch (err) {
    console.error('Failed to save deck:', err);
  }
}

export function moveDeckToSubject(deckId: string, newSubjectId: string): Deck | null {
  const deck = getDeckById(deckId);
  if (!deck) return null;

  const updatedDeck: Deck = {
    ...deck,
    subjectId: newSubjectId,
  };

  saveDeck(updatedDeck);
  return updatedDeck;
}

export function deleteDeck(id: string): void {
  const decks = getDecks().filter((d) => d.id !== id);
  cachedDecks = decks;
  if (!isBrowser()) return;
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
    // Remove associated sources
    let sources = (cachedDeckSources || getAllRawDeckSources()).filter((s) => s.deckId !== id);
    cachedDeckSources = sources;
    localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
  } catch (err) {
    console.error('Failed to delete deck:', err);
  }
}

export function toggleFlashcardBookmark(deckId: string, cardId: string): boolean {
  const deck = getDeckById(deckId);
  if (!deck) return false;

  let newBookmarkState = false;
  const updatedCards = deck.flashcards.map((card) => {
    if (card.id === cardId) {
      newBookmarkState = !card.isBookmarked;
      return { ...card, isBookmarked: newBookmarkState };
    }
    return card;
  });

  saveDeck({
    ...deck,
    flashcards: updatedCards,
  });

  return newBookmarkState;
}

export function updateFlashcardRating(
  deckId: string,
  cardId: string,
  rating: 'easy' | 'medium' | 'hard'
): Flashcard | null {
  const deck = getDeckById(deckId);
  if (!deck) return null;

  let updatedCard: Flashcard | null = null;
  const updatedFlashcards = deck.flashcards.map((card) => {
    if (card.id === cardId) {
      updatedCard = updateFlashcardSM2(card, rating);
      return updatedCard;
    }
    return card;
  });

  if (updatedCard) {
    saveDeck({
      ...deck,
      flashcards: updatedFlashcards,
    });
    logStudyActivity();
    checkAndUnlockBadges();
  }

  return updatedCard;
}

export function getSessionLogs(): SessionLog[] {
  if (!isBrowser()) return [];
  if (cachedSessionLogs) return cachedSessionLogs;
  try {
    const raw = localStorage.getItem(SESSION_LOGS_KEY);
    cachedSessionLogs = raw ? JSON.parse(raw) : [];
    return cachedSessionLogs!;
  } catch (err) {
    return [];
  }
}

export function saveSessionLog(log: SessionLog): void {
  const logs = getSessionLogs();
  logs.unshift(log);
  cachedSessionLogs = [...logs];
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SESSION_LOGS_KEY, JSON.stringify(cachedSessionLogs));
    logStudyActivity();
    checkAndUnlockBadges();
  } catch (err) {
    console.error('Failed to save session log:', err);
  }
}

export function getPlannerTasks(): PlannerTask[] {
  if (!isBrowser()) return [];
  if (cachedPlannerTasks) return cachedPlannerTasks;
  try {
    const raw = localStorage.getItem(PLANNER_TASKS_KEY);
    cachedPlannerTasks = raw ? JSON.parse(raw) : [];
    return cachedPlannerTasks!;
  } catch (err) {
    return [];
  }
}

export function savePlannerTask(task: PlannerTask): void {
  const tasks = getPlannerTasks();
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) {
    tasks[idx] = task;
  } else {
    tasks.push(task);
  }
  cachedPlannerTasks = [...tasks];
  if (!isBrowser()) return;
  try {
    localStorage.setItem(PLANNER_TASKS_KEY, JSON.stringify(cachedPlannerTasks));
  } catch (err) {
    console.error('Failed to save planner task:', err);
  }
}

export function togglePlannerTask(taskId: string): boolean {
  const tasks = getPlannerTasks();
  let newStatus = false;
  const updated = tasks.map((t) => {
    if (t.id === taskId) {
      newStatus = !t.isCompleted;
      return { ...t, isCompleted: newStatus };
    }
    return t;
  });
  cachedPlannerTasks = updated;
  if (!isBrowser()) return false;
  try {
    localStorage.setItem(PLANNER_TASKS_KEY, JSON.stringify(updated));
    return newStatus;
  } catch (err) {
    return false;
  }
}

export function deletePlannerTask(taskId: string): void {
  const tasks = getPlannerTasks().filter((t) => t.id !== taskId);
  cachedPlannerTasks = tasks;
  if (!isBrowser()) return;
  try {
    localStorage.setItem(PLANNER_TASKS_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to delete planner task:', err);
  }
}

export function getStudyTimeLogs(): StudyTimeLog[] {
  if (!isBrowser()) return [];
  if (cachedStudyTimeLogs) return cachedStudyTimeLogs;
  try {
    const raw = localStorage.getItem(STOPWATCH_LOGS_KEY);
    cachedStudyTimeLogs = raw ? JSON.parse(raw) : [];
    return cachedStudyTimeLogs!;
  } catch (err) {
    return [];
  }
}

export function saveStudyTimeLog(log: StudyTimeLog): void {
  const logs = getStudyTimeLogs();
  logs.unshift(log);
  cachedStudyTimeLogs = [...logs];
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STOPWATCH_LOGS_KEY, JSON.stringify(cachedStudyTimeLogs));
    logStudyActivity();
    checkAndUnlockBadges();
  } catch (err) {
    console.error('Failed to save study time log:', err);
  }
}

export function getTotalStudySeconds(): number {
  const logs = getStudyTimeLogs();
  return logs.reduce((acc, l) => acc + (l.durationSeconds || 0), 0);
}

export function getDailyStudyTimeLastNDays(days: number = 7): Array<{
  dateStr: string;
  dayLabel: string;
  durationSeconds: number;
  durationMinutes: number;
}> {
  const logs = getStudyTimeLogs();
  const sessionLogs = getSessionLogs();

  const result: Array<{
    dateStr: string;
    dayLabel: string;
    durationSeconds: number;
    durationMinutes: number;
  }> = [];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayLabel = dayNames[d.getDay()];

    let sec = 0;
    logs.forEach((l) => {
      if (l.date === dateStr) {
        sec += l.durationSeconds || 0;
      }
    });

    sessionLogs.forEach((s) => {
      if (s.startTime && s.startTime.startsWith(dateStr)) {
        sec += s.durationSeconds || 0;
      }
    });

    result.push({
      dateStr,
      dayLabel,
      durationSeconds: sec,
      durationMinutes: Math.round(sec / 60),
    });
  }

  return result;
}

export function getStats(): UserStats {
  if (!isBrowser()) return { lastStudyDate: null, streakDays: 0, eli5Cache: {} };
  if (cachedUserStats) return cachedUserStats;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    cachedUserStats = raw ? JSON.parse(raw) : { lastStudyDate: null, streakDays: 0, eli5Cache: {} };
    return cachedUserStats!;
  } catch (err) {
    return { lastStudyDate: null, streakDays: 0, eli5Cache: {} };
  }
}

export function logStudyActivity(): number {
  if (!isBrowser()) return 0;
  const stats = getStats();
  const today = getTodayDateString();

  if (stats.lastStudyDate === today) {
    return stats.streakDays;
  }

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const year = yesterdayDate.getFullYear();
  const month = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
  const day = String(yesterdayDate.getDate()).padStart(2, '0');
  const yesterday = `${year}-${month}-${day}`;

  let newStreak = 1;
  if (stats.lastStudyDate === yesterday) {
    newStreak = (stats.streakDays || 0) + 1;
  }

  const updatedStats: UserStats = {
    ...stats,
    lastStudyDate: today,
    streakDays: newStreak,
  };
  cachedUserStats = updatedStats;

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(updatedStats));
    checkAndUnlockBadges();
  } catch (err) {
    console.error('Failed to save study activity:', err);
  }

  return newStreak;
}

export function getEli5Cache(cardId: string): string | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(ELI5_CACHE_KEY);
    const cache: Record<string, string> = raw ? JSON.parse(raw) : {};
    return cache[cardId] || null;
  } catch (err) {
    return null;
  }
}

export function setEli5Cache(cardId: string, text: string): void {
  if (!isBrowser()) return;
  try {
    const raw = localStorage.getItem(ELI5_CACHE_KEY);
    const cache: Record<string, string> = raw ? JSON.parse(raw) : {};
    cache[cardId] = text;
    localStorage.setItem(ELI5_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error('Failed to cache ELI5 explanation:', err);
  }
}

export interface DashboardWeakTopic {
  topic: string;
  incorrectCount: number;
  correctCount?: number;
  totalCards?: number;
  deckId?: string;
  deckTitle?: string;
  accuracy?: number;
}

export interface DashboardPrimaryRecommendation {
  type: 'weak_topic' | 'due_cards' | 'empty' | 'mastered';
  title: string;
  description: string;
  topicName?: string;
  accuracy?: number;
  cardsCount?: number;
  actionLabel: string;
  actionUrl: string;
}

export interface DashboardMetrics {
  totalCards: number;
  easyCards?: number;
  masteredCards: number;
  masteryPercentage: number;
  cardsDueToday: number;
  streakDays: number;
  weakTopics: DashboardWeakTopic[];
  primaryRecommendation: DashboardPrimaryRecommendation;
}

export function getDashboardMetrics(subjectId?: string): DashboardMetrics {
  let decks = getDecks();
  if (subjectId && subjectId !== 'all') {
    decks = decks.filter((d) => d.subjectId === subjectId);
  }

  const today = getTodayDateString();

  let totalCards = 0;
  let masteredCards = 0;
  let cardsDueToday = 0;

  interface TopicDetails {
    topic: string;
    incorrectCount: number;
    correctCount: number;
    totalCards: number;
    deckId: string;
    deckTitle: string;
  }

  const topicDetailsMap: Record<string, TopicDetails> = {};

  decks.forEach((deck) => {
    deck.flashcards.forEach((card) => {
      totalCards += 1;
      if (card.masteryLevel === 'mastered') {
        masteredCards += 1;
      }
      if (card.nextReviewDate <= today) {
        cardsDueToday += 1;
      }

      if (card.topic) {
        const normalized = card.topic.trim();
        if (!topicDetailsMap[normalized]) {
          topicDetailsMap[normalized] = {
            topic: normalized,
            incorrectCount: 0,
            correctCount: 0,
            totalCards: 0,
            deckId: deck.id,
            deckTitle: deck.name,
          };
        }
        topicDetailsMap[normalized].totalCards += 1;
        topicDetailsMap[normalized].incorrectCount += card.timesIncorrect || 0;
        topicDetailsMap[normalized].correctCount += card.timesCorrect || 0;
      }
    });
  });

  const masteryPercentage =
    totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  const weakTopics = Object.values(topicDetailsMap)
    .map((td) => {
      const totalAttempts = td.correctCount + td.incorrectCount;
      const accuracy = totalAttempts > 0 ? Math.round((td.correctCount / totalAttempts) * 100) : 0;
      return {
        ...td,
        accuracy,
      };
    })
    .filter((td) => td.incorrectCount > 0)
    .sort((a, b) => b.incorrectCount - a.incorrectCount || a.accuracy - b.accuracy);

  let primaryRecommendation: {
    type: 'weak_topic' | 'due_cards' | 'empty' | 'mastered';
    title: string;
    description: string;
    topicName?: string;
    accuracy?: number;
    cardsCount?: number;
    actionLabel: string;
    actionUrl: string;
  };

  if (totalCards === 0) {
    primaryRecommendation = {
      type: 'empty',
      title: 'Ready to start learning?',
      description:
        'Upload your notes, textbook photos, or PDF documents to generate smart flashcards and receive personalized AI recommendations.',
      actionLabel: 'Upload Notes & Create Deck',
      actionUrl: '/create',
    };
  } else if (weakTopics.length > 0) {
    const topWeak = weakTopics[0];
    primaryRecommendation = {
      type: 'weak_topic',
      title: topWeak.topic,
      description: `You've struggled with this topic recently (${topWeak.incorrectCount} ${topWeak.incorrectCount === 1 ? 'mistake' : 'mistakes'}). Take a targeted review session to reinforce weak concepts.`,
      topicName: topWeak.topic,
      accuracy: topWeak.accuracy,
      actionLabel: 'Practice Now',
      actionUrl: `/deck/topic-${encodeURIComponent(topWeak.topic)}?topic=${encodeURIComponent(topWeak.topic)}`,
    };
  } else if (cardsDueToday > 0) {
    primaryRecommendation = {
      type: 'due_cards',
      title: `${cardsDueToday} Cards Due for Review`,
      description:
        'Reviewing overdue cards today maximizes long-term retention according to your SM-2 spaced repetition schedule.',
      cardsCount: cardsDueToday,
      actionLabel: 'Review Due Cards',
      actionUrl: '/decks',
    };
  } else {
    primaryRecommendation = {
      type: 'mastered',
      title: 'All caught up! Great work.',
      description:
        'All current flashcards are mastered. Keep your streak alive or create a new study deck to expand your knowledge.',
      actionLabel: 'Create New Deck',
      actionUrl: '/create',
    };
  }

  const stats = getStats();

  return {
    totalCards,
    easyCards: masteredCards,
    masteredCards,
    masteryPercentage,
    cardsDueToday,
    streakDays: stats.streakDays || 0,
    weakTopics,
    primaryRecommendation,
  };
}

// ============================================================================
// LOCAL AUTHENTICATION ENGINE (SINGLE ACCOUNT + SESSION MODEL)
// ============================================================================
export interface Account {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface Session {
  isLoggedIn: boolean;
  loggedInEmail: string | null;
}

const ACCOUNT_KEY = 'notionwell_account_v1';
const SESSION_KEY = 'notionwell_session_v1';

export async function hashPassword(password: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback simple hash for non-crypto environments
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function getStoredAccount(): Account | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY) || localStorage.getItem('studypack_account_v1');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function saveStoredAccount(account: Account): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  } catch (err) {
    console.error('Failed to save account:', err);
  }
}

export function getSession(): Session {
  if (!isBrowser()) return { isLoggedIn: false, loggedInEmail: null };
  try {
    const raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem('studypack_session_v1');
    if (!raw) {
      // Default session state for existing demo users
      const storedAcc = getStoredAccount();
      if (storedAcc) {
        return { isLoggedIn: true, loggedInEmail: storedAcc.email };
      }
      // Auto-initialize demo account if first time opening app
      const defaultAcc: Account = {
        email: 'demo@notionwell.ai',
        passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // SHA-256 for demo
        name: 'Demo Student',
        createdAt: new Date().toISOString(),
      };
      saveStoredAccount(defaultAcc);
      const defaultSession: Session = { isLoggedIn: true, loggedInEmail: defaultAcc.email };
      localStorage.setItem(SESSION_KEY, JSON.stringify(defaultSession));
      return defaultSession;
    }
    return JSON.parse(raw);
  } catch (err) {
    return { isLoggedIn: false, loggedInEmail: null };
  }
}

export function saveSession(session: Session): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

function notifyAuthChange() {
  if (isBrowser()) {
    window.dispatchEvent(new Event('auth-change'));
  }
}

export function getCurrentUser(): User | null {
  if (!isBrowser()) {
    return {
      id: 'local-user-1',
      name: 'Demo Student',
      email: 'demo@notionwell.ai',
      createdAt: new Date().toISOString(),
    };
  }

  const session = getSession();
  if (!session.isLoggedIn) return null;

  const account = getStoredAccount();
  if (!account) return null;

  return {
    id: 'local-user-1',
    name: account.name || 'Demo Student',
    email: account.email || 'demo@notionwell.ai',
    createdAt: account.createdAt || new Date().toISOString(),
  };
}

export async function signupUser(
  name: string,
  email: string,
  password: string,
  confirmPassword?: string
): Promise<{ success: boolean; user?: User; error?: string; accountExists?: boolean }> {
  if (!isBrowser()) return { success: false, error: 'Browser environment required.' };

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (!trimmedName || !trimmedEmail || !password) {
    return { success: false, error: 'Please fill in all required fields.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }

  const existingAccount = getStoredAccount();
  if (existingAccount && existingAccount.email.toLowerCase() === trimmedEmail) {
    return {
      success: false,
      error: 'An account with this email already exists. Please sign in instead.',
      accountExists: true,
    };
  }

  const passwordHash = await hashPassword(password);
  const newAccount: Account = {
    email: trimmedEmail,
    passwordHash,
    name: trimmedName,
    createdAt: new Date().toISOString(),
  };

  saveStoredAccount(newAccount);
  saveSession({ isLoggedIn: true, loggedInEmail: trimmedEmail });
  notifyAuthChange();

  return {
    success: true,
    user: {
      id: 'local-user-1',
      name: newAccount.name,
      email: newAccount.email,
      createdAt: newAccount.createdAt,
    },
  };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string; noAccount?: boolean }> {
  if (!isBrowser()) return { success: false, error: 'Browser environment required.' };

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    return { success: false, error: 'Please enter both email and password.' };
  }

  const account = getStoredAccount();
  if (!account) {
    return {
      success: false,
      error: 'No account found on this device. Please create an account first.',
      noAccount: true,
    };
  }

  if (account.email.toLowerCase() !== trimmedEmail) {
    return { success: false, error: 'Incorrect email or password.' };
  }

  const inputHash = await hashPassword(password);
  if (inputHash !== account.passwordHash) {
    return { success: false, error: 'Incorrect email or password.' };
  }

  saveSession({ isLoggedIn: true, loggedInEmail: account.email });
  notifyAuthChange();

  return {
    success: true,
    user: {
      id: 'local-user-1',
      name: account.name,
      email: account.email,
      createdAt: account.createdAt,
    },
  };
}

export async function demoLoginUser(): Promise<{ success: boolean; user?: User; error?: string }> {
  if (!isBrowser()) return { success: false, error: 'Browser environment required.' };

  try {
    let account = getStoredAccount();
    if (!account) {
      const passwordHash = await hashPassword('demo1234');
      account = {
        email: 'demo@notionwell.ai',
        passwordHash,
        name: 'Demo Student',
        createdAt: new Date().toISOString(),
      };
      saveStoredAccount(account);
    }

    saveSession({ isLoggedIn: true, loggedInEmail: account.email });
    notifyAuthChange();

    return {
      success: true,
      user: {
        id: 'local-user-1',
        name: account.name,
        email: account.email,
        createdAt: account.createdAt,
      },
    };
  } catch (err: any) {
    return { success: false, error: 'Demo login failed.' };
  }
}

export function logoutUser(): void {
  if (!isBrowser()) return;
  try {
    saveSession({ isLoggedIn: false, loggedInEmail: null });
    notifyAuthChange();
  } catch (err) {
    console.error('Logout error:', err);
  }
}

export function resetAllAppData(): void {
  if (!isBrowser()) return;

  try {
    // 1. Clear all localStorage data
    localStorage.clear();

    // 2. Reset all in-memory caches
    cachedSubjects = null;
    cachedDecks = null;
    cachedDeckSources = null;
    cachedBadges = null;
    cachedSessionLogs = null;
    cachedPlannerTasks = null;
    cachedStudyTimeLogs = null;
    cachedUserStats = null;
    hasMigratedStorage = false;

    // 3. Re-seed default user & default subjects
    const defaultAcc: Account = {
      email: 'demo@notionwell.ai',
      passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      name: 'Demo Student',
      createdAt: new Date().toISOString(),
    };
    saveStoredAccount(defaultAcc);
    saveSession({ isLoggedIn: true, loggedInEmail: defaultAcc.email });
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(DEFAULT_SUBJECTS));

    // 4. Notify app listeners
    notifyAuthChange();
  } catch (err) {
    console.error('Failed to reset app data:', err);
  }
}

// ============================================================================
// AI CLIENT & GENERATOR LOGIC
// ============================================================================
export interface GeneratedStudyMaterial {
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  skippedChunks?: number;
  totalChunks?: number;
  quotaNotice?: boolean;
}

function getAIClientAndModel(): { client: OpenAI; model: string } | null {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;

  if (geminiKey) {
    return {
      client: new OpenAI({
        apiKey: geminiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      }),
      model: process.env.AI_MODEL || 'gemini-1.5-flash',
    };
  }

  if (groqKey) {
    return {
      client: new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      }),
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    };
  }

  if (openRouterKey) {
    return {
      client: new OpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      }),
      model: process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct',
    };
  }

  if (openaiKey) {
    return {
      client: new OpenAI({
        apiKey: openaiKey,
        baseURL: baseUrl || undefined,
      }),
      model: process.env.AI_MODEL || 'gpt-4o-mini',
    };
  }

  if (baseUrl) {
    return {
      client: new OpenAI({
        apiKey: 'no-key-required',
        baseURL: baseUrl,
      }),
      model: process.env.AI_MODEL || 'local-model',
    };
  }

  return null;
}

export async function extractTextWithVisionOcr(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const base64Data = buffer.toString('base64');

  // 1. DIRECT GEMINI MULTIMODAL API (Native support for PDF and image OCR)
  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'You are an expert document OCR reader. Transcribe and extract ALL handwritten text, diagrams, notes, formulas, equations, definitions, memory instructions (such as LDA, LDAX, SRAM, DRAM, addressing modes), and written content from this document with high fidelity. Output ONLY the raw extracted text. Do not include metadata, introductory phrases, or placeholder summaries.',
                  },
                  {
                    inlineData: {
                      mimeType: mimeType === 'pdf' || mimeType.endsWith('/pdf') ? 'application/pdf' : mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const extracted = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (extracted.length >= 20) {
          console.log(`[Vision OCR Success]: Extracted ${extracted.length} characters from document.`);
          return extracted;
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.warn('Gemini Vision OCR API call timed out after 45s.');
      } else {
        console.warn('Gemini Vision OCR API call failed:', err);
      }
    }
  }

  // 2. OPENAI / GROQ MULTIMODAL FALLBACK FOR IMAGES
  const aiInfo = getAIClientAndModel();
  if (aiInfo && mimeType.startsWith('image/')) {
    try {
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      const response = await aiInfo.client.chat.completions.create({
        model: aiInfo.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcribe and extract ALL handwritten text, diagrams, formulas, definitions, and technical content from this image. Output ONLY the raw extracted text.',
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      });
      const text = response.choices[0]?.message?.content?.trim() || '';
      if (text.length >= 20) {
        return text;
      }
    } catch (err) {
      console.warn('Multimodal chat completion Vision OCR failed:', err);
    }
  }

  return '';
}

/**
 * Pre-processes and cleans extracted document text before chunking or AI generation.
 * Strips Table of Contents blocks, page headers/footers, and standalone callout numbers.
 */
export function cleanDocumentText(text: string): string {
  if (!text) return '';

  let lines = text.split(/\r?\n/);

  // 1. Remove repeating page headers / footers
  lines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true; // keep empty lines for paragraph boundaries

    // Strip "Page X of Y", "Page X", "X of Y"
    if (/^(page\s+\d+(\s+of\s+\d+)?|\d+\s+of\s+\d+)$/i.test(trimmed)) {
      return false;
    }
    // Strip header lines like "Artificial Intelligence & Its Applications Page 3 of 11"
    if (/.*\|?\s*page\s+\d+(\s+of\s+\d+)?$/i.test(trimmed)) {
      return false;
    }
    // Strip Table of Contents dot leaders e.g. "3.1 Machine Learning (ML) .................. 7"
    if (/(\.\.\.\.\.|\.\s\.\s\.\s\.)\s*\d+$/.test(trimmed)) {
      return false;
    }
    // Strip standalone callout numbers / page markers e.g. lone "Page 4" or "$15.7 Trillion" callouts without sentences
    if (/^[\$€£]?\d+(\.\d+)?\s*(trillion|billion|million|[tbm])?$/i.test(trimmed)) {
      return false;
    }

    return true;
  });

  // 2. Remove Table of Contents blocks (repeated lists of section titles without body paragraphs)
  const cleanedLines: string[] = [];
  let insideToc = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // TOC start markers
    if (/^(table of contents|contents|index of sections)$/i.test(trimmed)) {
      insideToc = true;
      continue;
    }

    if (insideToc) {
      // If we encounter a line with dots and a page number, or a bare section line in TOC block, skip it
      if (/(\.{2,}|\s{4,})\s*\d+$/.test(trimmed) || /^\d+(\.\d+)*\s+[A-Z]/.test(trimmed)) {
        continue;
      }
      // TOC ends when we encounter a real explanatory paragraph (> 100 characters ending in punctuation)
      if (trimmed.length > 100 && /[.!?]$/.test(trimmed)) {
        insideToc = false;
      } else {
        continue;
      }
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join('\n').trim();
}

/**
 * Checks if a paragraph line is a section heading/title rather than explanatory body text.
 */
function isHeadingLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 90) return false;

  // Ends in punctuation => likely a body sentence, not a heading
  if (/[.!?]$/.test(trimmed)) return false;

  // Pattern A: Starts with section numbers like "3.1", "4.2", "1.", "Section 3"
  if (/^(\d+(\.\d+)*|section\s+\d+|chapter\s+\d+)\b/i.test(trimmed)) return true;

  // Pattern B: Short line (< 70 chars) in Title Case or ALL CAPS without ending punctuation
  if (trimmed.length < 70 && (/^[A-Z0-9\s\-\:\(\)\&]+$/.test(trimmed) || /^[A-Z][a-z0-9]+(\s+[A-Z0-9][a-z0-9]+)*/.test(trimmed))) {
    return true;
  }

  return false;
}

export function splitTextIntoChunks(text: string, chunkSize = 9000): string[] {
  const cleanedText = cleanDocumentText(text);
  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }

  const rawParagraphs = cleanedText.split(/\n\s*\n/);
  const paragraphs: string[] = [];

  // Pre-pass: Attach standalone heading paragraphs to the body paragraph that follows them
  for (let i = 0; i < rawParagraphs.length; i++) {
    const current = rawParagraphs[i].trim();
    if (!current) continue;

    if (isHeadingLine(current) && i + 1 < rawParagraphs.length) {
      const next = rawParagraphs[i + 1].trim();
      paragraphs.push(`${current}\n\n${next}`);
      i++; // Skip next paragraph as it has been merged with its heading
    } else {
      paragraphs.push(current);
    }
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [cleanedText];
}

/**
 * Cleans lazy or templated question phrasing, removing raw section numbers,
 * quoted headings, and trailing commas.
 */
export function cleanQuestionText(q: string): string {
  let cleaned = (q || '').trim();

  // Strip section numbers e.g. "4.3", "3.1.2", "Section 4"
  cleaned = cleaned.replace(/\b(\d+(\.\d+)+|section\s+\d+|chapter\s+\d+)\b/gi, '').trim();

  // Strip quoted section headers e.g. "findings on "4.3 Autonomous Systems,"?" -> "findings on Autonomous Systems?"
  cleaned = cleaned.replace(/"\s*([^"]+?),?\s*"/g, '$1');

  // Replace lazy templated wrappers e.g. "Which statement correctly reflects the findings on X?" -> "What key mechanism defines X?"
  cleaned = cleaned.replace(/which statement correctly reflects the findings on\s+/i, 'What key mechanism defines ');
  cleaned = cleaned.replace(/which statement accurately describes\s+/i, 'What primary role does ');
  cleaned = cleaned.replace(/what key concept is explained regarding\s+/i, 'How does ');

  // Clean trailing punctuation bugs like ",?" or " , ?"
  cleaned = cleaned.replace(/,\s*\?/g, '?').replace(/\s{2,}/g, ' ');

  // Ensure first character is capitalized
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Formats long text into a short, scannable option phrase under ~10 words.
 */
export function formatShortOption(text: string, maxWords = 10): string {
  if (!text) return '';
  let cleaned = text.trim().replace(/^[^a-zA-Z0-9]+/, '');

  const words = cleaned.split(/\s+/);
  if (words.length <= maxWords) {
    return cleaned.replace(/\.$/, '');
  }

  const truncated = words.slice(0, maxWords).join(' ').replace(/[,;:–—\-]$/, '');
  return truncated;
}

/**
 * Checks if a flashcard answer is primarily a list of keywords/terms separated by commas
 * rather than a complete explanatory sentence.
 */
export function isKeywordListAnswer(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim();

  // If text contains a verb or clause connector, it is a genuine explanatory sentence
  const hasVerb = /\b(is|are|was|were|can|could|will|uses|used|provides|provided|enables|enabled|helps|allows|improves|applies|applied|operates|refers|functions|combines|supports|requires|includes|creates|generates)\b/i.test(trimmed);
  if (hasVerb) return false;

  // Pattern A: "Topic Name: term1, term2, term3..."
  if (/^[A-Za-z0-9\s]+:\s*([A-Za-z0-9\s\(\)]+\s*,\s*){2,}[A-Za-z0-9\s\(\)]+$/i.test(trimmed)) return true;

  // Pattern B: 3 or more short comma-separated items without full sentence structure
  const commaParts = trimmed.split(',');
  if (commaParts.length >= 3 && !hasVerb) {
    const isShortList = commaParts.every((part) => part.trim().split(/\s+/).length <= 3);
    if (isShortList) return true;
  }

  return false;
}

/**
 * Formats long verbatim text into a single, concise sentence under ~20 words.
 */
export function formatConciseSentence(text: string, maxWords = 20): string {
  if (!text) return '';

  const trimmed = text.trim();
  // Take first sentence if multiple sentences exist
  const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0] || trimmed;
  const words = firstSentence.split(/\s+/);

  if (words.length <= maxWords) {
    return firstSentence.endsWith('.') || firstSentence.endsWith('?') || firstSentence.endsWith('!')
      ? firstSentence
      : `${firstSentence}.`;
  }

  // Truncate at natural clause boundary or max words
  const truncated = words.slice(0, maxWords).join(' ').replace(/[,;:–—\-]$/, '');
  return `${truncated}.`;
}

/**
 * Ensures syntactic diversity across question openings in a generated set.
 * If 3+ questions share the exact same opening 3 words, rephrases them for variety.
 */
export function ensureQuestionDiversity<T extends { question: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const openingCounts = new Map<string, number>();

  return items.map((item) => {
    if (!item || !item.question) return item;
    let q = item.question.trim();
    const words = q.split(/\s+/);
    if (words.length < 3) return item;

    const openingKey = words.slice(0, 3).join(' ').toLowerCase();
    const count = openingCounts.get(openingKey) || 0;
    openingCounts.set(openingKey, count + 1);

    if (count >= 2) {
      if (q.toLowerCase().startsWith('how does')) {
        q = q.replace(/^how does\s+/i, 'In what way does ');
      } else if (q.toLowerCase().startsWith('what is')) {
        q = q.replace(/^what is\s+/i, 'Which concept defines ');
      } else if (q.toLowerCase().startsWith('what key')) {
        q = q.replace(/^what key\s+/i, 'Which fundamental ');
      } else if (q.toLowerCase().startsWith('which statement')) {
        q = q.replace(/^which statement\s+/i, 'What primary fact ');
      } else if (q.toLowerCase().startsWith('why is')) {
        q = q.replace(/^why is\s+/i, 'For what core reason is ');
      }
    }

    return { ...item, question: q };
  });
}

/**
 * Deduplicates quiz questions based on normalized question text and semantic token overlap.
 * Removes exact and near-duplicate questions testing the same underlying concept.
 */
export function deduplicateQuizQuestions<T extends { question: string }>(quiz: T[]): T[] {
  if (!Array.isArray(quiz) || quiz.length === 0) return [];

  const unique: T[] = [];
  const seenNorm = new Set<string>();

  const getTokens = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 3 &&
          !['what', 'which', 'how', 'does', 'with', 'this', 'that', 'from', 'have', 'were', 'been', 'about', 'role', 'main', 'primary', 'statement', 'accurately', 'reflects'].includes(w)
      );

  for (const item of quiz) {
    if (!item || !item.question) continue;
    const qRaw = item.question.trim();
    const qNorm = qRaw.toLowerCase().replace(/[^a-z0-9]/gi, '');

    if (seenNorm.has(qNorm)) continue;

    const qTokens = new Set(getTokens(qRaw));
    if (qTokens.size === 0) {
      seenNorm.add(qNorm);
      unique.push(item);
      continue;
    }

    let isDuplicate = false;

    for (const existing of unique) {
      const existingTokens = getTokens(existing.question);
      let matchCount = 0;
      for (const t of existingTokens) {
        if (qTokens.has(t)) matchCount++;
      }
      const similarity = matchCount / Math.max(qTokens.size, existingTokens.length);
      if (similarity >= 0.5) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seenNorm.add(qNorm);
      unique.push(item);
    }
  }

  return unique;
}

/**
 * Deduplicates flashcards based on normalized question text and key token overlap.
 */
export function deduplicateFlashcards<T extends { question: string }>(cards: T[]): T[] {
  return deduplicateQuizQuestions(cards);
}

/**
 * Checks if 4 options within a single question have duplicate wording.
 */
export function hasDuplicateOrOverlappingOptions(options: string[]): boolean {
  if (!Array.isArray(options) || options.length < 4) return true;

  const normalized = options.map((o) => o.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const uniqueSet = new Set(normalized);
  return uniqueSet.size < options.length;
}

/**
 * Detects any hardcoded or fabricated template placeholder strings in questions, answers, or options.
 */
export function isTemplatePlaceholderText(text: string): boolean {
  if (!text) return true;
  const lower = text.toLowerCase().trim();

  // Numbered placeholder patterns e.g. "#1", "#2", "option 1", "distractor 2", "mechanism #1"
  if (/#\d+/.test(lower) || /\b(option|distractor|mechanism|item|concept)\s*#?\d+\b/i.test(lower)) {
    return true;
  }

  // Fabricated fallback template words
  if (
    lower.includes('alternative mechanism') ||
    lower.includes('alternative principles') ||
    lower.includes('alternative concept') ||
    lower.includes('system context #') ||
    lower.includes('placeholder') ||
    lower.includes('distractor') ||
    /\boption\s+[a-d]\b/i.test(lower)
  ) {
    return true;
  }

  return false;
}

/**
 * Final quality validation pass before returning generated study material.
 * Strips any flashcard or quiz item containing template placeholder strings.
 */
export function validateDeckQuality(material: GeneratedStudyMaterial): GeneratedStudyMaterial {
  const flashcards = (material.flashcards || []).filter((fc) => {
    if (!fc || !fc.question || !fc.answer) return false;
    if (isTemplatePlaceholderText(fc.question)) return false;
    if (isTemplatePlaceholderText(fc.answer)) return false;
    return true;
  });

  const quiz = (material.quiz || []).filter((q) => {
    if (!q || !q.question || !Array.isArray(q.options) || q.options.length !== 4) return false;
    if (isTemplatePlaceholderText(q.question)) return false;
    if (isTemplatePlaceholderText(q.correctAnswer)) return false;
    if (q.options.some((opt) => isTemplatePlaceholderText(opt))) return false;
    return true;
  });

  return {
    ...material,
    flashcards,
    quiz,
  };
}

/**
 * Ensures answer options are unique across all questions in the quiz set.
 * Drops questions with duplicate options across the set instead of fabricating template text.
 */
export function ensureOptionUniquenessAcrossQuiz(quiz: QuizQuestion[]): QuizQuestion[] {
  if (!Array.isArray(quiz)) return [];

  const seenOptionNorms = new Set<string>();
  const uniqueQuiz: QuizQuestion[] = [];

  for (const q of quiz) {
    if (hasDuplicateOrOverlappingOptions(q.options)) continue;

    let hasCrossQuestionDuplicate = false;
    for (const opt of q.options) {
      const optNorm = opt.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (optNorm.length > 3 && seenOptionNorms.has(optNorm)) {
        hasCrossQuestionDuplicate = true;
        break;
      }
    }

    if (!hasCrossQuestionDuplicate) {
      for (const opt of q.options) {
        const optNorm = opt.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (optNorm.length > 3) seenOptionNorms.add(optNorm);
      }
      uniqueQuiz.push(q);
    }
  }

  return uniqueQuiz;
}

/**
 * Detects if an API error is due to rate limits or quota exhaustion (HTTP 429 / RESOURCE_EXHAUSTED).
 */
export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const status = err?.status || err?.statusCode || err?.code;
  const msg = (err?.message || String(err)).toLowerCase();

  if (status === 429 || status === '429' || status === 403) return true;
  if (
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('insufficient_quota') ||
    msg.includes('exceeded your current quota')
  ) {
    return true;
  }
  return false;
}

export async function generateSingleChunkMaterial(
  chunkText: string,
  deckId: string,
  targetFlashcards = 12,
  targetQuiz = 5
): Promise<GeneratedStudyMaterial> {
  const config = getAIClientAndModel();

  if (!config) {
    return validateDeckQuality(generateOfflineStudyMaterial(chunkText, deckId, targetFlashcards, targetQuiz));
  }

  const { client, model } = config;

  const systemPrompt = `You are an expert academic professor creating study material for a student. Analyze the provided study text and synthesize exactly ${targetFlashcards} flashcards and ${targetQuiz} multiple-choice quiz questions.

CRITICAL GENERATION RULES:
1. VARIED NATURAL QUESTIONS: Write varied, natural questions suited to each specific passage — do NOT reuse the same question opening or structure. Use diverse types: definitions ("What is X?"), mechanisms ("How does X work?"), comparisons ("How does X differ from Y?"), applications ("How is X used in Y?"), and cause/effect. NEVER quote raw section numbers, headings, or use template phrases like 'the findings on [X]'.
2. DIRECT EXPLANATORY FLASHCARD ANSWERS: The flashcard answer must directly and specifically answer the exact question asked in 1-3 complete, clear sentences. Do NOT answer with a list of keywords, terms, or topic names separated by commas. Write the answer as a real explanation a teacher would give a student.
3. UNIQUE QUESTION-SPECIFIC MCQ OPTIONS (UNDER 10 WORDS): Each answer option in quiz and exam questions must be a short phrase (under 10 words) that is UNIQUE to THIS specific question. Do NOT reuse the same or similar phrases as options across different questions. Distractors must be plausible, distinct short claims drawn from DIFFERENT specific facts in the text — not generic, recycled, or template options.
4. PLAUSIBLE DISTINCT DISTRACTORS: All 4 options within a question must be clearly distinct claims, not reworded versions of the same idea.
5. DISTINCT CONCEPTS ONLY: Every item in the set must cover a distinct concept — no duplicate or near-duplicate questions.
6. NO BARE HEADINGS: Do NOT generate questions from bare section titles, table of contents entries, or headers/footers.

Return ONLY valid JSON matching this schema:
{
  "flashcards": [
    { "question": string, "answer": string, "topic": string }
  ],
  "quiz": [
    { "question": string, "options": [string, string, string, string], "correctAnswer": string, "explanation": string, "topic": string }
  ]
}`;

  const userPrompt = `Here is the source study text:\n\n${chunkText}`;

  let attempts = 0;
  let rawAiOutput: any = null;
  let usedQuotaFallback = false;

  while (attempts < 2) {
    attempts++;
    try {
      const response = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
      });

      const content = response.choices[0]?.message?.content || '';
      rawAiOutput = JSON.parse(content);
      if (rawAiOutput && Array.isArray(rawAiOutput.flashcards) && Array.isArray(rawAiOutput.quiz)) {
        break;
      }
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        console.warn('[Gemini Quota Notice]: Demo API rate limit / quota reached. Switching seamlessly to Smart Offline AI Generator...');
        usedQuotaFallback = true;
        break;
      }
      console.warn(`[AI Chunk Gen Attempt ${attempts} Failed]:`, err?.message || err);
    }
  }

  const today = getTodayDateString();
  let flashcards: Flashcard[] = [];
  let quiz: QuizQuestion[] = [];

  if (rawAiOutput && Array.isArray(rawAiOutput.flashcards)) {
    flashcards = rawAiOutput.flashcards
      .filter((item: any) => {
        const q = cleanQuestionText(item.question || '');
        const a = (item.answer || '').trim();
        if (!q || !a) return false;
        if (isKeywordListAnswer(a)) return false;
        if (isTemplatePlaceholderText(q) || isTemplatePlaceholderText(a)) return false;
        if (/^(\d+(\.\d+)*|section|chapter)\s+[A-Z]/i.test(q) && !q.includes('?')) return false;
        if (q.length < 10) return false;
        return true;
      })
      .map((item: any) => ({
        id: uuidv4(),
        deckId,
        question: cleanQuestionText(item.question),
        answer: item.answer.trim(),
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: today,
        timesReviewed: 0,
        timesIncorrect: 0,
        topic: item.topic || 'General',
        isBookmarked: false,
        masteryLevel: 'new',
        correctReviewCount: 0,
        lastReviewedDate: null,
        isWeakTopicReviewed: false,
      }));
  }

  if (rawAiOutput && Array.isArray(rawAiOutput.quiz)) {
    console.log(`[AI Parsing]: AI returned ${rawAiOutput.quiz.length} raw quiz items.`);
    const rawQuiz: QuizQuestion[] = rawAiOutput.quiz
      .filter((item: any) => {
        const q = cleanQuestionText(item.question || '');
        if (!q) {
          console.log(`[Quiz Reject]: Missing question text.`);
          return false;
        }
        if (!Array.isArray(item.options) || item.options.length !== 4) {
          console.log(`[Quiz Reject]: Options length is not 4 (${item.options?.length}). Question: "${q}"`);
          return false;
        }
        if (/\b\d+\.\d+\b/.test(q)) {
          console.log(`[Quiz Reject]: Contains section number heading. Question: "${q}"`);
          return false;
        }

        const options = item.options.map((o: any) => String(o).trim());
        const hasLongOption = options.some((opt: string) => {
          const wordCount = opt.split(/\s+/).length;
          return wordCount > 18 || opt.length > 120 || opt.includes('\n');
        });
        if (hasLongOption) {
          console.log(`[Quiz Reject]: Option exceeds 18 words / 120 chars. Question: "${q}"`);
          return false;
        }
        if (hasDuplicateOrOverlappingOptions(options)) {
          console.log(`[Quiz Reject]: Intra-question option duplication. Question: "${q}"`);
          return false;
        }
        if (isTemplatePlaceholderText(q) || options.some((opt) => isTemplatePlaceholderText(opt))) {
          console.log(`[Quiz Reject]: Contains template placeholder text. Question: "${q}"`);
          return false;
        }

        return true;
      })
      .map((item: any) => {
        const options = item.options.map((o: any) => formatShortOption(String(o), 10));
        let correctAnswer = formatShortOption(item.correctAnswer || options[0], 10);
        if (!options.includes(correctAnswer)) {
          correctAnswer = options[0];
        }

        return {
          id: uuidv4(),
          question: cleanQuestionText(item.question),
          options,
          correctAnswer,
          explanation: formatConciseSentence(item.explanation || 'Based on document content.', 25),
          topic: item.topic || 'General',
        };
      });

    console.log(`[AI Filtering Pass]: ${rawQuiz.length} of ${rawAiOutput.quiz.length} quiz items passed single-item quality filters.`);
    quiz = ensureOptionUniquenessAcrossQuiz(
      ensureQuestionDiversity(deduplicateQuizQuestions(rawQuiz))
    );
    console.log(`[Cross-Question Dedup]: ${quiz.length} quiz questions retained after deduplication & option uniqueness.`);
  }

  flashcards = ensureQuestionDiversity(flashcards);

  // FAIL-SAFE BACKUP: Supplement using offline generator if cards are low
  const minRequiredCards = Math.max(6, Math.floor(targetFlashcards * 0.5));
  if (flashcards.length < minRequiredCards || quiz.length < 3) {
    console.log(
      `[AI Quality Gate]: Chunk yielded ${flashcards.length} flashcards & ${quiz.length} quiz questions. Supplementing with offline engine...`
    );
    const offlineBackup = generateOfflineStudyMaterial(
      chunkText,
      deckId,
      targetFlashcards - flashcards.length,
      targetQuiz - quiz.length
    );
    flashcards = [...flashcards, ...offlineBackup.flashcards];
    quiz = ensureOptionUniquenessAcrossQuiz([...quiz, ...offlineBackup.quiz]);
  }

  return validateDeckQuality({ flashcards, quiz, quotaNotice: usedQuotaFallback });
}

export async function generateStudyMaterial(
  text: string,
  deckId: string
): Promise<GeneratedStudyMaterial> {
  const cleaned = cleanDocumentText(text);
  const cleanLength = cleaned.length;

  // DYNAMIC CARD COUNT SCALING based on document content length (~1 card per 280 chars)
  const totalTargetFlashcards = Math.max(12, Math.min(60, Math.round(cleanLength / 280)));
  const totalTargetQuiz = Math.max(5, Math.min(25, Math.round(totalTargetFlashcards / 2.5)));

  const chunks = splitTextIntoChunks(cleaned);
  console.log(
    `[Multi-Chunk Engine]: Document (${cleanLength} chars) split into ${chunks.length} section(s). Dynamic Target: ${totalTargetFlashcards} flashcards, ${totalTargetQuiz} quiz questions...`
  );

  const flashcardsPerChunk = Math.max(8, Math.ceil(totalTargetFlashcards / chunks.length));
  const quizPerChunk = Math.max(3, Math.ceil(totalTargetQuiz / chunks.length));

  const combinedFlashcards: Flashcard[] = [];
  const combinedQuiz: QuizQuestion[] = [];
  let skippedCount = 0;
  let hasQuotaNotice = false;

  for (let i = 0; i < chunks.length; i++) {
    console.log(`[Chunk ${i + 1}/${chunks.length}]: Synthesizing section for deck ${deckId}...`);
    try {
      const res = await generateSingleChunkMaterial(
        chunks[i],
        deckId,
        flashcardsPerChunk,
        quizPerChunk
      );
      if (res.quotaNotice) {
        hasQuotaNotice = true;
      }
      if (res.flashcards && res.flashcards.length > 0) {
        combinedFlashcards.push(...res.flashcards.map((fc) => ({ ...fc, deckId })));
      }
      if (res.quiz && res.quiz.length > 0) {
        combinedQuiz.push(...res.quiz);
      }
    } catch (err) {
      console.warn(`[Chunk ${i + 1}/${chunks.length} Warning]: Falling back section to offline generator:`, err);
      const offlineRes = generateOfflineStudyMaterial(chunks[i], deckId, flashcardsPerChunk, quizPerChunk);
      combinedFlashcards.push(...offlineRes.flashcards);
      combinedQuiz.push(...offlineRes.quiz);
    }
  }

  // Final cross-chunk semantic deduplication, option uniqueness & syntactic question diversity enforcement
  let finalQuiz = ensureOptionUniquenessAcrossQuiz(
    ensureQuestionDiversity(deduplicateQuizQuestions(combinedQuiz))
  );
  let finalFlashcards = ensureQuestionDiversity(combinedFlashcards);

  // ULTIMATE FAIL-SAFE: If entire deck has 0 cards, generate from full text immediately!
  if (finalFlashcards.length === 0 || finalQuiz.length === 0) {
    console.warn(`[Ultimate Fail-Safe]: Entire deck output was low. Running complete offline generator...`);
    const fallback = generateOfflineStudyMaterial(cleaned, deckId, totalTargetFlashcards, totalTargetQuiz);
    if (finalFlashcards.length === 0) finalFlashcards = fallback.flashcards;
    if (finalQuiz.length === 0) finalQuiz = fallback.quiz;
  }

  const validated = validateDeckQuality({
    flashcards: finalFlashcards,
    quiz: finalQuiz,
    skippedChunks: skippedCount,
    totalChunks: chunks.length,
    quotaNotice: hasQuotaNotice,
  });

  console.log(
    `[Multi-Chunk Engine Success]: Generated single deck with ${validated.flashcards.length} flashcards and ${validated.quiz.length} quiz questions from ${chunks.length} section(s).`
  );

  return validated;
}


export async function generateEli5(
  question: string,
  answer: string
): Promise<string> {
  const config = getAIClientAndModel();

  if (!config) {
    return `In simple terms: ${answer}. Think of it like a tiny helper doing its job every day!`;
  }

  const { client, model } = config;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Explain this answer in the simplest possible terms, as if to a 5-year-old, in 2-3 sentences.',
        },
        {
          role: 'user',
          content: `Question: ${question}\nAnswer: ${answer}`,
        },
      ],
      temperature: 0.6,
    });

    return (
      response.choices[0]?.message?.content?.trim() ||
      `In simple terms: ${answer}`
    );
  } catch (err) {
    return `In simple terms: ${answer}.`;
  }
}

function generateOfflineStudyMaterial(
  text: string,
  deckId: string,
  targetFlashcards = 12,
  targetQuiz = 5
): GeneratedStudyMaterial {
  const today = getTodayDateString();
  const cleaned = cleanDocumentText(text);

  // Extract complete explanatory sentences (> 35 chars, ending in punctuation, not headings or keyword dumps)
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 35 &&
        !isHeadingLine(s) &&
        !isKeywordListAnswer(s)
    );

  const topics = ['Core Concept', 'Definitions', 'Key Mechanisms', 'Applications', 'Summary Points'];

  const validSentences =
    sentences.length > 0
      ? sentences
      : ['Artificial intelligence systems synthesize model data to perform cognitive tasks.'];

  // Array of varied, natural question templates
  const questionTemplates = [
    (kw: string) => `What primary role does ${kw} perform?`,
    (kw: string) => `How does ${kw} function within this framework?`,
    (kw: string) => `What key advantage does ${kw} provide?`,
    (kw: string) => `Why is ${kw} considered essential in this domain?`,
    (kw: string) => `How is ${kw} applied to solve technical challenges?`,
    (kw: string) => `What distinguishes ${kw} from alternative approaches?`,
    (kw: string) => `What main objective does ${kw} accomplish?`,
    (kw: string) => `In what context is ${kw} most effectively utilized?`,
  ];

  const flashcardCount = Math.min(targetFlashcards, Math.max(12, validSentences.length));
  const flashcards: Flashcard[] = [];

  for (let i = 0; i < flashcardCount; i++) {
    const sentence = validSentences[i % validSentences.length];
    const words = sentence.split(' ');

    // Extract clean keyword without section numbers or punctuation
    const rawKeyword = words.length > 4 ? words.slice(0, 3).join(' ') : 'this mechanism';
    const keyword = rawKeyword.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'this concept';

    const templateFn = questionTemplates[i % questionTemplates.length];
    const rawQ = templateFn(keyword);

    flashcards.push({
      id: uuidv4(),
      deckId,
      question: cleanQuestionText(rawQ),
      answer: formatConciseSentence(sentence, 22),
      difficulty: null,
      intervalDays: 0,
      nextReviewDate: today,
      timesReviewed: 0,
      timesIncorrect: 0,
      topic: topics[i % topics.length],
      isBookmarked: false,
      masteryLevel: 'new',
      correctReviewCount: 0,
      lastReviewedDate: null,
      isWeakTopicReviewed: false,
    });
  }

  const quizCount = Math.max(targetQuiz, Math.min(25, Math.floor(validSentences.length / 2)));
  const rawQuiz: QuizQuestion[] = [];

  for (let i = 0; i < quizCount; i++) {
    // Pick target sentence at index (i * 3) % length
    const targetIdx = (i * 3) % validSentences.length;
    const targetSentence = validSentences[targetIdx];
    const words = targetSentence.split(' ');
    const rawKeyword = words.slice(0, 3).join(' ');
    const keyword = rawKeyword.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'this feature';

    const correctAnswer = formatShortOption(targetSentence, 8);

    // Pick 3 non-overlapping distractors starting from (i * 3 + 1)
    const distractors: string[] = [];
    for (let d = 1; d <= 5; d++) {
      const candidateIdx = (targetIdx + d) % validSentences.length;
      if (candidateIdx !== targetIdx) {
        const candidateOpt = formatShortOption(validSentences[candidateIdx], 8);
        if (!distractors.includes(candidateOpt) && candidateOpt !== correctAnswer) {
          distractors.push(candidateOpt);
        }
      }
      if (distractors.length >= 3) break;
    }

    if (distractors.length < 3) continue;

    const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
    const templateFn = questionTemplates[(i + 3) % questionTemplates.length];

    rawQuiz.push({
      id: uuidv4(),
      question: cleanQuestionText(templateFn(keyword)),
      options,
      correctAnswer,
      explanation: `Source text: "${formatConciseSentence(targetSentence, 20)}".`,
      topic: topics[i % topics.length],
    });
  }

  const quiz = ensureOptionUniquenessAcrossQuiz(deduplicateQuizQuestions(rawQuiz));
  const finalFlashcards = ensureQuestionDiversity(flashcards);

  return { flashcards: finalFlashcards, quiz };
}
