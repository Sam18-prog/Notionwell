'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Sparkles,
  HelpCircle,
  Layers,
  Bot,
  RefreshCw,
  BookOpen,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getCurrentUser, User } from '@/lib/app';
import { WeakTopicItem, WeakTopicStatus } from '@/lib/intelligence';
import WeakTopicsLoading from './loading';

export default function WeakTopicsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [weakTopics, setWeakTopics] = useState<WeakTopicItem[]>([]);
  const [summary, setSummary] = useState({
    totalAnalyzed: 0,
    needsImprovement: 0,
    improving: 0,
    insufficientData: 0,
    strong: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | WeakTopicStatus>('all');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [revisionTopic, setRevisionTopic] = useState<WeakTopicItem | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());
    loadWeakTopics();
  }, []);

  const loadWeakTopics = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/study/weak-topics');
      const data = await res.json();
      if (data.success) {
        setWeakTopics(data.weakTopics || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load weak topics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskAITutor = (topic: string) => {
    router.push(`/assistant?initialQuery=${encodeURIComponent(`Can you explain ${topic} in detail, specifically highlighting common pitfalls and core concepts?`)}`);
  };

  const handlePracticeQuiz = (topic: string) => {
    router.push(`/decks?tab=quizzes&search=${encodeURIComponent(topic)}`);
  };

  const handleGenerateCards = (topic: string) => {
    router.push(`/create?topic=${encodeURIComponent(topic)}`);
  };

  if (!mounted) return <WeakTopicsLoading />;

  const filteredTopics = activeFilter === 'all'
    ? weakTopics
    : weakTopics.filter(w => w.status === activeFilter);

  const getStatusBadge = (status: WeakTopicStatus) => {
    switch (status) {
      case 'needs_improvement':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 text-[10px] font-extrabold uppercase">
            <TrendingDown className="w-3 h-3" /> Needs Improvement
          </span>
        );
      case 'improving':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 text-[10px] font-extrabold uppercase">
            <TrendingUp className="w-3 h-3" /> Improving
          </span>
        );
      case 'insufficient_data':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-extrabold uppercase">
            <Clock className="w-3 h-3" /> Insufficient Data
          </span>
        );
      case 'strong':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-extrabold uppercase">
            <CheckCircle2 className="w-3 h-3" /> Strong Mastery
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1D] text-[#0F172A] dark:text-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Intelligent Weak-Topic Detection</h1>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                Real-time diagnostic analysis cross-referencing quiz errors, exam lapses, and SM-2 retention
              </p>
            </div>
          </div>

          <button
            onClick={loadWeakTopics}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] text-xs font-bold shadow-xs hover:border-[#2563EB] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#2563EB]' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        {/* SUMMARY STAT CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveFilter('needs_improvement')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'needs_improvement'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 shadow-sm'
                : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#263449] hover:border-rose-300'
            }`}
          >
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Needs Improvement
            </span>
            <div className="text-2xl font-black mt-1 text-[#0F172A] dark:text-white">
              {summary.needsImprovement}
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">Accuracy below 60%</p>
          </div>

          <div
            onClick={() => setActiveFilter('improving')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'improving'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-sm'
                : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#263449] hover:border-amber-300'
            }`}
          >
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Improving
            </span>
            <div className="text-2xl font-black mt-1 text-[#0F172A] dark:text-white">
              {summary.improving}
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">Accuracy 60% - 79%</p>
          </div>

          <div
            onClick={() => setActiveFilter('insufficient_data')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'insufficient_data'
                ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-500 shadow-sm'
                : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#263449] hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              Insufficient Data
            </span>
            <div className="text-2xl font-black mt-1 text-[#0F172A] dark:text-white">
              {summary.insufficientData}
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">&lt; 3 verified attempts</p>
          </div>

          <div
            onClick={() => setActiveFilter('strong')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'strong'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm'
                : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#263449] hover:border-emerald-300'
            }`}
          >
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Strong Mastery
            </span>
            <div className="text-2xl font-black mt-1 text-[#0F172A] dark:text-white">
              {summary.strong}
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">Accuracy 80% or higher</p>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[#64748B] dark:text-[#94A3B8] font-bold mr-1">Filter:</span>
          {(['all', 'needs_improvement', 'improving', 'insufficient_data', 'strong'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all whitespace-nowrap ${
                activeFilter === f
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] text-[#64748B] dark:text-[#CBD5E1] hover:border-blue-400'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* TOPICS LIST */}
        {isLoading ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2563EB] mx-auto mb-2" />
            <p className="text-xs text-[#64748B]">Synthesizing assessment error patterns across all quizzes and flashcards...</p>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0F172A] border border-dashed border-[#CBD5E1] dark:border-[#334155] space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold">No Weak Topics Found in this Category</h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto">
              Continue taking quizzes and flashcard reviews to maintain high retention and uncover any subtle knowledge gaps.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTopics.map((topicItem, idx) => {
              const isExpanded = expandedTopic === topicItem.topic;
              return (
                <div
                  key={idx}
                  className="rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] p-5 shadow-xs space-y-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(topicItem.status)}
                        <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          {topicItem.totalAttempts} encounters • {topicItem.errorCount} review lapses
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                        {topicItem.topic}
                      </h3>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                        {topicItem.summaryConcept}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Accuracy Circular / Percentage Metric */}
                      <div className="text-right">
                        <div className="text-xl font-black text-[#2563EB]">
                          {topicItem.accuracyPercentage}%
                        </div>
                        <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-bold">
                          Accuracy
                        </span>
                      </div>

                      {/* Expand evidence toggle */}
                      {topicItem.evidence.length > 0 && (
                        <button
                          onClick={() => setExpandedTopic(isExpanded ? null : topicItem.topic)}
                          className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] hover:border-blue-400 text-xs font-bold flex items-center gap-1"
                          title="View error logs"
                        >
                          <span className="text-[11px]">Evidence ({topicItem.evidence.length})</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 1-CLICK ACTION TRIGGERS */}
                  <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#263449] flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] mr-1">
                      1-Click Remediation:
                    </span>

                    <button
                      onClick={() => setRevisionTopic(topicItem)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Revise Topic</span>
                    </button>

                    <button
                      onClick={() => handleAskAITutor(topicItem.topic)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Ask AI Tutor</span>
                    </button>

                    <button
                      onClick={() => handleGenerateCards(topicItem.topic)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Generate Flashcards</span>
                    </button>

                    <button
                      onClick={() => handlePracticeQuiz(topicItem.topic)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Practice Quiz</span>
                    </button>
                  </div>

                  {/* EXPANDED EVIDENCE BREAKDOWN */}
                  {isExpanded && topicItem.evidence.length > 0 && (
                    <div className="mt-3 p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#131D31] border border-[#E2E8F0] dark:border-[#263449] space-y-2">
                      <h4 className="text-xs font-extrabold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                        Documented Error Lapses ({topicItem.evidence.length})
                      </h4>
                      <div className="space-y-1.5">
                        {topicItem.evidence.map((ev, evIdx) => (
                          <div
                            key={evIdx}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] text-xs flex items-center justify-between"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-[#0F172A] dark:text-white">
                                {ev.promptOrQuestion}
                              </span>
                              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                                Source: {ev.sourceTitle} ({ev.sourceType.toUpperCase()})
                              </div>
                            </div>
                            <span className="text-[10px] text-[#94A3B8] shrink-0">
                              {new Date(ev.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* REVISE TOPIC MODAL */}
      {revisionTopic && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#263449]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#2563EB]" />
                <h3 className="font-extrabold text-base">Quick Revision: {revisionTopic.topic}</h3>
              </div>
              <button
                onClick={() => setRevisionTopic(null)}
                className="text-xs text-[#94A3B8] hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                <h4 className="font-bold text-[#2563EB] mb-1">Diagnostic Context</h4>
                <p className="text-[#334155] dark:text-[#CBD5E1]">
                  You have recorded {revisionTopic.errorCount} review lapses across {revisionTopic.totalAttempts} practice events. Focus on understanding the core mechanism rather than memorizing surface wording.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold">Key Recommendation:</h4>
                <p className="text-[#64748B] dark:text-[#94A3B8]">
                  Open the AI Study Assistant to run multi-turn probing questions, or launch a viva voce session to test your oral articulation of this concept.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setRevisionTopic(null)}
                className="px-4 py-2 rounded-xl border font-bold text-xs"
              >
                Done
              </button>
              <button
                onClick={() => {
                  setRevisionTopic(null);
                  handleAskAITutor(revisionTopic.topic);
                }}
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Launch AI Tutor Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
