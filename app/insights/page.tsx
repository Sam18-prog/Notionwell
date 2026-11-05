'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getSubjects,
  getDecks,
  getCurrentUser,
  Subject,
  Deck,
} from '@/lib/app';
import type {
  ComprehensiveAnalyticsReport,
  UserAchievement,
  UserLevelInfo,
  GoalProgressSummary,
  LearningGoals,
} from '@/lib/analytics';
import {
  BarChart3,
  Lightbulb,
  Award,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Folder,
  Sparkles,
  Lock,
  HelpCircle,
  Clock,
  Flame,
  Zap,
  Target,
  Edit2,
  Calendar,
  Layers,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import InsightsLoading from './loading';

export default function InsightsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [timeWindow, setTimeWindow] = useState<'7' | '30' | '90' | 'all'>('30');
  const [isLoading, setIsLoading] = useState(true);

  const [report, setReport] = useState<ComprehensiveAnalyticsReport | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const [goals, setGoals] = useState<LearningGoals | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgressSummary | null>(null);

  // Active Achievement Category Filter
  const [achCategory, setAchCategory] = useState<'all' | 'consistency' | 'flashcards' | 'quizzes' | 'exams' | 'milestones'>('all');

  // Goals Edit Modal State
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [editDailyMins, setEditDailyMins] = useState(20);
  const [editDailyCards, setEditDailyCards] = useState(15);
  const [editDailyQuestions, setEditDailyQuestions] = useState(5);
  const [editWeeklyHours, setEditWeeklyHours] = useState(2.5);

  const loadAllAnalytics = async (windowVal: string) => {
    setIsLoading(true);
    try {
      const user = getCurrentUser();
      const userId = user?.id || 'default-user';

      // Parallelized execution: Fetch analytics, XP, achievements, and goals concurrently
      const [repData, xpData, achData, goalsData] = await Promise.all([
        fetch(`/api/analytics?userId=${userId}&days=${windowVal}`).then((r) => r.json()).catch(() => ({ success: false })),
        fetch(`/api/gamification/xp?userId=${userId}`).then((r) => r.json()).catch(() => ({ success: false })),
        fetch(`/api/gamification/achievements?userId=${userId}`).then((r) => r.json()).catch(() => ({ success: false })),
        fetch(`/api/gamification/goals?userId=${userId}`).then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (repData.success) {
        setReport(repData.report);
      }
      if (xpData.success) {
        setLevelInfo(xpData.levelInfo);
      }
      if (achData.success) {
        setAchievements(achData.achievements);
      }
      if (goalsData.success && goalsData.goals) {
        setGoals(goalsData.goals);
        setGoalProgress(goalsData.progress);
        setEditDailyMins(goalsData.goals.dailyStudyMinutes);
        setEditDailyCards(goalsData.goals.dailyCardsReviewed);
        setEditDailyQuestions(goalsData.goals.dailyQuestionsPracticed);
        setEditWeeklyHours(goalsData.goals.weeklyStudyHours);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (!user) {
      router.push('/auth?redirect=/insights');
      return;
    }
    loadAllAnalytics(timeWindow);
  }, [router, timeWindow]);

  const handleSaveGoals = async () => {
    try {
      const user = getCurrentUser();
      const userId = user?.id || 'default-user';
      const res = await fetch('/api/gamification/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          dailyStudyMinutes: editDailyMins,
          dailyCardsReviewed: editDailyCards,
          dailyQuestionsPracticed: editDailyQuestions,
          weeklyStudyHours: editWeeklyHours,
        }),
      });
      if (res.ok) {
        setIsGoalsModalOpen(false);
        loadAllAnalytics(timeWindow);
      }
    } catch (err) {
      console.error('Failed to update goals:', err);
    }
  };

  if (!mounted) return <InsightsLoading />;

  const filteredAchievements = achievements.filter((a) => {
    if (achCategory === 'all') return true;
    return a.category === achCategory;
  });

  const unlockedAchCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* -----------------------------------------------------------------------
          1. HEADER WITH TIME WINDOW SELECTOR
      ------------------------------------------------------------------------ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#263449] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA] text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="font-bold">Phase 6 • Advanced Learning Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            Learning Insights & Academic Performance
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] mt-1 font-medium">
            Monitor retention mastery, SM-2 memory curves, assessment accuracy, study consistency, and unlocked badges.
          </p>
        </div>

        {/* TIME WINDOW TOGGLE */}
        <div className="flex items-center bg-[#F1F5F9] dark:bg-[#1E293B] p-1 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] self-start md:self-auto">
          {(['7', '30', '90', 'all'] as const).map((win) => (
            <button
              key={win}
              onClick={() => setTimeWindow(win)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                timeWindow === win
                  ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              {win === '7' ? '7 Days' : win === '30' ? '30 Days' : win === '90' ? '90 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          2. GAMIFICATION LEVEL & XP STRIP
      ------------------------------------------------------------------------ */}
      {levelInfo && (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B1220] border border-[#334155] text-white shadow-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex flex-col items-center justify-center font-black shadow-md shrink-0">
                <span className="text-[10px] uppercase tracking-wider font-extrabold leading-none">LVL</span>
                <span className="text-2xl leading-none">{levelInfo.currentLevel}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    Scholar Level {levelInfo.currentLevel}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                    {levelInfo.totalXP} Total XP
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  {levelInfo.xpToNextLevel} XP needed to reach Level {levelInfo.currentLevel + 1}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span>Level Progress</span>
                <span>{levelInfo.levelProgressPercentage || levelInfo.progressPercentage || 0}%</span>
              </div>
              <div className="w-full bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${levelInfo.levelProgressPercentage || levelInfo.progressPercentage || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          3. 8-CARD COMPREHENSIVE OVERVIEW METRICS GRID
      ------------------------------------------------------------------------ */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Total Study Time */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">Study Time</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
              {report.overview.totalStudyHoursFormatted}
            </p>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">Logged sessions</span>
          </div>

          {/* Cards Reviewed */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">Cards Reviewed</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                <RotateCw className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
              {report.overview.totalFlashcardsReviewed}
            </p>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
              {report.retention.dueTodayCount} due today
            </span>
          </div>

          {/* Quizzes Completed & Avg */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">Quiz Accuracy</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {report.overview.quizzesCompleted > 0 ? `${report.overview.averageQuizScore}%` : '—'}
            </p>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">
              {report.overview.quizzesCompleted} completed
            </span>
          </div>

          {/* Exams Completed & Avg */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">Exam Average</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {report.overview.examsCompleted > 0 ? `${report.overview.averageExamScore}%` : '—'}
            </p>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">
              {report.overview.examsCompleted} simulated
            </span>
          </div>

          {/* Current & Longest Streak */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">Study Streak</span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950 text-orange-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400">
              {report.overview.currentStreak}d
            </p>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">
              Best: {report.overview.longestStreak} days
            </span>
          </div>

          {/* Retention Mastery % */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">Retention Mastery</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {report.overview.retentionMasteryPercentage}%
            </p>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">
              {report.retention.masteredCardsCount}/{report.overview.totalCards} cards
            </span>
          </div>

          {/* Review Success Rate */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">Recall Rate</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400">
              {report.retention.reviewSuccessRate}%
            </p>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">Good / Easy passes</span>
          </div>

          {/* Consistency & Active Days */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase">Most Active Day</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] truncate">
              {report.studyBehavior.mostActiveDay}
            </p>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">Peak focus</span>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          4. GOALS PROGRESS STRIP & CONFIGURATION
      ------------------------------------------------------------------------ */}
      {goalProgress && goals && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                  Daily & Weekly Learning Targets
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Verified progress towards your personalized daily and weekly study targets.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsGoalsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Goals</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {goalProgress.daily.map((item) => (
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

      {/* -----------------------------------------------------------------------
          5. 14-DAY DAILY ACTIVITY BAR CHART
      ------------------------------------------------------------------------ */}
      {report && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                Daily Study & Flashcard Review Activity
              </h2>
            </div>
            <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
              Past 14 Days
            </span>
          </div>

          <div className="pt-4 pb-2">
            <div className="h-44 flex items-end justify-between gap-2 px-1 border-b border-[#E2E8F0] dark:border-[#263449]">
              {report.learningActivity.dailyActivity.map((day) => {
                const maxSecs = Math.max(1800, ...report.learningActivity.dailyActivity.map((d) => d.studySeconds));
                const heightPercent = day.studySeconds > 0 ? Math.max(8, Math.round((day.studySeconds / maxSecs) * 100)) : 0;
                const mins = Math.round(day.studySeconds / 60);

                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative"
                  >
                    {/* TOOLTIP */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0F172A] dark:bg-[#F8FAFC] text-white dark:text-[#0F172A] text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap shadow-md z-20">
                      {mins} mins • {day.cardsReviewed} cards ({day.date})
                    </div>

                    {/* BAR */}
                    <div className="w-full bg-[#F1F5F9] dark:bg-[#172033] rounded-t-xl h-full flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          day.studySeconds > 0
                            ? 'bg-[#2563EB] dark:bg-[#3B82F6] group-hover:bg-[#1D4ED8]'
                            : 'bg-transparent'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LABELS */}
            <div className="flex items-center justify-between gap-2 px-1 mt-2">
              {report.learningActivity.dailyActivity.map((day) => (
                <div key={day.date} className="flex-1 text-center text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8]">
                  {day.dayLabel}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          6. PERFORMANCE ANALYTICS: TOPIC ACCURACY & SUBJECT RANKING
      ------------------------------------------------------------------------ */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TOPIC-WISE ACCURACY */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h2 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                  Topic-Wise Assessment Performance
                </h2>
              </div>
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                {report.performance.topicBreakdown.length} topics tested
              </span>
            </div>

            {report.performance.topicBreakdown.length === 0 ? (
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] py-8 text-center font-medium">
                Complete a simulated exam or quiz to populate verified topic-wise accuracy metrics.
              </p>
            ) : (
              <div className="space-y-3 pt-1 max-h-72 overflow-y-auto pr-1">
                {report.performance.topicBreakdown.map((t) => (
                  <div key={t.topic} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#0F172A] dark:text-[#F8FAFC] truncate max-w-[200px]">{t.topic}</span>
                      <span className={t.accuracy >= 70 ? 'text-emerald-500' : 'text-rose-500'}>
                        {t.accuracy}% ({t.correct}/{t.total})
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] dark:bg-[#263449] rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          t.accuracy >= 70 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${t.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STRONGEST VS WEAKEST SUBJECTS */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                  <Folder className="w-4 h-4" />
                </div>
                <h2 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                  Subject Mastery Ranking
                </h2>
              </div>
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                Retention Distribution
              </span>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                  Strongest Subjects
                </h4>
                {report.performance.strongestSubjects.length === 0 ? (
                  <p className="text-xs text-[#64748B]">Add study materials to populate.</p>
                ) : (
                  <div className="space-y-2">
                    {report.performance.strongestSubjects.map((s) => (
                      <div key={s.subjectName} className="flex items-center justify-between text-xs font-bold">
                        <span className="text-[#0F172A] dark:text-[#F8FAFC]">{s.subjectName}</span>
                        <span className="text-emerald-600">{s.mastery}% mastery</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#263449]">
                <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2">
                  Requires Attention
                </h4>
                {report.performance.weakestSubjects.length === 0 ? (
                  <p className="text-xs text-[#64748B]">Add study materials to populate.</p>
                ) : (
                  <div className="space-y-2">
                    {report.performance.weakestSubjects.map((s) => (
                      <div key={s.subjectName} className="flex items-center justify-between text-xs font-bold">
                        <span className="text-[#0F172A] dark:text-[#F8FAFC]">{s.subjectName}</span>
                        <span className="text-rose-600">{s.mastery}% mastery</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          7. GAMIFICATION: ACHIEVEMENTS & BADGES CATALOG
      ------------------------------------------------------------------------ */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-[#0F172A] dark:text-[#F8FAFC]">
                Achievements & Badges
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Earn verified badges and XP as you review cards, take exams, and maintain streaks.
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA]">
            {unlockedAchCount} of {achievements.length} Badges Unlocked
          </span>
        </div>

        {/* CATEGORY TABS */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(['all', 'consistency', 'flashcards', 'quizzes', 'exams', 'milestones'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setAchCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                achCategory === cat
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F8FAFC] dark:bg-[#172033] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] dark:border-[#263449]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* BADGES GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3">
          {filteredAchievements.map((badge) => (
            <div
              key={badge.id}
              className={`relative group p-4 rounded-2xl border transition-all flex flex-col items-center text-center shadow-xs ${
                badge.isUnlocked
                  ? 'bg-white dark:bg-[#172033] border-emerald-300 dark:border-emerald-800 hover:border-emerald-500'
                  : 'bg-[#F8FAFC]/60 dark:bg-[#172033]/40 border-[#E2E8F0] dark:border-[#263449] opacity-75'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 shadow-xs transition-transform group-hover:scale-105 ${
                  badge.isUnlocked
                    ? 'bg-emerald-50 dark:bg-emerald-950 border border-emerald-300'
                    : 'bg-[#E2E8F0] dark:bg-[#263449] text-gray-400'
                }`}
              >
                {badge.isUnlocked ? badge.icon : <Lock className="w-5 h-5 text-gray-400" />}
              </div>

              <h4 className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC] line-clamp-1">
                {badge.title}
              </h4>

              <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-medium line-clamp-2 mt-0.5">
                {badge.description}
              </p>

              <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-amber-500">
                <span>+{badge.xpReward} XP</span>
              </div>

              {!badge.isUnlocked && (
                <div className="w-full mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-bold text-[#64748B]">
                    <span>Progress</span>
                    <span>{badge.currentProgress ?? badge.progress ?? 0}/{badge.threshold}</span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] dark:bg-[#263449] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, (((badge.currentProgress ?? badge.progress ?? 0) / (badge.threshold || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          8. EDIT GOALS MODAL
      ------------------------------------------------------------------------ */}
      {isGoalsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-extrabold text-lg text-[#0F172A] dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span>Configure Learning Goals</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#475569] dark:text-slate-300 block mb-1">
                  Daily Study Minutes Target:
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={editDailyMins}
                  onChange={(e) => setEditDailyMins(parseInt(e.target.value, 10) || 20)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#172033] font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-[#475569] dark:text-slate-300 block mb-1">
                  Daily Flashcards Reviewed Target:
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={editDailyCards}
                  onChange={(e) => setEditDailyCards(parseInt(e.target.value, 10) || 15)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#172033] font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-[#475569] dark:text-slate-300 block mb-1">
                  Daily Questions Practiced Target:
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editDailyQuestions}
                  onChange={(e) => setEditDailyQuestions(parseInt(e.target.value, 10) || 5)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#172033] font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-[#475569] dark:text-slate-300 block mb-1">
                  Weekly Study Hours Target:
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="40"
                  value={editWeeklyHours}
                  onChange={(e) => setEditWeeklyHours(parseFloat(e.target.value) || 2.5)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#172033] font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#263449]">
              <button
                onClick={() => setIsGoalsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#334155] text-xs font-bold text-[#64748B]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoals}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs"
              >
                Save Goals
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
