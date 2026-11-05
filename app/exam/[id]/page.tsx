'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Send,
  Flag,
  HelpCircle,
  Sparkles,
  FileText,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  X,
  GraduationCap,
} from 'lucide-react';
import { getCurrentUser, User } from '@/lib/app';
import { SanitizedExamQuestion, ExamMode } from '@/lib/exam';

interface ActiveExamData {
  id: string;
  title: string;
  mode: ExamMode;
  timeLimitMinutes: number;
  totalQuestions: number;
  negativeMarking: boolean;
  negativeMarkValue: number;
  questions: SanitizedExamQuestion[];
}

export default function ExamTakingPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.id as string;

  // Session & User
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  // Exam Data
  const [exam, setExam] = useState<ActiveExamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active Question & Navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});
  const [visitedSet, setVisitedSet] = useState<Set<number>>(new Set([0]));

  // Timing & Session Restoration
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins default
  const [examStartTimestamp, setExamStartTimestamp] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // 1. LOAD EXAM AND RESTORE PERSISTED SESSION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    setUser(currentUser);

    if (!examId) return;

    // Fetch sanitized exam questions from API (mode=taking strips correct answers for integrity)
    fetch(`/api/exam/${examId}?mode=taking`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.exam) {
          throw new Error(data.error || 'Failed to load examination.');
        }

        const loadedExam: ActiveExamData = data.exam;
        setExam(loadedExam);

        // Check if an existing session exists in localStorage for this exam
        const sessionKey = `notionwell_exam_session_${examId}`;
        const savedSession = localStorage.getItem(sessionKey);

        const now = Date.now();
        let startTime = new Date(now).toISOString();
        let totalAllowedSecs = (loadedExam.timeLimitMinutes || 15) * 60;
        let remaining = totalAllowedSecs;

        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed.userAnswers) setUserAnswers(parsed.userAnswers);
            if (parsed.reviewFlags) setReviewFlags(parsed.reviewFlags);
            if (parsed.visited) setVisitedSet(new Set(parsed.visited));

            if (parsed.startTime) {
              startTime = parsed.startTime;
              const elapsedSecs = Math.floor((now - new Date(startTime).getTime()) / 1000);
              if (loadedExam.timeLimitMinutes > 0) {
                remaining = Math.max(0, totalAllowedSecs - elapsedSecs);
              }
            }
          } catch (e) {}
        } else {
          // Initialize fresh session in localStorage
          localStorage.setItem(
            sessionKey,
            JSON.stringify({
              startTime,
              userAnswers: {},
              reviewFlags: {},
              visited: [0],
            })
          );
        }

        setExamStartTimestamp(startTime);
        setSecondsRemaining(remaining);
        setIsLoading(false);
      })
      .catch((err) => {
        setLoadError(err?.message || 'Error loading exam.');
        setIsLoading(false);
      });
  }, [examId]);

  // ---------------------------------------------------------------------------
  // 2. COUNTDOWN TIMER AND AUTO-SUBMIT TRIGGER
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!exam || isLoading || isSubmitting) return;

    // Untimed practice mode
    if (exam.timeLimitMinutes === 0) return;

    // Clear existing timer if any
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAutoSubmitOnExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [exam, isLoading, isSubmitting]);

  // Save progress to localStorage whenever answers or flags change
  useEffect(() => {
    if (!examId || !exam) return;
    const sessionKey = `notionwell_exam_session_${examId}`;
    try {
      localStorage.setItem(
        sessionKey,
        JSON.stringify({
          startTime: examStartTimestamp,
          userAnswers,
          reviewFlags,
          visited: Array.from(visitedSet),
        })
      );
    } catch {}
  }, [examId, exam, examStartTimestamp, userAnswers, reviewFlags, visitedSet]);

  // Mark current question as visited
  useEffect(() => {
    setVisitedSet((prev) => {
      const next = new Set(prev);
      next.add(currentIndex);
      return next;
    });
  }, [currentIndex]);

  // ---------------------------------------------------------------------------
  // 3. ACTIONS: ANSWERING & NAVIGATION
  // ---------------------------------------------------------------------------
  const handleSelectAnswer = (ans: string) => {
    if (!exam || !exam.questions[currentIndex]) return;
    const qId = exam.questions[currentIndex].id;
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: ans,
    }));
  };

  const handleClearResponse = () => {
    if (!exam || !exam.questions[currentIndex]) return;
    const qId = exam.questions[currentIndex].id;
    setUserAnswers((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  };

  const handleToggleReviewFlag = () => {
    if (!exam || !exam.questions[currentIndex]) return;
    const qId = exam.questions[currentIndex].id;
    setReviewFlags((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleNext = () => {
    if (!exam) return;
    if (currentIndex < exam.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. SUBMISSION HANDLERS
  // ---------------------------------------------------------------------------
  const handleAutoSubmitOnExpiry = () => {
    alert('⏱ Exam time has expired! Your responses are being submitted for evaluation.');
    executeExamSubmission();
  };

  const executeExamSubmission = async () => {
    if (!exam || isSubmitting) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const totalAllowedSecs = (exam.timeLimitMinutes || 15) * 60;
      const timeSpentSeconds = Math.max(1, totalAllowedSecs - secondsRemaining);

      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: exam.id,
          userId: user?.id || 'default-user',
          startedAt: examStartTimestamp,
          userAnswers,
          reviewStatus: reviewFlags,
          timeSpentSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit exam.');
      }

      // Clear local session storage
      localStorage.removeItem(`notionwell_exam_session_${exam.id}`);

      // Route to detailed results page with attempt ID
      router.push(`/exam/${exam.id}/results?attemptId=${data.attempt.id}`);
    } catch (err: any) {
      alert(`Submission error: ${err?.message || 'Error communicating with server.'}`);
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. QUESTION STATUS PALETTE COLOR EVALUATOR
  // ---------------------------------------------------------------------------
  const getQuestionStatus = (idx: number) => {
    if (!exam) return 'not_visited';
    const q = exam.questions[idx];
    const hasAnswer = !!(userAnswers[q.id] && userAnswers[q.id].trim() !== '');
    const isMarked = !!reviewFlags[q.id];
    const isVisited = visitedSet.has(idx);

    if (isMarked && hasAnswer) return 'answered_and_marked';
    if (isMarked) return 'marked_for_review';
    if (hasAnswer) return 'answered';
    if (isVisited) return 'not_answered';
    return 'not_visited';
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Counts for modal summary
  const answeredCount = exam
    ? exam.questions.filter((q) => userAnswers[q.id] && userAnswers[q.id].trim() !== '').length
    : 0;
  const markedCount = exam ? exam.questions.filter((q) => reviewFlags[q.id]).length : 0;
  const unansweredCount = exam ? exam.questions.length - answeredCount : 0;

  if (!mounted || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Sparkles className="w-8 h-8 animate-spin text-[#2563EB]" />
        <p className="text-sm font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
          Preparing Examination Environment...
        </p>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Restoring state, validating time parameters, and establishing session integrity.
        </p>
      </div>
    );
  }

  if (loadError || !exam) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-rose-200 dark:border-rose-900 text-center space-y-4 shadow-xl">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
          Unable to Load Exam
        </h3>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{loadError || 'Exam not found.'}</p>
        <Link
          href="/exam"
          className="inline-block px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8]"
        >
          Return to Exam Hub
        </Link>
      </div>
    );
  }

  const currentQ = exam.questions[currentIndex];
  const currentAnswer = currentQ ? userAnswers[currentQ.id] || '' : '';
  const isCurrentMarked = currentQ ? !!reviewFlags[currentQ.id] : false;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* -----------------------------------------------------------------------
          EXAM CONTROL TOP BAR
      ------------------------------------------------------------------------ */}
      <header className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-4 z-30">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 dark:bg-blue-900/50 text-[#2563EB] dark:text-[#60A5FA]">
              {exam.mode} mode
            </span>
            {exam.negativeMarking && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                Negative Marking (-{exam.negativeMarkValue})
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC] truncate max-w-md mt-0.5">
            {exam.title}
          </h2>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Real-time Countdown Timer */}
          {exam.timeLimitMinutes > 0 && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-extrabold text-sm sm:text-base ${
                secondsRemaining < 120
                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 animate-pulse'
                  : 'border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#0F172A] dark:text-white'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          )}

          {/* Submit Exam Button */}
          <button
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-extrabold transition-all shadow-md hover:scale-102"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </button>
        </div>
      </header>

      {/* -----------------------------------------------------------------------
          MAIN EXAMINATION SPLIT VIEW: QUESTION vs QUESTION PALETTE
      ------------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* =====================================================================
            LEFT / MAIN AREA: ACTIVE QUESTION (Cols 1-8)
        ====================================================================== */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] shadow-xs space-y-6 min-h-[460px] flex flex-col justify-between">
            {/* Question Header & Meta */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold flex items-center justify-center">
                    {currentIndex + 1}
                  </span>
                  <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                    of {exam.questions.length} Questions
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] dark:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] uppercase">
                    {currentQ.questionType.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA]">
                    {currentQ.topic}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed pt-2">
                {currentQ.question}
              </h3>
            </div>

            {/* Answer Options Area */}
            <div className="py-2 space-y-3">
              {/* MCQ & True/False */}
              {(currentQ.questionType === 'mcq' || currentQ.questionType === 'true_false') && (
                <div className="space-y-2.5">
                  {currentQ.options?.map((opt, optIdx) => {
                    const isSelected = currentAnswer === opt;
                    const optionLetter = String.fromCharCode(65 + optIdx);
                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectAnswer(opt)}
                        className={`p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3.5 ${
                          isSelected
                            ? 'border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/50 shadow-xs'
                            : 'border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-white dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {optionLetter}
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                          {opt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Short Answer Text Input */}
              {currentQ.questionType === 'short_answer' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#475569] dark:text-[#CBD5E1]">
                    Type your concise answer (1-3 sentences):
                  </label>
                  <textarea
                    rows={4}
                    value={currentAnswer}
                    onChange={(e) => handleSelectAnswer(e.target.value)}
                    placeholder="Write your explanation or answer here..."
                    className="w-full p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-xs sm:text-sm text-[#0F172A] dark:text-white outline-hidden focus:border-[#2563EB] resize-none"
                  />
                  <p className="text-[11px] text-[#94A3B8]">
                    Evaluated automatically by AI against key conceptual criteria.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Question Toolbar */}
            <div className="pt-4 border-t border-[#F1F5F9] dark:border-[#1E293B] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:bg-slate-100 disabled:opacity-30 text-xs font-bold text-[#334155] dark:text-[#CBD5E1] flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Mark for Review */}
                <button
                  type="button"
                  onClick={handleToggleReviewFlag}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isCurrentMarked
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      : 'border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Flag className={`w-3.5 h-3.5 ${isCurrentMarked ? 'fill-current' : ''}`} />
                  <span>{isCurrentMarked ? 'Marked for Review' : 'Mark for Review'}</span>
                </button>

                {/* Clear Response */}
                {currentAnswer && (
                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="px-2.5 py-2 text-xs font-semibold text-[#64748B] hover:text-rose-500 transition-colors"
                  >
                    Clear Response
                  </button>
                )}
              </div>

              {/* Next Button */}
              {currentIndex < exam.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <span>Review & Submit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            RIGHT AREA: QUESTION PALETTE & STATUS INDICATORS (Cols 9-12)
        ====================================================================== */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] shadow-xs space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
              Question Navigation Palette
            </h4>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500 shrink-0" />
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500 shrink-0" />
                <span>Marked for Review ({markedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-purple-500 shrink-0" />
                <span>Answered & Marked</span>
              </div>
            </div>

            {/* Question Grid Buttons */}
            <div className="grid grid-cols-5 gap-2 pt-2 border-t border-[#F1F5F9] dark:border-[#1E293B]">
              {exam.questions.map((q, idx) => {
                const status = getQuestionStatus(idx);
                const isCurrent = currentIndex === idx;

                let bgClass = 'bg-[#F1F5F9] dark:bg-[#1E293B] text-slate-700 dark:text-slate-300';
                if (status === 'answered') {
                  bgClass = 'bg-emerald-500 text-white font-bold';
                } else if (status === 'not_answered') {
                  bgClass = 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-300 dark:border-rose-800';
                } else if (status === 'marked_for_review') {
                  bgClass = 'bg-amber-400 text-black font-extrabold';
                } else if (status === 'answered_and_marked') {
                  bgClass = 'bg-purple-600 text-white font-extrabold';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${bgClass} ${
                      isCurrent ? 'ring-2 ring-offset-2 ring-[#2563EB] scale-105' : 'hover:opacity-80'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Quick Summary Pill */}
            <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#172033] text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-between">
              <span>{answeredCount} Answered</span>
              <span>{unansweredCount} Left</span>
            </div>

            {/* Submit CTA */}
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Finalize & Submit Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* =======================================================================
          CONFIRMATION SUBMISSION MODAL
      ======================================================================== */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA]">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                  Submit Examination?
                </h3>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1 rounded-xl text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Are you ready to submit your exam for evaluation? Once submitted, your answers will be finalized and graded immediately.
            </p>

            {/* Breakdown Card */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{answeredCount}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Answered</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400">{unansweredCount}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Unanswered</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-amber-500">{markedCount}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Flagged</p>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}. Unanswered questions receive 0 marks.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white"
              >
                Back to Questions
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  executeExamSubmission();
                }}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-md"
              >
                {isSubmitting ? 'Grading Answers...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
