'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getDecks,
  getSubjects,
  getCurrentUser,
  Subject,
  Deck,
} from '@/lib/app';
import { calculateReviewWorkload, ReviewWorkloadItem } from '@/lib/review-workload';
import {
  RotateCw,
  Sparkles,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Folder,
  Layers,
  ChevronRight,
  Zap,
} from 'lucide-react';
import SubjectIcon from '@/components/SubjectIcon';
import ReviewLoading from './loading';

export default function ReviewHubPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [workload, setWorkload] = useState<{
    dueTodayCount: number;
    overdueCount: number;
    upcoming7DaysCount: number;
    difficultCardsCount: number;
    masteredCardsCount: number;
    deckWorkload: ReviewWorkloadItem[];
    next14DaysSchedule: Array<{ date: string; dayLabel: string; count: number }>;
  }>({
    dueTodayCount: 0,
    overdueCount: 0,
    upcoming7DaysCount: 0,
    difficultCardsCount: 0,
    masteredCardsCount: 0,
    deckWorkload: [],
    next14DaysSchedule: [],
  });

  const [mounted, setMounted] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (!user) {
      router.push('/auth?redirect=/review');
      return;
    }

    const loadedDecks = getDecks();
    const loadedSubjects = getSubjects();
    setDecks(loadedDecks);
    setSubjects(loadedSubjects);

    const calculated = calculateReviewWorkload(loadedDecks, loadedSubjects);
    setWorkload(calculated);
  }, [router]);

  if (!mounted) return <ReviewLoading />;

  const totalDueNow = workload.dueTodayCount + workload.overdueCount;
  const estimatedMins = Math.max(1, Math.round((totalDueNow * 35) / 60));

  const filteredDeckWorkload = workload.deckWorkload.filter((dw) => {
    if (selectedSubjectFilter === 'all') return true;
    return dw.subjectId === selectedSubjectFilter;
  });

  // Find primary deck to review
  const firstDueDeck = filteredDeckWorkload[0] || workload.deckWorkload[0] || (decks[0] ? { deckId: decks[0].id } : null);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. HERO HEADER */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B1220] border border-[#334155] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Phase 6 • Intelligent Spaced Repetition (SM-2)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Personalized Review Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Maintain optimal memory retention. The SuperMemo SM-2 algorithm calculates exact review intervals based on your past responses.
            </p>
          </div>

          {firstDueDeck && totalDueNow > 0 && (
            <Link
              href={`/deck/${firstDueDeck.deckId}?mode=study`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:opacity-95 text-white font-extrabold text-sm shadow-md transition-all hover:scale-[1.02] shrink-0"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Start Due Review ({totalDueNow})</span>
            </Link>
          )}
        </div>

        {/* WORKLOAD METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-700/60 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Overdue Cards</p>
            <p className="text-xl font-extrabold text-rose-400 mt-0.5">{workload.overdueCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Due Today</p>
            <p className="text-xl font-extrabold text-amber-400 mt-0.5">{workload.dueTodayCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Upcoming (7d)</p>
            <p className="text-xl font-extrabold text-blue-400 mt-0.5">{workload.upcoming7DaysCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Difficult Cards</p>
            <p className="text-xl font-extrabold text-purple-400 mt-0.5">{workload.difficultCardsCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-slate-400 font-medium">Est. Duration</p>
            <p className="text-xl font-extrabold text-emerald-400 mt-0.5">~{estimatedMins} mins</p>
          </div>
        </div>
      </div>

      {/* 2. OVERDUE ALERT BANNER (IF ANY) */}
      {workload.overdueCount > 0 && (
        <div className="rounded-2xl p-4 sm:p-5 bg-[#FEF2F2] dark:bg-[#450A0A]/40 border border-[#FEE2E2] dark:border-[#7F1D1D] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-rose-900 dark:text-rose-200">
                {workload.overdueCount} Flashcard{workload.overdueCount === 1 ? ' is' : 's are'} Overdue for Review
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                Cards past their SM-2 interval experience accelerated retention decay. Review them first to protect your memory streak!
              </p>
            </div>
          </div>

          {firstDueDeck && (
            <Link
              href={`/deck/${firstDueDeck.deckId}?mode=study`}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>Review Overdue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* 3. 14-DAY REVIEW FORECAST CALENDAR */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] flex items-center justify-center font-bold">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                14-Day Spaced Repetition Forecast
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Predicted flashcard workload distributed by the SM-2 scheduling algorithm.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
            {workload.next14DaysSchedule.reduce((s, d) => s + d.count, 0)} cards scheduled
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
          {workload.next14DaysSchedule.map((day, idx) => {
            const isToday = idx === 0;
            const hasCards = day.count > 0;
            return (
              <div
                key={day.date}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isToday
                    ? 'bg-[#EFF6FF] dark:bg-[#172554] border-[#2563EB] text-[#2563EB] dark:text-[#60A5FA]'
                    : hasCards
                    ? 'bg-[#F8FAFC] dark:bg-[#172033] border-[#E2E8F0] dark:border-[#263449]'
                    : 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#263449] opacity-60'
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  {isToday ? 'Today' : day.dayLabel.split(',')[0]}
                </p>
                <p className="text-lg font-black mt-1 text-[#0F172A] dark:text-[#F8FAFC]">
                  {day.count}
                </p>
                <p className="text-[9px] text-[#64748B] dark:text-[#94A3B8] font-medium">
                  {day.count === 1 ? 'card' : 'cards'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DECK REVIEW WORKLOAD SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-lg text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6]" />
              <span>Study Decks Due for Review</span>
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Select a deck to initiate an SM-2 spaced repetition review session.
            </p>
          </div>

          {/* SUBJECT FILTER */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">Filter:</span>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#111827] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredDeckWorkload.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-10 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              🎉 All Caught Up! Zero Due Flashcards
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto">
              Your memory intervals are active. Come back tomorrow or practice mock exams and quizzes to test retention.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/decks"
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-[#0F172A] dark:text-white"
              >
                Browse Decks
              </Link>
              <Link
                href="/exam"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white"
              >
                Launch Mock Exam
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDeckWorkload.map((dw) => {
              const hasOverdue = dw.overdueCount > 0;
              return (
                <div
                  key={dw.deckId}
                  className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] dark:hover:border-[#3B82F6] rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {dw.subjectName ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] text-[10px] font-bold">
                          {dw.subjectName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#64748B]">Deck</span>
                      )}

                      {hasOverdue ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-200 dark:border-rose-900">
                          {dw.overdueCount} Overdue
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-200 dark:border-amber-900">
                          {dw.dueTodayCount} Due Today
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] transition-colors line-clamp-1">
                      {dw.deckName}
                    </h3>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {dw.totalDueCount} cards due • Est. ~{dw.estimatedMinutes} mins
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#263449]">
                    <Link
                      href={`/deck/${dw.deckId}?mode=study`}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Review Deck Cards</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
