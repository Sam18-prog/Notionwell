'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getDecks,
  deleteDeck,
  clearDeckFromRecentlyViewed,
  getDashboardMetrics,
  getRecentlyViewedDecks,
  getDecksDueForReview,
  DeckDueReviewItem,
  saveDeck,
  getCurrentUser,
  getSubjects,
  getPlannerTasks,
  togglePlannerTask,
  Subject,
  Deck,
  PlannerTask,
  DashboardMetrics,
  getTodayDateString,
} from '@/lib/app';
import MoveDeckModal from '@/components/MoveDeckModal';
import MigrationBanner from '@/components/MigrationBanner';
import StudyTimeChart from '@/components/StudyTimeChart';
import {
  GraduationCap,
  Sparkles,
  Award,
  Plus,
  BookOpen,
  HelpCircle,
  Timer,
  EyeOff,
  FileText,
  FileCode,
  CheckCircle2,
  Lightbulb,
  Filter,
  Calendar as CalendarIcon,
  CheckSquare,
  Square,
  ArrowRight,
  Clock,
  FolderInput,
  Zap,
  Layers,
  Play,
  Flame,
  Target,
  RotateCw,
  TrendingUp,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import DashboardLoading from './loading';

export default function DashboardPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [movingDeck, setMovingDeck] = useState<Deck | null>(null);

  const [decks, setDecks] = useState<Deck[]>([]);
  const [continueLearningDecks, setContinueLearningDecks] = useState<DeckDueReviewItem[]>([]);
  const [todayTasks, setTodayTasks] = useState<PlannerTask[]>([]);
  const [examStats, setExamStats] = useState<{
    examsCompleted: number;
    averageScore: number;
    recentAttempts: any[];
    weakTopics: string[];
  }>({
    examsCompleted: 0,
    averageScore: 0,
    recentAttempts: [],
    weakTopics: [],
  });
  const [levelInfo, setLevelInfo] = useState<{
    currentLevel: number;
    totalXP: number;
    progressPercentage: number;
    xpToNextLevel: number;
  }>({
    currentLevel: 1,
    totalXP: 0,
    progressPercentage: 0,
    xpToNextLevel: 50,
  });
  const [goalProgress, setGoalProgress] = useState<any | null>(null);
  const [aiRecs, setAiRecs] = useState<any[]>([]);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalDecks: 0,
    totalCards: 0,
    totalFlashcards: 0,
    quizzesCompleted: 0,
    easyCards: 0,
    masteredCards: 0,
    masteryPercentage: 0,
    cardsDueToday: 0,
    streakDays: 0,
    weakTopics: [],
    primaryRecommendation: {
      type: 'empty',
      title: 'Ready to start learning?',
      description: 'Upload your notes, textbook photos, or PDF documents to generate smart flashcards and receive personalized AI recommendations.',
      actionLabel: 'Upload Notes & Create Deck',
      actionUrl: '/create',
    },
  });
  const [mounted, setMounted] = useState(false);

  const loadLocalData = (filterSubjectId: string = 'all') => {
    const loadedSubjects = getSubjects();
    setSubjects(loadedSubjects);

    // Fetch max 4 recently viewed decks
    const recentDecks = getRecentlyViewedDecks(filterSubjectId, 4);
    setDecks(recentDecks);
    setMetrics(getDashboardMetrics(filterSubjectId));
    setContinueLearningDecks(getDecksDueForReview(3));

    const todayStr = getTodayDateString();
    const tasks = getPlannerTasks().filter((t) => t.date === todayStr);
    setTodayTasks(tasks);
  };

  const loadRemoteData = () => {
    Promise.allSettled([
      fetch('/api/exam/history').then((r) => r.json()),
      fetch('/api/gamification/xp').then((r) => r.json()),
      fetch('/api/gamification/goals').then((r) => r.json()),
      fetch('/api/study/recommendations').then((r) => r.json()),
    ]).then(([examRes, xpRes, goalsRes, recsRes]) => {
      if (examRes.status === 'fulfilled' && examRes.value?.success && examRes.value.stats) {
        setExamStats(examRes.value.stats);
      }
      if (xpRes.status === 'fulfilled' && xpRes.value?.success && xpRes.value.levelInfo) {
        setLevelInfo(xpRes.value.levelInfo);
      }
      if (goalsRes.status === 'fulfilled' && goalsRes.value?.success && goalsRes.value.progress) {
        setGoalProgress(goalsRes.value.progress);
      }
      if (recsRes.status === 'fulfilled' && recsRes.value?.success && recsRes.value.recommendations) {
        setAiRecs(recsRes.value.recommendations);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    loadLocalData(selectedSubjectId);
    loadRemoteData();
  }, [router]);

  const handleSubjectFilterChange = (id: string) => {
    setSelectedSubjectId(id);
    loadLocalData(id);
  };

  const handleToggleTodayTask = (id: string) => {
    togglePlannerTask(id);
    loadLocalData(selectedSubjectId);
  };

  const handleClearFromRecentlyViewed = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    clearDeckFromRecentlyViewed(id);
    loadLocalData(selectedSubjectId);
  };

  const handleCreateSampleDeck = () => {
    const today = getTodayDateString();
    const loadedSubjects = getSubjects();
    const targetSubjectId = loadedSubjects[0]?.id || 'subject-science';

    const sampleDeck: Deck = {
      id: uuidv4(),
      subjectId: targetSubjectId,
      name: 'Sample Deck — Human Cell Biology',
      createdAt: new Date().toISOString(),
      sourceType: 'text',
      flashcards: [
        {
          id: uuidv4(),
          deckId: 'sample',
          question: 'What is the primary function of the Mitochondria?',
          answer: 'Generates cellular energy in the form of ATP through cellular respiration.',
          difficulty: null,
          intervalDays: 0,
          nextReviewDate: today,
          timesReviewed: 0,
          timesIncorrect: 0,
          topic: 'Cellular Energetics',
          masteryLevel: 'new',
          correctReviewCount: 0,
        },
        {
          id: uuidv4(),
          deckId: 'sample',
          question: 'What organelle synthesizes proteins in eukaryotic cells?',
          answer: 'Ribosomes, which translate mRNA sequences into polypeptide chains.',
          difficulty: null,
          intervalDays: 0,
          nextReviewDate: today,
          timesReviewed: 0,
          timesIncorrect: 0,
          topic: 'Protein Synthesis',
          masteryLevel: 'new',
          correctReviewCount: 0,
        },
        {
          id: uuidv4(),
          deckId: 'sample',
          question: 'Define the Selective Permeability of the Cell Membrane.',
          answer: 'The ability of the phospholipid bilayer to regulate which molecules pass into or out of the cell.',
          difficulty: null,
          intervalDays: 0,
          nextReviewDate: today,
          timesReviewed: 0,
          timesIncorrect: 0,
          topic: 'Cell Membrane',
          masteryLevel: 'new',
          correctReviewCount: 0,
        },
        {
          id: uuidv4(),
          deckId: 'sample',
          question: 'What is the role of the Lysosome?',
          answer: 'Contains digestive enzymes to break down waste materials and cellular debris.',
          difficulty: null,
          intervalDays: 0,
          nextReviewDate: today,
          timesReviewed: 0,
          timesIncorrect: 0,
          topic: 'Cellular Digestion',
          masteryLevel: 'new',
          correctReviewCount: 0,
        },
      ],
      quizQuestions: [
        {
          id: uuidv4(),
          question: 'Which organelle is known as the powerhouse of the cell?',
          options: ['Ribosome', 'Mitochondria', 'Golgi Body', 'Nucleus'],
          correctAnswer: 'Mitochondria',
          explanation: 'Mitochondria convert nutrients into adenosine triphosphate (ATP), powering cellular functions.',
          topic: 'Cellular Energetics',
        },
        {
          id: uuidv4(),
          question: 'Where is genetic material (DNA) primarily stored in animal cells?',
          options: ['Cytoplasm', 'Nucleus', 'Endoplasmic Reticulum', 'Vacuole'],
          correctAnswer: 'Nucleus',
          explanation: 'The nucleus encloses genomic DNA and directs protein synthesis and cell division.',
          topic: 'Genetics',
        },
      ],
    };

    saveDeck(sampleDeck);
    loadLocalData(selectedSubjectId);
  };

  if (!mounted) return <DashboardLoading />;

  const currentUser = getCurrentUser();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const userInitial = (currentUser?.name || currentUser?.email || 'S').charAt(0).toUpperCase();

  const incompleteTodayTasks = todayTasks.filter((t) => !t.isCompleted);
  const topWeakTopics = metrics.weakTopics.slice(0, 4);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* CLOUD MIGRATION BANNER (PERSISTENCE BRIDGE) */}
      <MigrationBanner />

      {/* 1. GREETING & HERO HEADER WITH BRAND TAGLINE & SUBJECT FILTER */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] p-6 sm:p-8 shadow-xs transition-all">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              {userInitial}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA] text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="font-bold">Notionwell — From Notes to Knowledge</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-extrabold">
                  <Award className="w-3.5 h-3.5" />
                  <span>Level {levelInfo.currentLevel} ({levelInfo.totalXP} XP)</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-extrabold">
                  <Flame className="w-3.5 h-3.5 fill-orange-500" />
                  <span>{metrics.streakDays > 0 ? `${metrics.streakDays}d Streak` : 'Streak Active'}</span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                {greeting}, {currentUser?.name || 'Student'} 👋
              </h1>
              <p className="mt-1 text-[#475569] dark:text-[#CBD5E1] text-xs sm:text-sm max-w-xl leading-relaxed font-medium">
                Your adaptive AI study workspace. Review upcoming SM-2 flashcards, practice quizzes, and track retention mastery.
              </p>
            </div>
          </div>

          {/* SUBJECT FILTER DROPDOWN & CREATE BUTTON */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl px-3 py-2">
              <Filter className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6] shrink-0" />
              <select
                value={selectedSubjectId}
                onChange={(e) => handleSubjectFilterChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none cursor-pointer"
              >
                <option value="all">📁 All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Upload Notes & Create Deck</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. KEY STUDY STATS CARDS */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
          Key Study Metrics
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Decks */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">
                Total Decks
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6]">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                {metrics.totalDecks ?? decks.length}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">decks</span>
            </div>
            <p className="mt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium truncate">
              Across {subjects.length} subject folder{subjects.length === 1 ? '' : 's'}
            </p>
          </div>

          {/* Card 2: Total Flashcards */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">
                Total Flashcards
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] dark:bg-[#2E1065] border border-[#DDD6FE] dark:border-[#581C87] flex items-center justify-center text-[#7C3AED] dark:text-[#A78BFA]">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                {metrics.totalFlashcards ?? metrics.totalCards}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">cards</span>
            </div>
            <p className="mt-2 text-[11px] text-[#2563EB] dark:text-[#60A5FA] font-bold truncate">
              {metrics.cardsDueToday} due today (SM-2)
            </p>
          </div>

          {/* Card 3: Quizzes Completed */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">
                Quizzes Completed
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#431407] border border-[#FFEDD5] dark:border-[#9A3412] flex items-center justify-center text-[#F97316] dark:text-[#FB923C]">
                <HelpCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                {metrics.quizzesCompleted ?? 0}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">
                completed
              </span>
            </div>
            <p className="mt-2 text-[11px] text-[#F97316] dark:text-[#FB923C] font-bold truncate">
              {metrics.streakDays > 0 ? `${metrics.streakDays}-day streak active` : 'Take a quiz to practice'}
            </p>
          </div>

          {/* Card 4: Retention Mastery % */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">
                Retention Mastery
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] dark:bg-[#052E2B] border border-[#A7F3D0] dark:border-[#065F46] flex items-center justify-center text-[#10B981] dark:text-[#34D399]">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                {metrics.masteryPercentage}%
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-semibold truncate">
                ({metrics.masteredCards}/{metrics.totalCards})
              </span>
            </div>
            <div className="mt-2 w-full bg-[#E2E8F0] dark:bg-[#263449] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#10B981] dark:bg-[#34D399] h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.masteryPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS ROW (6 ACTION BUTTONS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          href="/create"
          className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] dark:hover:border-[#3B82F6] shadow-xs transition-all group hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center shrink-0 group-hover:bg-[#2563EB] group-hover:text-white transition-all">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-[#0F172A] dark:text-[#F8FAFC]">Generate AI</h3>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">From notes & docs</p>
          </div>
        </Link>

        <Link
          href="/review"
          className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] dark:hover:border-[#3B82F6] shadow-xs transition-all group hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center shrink-0 group-hover:bg-[#2563EB] group-hover:text-white transition-all">
            <RotateCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-[#0F172A] dark:text-[#F8FAFC]">Review Hub</h3>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">{metrics.cardsDueToday} cards due</p>
          </div>
        </Link>

        <Link
          href="/exam"
          className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] dark:hover:border-[#3B82F6] shadow-xs transition-all group hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#818CF8] flex items-center justify-center shrink-0 group-hover:bg-[#4F46E5] group-hover:text-white transition-all">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-[#0F172A] dark:text-[#F8FAFC]">Exam Simulator</h3>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Timed mock exams</p>
          </div>
        </Link>

        <Link
          href="/decks"
          className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] dark:hover:border-[#3B82F6] shadow-xs transition-all group hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] dark:bg-[#2E1065] text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center shrink-0 group-hover:bg-[#7C3AED] group-hover:text-white transition-all">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-[#0F172A] dark:text-[#F8FAFC]">Study Decks</h3>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">{metrics.totalDecks ?? decks.length} decks</p>
          </div>
        </Link>

        <Link
          href="/decks?tab=flashcards"
          className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] dark:hover:border-[#3B82F6] shadow-xs transition-all group hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] dark:bg-[#052E2B] text-[#10B981] dark:text-[#34D399] flex items-center justify-center shrink-0 group-hover:bg-[#10B981] group-hover:text-white transition-all">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-[#0F172A] dark:text-[#F8FAFC]">Flashcards</h3>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Spaced repetition</p>
          </div>
        </Link>

        <Link
          href="/decks?tab=quizzes"
          className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] dark:hover:border-[#3B82F6] shadow-xs transition-all group hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] dark:bg-[#431407] text-[#F97316] dark:text-[#FB923C] flex items-center justify-center shrink-0 group-hover:bg-[#F97316] group-hover:text-white transition-all">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-[#0F172A] dark:text-[#F8FAFC]">Practice Quizzes</h3>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">MCQ test mode</p>
          </div>
        </Link>
      </div>

      {/* AI EXAM SIMULATION SYSTEM HIGHLIGHT BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] border border-[#334155] p-6 sm:p-7 text-white shadow-md">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Phase 5 • AI Exam Simulation System</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Ground-Truth AI Exam & Timed Assessment Simulator
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Generate realistic timed mock tests directly from your uploaded lecture notes and PDFs. Practice with negative marking, automated concept grading, and instant academic diagnostic breakdown.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-bold">
                <Award className="w-4 h-4 text-amber-400" />
                <span>{examStats.examsCompleted} Exam{examStats.examsCompleted === 1 ? '' : 's'} Completed</span>
              </span>
              {examStats.examsCompleted > 0 && (
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Avg. Score: {examStats.averageScore}%</span>
                </span>
              )}
              {examStats.weakTopics.length > 0 && (
                <span className="flex items-center gap-1.5 text-rose-300 font-bold">
                  <span>Weakest Topic: {examStats.weakTopics[0]}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              href="/exam"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-md transition-all hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Exam Simulator</span>
            </Link>
          </div>
        </div>
      </div>

      {/* DAILY GOALS PROGRESS WIDGET */}
      {goalProgress && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                  Today's Study Goals
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {goalProgress.dailyCompletionPercentage}% of your personalized daily learning targets achieved
                </p>
              </div>
            </div>

            <Link
              href="/insights"
              className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline flex items-center gap-1"
            >
              <span>Manage Goals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {goalProgress.daily.map((item: any) => (
              <div
                key={item.metric}
                className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#0F172A] dark:text-[#F8FAFC]">{item.label}</span>
                  <span className={item.isCompleted ? 'text-emerald-500 font-extrabold' : 'text-[#64748B]'}>
                    {item.actual} / {item.target} {item.unit}
                  </span>
                </div>
                <div className="w-full bg-[#E2E8F0] dark:bg-[#263449] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.isCompleted ? 'bg-emerald-500' : 'bg-[#2563EB]'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PERSONALIZED AI STUDY RECOMMENDATIONS */}
      {aiRecs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
              <span>Personalized AI Study Recommendations</span>
            </h2>
            <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
              Grounded in Verified Learning Data
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiRecs.slice(0, 3).map((rec: any) => (
              <div
                key={rec.id}
                className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        rec.priority === 'high'
                          ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:border-rose-900'
                          : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:border-blue-900'
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                    {rec.topic && (
                      <span className="text-[10px] text-[#64748B] truncate max-w-[120px]">
                        {rec.topic}
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] transition-colors line-clamp-1">
                    {rec.title}
                  </h3>

                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed line-clamp-3">
                    {rec.rationale}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#263449]">
                  <Link
                    href={rec.actionUrl}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <span>{rec.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. CONTINUE LEARNING (NEXT SCHEDULED SM-2 REVIEWS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>Continue Learning — Spaced Repetition (SM-2)</span>
          </h2>
          <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
            {metrics.cardsDueToday} card{metrics.cardsDueToday === 1 ? '' : 's'} due today
          </span>
        </div>

        {continueLearningDecks.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 text-center space-y-2">
            <p className="text-sm text-[#475569] dark:text-[#CBD5E1] font-medium">
              No review sessions pending! Create a new deck or practice with flashcards.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] dark:text-[#3B82F6] hover:underline"
            >
              <span>Upload notes to create new flashcards</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {continueLearningDecks.map(({ deck, dueCount, totalCards, nextReviewDate }) => {
              const subject = subjects.find((s) => s.id === deck.subjectId);
              const isDueToday = dueCount > 0;

              return (
                <div
                  key={deck.id}
                  className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] dark:hover:border-[#3B82F6] rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {subject && (
                        <span
                          className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-md text-white uppercase truncate max-w-[120px]"
                          style={{ backgroundColor: subject.colorTag || '#2563EB' }}
                        >
                          {subject.name}
                        </span>
                      )}
                      {isDueToday ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-[#422006] text-[#B45309] dark:text-[#FBBF24] font-bold text-[10px] border border-[#FDE68A] dark:border-[#78350F]">
                          {dueCount} Due Now
                        </span>
                      ) : (
                        <span className="text-[#64748B] dark:text-[#94A3B8] text-[10px] font-medium">
                          Next: {nextReviewDate}
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6] transition-colors line-clamp-1">
                      {deck.name}
                    </h3>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {totalCards} cards total • {deck.quizQuestions?.length || 0} quiz items
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#263449]">
                    <Link
                      href={`/deck/${deck.id}?mode=study`}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{isDueToday ? 'Review Due Cards' : 'Practice Flashcards'}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SMART FOCUS TOPICS */}
      {topWeakTopics.length > 0 && (
        <div className="bg-[#F8FAFF] dark:bg-[#172033] border border-[#DBEAFE] dark:border-[#334155] rounded-2xl p-5 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] rounded-xl text-[#2563EB] dark:text-[#60A5FA] shrink-0 shadow-xs">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#0F172A] dark:text-[#F8FAFC] text-sm">
                  Smart Focus Topics
                </h3>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                  Click a topic tag to launch a targeted review session on weak cards:
                </p>

                <div className="flex flex-wrap gap-2 pt-3">
                  {topWeakTopics.map(({ topic, incorrectCount, accuracy }) => (
                    <Link
                      key={topic}
                      href={`/deck/topic-${encodeURIComponent(topic)}?topic=${encodeURIComponent(topic)}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#DBEAFE] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] text-xs font-bold shadow-xs hover:border-[#2563EB] transition-all"
                    >
                      <span>{topic}</span>
                      <span className="bg-[#FEF2F2] dark:bg-[#450A0A] text-[#EF4444] dark:text-[#F87171] border border-[#FEE2E2] dark:border-[#7F1D1D] px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                        {accuracy}% accuracy ({incorrectCount} {incorrectCount === 1 ? 'miss' : 'misses'})
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href="/insights"
              className="text-xs font-bold text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1 shrink-0 pt-1"
            >
              <span>View Full Insights</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 5. LEARNING ACTIVITY & TODAY'S TASKS (2-COLUMN GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudyTimeChart detailed={false} />

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                    Today’s Study Tasks
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {incompleteTodayTasks.length} pending task{incompleteTodayTasks.length === 1 ? '' : 's'} scheduled for today
                  </p>
                </div>
              </div>

              <Link
                href="/planner"
                className="text-xs font-bold text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1"
              >
                <span>Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todayTasks.length === 0 ? (
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium py-4 text-center">
                No study tasks scheduled for today.{' '}
                <Link href="/planner" className="text-[#2563EB] dark:text-[#3B82F6] underline font-bold">
                  Schedule tasks on your Study Planner
                </Link>
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {todayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (t.linkedDeckId) {
                        router.push(`/deck/${t.linkedDeckId}?mode=study`);
                      } else {
                        handleToggleTodayTask(t.id);
                      }
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      t.isCompleted
                        ? 'bg-[#F8FAFC] dark:bg-[#172033]/50 border-[#E2E8F0] dark:border-[#263449] opacity-65'
                        : 'bg-[#F8FAFC] dark:bg-[#172033] border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTodayTask(t.id);
                        }}
                      >
                        {t.isCompleted ? (
                          <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-[#64748B] shrink-0" />
                        )}
                      </div>

                      <span
                        className={`text-xs font-bold truncate ${
                          t.isCompleted ? 'line-through text-[#64748B]' : 'text-[#0F172A] dark:text-[#F8FAFC]'
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>

                    {t.linkedDeckId && (
                      <span className="px-2 py-0.5 rounded-md bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[10px] font-bold shrink-0">
                        📘 Deck
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. RECENTLY VIEWED DECKS SECTION (MAX 4) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>Recently Viewed Decks</span>
          </h2>

          <div className="flex items-center gap-3">
            {decks.length === 0 && (
              <button
                onClick={handleCreateSampleDeck}
                className="text-xs font-bold text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Load Sample Biology Deck
              </button>
            )}

            <Link
              href="/decks"
              className="text-xs font-bold text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1"
            >
              <span>View All Decks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {decks.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-dashed border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-12 text-center flex flex-col items-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center mb-4 shadow-xs">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
              No Study Decks Found
            </h3>
            <p className="text-[#475569] dark:text-[#CBD5E1] text-sm max-w-md mb-6 font-medium">
              Upload a PDF, DOCX file, or paste lecture notes to synthesize AI flashcards & practice tests.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/create"
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-semibold text-sm shadow-xs transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Upload Document / Paste Notes
              </Link>
              <button
                onClick={handleCreateSampleDeck}
                className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] font-semibold text-sm hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] transition-all"
              >
                Try Sample Biology Deck
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {decks.map((deck) => {
              const today = getTodayDateString();
              const dueCount = deck.flashcards.filter(
                (c) => c.nextReviewDate <= today
              ).length;
              const masteredCount = deck.flashcards.filter(
                (c) => c.masteryLevel === 'mastered'
              ).length;
              const deckMastery =
                deck.flashcards.length > 0
                  ? Math.round((masteredCount / deck.flashcards.length) * 100)
                  : 0;

              const deckSubject = subjects.find((s) => s.id === deck.subjectId);

              let masteryBadgeClass = 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8] border-[#CBD5E1] dark:border-[#334155]';
              if (deckMastery >= 75) {
                masteryBadgeClass = 'bg-[#ECFDF5] dark:bg-[#052E2B] text-[#10B981] dark:text-[#34D399] border-[#A7F3D0] dark:border-[#065F46]';
              } else if (deckMastery >= 40) {
                masteryBadgeClass = 'bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] border-[#DBEAFE] dark:border-[#1E3A8A]';
              } else if (deckMastery > 0) {
                masteryBadgeClass = 'bg-[#FFFBEB] dark:bg-[#422006] text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[#78350F]';
              }

              return (
                <div
                  key={deck.id}
                  className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#CBD5E1] dark:hover:border-[#334155] rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#263449]">
                          {deck.sourceType === 'pdf' ? (
                            <FileText className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#3B82F6]" />
                          ) : deck.sourceType === 'docx' ? (
                            <FileCode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </span>
                        {deckSubject && (
                          <span
                            className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-md text-white uppercase truncate max-w-[110px]"
                            style={{ backgroundColor: deckSubject.colorTag || '#2563EB' }}
                          >
                            {deckSubject.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMovingDeck(deck);
                          }}
                          className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#3B82F6] p-1.5 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-[#172554] transition-colors"
                          title="Move Deck to Another Subject"
                        >
                          <FolderInput className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleClearFromRecentlyViewed(e, deck.id)}
                          className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#3B82F6] p-1.5 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-[#172554] transition-colors"
                          title="Remove from recently viewed list"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6] transition-colors line-clamp-2">
                      {deck.name}
                    </h3>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-[#475569] dark:text-[#CBD5E1] border-t border-[#E2E8F0] dark:border-[#263449] pt-2.5 font-medium">
                      <span>{deck.flashcards.length} Cards</span>
                      <span>{deck.quizQuestions.length} Items</span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-md border text-[10px] ${masteryBadgeClass}`}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{deckMastery}%</span>
                      </div>

                      {dueCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-[#422006] text-[#B45309] dark:text-[#FBBF24] font-bold text-[10px] border border-[#FDE68A] dark:border-[#78350F]">
                          {dueCount} Due
                        </span>
                      ) : (
                        <span className="text-[#64748B] dark:text-[#94A3B8] text-[10px] font-medium">
                          Reviewed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#E2E8F0] dark:border-[#263449] space-y-2">
                    <Link
                      href={`/deck/${deck.id}?mode=study`}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      Study Deck
                    </Link>

                    <div className="grid grid-cols-2 gap-1.5">
                      <Link
                        href={`/deck/${deck.id}?mode=quiz`}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-semibold transition-all"
                      >
                        <HelpCircle className="w-3 h-3 text-[#2563EB] dark:text-[#3B82F6]" />
                        Quiz
                      </Link>

                      <Link
                        href={`/deck/${deck.id}?mode=exam`}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-semibold transition-all"
                      >
                        <Timer className="w-3 h-3 text-pink-600 dark:text-pink-400" />
                        Exam
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MOVE DECK MODAL */}
      {movingDeck && (
        <MoveDeckModal
          deck={movingDeck}
          isOpen={Boolean(movingDeck)}
          onClose={() => setMovingDeck(null)}
          onSuccess={() => loadLocalData(selectedSubjectId)}
        />
      )}
    </div>
  );
}
