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
import DashboardLoading from '../loading';

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
          options: ['Nucleus', 'Mitochondria', 'Golgi Apparatus', 'Endoplasmic Reticulum'],
          correctAnswer: 'Mitochondria',
          explanation: 'Mitochondria produce the biochemical energy (ATP) required for cell functions.',
          topic: 'Cellular Energetics',
        },
        {
          id: uuidv4(),
          question: 'What is the main component of biological cell membranes?',
          options: ['Phospholipid Bilayer', 'Polysaccharide Matrix', 'Peptidoglycan Mesh', 'Dense Collagen'],
          correctAnswer: 'Phospholipid Bilayer',
          explanation: 'The cell membrane is primarily composed of an amphipathic phospholipid bilayer.',
          topic: 'Cell Membrane',
        },
      ],
    };

    saveDeck(sampleDeck);
    loadLocalData(selectedSubjectId);
  };

  const handleDeleteDeck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this study deck?')) {
      deleteDeck(id);
      loadLocalData(selectedSubjectId);
    }
  };

  const handleOpenMoveModal = (e: React.MouseEvent, deck: Deck) => {
    e.stopPropagation();
    setMovingDeck(deck);
  };

  const handleCloseMoveModal = () => {
    setMovingDeck(null);
  };

  const handleDeckMoved = () => {
    loadLocalData(selectedSubjectId);
  };

  if (!mounted) {
    return <DashboardLoading />;
  }

  const user = getCurrentUser();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* MIGRATION / ENHANCEMENT BANNER */}
      <MigrationBanner />

      {/* HEADER BAR & QUICK ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
              Welcome back, {user?.name || 'Scholar'}!
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] dark:bg-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA]">
              Level {levelInfo.currentLevel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1]">
            Turn your study notes into permanent knowledge with active recall and AI diagnostics.
          </p>

          {/* LEVEL & XP PROGRESS BAR */}
          <div className="pt-2 max-w-md">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
              <span>{levelInfo.totalXP} Total XP</span>
              <span>{levelInfo.xpToNextLevel} XP to Level {levelInfo.currentLevel + 1}</span>
            </div>
            <div className="w-full bg-[#E2E8F0] dark:bg-[#263449] h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#2563EB] to-[#3B82F6] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, levelInfo.progressPercentage))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          <Link
            href="/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs sm:text-sm font-bold shadow-md hover:scale-[1.01] transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Deck with AI</span>
          </Link>
          <Link
            href="/exam"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-white text-xs sm:text-sm font-bold shadow-xs transition-all"
          >
            <GraduationCap className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>Exam Simulator</span>
          </Link>
          <Link
            href="/review"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#DBEAFE] dark:border-[#1E3A8A] bg-[#EFF6FF] dark:bg-[#172554] hover:bg-[#DBEAFE] text-[#2563EB] dark:text-[#60A5FA] text-xs sm:text-sm font-bold shadow-xs transition-all"
          >
            <RotateCw className="w-4 h-4" />
            <span>Review Hub</span>
          </Link>
        </div>
      </div>

      {/* DASHBOARD METRICS SUMMARY CARDS (MATCHING REFERENCE AESTHETIC) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL DECKS */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Study Decks
            </span>
            <div className="w-8 h-8 rounded-full bg-[#EFF6FF] dark:bg-[#172554] flex items-center justify-center text-[#2563EB] dark:text-[#60A5FA]">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-3">
            {metrics.totalDecks}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 font-medium">
            {metrics.totalFlashcards} total flashcards
          </p>
        </div>

        {/* CARDS DUE TODAY */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Due Today
            </span>
            <div className="w-8 h-8 rounded-full bg-[#FEF2F2] dark:bg-[#450A0A] flex items-center justify-center text-[#EF4444] dark:text-[#F87171]">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-3">
            {metrics.cardsDueToday}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 font-medium">
            SM-2 spaced repetition cards
          </p>
        </div>

        {/* ACTIVE STUDY STREAK */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Study Streak
            </span>
            <div className="w-8 h-8 rounded-full bg-[#FFFBEB] dark:bg-[#451A03] flex items-center justify-center text-[#F59E0B] dark:text-[#FBBF24]">
              <Flame className="w-4 h-4 fill-[#F59E0B]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-3">
            {metrics.streakDays} {metrics.streakDays === 1 ? 'Day' : 'Days'}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 font-medium">
            Consecutive daily study
          </p>
        </div>

        {/* EXAM READINESS / AVERAGE SCORE */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Avg Exam Score
            </span>
            <div className="w-8 h-8 rounded-full bg-[#F0FDF4] dark:bg-[#064E3B] flex items-center justify-center text-[#10B981] dark:text-[#34D399]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-3">
            {examStats.averageScore > 0 ? `${examStats.averageScore}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 font-medium">
            {examStats.examsCompleted} simulated tests taken
          </p>
        </div>
      </div>

      {/* RECENT DECKS & STUDY TIME SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLUMNS: RECENT DECKS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6]" />
              <h2 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Recent Study Decks
              </h2>
            </div>
            <Link
              href="/decks"
              className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline flex items-center gap-1"
            >
              <span>View All Decks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {decks.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                  No study decks found
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto">
                  Upload lecture notes or slides to generate smart flashcards and practice quizzes.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  href="/create"
                  className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Create First Deck
                </Link>
                <button
                  type="button"
                  onClick={handleCreateSampleDeck}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] text-xs font-bold hover:bg-[#F8FAFC] transition-colors"
                >
                  Load Sample Biology Deck
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  onClick={() => router.push(`/deck/${deck.id}`)}
                  className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-5 hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
                        {deck.sourceType || 'text'}
                      </span>
                      <button
                        onClick={(e) => handleClearFromRecentlyViewed(e, deck.id)}
                        className="text-[#94A3B8] hover:text-[#EF4444] p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove from recently viewed"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-[#F8FAFC] line-clamp-1 group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6] transition-colors">
                      {deck.name}
                    </h3>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2">
                      {deck.summary?.[0] || 'Interactive study material ready for flashcards and quiz practice.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#F1F5F9] dark:border-[#1E293B] mt-4 flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                    <span>{deck.flashcards?.length || 0} cards</span>
                    <span className="text-[#2563EB] dark:text-[#60A5FA] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Study Now <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI ADAPTIVE RECOMMENDATIONS SECTION */}
          {aiRecs.length > 0 && (
            <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]/40 dark:from-[#172554]/50 dark:to-[#1E3A8A]/30 border border-[#DBEAFE] dark:border-[#1E3A8A] rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
                <h3 className="font-extrabold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                  AI Study Advisor Recommendations
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aiRecs.slice(0, 2).map((rec, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-[#DBEAFE] dark:border-[#1E3A8A] space-y-2"
                  >
                    <span className="text-[10px] font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
                      {rec.type || 'Suggestion'}
                    </span>
                    <h4 className="font-extrabold text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                      {rec.title}
                    </h4>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] line-clamp-2">
                      {rec.description}
                    </p>
                    {rec.actionUrl && (
                      <Link
                        href={rec.actionUrl}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline pt-1"
                      >
                        {rec.actionLabel || 'Start Now'} <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: STUDY TIME CHART & TODAY'S TASKS */}
        <div className="space-y-6">
          {/* STUDY TIME CHART */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                  Weekly Study Activity
                </h3>
              </div>
              <Link
                href="/insights"
                className="text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline"
              >
                Analytics
              </Link>
            </div>
            <StudyTimeChart />
          </div>

          {/* TODAY'S PLANNER TASKS */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                  Today's Planner
                </h3>
              </div>
              <Link
                href="/planner"
                className="text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline"
              >
                Open Planner
              </Link>
            </div>

            {todayTasks.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#64748B] dark:text-[#94A3B8] space-y-2">
                <p>No study tasks scheduled for today.</p>
                <Link
                  href="/planner"
                  className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline inline-block"
                >
                  + Add Study Goal
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTodayTask(t.id)}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-[#F1F5F9] dark:border-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-[#172033] transition-colors cursor-pointer"
                  >
                    {t.isCompleted ? (
                      <CheckSquare className="w-4 h-4 text-[#10B981] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-[#94A3B8] shrink-0" />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        t.isCompleted
                          ? 'line-through text-[#94A3B8]'
                          : 'text-[#0F172A] dark:text-[#F8FAFC]'
                      }`}
                    >
                      {t.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOVE DECK MODAL */}
      {movingDeck && (
        <MoveDeckModal
          deck={movingDeck}
          isOpen={Boolean(movingDeck)}
          onClose={handleCloseMoveModal}
          onSuccess={handleDeckMoved}
        />
      )}
    </div>
  );
}
