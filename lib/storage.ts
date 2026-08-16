/**
 * Notionwell — Storage Abstraction Layer
 * Single Source of Truth for all Data Persistence Operations.
 * 
 * Isolates data storage logic from UI components and business logic,
 * making the underlying persistence layer (LocalStorage, IndexedDB, or REST/Database API)
 * completely swappable without changing UI component code.
 */

export {
  // Theme Storage
  getStoredTheme,
  setStoredTheme,

  // Subject Folder Storage
  getSubjects,
  getSubjectById,
  saveSubject,
  deleteSubject,

  // Study Deck Storage
  getDecks,
  getDeckById,
  getDecksBySubject,
  getRecentlyViewedDecks,
  touchDeckViewDate,
  clearDeckFromRecentlyViewed,
  saveDeck,
  moveDeckToSubject,
  deleteDeck,

  // Multi-Source Document Storage
  getDeckSources,
  saveDeckSource,
  deleteDeckSource,

  // Study Session & Time Logs Storage
  getSessionLogs,
  saveSessionLog,
  getStudyTimeLogs,
  saveStudyTimeLog,

  // Study Planner Task Storage
  getPlannerTasks,
  savePlannerTask,
  togglePlannerTask,
  deletePlannerTask,

  // Achievement Badges Storage
  getBadges,
  saveBadges,
  checkAndUnlockBadges,
  unlockQuizWhizBadge,

  // Account & Session Auth Storage
  getStoredAccount,
  saveStoredAccount,
  getSession,
  saveSession,
  getCurrentUser,
  signupUser,
  loginUser,
  demoLoginUser,
  logoutUser,
  resetAllAppData,

  // Dashboard Metrics & Stats Storage
  getStats,
  getDashboardMetrics,

  // Deduplication & Diversity Processing
  deduplicateQuizQuestions,
  deduplicateFlashcards,
  ensureQuestionDiversity,
  formatShortOption,
  isKeywordListAnswer,
  hasDuplicateOrOverlappingOptions,
  ensureOptionUniquenessAcrossQuiz,
} from './app';

export type {
  GeneratedStudyMaterial,
  DashboardMetrics,
  DashboardWeakTopic,
  DashboardPrimaryRecommendation,
} from './app';
