'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Play,
  ArrowRight,
  BookOpen,
  Folder,
  Layers,
  Settings2,
  FileText,
  Check,
  RotateCcw,
  History,
  BarChart3,
  Target,
  ShieldAlert,
  ListFilter,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  Flame,
  Search,
} from 'lucide-react';
import { getCurrentUser, getSubjects, getDecks, Subject, Deck, User } from '@/lib/app';
import { ExamConfig, ExamAttempt, ExamMode, ExamDifficulty, QuestionType, ExamDashboardStats } from '@/lib/exam';
import ExamLoading from './loading';

export default function ExamHubPage() {
  const router = useRouter();

  // Authentication & Session
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  // Active Tab: 'configure' | 'history' | 'blueprints'
  const [activeTab, setActiveTab] = useState<'configure' | 'history' | 'blueprints'>('configure');

  // Available Materials
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [storedDocs, setStoredDocs] = useState<Array<{ id: string; fileName: string; chunkCount: number }>>([]);

  // Stats & History
  const [examStats, setExamStats] = useState<ExamDashboardStats>({
    examsCompleted: 0,
    averageScore: 0,
    highestScore: 0,
    totalTimeSpentSeconds: 0,
    recentAttempts: [],
    weakTopics: [],
    strongTopics: [],
  });
  const [allAttempts, setAllAttempts] = useState<ExamAttempt[]>([]);
  const [savedExams, setSavedExams] = useState<ExamConfig[]>([]);

  // Configuration Form State
  const [examTitle, setExamTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [examMode, setExamMode] = useState<ExamMode>('timed');
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('mixed');
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(15);
  const [negativeMarking, setNegativeMarking] = useState<boolean>(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState<number>(0.25);
  const [randomizeOrder, setRandomizeOrder] = useState<boolean>(true);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>(['mcq', 'true_false']);

  // Generation Loading State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Filter for history
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    setUser(currentUser);

    // Load user materials
    const loadedSubjects = getSubjects();
    const loadedDecks = getDecks();
    setSubjects(loadedSubjects);
    setDecks(loadedDecks);

    // Fetch documents and exam history in parallel
    const userId = currentUser?.id || 'default-user';
    Promise.allSettled([
      fetch(`/api/assistant/index-document?userId=${userId}`).then((r) => r.json()),
      fetch(`/api/exam/history?userId=${userId}`).then((r) => r.json()),
    ]).then(([docRes, examRes]) => {
      if (docRes.status === 'fulfilled' && docRes.value?.success && Array.isArray(docRes.value.documents)) {
        setStoredDocs(docRes.value.documents.map((doc: any) => ({ id: doc.id, fileName: doc.fileName, chunkCount: doc.chunkCount })));
      }
      if (examRes.status === 'fulfilled' && examRes.value?.success) {
        if (examRes.value.stats) setExamStats(examRes.value.stats);
        if (Array.isArray(examRes.value.attempts)) setAllAttempts(examRes.value.attempts);
        if (Array.isArray(examRes.value.exams)) setSavedExams(examRes.value.exams);
      }
    }).catch(() => {});
  }, []);

  // Toggle document selection
  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  // Toggle question type
  const toggleQuestionType = (qType: QuestionType) => {
    if (selectedQuestionTypes.includes(qType)) {
      if (selectedQuestionTypes.length > 1) {
        setSelectedQuestionTypes((prev) => prev.filter((t) => t !== qType));
      }
    } else {
      setSelectedQuestionTypes((prev) => [...prev, qType]);
    }
  };

  // Generate Exam
  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
      const selectedDeck = decks.find((d) => d.id === selectedDeckId);

      const payload = {
        userId: user?.id || 'default-user',
        title: examTitle.trim() || (selectedDeck ? `${selectedDeck.name} Exam` : 'AI Simulated Exam'),
        subjectId: selectedSubjectId !== 'all' ? selectedSubjectId : undefined,
        subjectName: selectedSubject?.name,
        deckId: selectedDeckId !== 'all' ? selectedDeckId : undefined,
        deckName: selectedDeck?.name,
        mode: examMode,
        difficulty,
        timeLimitMinutes: examMode === 'practice' && timeLimitMinutes === 0 ? 0 : timeLimitMinutes,
        totalQuestions,
        negativeMarking,
        negativeMarkValue,
        questionTypes: selectedQuestionTypes,
        selectedSourceIds: selectedDocIds,
        randomizeOrder,
      };

      const res = await fetch('/api/exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate examination.');
      }

      // Route immediately to exam taking interface
      router.push(`/exam/${data.exam.id}`);
    } catch (err: any) {
      setGenerationError(err?.message || 'Error generating exam.');
      setIsGenerating(false);
    }
  };

  const filteredAttempts = allAttempts.filter((a) =>
    a.examTitle.toLowerCase().includes(historySearch.toLowerCase()) ||
    (a.subjectName && a.subjectName.toLowerCase().includes(historySearch.toLowerCase()))
  );

  if (!mounted) return <ExamLoading />;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* -----------------------------------------------------------------------
          HERO BANNER & WORKSPACE HEADER
      ------------------------------------------------------------------------ */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B1220] border border-[#334155] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Phase 5 • AI Exam Simulation System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Test & Master Your Knowledge
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Generate realistic timed mock exams and practice assessments grounded strictly in your lecture notes and uploaded study materials.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('configure')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:opacity-95 text-white font-bold text-xs sm:text-sm transition-all shadow-md hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>New Exam</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm transition-all border border-white/10"
            >
              <History className="w-4 h-4" />
              <span>History ({allAttempts.length})</span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------------
            METRICS STRIP
        ---------------------------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-700/60 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Exams Completed</p>
            <p className="text-xl font-extrabold text-white mt-0.5">{examStats.examsCompleted}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Average Score</p>
            <p className="text-xl font-extrabold text-blue-400 mt-0.5">
              {examStats.averageScore > 0 ? `${examStats.averageScore}%` : '—'}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Highest Score</p>
            <p className="text-xl font-extrabold text-emerald-400 mt-0.5">
              {examStats.highestScore > 0 ? `${examStats.highestScore}%` : '—'}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Active Weak Topics</p>
            <p className="text-xl font-extrabold text-amber-400 mt-0.5">
              {examStats.weakTopics.length > 0 ? examStats.weakTopics.length : 0}
            </p>
          </div>
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          MAIN NAVIGATION TABS
      ------------------------------------------------------------------------ */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('configure')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-extrabold transition-all ${
              activeTab === 'configure'
                ? 'border-[#2563EB] text-[#2563EB] dark:text-[#60A5FA]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Configure New Exam</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-extrabold transition-all ${
              activeTab === 'history'
                ? 'border-[#2563EB] text-[#2563EB] dark:text-[#60A5FA]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Exam History ({allAttempts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('blueprints')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-extrabold transition-all ${
              activeTab === 'blueprints'
                ? 'border-[#2563EB] text-[#2563EB] dark:text-[#60A5FA]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Saved Blueprints ({savedExams.length})</span>
          </button>
        </div>
      </div>

      {/* =======================================================================
          TAB 1: CONFIGURE NEW EXAM WIZARD
      ======================================================================== */}
      {activeTab === 'configure' && (
        <form onSubmit={handleGenerateExam} className="space-y-8">
          {/* Generation Error Banner */}
          {generationError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Exam Generation Error</p>
                <p className="mt-0.5">{generationError}</p>
              </div>
            </div>
          )}

          {/* SECTION A: STUDY MATERIAL SELECTION */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                    1. Study Material Source
                  </h3>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Select the lecture notes, decks, or uploaded PDFs to generate questions from.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Subject Folder Selection */}
              <div>
                <label className="block text-xs font-bold text-[#475569] dark:text-[#CBD5E1] mb-1.5">
                  Subject Folder (Optional)
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-xs text-[#0F172A] dark:text-white font-medium outline-hidden"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Study Deck Selection */}
              <div>
                <label className="block text-xs font-bold text-[#475569] dark:text-[#CBD5E1] mb-1.5">
                  Study Deck
                </label>
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-xs text-[#0F172A] dark:text-white font-medium outline-hidden"
                >
                  <option value="all">All Available Decks & Materials</option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.flashcards.length} cards)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Uploaded Documents Checkbox List */}
            {storedDocs.length > 0 && (
              <div className="pt-2 space-y-2">
                <label className="block text-xs font-bold text-[#475569] dark:text-[#CBD5E1]">
                  Target Specific Uploaded Documents ({selectedDocIds.length} selected):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {storedDocs.map((doc) => {
                    const isChecked = selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocSelection(doc.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                          isChecked
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                            : 'border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FileText className="w-3.5 h-3.5 shrink-0 text-[#2563EB]" />
                          <span className="truncate font-semibold">{doc.fileName}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div onClick
                          className="w-3.5 h-3.5 rounded text-[#2563EB] cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION B: EXAM MODE & SETTINGS */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] space-y-6 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                  2. Examination Parameters
                </h3>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Customize question counts, duration, scoring rules, and difficulty.
                </p>
              </div>
            </div>

            {/* Exam Title */}
            <div>
              <label className="block text-xs font-bold text-[#475569] dark:text-[#CBD5E1] mb-1">
                Examination Title
              </label>
              <input
                type="text"
                placeholder="e.g., Biology Midterm Mock Exam"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-xs text-[#0F172A] dark:text-white font-medium outline-hidden"
              />
            </div>

            {/* Exam Mode Cards */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#475569] dark:text-[#CBD5E1]">
                Exam Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    id: 'timed',
                    title: 'Timed Exam',
                    desc: 'Countdown timer with auto-submission and strict conditions.',
                    icon: Clock,
                  },
                  {
                    id: 'practice',
                    title: 'Practice Mode',
                    desc: 'Relaxed pacing with instant feedback and explanations.',
                    icon: LightbulbIcon,
                  },
                  {
                    id: 'topic',
                    title: 'Topic Assessment',
                    desc: 'Focused evaluation zeroing in on key concepts and weak areas.',
                    icon: Target,
                  },
                  {
                    id: 'mock',
                    title: 'Full Mock Exam',
                    desc: 'Balanced coverage simulating a real certification or university final.',
                    icon: GraduationCap,
                  },
                ].map((modeItem) => {
                  const Icon = modeItem.icon;
                  const isSelected = examMode === modeItem.id;
                  return (
                    <div
                      key={modeItem.id}
                      onClick={() => setExamMode(modeItem.id as ExamMode)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                          : 'border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#2563EB]' : 'text-slate-500'}`} />
                        <span className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                          {modeItem.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] leading-normal">
                        {modeItem.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sliders & Granular Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Question Count */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#475569] dark:text-[#CBD5E1] mb-1.5">
                  <span>Questions</span>
                  <span className="text-[#2563EB] dark:text-[#60A5FA] font-extrabold">{totalQuestions} Questions</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTotalQuestions(num)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        totalQuestions === num
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Limit */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#475569] dark:text-[#CBD5E1] mb-1.5">
                  <span>Duration</span>
                  <span className="text-[#2563EB] dark:text-[#60A5FA] font-extrabold">
                    {examMode === 'practice' && timeLimitMinutes === 0 ? 'Untimed' : `${timeLimitMinutes} Mins`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 15, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setTimeLimitMinutes(mins)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        timeLimitMinutes === mins
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#475569] dark:text-[#CBD5E1] mb-1.5">
                  <span>Difficulty</span>
                  <span className="capitalize text-[#2563EB] dark:text-[#60A5FA] font-extrabold">{difficulty}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {['easy', 'medium', 'hard', 'mixed'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff as ExamDifficulty)}
                      className={`py-1.5 text-xs font-bold rounded-lg border capitalize transition-all ${
                        difficulty === diff
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Question Types & Negative Marking */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0] dark:border-[#263449]">
              {/* Question Types */}
              <div>
                <label className="block text-xs font-bold text-[#475569] dark:text-[#CBD5E1] mb-2">
                  Allowed Question Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'mcq', label: 'Multiple Choice (MCQ)' },
                    { id: 'true_false', label: 'True / False' },
                    { id: 'short_answer', label: 'Short Answer' },
                  ].map((item) => {
                    const isChecked = selectedQuestionTypes.includes(item.id as QuestionType);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleQuestionType(item.id as QuestionType)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-[#2563EB] dark:text-[#60A5FA]'
                            : 'border-[#E2E8F0] dark:border-[#263449] text-slate-500 bg-[#F8FAFC] dark:bg-[#172033]'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 ${isChecked ? 'opacity-100' : 'opacity-0'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Negative Marking & Randomization */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-[#475569] dark:text-[#CBD5E1]">
                  <input
                    type="checkbox"
                    checked={negativeMarking}
                    onChange={(e) => setNegativeMarking(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] focus:ring-0 cursor-pointer"
                  />
                  <span>Enable Negative Marking (-0.25 marks per wrong answer)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-[#475569] dark:text-[#CBD5E1]">
                  <input
                    type="checkbox"
                    checked={randomizeOrder}
                    onChange={(e) => setRandomizeOrder(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] focus:ring-0 cursor-pointer"
                  />
                  <span>Randomize Question Order</span>
                </label>
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isGenerating}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:opacity-95 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base transition-all shadow-lg hover:scale-102 flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>Synthesizing Exam with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Examination</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* =======================================================================
          TAB 2: EXAM HISTORY & ATTEMPTS LIST
      ======================================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search past exam attempts..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] text-xs text-[#0F172A] dark:text-white outline-hidden"
              />
            </div>
          </div>

          {filteredAttempts.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] space-y-3">
              <History className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                No completed exams found
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-xs mx-auto">
                Configure your first mock exam above to test yourself and unlock detailed performance analytics.
              </p>
              <button
                onClick={() => setActiveTab('configure')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Configure Exam</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] space-y-3 shadow-xs hover:border-[#2563EB] transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-[#2563EB] dark:text-[#60A5FA] uppercase">
                          {attempt.mode}
                        </span>
                        <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          {new Date(attempt.startedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-[#0F172A] dark:text-[#F8FAFC] mt-1 group-hover:text-[#2563EB] transition-colors">
                        {attempt.examTitle}
                      </h4>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-extrabold text-[#2563EB] dark:text-[#60A5FA]">
                        {attempt.score} / {attempt.maxPossibleScore}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500">{attempt.percentage}% Score</p>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8] pt-2 border-t border-[#F1F5F9] dark:border-[#1E293B]">
                    <span>⏱ {Math.round(attempt.timeSpentSeconds / 60)} mins</span>
                    <span className="text-emerald-600 font-semibold">{attempt.correctCount} Correct</span>
                    <span className="text-rose-600 font-semibold">{attempt.incorrectCount} Incorrect</span>
                    <Link
                      href={`/exam/${attempt.examId}/results?attemptId=${attempt.id}`}
                      className="flex items-center gap-1 font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          TAB 3: SAVED EXAM BLUEPRINTS
      ======================================================================== */}
      {activeTab === 'blueprints' && (
        <div className="space-y-4">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Previously generated examination blueprints that can be retaken at any time.
          </p>

          {savedExams.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] space-y-2">
              <Layers className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                No exam blueprints saved yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedExams.map((ex) => (
                <div
                  key={ex.id}
                  className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                    <span>{ex.mode}</span>
                    <span>{ex.totalQuestions} Questions</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                    {ex.title}
                  </h4>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    {ex.timeLimitMinutes > 0 ? `${ex.timeLimitMinutes} min countdown` : 'Untimed practice'} • {ex.difficulty}
                  </p>
                  <div className="pt-2">
                    <Link
                      href={`/exam/${ex.id}`}
                      className="w-full py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-[#2563EB] text-[#2563EB] dark:text-[#60A5FA] hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Take Exam</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LightbulbIcon(props: any) {
  return <HelpCircle {...props} />;
}
