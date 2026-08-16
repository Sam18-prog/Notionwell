'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getSubjects,
  getDecks,
  getDashboardMetrics,
  getCurrentUser,
  getBadges,
  AchievementBadge,
  Subject,
  Deck,
} from '@/lib/app';
import StudyTimeChart from '@/components/StudyTimeChart';
import SubjectIcon from '@/components/SubjectIcon';
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
} from 'lucide-react';

export default function InsightsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [metrics, setMetrics] = useState({
    totalCards: 0,
    masteredCards: 0,
    masteryPercentage: 0,
    cardsDueToday: 0,
    streakDays: 0,
    weakTopics: [] as Array<{ topic: string; incorrectCount: number }>,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (!user) {
      router.push('/auth?redirect=/insights');
      return;
    }

    setSubjects(getSubjects());
    setDecks(getDecks());
    setBadges(getBadges());
    setMetrics(getDashboardMetrics('all'));
  }, [router]);

  if (!mounted) return null;

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="border-b border-[#E2E8F0] dark:border-[#263449] pb-6">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA] text-xs font-semibold w-fit mb-3">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics & Progress Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
          Study Insights & Analytics
        </h1>
        <p className="text-sm sm:text-base text-[#475569] dark:text-[#CBD5E1] mt-1 font-normal">
          Track subject mastery trends, review weak subtopics, unlock study achievements, and monitor 7-day study habits.
        </p>
      </div>

      {/* SECTION 1: WEAK TOPICS SECTION (CLICKABLE TAGS) */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFFBEB] dark:bg-[#422006] text-[#D97706] dark:text-[#FBBF24] border border-[#FDE68A] dark:border-[#78350F] flex items-center justify-center font-bold">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-[#0F172A] dark:text-[#F8FAFC]">
                Weak Subtopics (Requires Focus)
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Click any topic tag below to launch a targeted study session on those cards.
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
            {metrics.weakTopics.length} topic{metrics.weakTopics.length === 1 ? '' : 's'} identified
          </span>
        </div>

        {metrics.weakTopics.length === 0 ? (
          <div className="py-8 text-center bg-[#ECFDF5] dark:bg-[#052E2B]/40 border border-[#A7F3D0] dark:border-[#065F46] rounded-2xl p-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#10B981] text-white flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              🎉 No weak topics right now — nice work!
            </h3>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1] max-w-md mx-auto font-medium">
              All flagged card subtopics have been reviewed and mastered. Keep completing daily study sessions to maintain your mastery streak!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {metrics.weakTopics.map(({ topic, incorrectCount }) => (
              <Link
                key={topic}
                href={`/deck/topic-${encodeURIComponent(topic)}?topic=${encodeURIComponent(topic)}`}
                className="group p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition-all flex items-center justify-between shadow-xs hover:-translate-y-0.5"
              >
                <div className="space-y-1">
                  <span className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6] transition-colors block">
                    {topic}
                  </span>
                  <span className="inline-block bg-[#FFFBEB] dark:bg-[#422006] text-[#B45309] dark:text-[#FBBF24] border border-[#FDE68A] dark:border-[#78350F] px-2 py-0.5 rounded text-[10px] font-bold">
                    {incorrectCount} {incorrectCount === 1 ? 'missed card' : 'missed cards'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: ACHIEVEMENT BADGES SYSTEM GRID */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#3B82F6] border border-[#DBEAFE] dark:border-[#1E3A8A] flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-[#0F172A] dark:text-[#F8FAFC]">
                Achievement Badges & Milestones
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Earn badges as you review flashcards, maintain streaks, and master study decks.
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA]">
            {unlockedCount} of {badges.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`relative group p-4 rounded-2xl border transition-all flex flex-col items-center text-center shadow-xs ${
                badge.isUnlocked
                  ? 'bg-white dark:bg-[#172033] border-[#A7F3D0] dark:border-[#065F46] hover:border-[#10B981]'
                  : 'bg-[#F8FAFC]/60 dark:bg-[#172033]/40 border-[#E2E8F0] dark:border-[#263449] opacity-60 grayscale'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 shadow-xs transition-transform group-hover:scale-110 ${
                  badge.isUnlocked
                    ? 'bg-[#ECFDF5] dark:bg-[#052E2B] border border-[#A7F3D0] dark:border-[#065F46]'
                    : 'bg-[#E2E8F0] dark:bg-[#263449] text-gray-400'
                }`}
              >
                {badge.isUnlocked ? badge.icon : <Lock className="w-5 h-5 text-gray-400" />}
              </div>

              <h4 className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC] line-clamp-1">
                {badge.name}
              </h4>

              <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-medium line-clamp-2 mt-0.5">
                {badge.description}
              </p>

              {badge.isUnlocked && badge.unlockedAt && (
                <span className="mt-2 text-[9px] font-bold text-[#10B981] dark:text-[#34D399] bg-[#ECFDF5] dark:bg-[#052E2B] px-2 py-0.5 rounded-full border border-[#A7F3D0] dark:border-[#065F46]">
                  Unlocked {new Date(badge.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: 7-DAY STUDY TIME CHART */}
      <StudyTimeChart detailed={true} />

      {/* SECTION 4: MASTERY TREND & SUBJECT BREAKDOWN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MASTERY TREND CARD */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] dark:bg-[#052E2B] border border-[#A7F3D0] dark:border-[#065F46] text-[#10B981] flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                Overall Mastery Trend
              </h2>
            </div>
            <span className="text-xl font-black text-[#10B981] dark:text-[#34D399]">
              {metrics.masteryPercentage}%
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] font-bold">
              <span>Mastered Cards Ratio</span>
              <span>
                {metrics.masteredCards} of {metrics.totalCards} cards mastered
              </span>
            </div>
            <div className="w-full bg-[#E2E8F0] dark:bg-[#263449] rounded-full h-3 overflow-hidden">
              <div
                className="bg-[#10B981] dark:bg-[#34D399] h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.masteryPercentage}%` }}
              />
            </div>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed pt-1">
              {metrics.masteryPercentage >= 70
                ? 'Excellent retention rate! Spaced repetition algorithm has strengthened your memory retrieval.'
                : 'Keep completing study sessions, quizzes, and exams to increase your mastery percentage over time.'}
            </p>
          </div>
        </div>

        {/* SUBJECT BREAKDOWN CARD */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] flex items-center justify-center font-bold">
                <Folder className="w-4 h-4" />
              </div>
              <h2 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                Mastery % by Subject
              </h2>
            </div>
            <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
              {subjects.length} subjects
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {subjects.map((sub) => {
              const subDecks = decks.filter((d) => d.subjectId === sub.id);
              let totalCards = 0;
              let masteredCards = 0;
              subDecks.forEach((d) => {
                d.flashcards.forEach((c) => {
                  totalCards += 1;
                  if (c.masteryLevel === 'mastered') masteredCards += 1;
                });
              });

              const subMastery = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

              return (
                <div key={sub.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white p-0.5"
                        style={{ backgroundColor: sub.colorTag }}
                      >
                        <SubjectIcon iconName={sub.icon} name={sub.name} className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span>{sub.name}</span>
                    </span>
                    <span className="text-[#64748B] dark:text-[#94A3B8]">{subMastery}%</span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] dark:bg-[#172033] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${subMastery}%`,
                        backgroundColor: sub.colorTag,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
