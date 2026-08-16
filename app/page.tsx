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
  saveDeck,
  getCurrentUser,
  getSubjects,
  getPlannerTasks,
  togglePlannerTask,
  Subject,
  Deck,
  PlannerTask,
  getTodayDateString,
} from '@/lib/app';
import MoveDeckModal from '@/components/MoveDeckModal';
import {
  GraduationCap,
  Sparkles,
  Flame,
  Award,
  Plus,
  BookOpen,
  HelpCircle,
  Timer,
  Trash2,
  EyeOff,
  FileText,
  FileCode,
  CheckCircle2,
  BookMarked,
  Lightbulb,
  Filter,
  Calendar as CalendarIcon,
  CheckSquare,
  Square,
  ArrowRight,
  Clock,
  FolderInput,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function DashboardPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [movingDeck, setMovingDeck] = useState<Deck | null>(null);

  const [decks, setDecks] = useState<Deck[]>([]);
  const [todayTasks, setTodayTasks] = useState<PlannerTask[]>([]);
  const [metrics, setMetrics] = useState({
    totalCards: 0,
    masteredCards: 0,
    masteryPercentage: 0,
    cardsDueToday: 0,
    streakDays: 0,
    weakTopics: [] as Array<{ topic: string; incorrectCount: number; accuracy?: number; totalCards?: number; deckId?: string; deckTitle?: string }>,
    primaryRecommendation: {
      type: 'empty' as 'weak_topic' | 'due_cards' | 'empty' | 'mastered',
      title: 'Ready to start learning?',
      description: 'Upload your notes, textbook photos, or PDF documents to generate smart flashcards and receive personalized AI recommendations.',
      actionLabel: 'Upload Notes & Create Deck',
      actionUrl: '/create',
      topicName: undefined as string | undefined,
      accuracy: undefined as number | undefined,
      cardsCount: undefined as number | undefined,
    },
  });
  const [mounted, setMounted] = useState(false);

  const loadData = (filterSubjectId: string = 'all') => {
    const loadedSubjects = getSubjects();
    setSubjects(loadedSubjects);

    // Fetch max 4 recently viewed decks
    const recentDecks = getRecentlyViewedDecks(filterSubjectId, 4);
    setDecks(recentDecks);
    setMetrics(getDashboardMetrics(filterSubjectId));

    const todayStr = getTodayDateString();
    const tasks = getPlannerTasks().filter((t) => t.date === todayStr);
    setTodayTasks(tasks);
  };

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    loadData(selectedSubjectId);
  }, [router, selectedSubjectId]);

  const handleSubjectFilterChange = (id: string) => {
    setSelectedSubjectId(id);
    loadData(id);
  };

  const handleToggleTodayTask = (id: string) => {
    togglePlannerTask(id);
    loadData(selectedSubjectId);
  };

  const handleClearFromRecentlyViewed = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    clearDeckFromRecentlyViewed(id);
    loadData(selectedSubjectId);
  };

  const handleDeleteDeck = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete deck "${name}"?`)) {
      deleteDeck(id);
      loadData(selectedSubjectId);
    }
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
    loadData(selectedSubjectId);
  };

  if (!mounted) return null;

  const currentUser = getCurrentUser();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  const incompleteTodayTasks = todayTasks.filter((t) => !t.isCompleted);
  const topWeakTopics = metrics.weakTopics.slice(0, 4);
  const rec = metrics.primaryRecommendation || {
    type: 'empty' as const,
    title: 'Ready to start learning?',
    description: 'Upload your notes, textbook photos, or PDF documents to generate smart flashcards and receive personalized AI recommendations.',
    actionLabel: 'Upload Notes & Create Deck',
    actionUrl: '/create',
    topicName: undefined,
    accuracy: undefined,
    cardsCount: undefined,
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. GREETING & HERO HEADER WITH SUBJECT FILTER */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] p-6 sm:p-8 shadow-xs transition-all">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Spaced Repetition (SM-2 Engine)</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              {greeting}, {currentUser?.name || 'Student'} 👋
            </h1>
            <p className="mt-1 text-[#475569] dark:text-[#CBD5E1] text-xs sm:text-sm max-w-xl leading-relaxed font-medium">
              Here is your adaptive study snapshot based on your real learning performance.
            </p>
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
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-bold text-sm shadow-xs transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Upload Notes & Create Deck</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. YOUR STUDY HEALTH (4 METRIC CARDS) */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider">
          Your Study Health
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Mastery % */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">
                Mastery
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

          {/* Metric 2: Study Streak */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">
                Study Streak
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#431407] border border-[#FFEDD5] dark:border-[#9A3412] flex items-center justify-center text-[#F97316] dark:text-[#FB923C]">
                <Flame className="w-4 h-4 fill-[#F97316]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                {metrics.streakDays}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">
                {metrics.streakDays === 1 ? 'day' : 'days'}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium truncate">
              {metrics.streakDays > 0 ? 'Keep momentum!' : 'Review cards today'}
            </p>
          </div>

          {/* Metric 3: Cards Due */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">
                Cards Due
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6]">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                {metrics.cardsDueToday}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">due today</span>
            </div>
            <p className="mt-2 text-[11px] text-[#2563EB] dark:text-[#60A5FA] font-bold truncate">
              Spaced repetition SM-2
            </p>
          </div>

          {/* Metric 4: Weak Topics */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">
                Weak Topics
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] dark:bg-[#422006] border border-[#FDE68A] dark:border-[#78350F] flex items-center justify-center text-[#D97706] dark:text-[#FBBF24]">
                <Lightbulb className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                {metrics.weakTopics.length}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">
                {metrics.weakTopics.length === 1 ? 'focus topic' : 'focus topics'}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-[#D97706] dark:text-[#FBBF24] font-bold truncate">
              {metrics.weakTopics.length > 0 ? 'Targeted review needed' : 'All clear!'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. RECOMMENDED FOR YOU (HERO ACTION SECTION) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>Recommended for You</span>
          </h2>
          <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
            Adaptive AI Recommendation
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border-2 border-[#DBEAFE] dark:border-[#1E3A8A] rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden transition-all">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA] text-xs font-extrabold tracking-wider">
                {rec.type === 'weak_topic' && <span>⚠️ Weak Topic Focus</span>}
                {rec.type === 'due_cards' && <span>🕒 Overdue Spaced Repetition</span>}
                {rec.type === 'empty' && <span>🚀 Get Started</span>}
                {rec.type === 'mastered' && <span>🎉 All Cards Mastered</span>}
              </div>

              <div className="flex items-center flex-wrap gap-3">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                  {rec.title}
                </h3>
                {rec.accuracy !== undefined && (
                  <span className="px-3 py-1 rounded-full bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#FEE2E2] dark:border-[#7F1D1D] text-[#EF4444] dark:text-[#F87171] text-xs font-extrabold">
                    {rec.accuracy}% accuracy
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] font-medium leading-relaxed">
                "{rec.description}"
              </p>
            </div>

            <Link
              href={rec.actionUrl}
              className="px-6 py-3.5 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-extrabold text-sm shadow-xs transition-all flex items-center justify-center gap-2 hover:scale-[1.02] shrink-0"
            >
              <span>{rec.actionLabel}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. SMART FOCUS TOPICS (CLICKABLE TAGS FOR TARGETED PRACTICE) */}
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

      {/* TODAY'S TASKS SUMMARY CARD */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                Today’s Planned Study Tasks
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
            <span>Open Full Calendar Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {todayTasks.length === 0 ? (
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium py-2">
            No study tasks scheduled for today.{' '}
            <Link href="/planner" className="text-[#2563EB] dark:text-[#3B82F6] underline font-bold">
              Schedule tasks on your Study Planner
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

      {/* RECENTLY VIEWED DECKS SECTION (MAX 4) */}
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
          onSuccess={() => loadData(selectedSubjectId)}
        />
      )}
    </div>
  );
}
