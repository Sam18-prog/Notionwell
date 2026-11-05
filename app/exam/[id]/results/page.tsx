'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Bookmark,
  Share2,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Check,
  Bot,
  Layers,
  GraduationCap,
  HelpCircle,
} from 'lucide-react';
import { getCurrentUser, User } from '@/lib/app';
import { ExamAttempt, AnswerEvaluation, TopicPerformance } from '@/lib/exam';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ExamResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const examId = params?.id as string;
  const attemptId = searchParams.get('attemptId');

  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Review Filter: 'all' | 'incorrect' | 'flagged'
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'flagged'>('all');

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    setUser(currentUser);

    // Fetch attempt from API
    const url = attemptId
      ? `/api/exam/history?attemptId=${attemptId}&userId=${currentUser?.id || 'default-user'}`
      : `/api/exam/history?userId=${currentUser?.id || 'default-user'}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.attempt) {
            setAttempt(data.attempt);
          } else if (Array.isArray(data.attempts)) {
            // Find attempt for this exam
            const matched = data.attempts.find((a: ExamAttempt) => a.examId === examId) || data.attempts[0];
            if (matched) {
              setAttempt(matched);
            } else {
              throw new Error('Exam results not found.');
            }
          }
        } else {
          throw new Error(data.error || 'Failed to load results.');
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setLoadError(err?.message || 'Error loading exam results.');
        setIsLoading(false);
      });
  }, [examId, attemptId]);

  if (!mounted || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Sparkles className="w-8 h-8 animate-spin text-[#2563EB]" />
        <p className="text-sm font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
          Computing Diagnostic Assessment & Analytics...
        </p>
      </div>
    );
  }

  if (loadError || !attempt) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-rose-200 dark:border-rose-900 text-center space-y-4 shadow-xl">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
          Results Unavailable
        </h3>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{loadError || 'Attempt not found.'}</p>
        <Link
          href="/exam"
          className="inline-block px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8]"
        >
          Return to Exam Hub
        </Link>
      </div>
    );
  }

  const evaluatedAnswers = attempt.evaluatedAnswers || [];
  const filteredQuestions = evaluatedAnswers.filter((a) => {
    if (reviewFilter === 'incorrect') return !a.isCorrect;
    if (reviewFilter === 'flagged') return attempt.reviewStatus[a.questionId];
    return true;
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Distinction':
        return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800';
      case 'Proficient':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800';
      case 'Developing':
        return 'text-amber-500 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800';
      default:
        return 'text-rose-500 bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* -----------------------------------------------------------------------
          PERFORMANCE HEADER BANNER
      ------------------------------------------------------------------------ */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B1220] border border-[#334155] text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${getTierColor(
                  attempt.aiFeedback?.performanceTier || 'Proficient'
                )}`}
              >
                {attempt.aiFeedback?.performanceTier || 'Evaluation Complete'}
              </span>
              <span className="text-xs text-slate-400">• {attempt.mode} mode</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {attempt.examTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Exam evaluated on {new Date(attempt.submittedAt || attempt.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* Large Score Pill */}
          <div className="p-5 rounded-2xl bg-white/10 border border-white/10 text-center shrink-0">
            <p className="text-3xl sm:text-4xl font-extrabold text-blue-400">
              {attempt.score} <span className="text-lg font-medium text-slate-300">/ {attempt.maxPossibleScore}</span>
            </p>
            <p className="text-xs font-bold text-slate-300 mt-1">{attempt.percentage}% Overall Score</p>
          </div>
        </div>

        {/* ---------------------------------------------------------------------
            PERFORMANCE METRICS GRID
        ---------------------------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-700/60 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Accuracy</p>
            <p className="text-lg font-extrabold text-white mt-0.5">{attempt.accuracyPercentage}%</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Time Taken</p>
            <p className="text-lg font-extrabold text-white mt-0.5">
              {Math.floor(attempt.timeSpentSeconds / 60)}m {attempt.timeSpentSeconds % 60}s
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Correct</p>
            <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{attempt.correctCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Incorrect</p>
            <p className="text-lg font-extrabold text-rose-400 mt-0.5">{attempt.incorrectCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Unanswered</p>
            <p className="text-lg font-extrabold text-amber-400 mt-0.5">{attempt.unansweredCount}</p>
          </div>
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          AI PERFORMANCE DIAGNOSTIC CARD
      ------------------------------------------------------------------------ */}
      {attempt.aiFeedback && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                AI Performance Diagnostic & Feedback
              </h3>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Personalized conceptual analysis generated from your examination responses.
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
            {attempt.aiFeedback.summary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Strengths */}
            {attempt.aiFeedback.strengths.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-1.5">
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Strong Topics Mastered
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {attempt.aiFeedback.strengths.map((str, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs font-semibold"
                    >
                      {str}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Areas for Revision */}
            {attempt.aiFeedback.weakTopics.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-1.5">
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Areas Requiring Revision
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {attempt.aiFeedback.weakTopics.map((wk, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 text-xs font-semibold"
                    >
                      {wk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actionable Recommendations with AI Assistant Jump */}
          {attempt.aiFeedback.recommendations.length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Recommended Next Step:
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {attempt.aiFeedback.recommendations[0].action}
                </p>
              </div>

              <Link
                href={`/assistant`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-xs shrink-0"
              >
                <Bot className="w-4 h-4" />
                <span>Launch AI Study Assistant</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* -----------------------------------------------------------------------
          TOPIC PERFORMANCE BREAKDOWN
      ------------------------------------------------------------------------ */}
      {attempt.topicBreakdown && attempt.topicBreakdown.length > 0 && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            Topic-Wise Mastery Breakdown
          </h3>

          <div className="space-y-3">
            {attempt.topicBreakdown.map((t, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#0F172A] dark:text-[#F8FAFC]">{t.topic}</span>
                  <span className="text-[#64748B] dark:text-[#94A3B8]">
                    {t.correct} / {t.total} ({t.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      t.percentage >= 75
                        ? 'bg-emerald-500'
                        : t.percentage >= 50
                        ? 'bg-blue-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${t.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          QUESTION-BY-QUESTION REVIEW
      ------------------------------------------------------------------------ */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              Detailed Question Review
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Inspect explanations, examine misconceptions, and verify source quotes.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F1F5F9] dark:bg-[#172033]">
            <button
              onClick={() => setReviewFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                reviewFilter === 'all'
                  ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                  : 'text-[#64748B]'
              }`}
            >
              All ({evaluatedAnswers.length})
            </button>
            <button
              onClick={() => setReviewFilter('incorrect')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                reviewFilter === 'incorrect'
                  ? 'bg-white dark:bg-[#0F172A] text-rose-600 shadow-xs'
                  : 'text-[#64748B]'
              }`}
            >
              Mistakes Only ({attempt.incorrectCount})
            </button>
            <button
              onClick={() => setReviewFilter('flagged')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                reviewFilter === 'flagged'
                  ? 'bg-white dark:bg-[#0F172A] text-amber-500 shadow-xs'
                  : 'text-[#64748B]'
              }`}
            >
              Flagged Items
            </button>
          </div>
        </div>

        {/* Questions Cards */}
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const isFlagged = attempt.reviewStatus[q.questionId];
            return (
              <div
                key={q.questionId}
                className={`p-6 rounded-3xl border transition-all space-y-4 ${
                  q.isCorrect
                    ? 'border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A]'
                    : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${
                        q.isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {q.questionIndex + 1}
                    </span>
                    <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                      Topic: <span className="text-[#0F172A] dark:text-[#F8FAFC]">{q.topic}</span>
                    </span>
                    {isFlagged && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        Flagged
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      q.isCorrect
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {q.marksAwarded > 0 ? `+${q.marksAwarded} Marks` : `${q.marksAwarded} Marks`}
                  </span>
                </div>

                {/* Question Text */}
                <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                  {q.questionText}
                </p>

                {/* Answer Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Student Answer */}
                  <div
                    className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                      q.isCorrect
                        ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30'
                        : 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/30'
                    }`}
                  >
                    <p className="font-bold text-slate-500 dark:text-slate-400 mb-1">Your Answer:</p>
                    <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      {q.userAnswer ? q.userAnswer : <span className="italic text-slate-400">Unanswered</span>}
                    </p>
                  </div>

                  {/* Correct Answer */}
                  <div className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30 text-xs leading-relaxed">
                    <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">Correct Answer:</p>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-200">{q.correctAnswer}</p>
                  </div>
                </div>

                {/* AI Explanation & Feedback */}
                <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#475569] dark:text-[#CBD5E1]">
                    <HelpCircle className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Explanation:</span>
                  </div>
                  <p className="text-[#334155] dark:text-[#CBD5E1] leading-relaxed">{q.explanation}</p>

                  {/* Verbatim Source Grounding Quote */}
                  {q.sourceQuote && (
                    <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#263449]">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Source Reference ({q.sourceReference || 'Study Notes'}):
                      </p>
                      <blockquote className="border-l-2 border-[#2563EB] pl-2.5 text-[11px] italic text-[#64748B] dark:text-[#94A3B8]">
                        "{q.sourceQuote}"
                      </blockquote>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          BOTTOM ACTION BAR
      ------------------------------------------------------------------------ */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0] dark:border-[#263449]">
        <Link
          href="/exam"
          className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] text-xs font-bold text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white"
        >
          Back to Exam Hub
        </Link>

        <Link
          href={`/exam/${attempt.examId}`}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-md hover:scale-102 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retake Exam</span>
        </Link>
      </div>
    </div>
  );
}
