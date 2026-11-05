'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DEMO_DECKS,
  DEMO_MOCK_EXAM,
  DEMO_ANALYTICS,
  getStoredDemoDecks,
  saveStoredDemoDecks,
  resetDemoState,
} from '@/lib/demoData';
import { Deck, Flashcard } from '@/lib/app';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  HelpCircle,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Clock,
  Layers,
  Award,
  Flame,
  Check,
  X,
  RefreshCw,
  TrendingUp,
  Brain,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

function GuestDemoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'flashcards' | 'quizzes' | 'exam' | 'analytics'>('flashcards');

  // Flashcards state
  const [decks, setDecks] = useState<Deck[]>(DEMO_DECKS);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('demo-deck-osi-model');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Quiz state
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Mock Exam state
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examSubmitted, setExamSubmitted] = useState<boolean>(false);
  const [examScore, setExamScore] = useState<number>(0);
  const [examTimeRemaining, setExamTimeRemaining] = useState<number>(15 * 60);
  const [examTimerRunning, setExamTimerRunning] = useState<boolean>(false);

  // Mounted check
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Ensure demo cookie is active
    document.cookie = 'notionwell_demo_session=1; path=/; max-age=86400; SameSite=Lax';

    // Load stored demo decks
    const loadedDecks = getStoredDemoDecks();
    setDecks(loadedDecks);

    // Read URL tab parameter if present
    const urlTab = searchParams.get('tab');
    if (urlTab === 'quizzes' || urlTab === 'exam' || urlTab === 'analytics') {
      setActiveTab(urlTab);
    }
    const urlDeck = searchParams.get('deck');
    if (urlDeck && loadedDecks.some((d) => d.id === urlDeck)) {
      setSelectedDeckId(urlDeck);
    }

    const handleDemoResetEvent = () => {
      setDecks(DEMO_DECKS);
      setSelectedAnswers({});
      setQuizSubmitted(false);
      setExamAnswers({});
      setExamSubmitted(false);
      setExamTimeRemaining(15 * 60);
      setExamTimerRunning(false);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    };

    window.addEventListener('demo-reset', handleDemoResetEvent);
    return () => window.removeEventListener('demo-reset', handleDemoResetEvent);
  }, [searchParams]);

  // Exam timer effect
  useEffect(() => {
    let timer: any = null;
    if (examTimerRunning && examTimeRemaining > 0 && !examSubmitted) {
      timer = setInterval(() => {
        setExamTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [examTimerRunning, examTimeRemaining, examSubmitted]);

  // Current active deck
  const activeDeck = decks.find((d) => d.id === selectedDeckId) || decks[0] || DEMO_DECKS[0];
  const currentCard: Flashcard | undefined = activeDeck.flashcards[currentCardIndex];

  // Card interaction handlers
  const handleNextCard = () => {
    if (currentCardIndex < activeDeck.flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleMarkMastery = (level: 'mastered' | 'learning') => {
    if (!currentCard) return;
    const updatedCards = [...activeDeck.flashcards];
    updatedCards[currentCardIndex] = {
      ...currentCard,
      masteryLevel: level,
      timesReviewed: (currentCard.timesReviewed || 0) + 1,
    };

    const updatedDeck = { ...activeDeck, flashcards: updatedCards };
    const updatedDecks = decks.map((d) => (d.id === activeDeck.id ? updatedDeck : d));
    setDecks(updatedDecks);
    saveStoredDemoDecks(updatedDecks);

    // Auto advance to next card if not at end
    if (currentCardIndex < activeDeck.flashcards.length - 1) {
      setTimeout(() => {
        setCurrentCardIndex(currentCardIndex + 1);
        setIsFlipped(false);
      }, 200);
    }
  };

  // Quiz submission & scoring
  const activeQuiz = activeDeck.quizQuestions || [];
  const handleSelectQuizAnswer = (questionIndex: number, option: string) => {
    if (quizSubmitted) return;
    setSelectedAnswers({ ...selectedAnswers, [questionIndex]: option });
  };

  const calculateQuizScore = () => {
    let correct = 0;
    activeQuiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        correct++;
      }
    });
    return {
      correct,
      total: activeQuiz.length,
      percentage: activeQuiz.length > 0 ? Math.round((correct / activeQuiz.length) * 100) : 0,
    };
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
  };

  // Exam submission & scoring
  const handleAutoSubmitExam = () => {
    let earned = 0;
    DEMO_MOCK_EXAM.questions.forEach((q) => {
      const userAns = examAnswers[q.id]?.trim().toLowerCase();
      const correctAns = q.correctAnswer.trim().toLowerCase();
      if (q.questionType === 'mcq' || q.questionType === 'true_false') {
        if (userAns === correctAns) earned += q.points;
      } else {
        // Simple fuzzy concept check for demo
        if (userAns && (userAns.includes('arp') || userAns.includes('cname') || userAns === correctAns)) {
          earned += q.points;
        }
      }
    });
    setExamScore(earned);
    setExamSubmitted(true);
    setExamTimerRunning(false);
  };

  const handleSubmitExam = (e: React.FormEvent) => {
    e.preventDefault();
    handleAutoSubmitExam();
  };

  const handleResetExam = () => {
    setExamAnswers({});
    setExamSubmitted(false);
    setExamScore(0);
    setExamTimeRemaining(15 * 60);
    setExamTimerRunning(false);
  };

  // Reset entire demo state
  const handleResetDemo = () => {
    if (confirm('Reset demo data back to default Computer Networks baseline?')) {
      resetDemoState();
    }
  };

  // Deck mastery counts
  const masteredCount = activeDeck.flashcards.filter((c) => c.masteryLevel === 'mastered').length;
  const learningCount = activeDeck.flashcards.filter((c) => c.masteryLevel === 'learning').length;
  const newCount = activeDeck.flashcards.filter((c) => !c.masteryLevel || c.masteryLevel === 'new').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* TOP DEMO HERO BANNER */}
        <div className="bg-gradient-to-r from-[#2563EB] via-[#1D4ED8] to-[#3B82F6] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>INTERACTIVE GUEST DEMO — COMPUTER NETWORKS</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Experience Notionwell in Action
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 max-w-2xl">
                Explore real flashcards, take graded practice quizzes, and attempt a timed mock exam.
                No registration required. Zero simulated delays.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleResetDemo}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all shadow-xs"
                title="Reset local demo progress"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Demo</span>
              </button>
              <Link
                href="/auth?tab=signup"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#1D4ED8] text-xs font-extrabold transition-all shadow-md hover:scale-[1.01]"
              >
                <span>Save Your Progress</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* DEMO NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#263449] pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'flashcards'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Flashcards (30 Cards)</span>
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'quizzes'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Interactive Quizzes</span>
          </button>
          <button
            onClick={() => setActiveTab('exam')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'exam'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Mock Exam (15m Timed)</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Performance Report</span>
          </button>
        </div>

        {/* ================================================================== */}
        {/* TAB 1: FLASHCARDS (3 SAMPLE DECKS) */}
        {/* ================================================================== */}
        {activeTab === 'flashcards' && (
          <div className="space-y-6">
            {/* DECK SELECTOR PILLS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {decks.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDeckId(d.id);
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    d.id === selectedDeckId
                      ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#172554] dark:border-[#3B82F6] shadow-sm'
                      : 'border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#111827] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                    <span>{d.flashcards.length} Cards</span>
                    <span className="text-[10px] uppercase text-[#2563EB] dark:text-[#60A5FA]">
                      {d.flashcards.filter((c) => c.masteryLevel === 'mastered').length} Mastered
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-[#0F172A] dark:text-[#F8FAFC] mt-1 line-clamp-1">
                    {d.name}
                  </h3>
                </button>
              ))}
            </div>

            {/* INTERACTIVE 3D FLASHCARD VIEWER */}
            {currentCard && (
              <div className="max-w-2xl mx-auto space-y-4">
                {/* CARD PROGRESS HEADER */}
                <div className="flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                  <span>
                    Card {currentCardIndex + 1} of {activeDeck.flashcards.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA]">
                      {currentCard.topic}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-extrabold ${
                        currentCard.masteryLevel === 'mastered'
                          ? 'bg-[#F0FDF4] text-[#10B981]'
                          : currentCard.masteryLevel === 'learning'
                          ? 'bg-[#FFFBEB] text-[#F59E0B]'
                          : 'bg-[#F1F5F9] text-[#64748B]'
                      }`}
                    >
                      {currentCard.masteryLevel || 'new'}
                    </span>
                  </div>
                </div>

                {/* FLIPPABLE CARD CONTAINER */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="min-h-[280px] sm:min-h-[320px] bg-white dark:bg-[#111827] border-2 border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] dark:hover:border-[#3B82F6] rounded-3xl p-8 flex flex-col justify-between shadow-lg cursor-pointer transition-all duration-300 relative group"
                >
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span className="font-bold uppercase tracking-wider">
                      {isFlipped ? 'Answer Side' : 'Question Side'}
                    </span>
                    <span className="text-[11px] text-[#2563EB] dark:text-[#60A5FA] group-hover:underline flex items-center gap-1">
                      <RotateCw className="w-3 h-3" /> Click to flip
                    </span>
                  </div>

                  <div className="py-6 text-center">
                    {isFlipped ? (
                      <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                        <p className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                          {currentCard.answer}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-lg sm:text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                          {currentCard.question}
                        </h2>
                      </div>
                    )}
                  </div>

                  <div className="text-center text-xs text-[#94A3B8] font-medium">
                    {isFlipped
                      ? 'Did you recall this correctly?'
                      : 'Test your active recall before flipping'}
                  </div>
                </div>

                {/* CARD ACTION BUTTONS */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handlePrevCard}
                    disabled={currentCardIndex === 0}
                    className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] disabled:opacity-40 text-xs font-bold text-[#475569] dark:text-[#CBD5E1]"
                  >
                    <ArrowLeft className="w-4 h-4" /> Previous
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMarkMastery('learning')}
                      className="px-4 py-2 rounded-xl bg-[#FFFBEB] dark:bg-[#451A03] border border-[#FDE68A] dark:border-[#78350F] text-[#D97706] dark:text-[#FBBF24] text-xs font-bold hover:scale-[1.02] transition-transform"
                    >
                      Needs Revision
                    </button>
                    <button
                      onClick={() => handleMarkMastery('mastered')}
                      className="px-4 py-2 rounded-xl bg-[#F0FDF4] dark:bg-[#064E3B] border border-[#BBF7D0] dark:border-[#065F46] text-[#16A34A] dark:text-[#34D399] text-xs font-bold hover:scale-[1.02] transition-transform"
                    >
                      I Know This
                    </button>
                  </div>

                  <button
                    onClick={handleNextCard}
                    disabled={currentCardIndex === activeDeck.flashcards.length - 1}
                    className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] disabled:opacity-40 text-xs font-bold text-[#475569] dark:text-[#CBD5E1]"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* SUMMARY STATS BAR */}
                <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 flex items-center justify-around text-xs font-bold shadow-xs">
                  <div className="flex items-center gap-2 text-[#10B981]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{masteredCount} Mastered</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#F59E0B]">
                    <RotateCw className="w-4 h-4" />
                    <span>{learningCount} Learning</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#64748B]">
                    <Layers className="w-4 h-4" />
                    <span>{newCount} New Cards</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: INTERACTIVE PRACTICE QUIZZES */}
        {/* ================================================================== */}
        {activeTab === 'quizzes' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* QUIZ HEADER */}
            <div className="flex items-center justify-between bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 shadow-xs">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-[#F8FAFC]">
                  {activeDeck.name} — Practice Quiz
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  5 multi-choice questions with instant automated rationale.
                </p>
              </div>

              {quizSubmitted ? (
                <button
                  onClick={handleResetQuiz}
                  className="px-3.5 py-1.5 rounded-xl border border-[#2563EB] text-[#2563EB] text-xs font-bold hover:bg-[#EFF6FF] transition-colors"
                >
                  Retake Quiz
                </button>
              ) : (
                <button
                  onClick={() => setQuizSubmitted(true)}
                  disabled={Object.keys(selectedAnswers).length === 0}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors shadow-xs"
                >
                  Submit Quiz
                </button>
              )}
            </div>

            {/* QUIZ SCORE BANNER (IF SUBMITTED) */}
            {quizSubmitted && (
              <div className="bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
                    Quiz Results
                  </span>
                  <h4 className="text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                    Score: {calculateQuizScore().correct} / {calculateQuizScore().total} (
                    {calculateQuizScore().percentage}%)
                  </h4>
                </div>
                <div className="text-3xl font-black text-[#2563EB] dark:text-[#60A5FA]">
                  {calculateQuizScore().percentage >= 80 ? '🌟 Distinction' : '✅ Completed'}
                </div>
              </div>
            )}

            {/* QUESTIONS LIST */}
            <div className="space-y-4">
              {activeQuiz.map((q, idx) => {
                const userChoice = selectedAnswers[idx];
                const isCorrect = userChoice === q.correctAnswer;

                return (
                  <div
                    key={q.id}
                    className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-6 space-y-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#F1F5F9] dark:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1]">
                        Question {idx + 1}
                      </span>
                      <span className="text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA]">
                        {q.topic}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-[#F8FAFC]">
                      {q.question}
                    </h4>

                    {/* OPTIONS */}
                    <div className="space-y-2">
                      {q.options.map((option) => {
                        const isSelected = userChoice === option;
                        let optionStyle =
                          'border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB]';

                        if (quizSubmitted) {
                          if (option === q.correctAnswer) {
                            optionStyle =
                              'border-[#10B981] bg-[#F0FDF4] dark:bg-[#064E3B]/40 text-[#15803D] font-bold';
                          } else if (isSelected && !isCorrect) {
                            optionStyle =
                              'border-[#EF4444] bg-[#FEF2F2] dark:bg-[#450A0A]/40 text-[#B91C1C]';
                          }
                        } else if (isSelected) {
                          optionStyle =
                            'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] font-bold';
                        }

                        return (
                          <div
                            key={option}
                            onClick={() => handleSelectQuizAnswer(idx, option)}
                            className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-all ${optionStyle}`}
                          >
                            <span>{option}</span>
                            {quizSubmitted && option === q.correctAnswer && (
                              <Check className="w-4 h-4 text-[#10B981]" />
                            )}
                            {quizSubmitted && isSelected && !isCorrect && (
                              <X className="w-4 h-4 text-[#EF4444]" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* EXPLANATION */}
                    {quizSubmitted && (
                      <div className="bg-[#F8FAFC] dark:bg-[#172033] rounded-xl p-3 text-xs text-[#475569] dark:text-[#CBD5E1] border-l-4 border-[#2563EB]">
                        <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">Rationale: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: TIMED MOCK EXAM */}
        {/* ================================================================== */}
        {activeTab === 'exam' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* EXAM CONTROL HEADER */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
                    {DEMO_MOCK_EXAM.subjectName}
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                    {DEMO_MOCK_EXAM.title}
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    10 Questions • Mixed MCQ, True/False & Short Answer • Passing Threshold: 70%
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#FCA5A5] text-[#DC2626] dark:text-[#F87171] text-xs font-extrabold">
                    <Clock className="w-4 h-4" />
                    <span>
                      {Math.floor(examTimeRemaining / 60)}:
                      {(examTimeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {!examSubmitted && (
                    <button
                      onClick={() => setExamTimerRunning(!examTimerRunning)}
                      className="px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] text-xs font-bold"
                    >
                      {examTimerRunning ? 'Pause' : 'Start Timer'}
                    </button>
                  )}
                </div>
              </div>

              {/* EXAM RESULT BANNER */}
              {examSubmitted && (
                <div className="bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] dark:from-[#172554] dark:to-[#1E3A8A] rounded-2xl p-5 border border-[#BFDBFE] dark:border-[#1E3A8A] flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase">
                      Official Exam Score
                    </span>
                    <h4 className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                      {examScore} / {DEMO_MOCK_EXAM.totalPoints} Points (
                      {Math.round((examScore / DEMO_MOCK_EXAM.totalPoints) * 100)}%)
                    </h4>
                    <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                      {examScore >= 7 ? '✅ Congratulations, you Passed!' : '⚠️ Needs remediation on weak topics.'}
                    </p>
                  </div>
                  <button
                    onClick={handleResetExam}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-xs hover:bg-[#1D4ED8]"
                  >
                    Retake Exam
                  </button>
                </div>
              )}
            </div>

            {/* EXAM QUESTIONS */}
            <form onSubmit={handleSubmitExam} className="space-y-4">
              {DEMO_MOCK_EXAM.questions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-6 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#64748B]">Question {q.questionIndex}</span>
                    <span className="text-[#2563EB]">{q.topic} (1 Pt)</span>
                  </div>

                  <p className="font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-[#F8FAFC]">
                    {q.question}
                  </p>

                  {/* MULTIPLE CHOICE / TRUE-FALSE */}
                  {q.options && (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] dark:border-[#263449] hover:bg-[#F8FAFC] dark:hover:bg-[#172033] cursor-pointer text-xs sm:text-sm"
                        >
                          <input
                            type="radio"
                            name={`exam-${q.id}`}
                            value={opt}
                            disabled={examSubmitted}
                            checked={examAnswers[q.id] === opt}
                            onChange={() => setExamAnswers({ ...examAnswers, [q.id]: opt })}
                            className="text-[#2563EB]"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* SHORT ANSWER */}
                  {!q.options && (
                    <div>
                      <input
                        type="text"
                        disabled={examSubmitted}
                        placeholder="Type your answer here..."
                        value={examAnswers[q.id] || ''}
                        onChange={(e) =>
                          setExamAnswers({ ...examAnswers, [q.id]: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#111827] text-xs sm:text-sm"
                      />
                    </div>
                  )}

                  {/* POST-SUBMISSION EXPLANATION */}
                  {examSubmitted && (
                    <div className="bg-[#F8FAFC] dark:bg-[#172033] rounded-xl p-3 text-xs border-l-4 border-[#2563EB] space-y-1">
                      <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        Correct Answer: <span className="text-[#10B981]">{q.correctAnswer}</span>
                      </div>
                      <p className="text-[#475569] dark:text-[#CBD5E1]">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}

              {!examSubmitted && (
                <div className="text-center pt-4">
                  <button
                    type="submit"
                    className="px-8 py-3 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-extrabold shadow-lg hover:scale-[1.01] transition-all"
                  >
                    Submit Exam For Evaluation
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: SAMPLE PERFORMANCE REPORT */}
        {/* ================================================================== */}
        {activeTab === 'analytics' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* OVERVIEW STATS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-bold text-[#64748B] uppercase">Study Hours</span>
                <div className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] mt-2">
                  {DEMO_ANALYTICS.overview.totalStudyHoursFormatted}
                </div>
                <span className="text-[11px] text-[#10B981] font-bold">↑ 12% vs last week</span>
              </div>

              <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-bold text-[#64748B] uppercase">Total XP</span>
                <div className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] mt-2">
                  {DEMO_ANALYTICS.overview.totalXP}
                </div>
                <span className="text-[11px] text-[#2563EB] font-bold">
                  Level {DEMO_ANALYTICS.overview.currentLevel}
                </span>
              </div>

              <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-bold text-[#64748B] uppercase">Quiz Accuracy</span>
                <div className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] mt-2">
                  {DEMO_ANALYTICS.overview.overallAccuracy}%
                </div>
                <span className="text-[11px] text-[#10B981] font-bold">High Proficiency</span>
              </div>

              <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-bold text-[#64748B] uppercase">Active Streak</span>
                <div className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] mt-2">
                  {DEMO_ANALYTICS.overview.currentStreakDays} Days
                </div>
                <span className="text-[11px] text-[#F59E0B] font-bold">🔥 On Fire</span>
              </div>
            </div>

            {/* DECK MASTERY BARS */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-[#F8FAFC]">
                Deck Mastery Breakdown
              </h3>
              <div className="space-y-4">
                {DEMO_ANALYTICS.deckMastery.map((dm) => (
                  <div key={dm.deckId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-[#475569] dark:text-[#CBD5E1]">
                      <span>{dm.deckName}</span>
                      <span>{dm.masteryPercent}% Mastery</span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] dark:bg-[#263449] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#2563EB] to-[#10B981] h-full rounded-full"
                        style={{ width: `${dm.masteryPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WEAK TOPICS REMEDIATION */}
            <div className="bg-[#FEF2F2] dark:bg-[#450A0A]/40 border border-[#FCA5A5] dark:border-[#7F1D1D] rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-[#DC2626] font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Detected Weak Topics Requiring Revision</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEMO_ANALYTICS.weakTopics.map((wt) => (
                  <span
                    key={wt}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#111827] text-xs font-bold text-[#B91C1C] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#991B1B]"
                  >
                    ⚠️ {wt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GuestDemoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center text-xs sm:text-sm font-bold text-[#64748B] dark:text-[#94A3B8] space-y-4">
          <div className="flex items-center gap-2">
            <RotateCw className="w-5 h-5 animate-spin text-[#2563EB]" />
            <span>Loading Computer Networks Guest Demo...</span>
          </div>
          {/* Prerendered SEO Curriculum Metadata */}
          <div className="sr-only">
            <h2>Computer Networks Preloaded Curriculum</h2>
            <p>Network Fundamentals &amp; OSI Model</p>
            <p>TCP/IP Protocol Suite &amp; Transport Layer</p>
            <p>Routing, DNS &amp; Application Layer Protocols</p>
          </div>
        </div>
      }
    >
      <GuestDemoContent />
    </Suspense>
  );
}
