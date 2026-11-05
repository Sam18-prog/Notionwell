'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Route,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  RefreshCw,
  BookOpen,
  HelpCircle,
  Layers,
  GraduationCap,
  RotateCw,
  ArrowRight,
  Sliders,
  AlertCircle,
  Folder,
} from 'lucide-react';
import { getCurrentUser, getDecks, getSubjects, Deck, Subject, User, savePlannerTask } from '@/lib/app';
import { LearningPath, LearningPathTask } from '@/lib/intelligence';
import StudyPathsLoading from './loading';

export default function StudyPathsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  const [paths, setPaths] = useState<any[]>([]);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [tasks, setTasks] = useState<LearningPathTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Creation modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [pathTitle, setPathTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [initialLevel, setInitialLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isGenerating, setIsGenerating] = useState(false);

  // Reschedule modal states
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleMinutes, setRescheduleMinutes] = useState(30);

  useEffect(() => {
    setMounted(true);
    const currUser = getCurrentUser();
    setUser(currUser);

    const loadedSubjects = getSubjects();
    const loadedDecks = getDecks();
    setSubjects(loadedSubjects);
    setDecks(loadedDecks);

    loadPaths();
  }, []);

  const loadPaths = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/study/paths');
      const data = await res.json();
      if (data.success && data.paths) {
        setPaths(data.paths);
        if (data.paths.length > 0 && !selectedPath) {
          loadPathDetails(data.paths[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load study paths:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPathDetails = async (pathId: string) => {
    try {
      const res = await fetch(`/api/study/paths/${pathId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedPath(data.path);
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Failed to load path details:', err);
    }
  };

  const handleCreatePath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDate || isGenerating) return;

    try {
      setIsGenerating(true);
      const subj = subjects.find(s => s.id === selectedSubjectId);
      const res = await fetch('/api/study/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pathTitle || `Mastery Path: ${subj?.name || 'Academic Course'}`,
          objective: objective || 'Complete all milestone tasks and ace examinations',
          targetDate,
          dailyMinutes,
          initialLevel,
          subjectId: selectedSubjectId || undefined,
          subjectName: subj?.name || 'General Course',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCreateModalOpen(false);
        setPathTitle('');
        setObjective('');
        await loadPaths();
        if (data.path) {
          setSelectedPath(data.path);
          setTasks(data.tasks || []);
        }
      }
    } catch (err) {
      console.error('Failed to create study path:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t));

      const res = await fetch(`/api/study/paths/${selectedPath?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_task', taskId }),
      });
      const data = await res.json();
      if (data.success) {
        loadPaths();
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPath || !rescheduleDate) return;

    try {
      const res = await fetch(`/api/study/paths/${selectedPath.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          newTargetDate: rescheduleDate,
          dailyMinutes: rescheduleMinutes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsRescheduleOpen(false);
        await loadPathDetails(selectedPath.id);
        await loadPaths();
      }
    } catch (err) {
      console.error('Failed to reschedule path:', err);
    }
  };

  const handleSyncToPlanner = (task: LearningPathTask) => {
    savePlannerTask({
      id: task.id || crypto.randomUUID(),
      date: task.dueDate || new Date().toISOString().split('T')[0],
      title: task.title,
      notes: `[AI Study Path] ${task.description} (${task.estimatedMinutes} mins)`,
      linkedSubjectId: selectedPath?.subjectId || null,
      linkedDeckId: null,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    });
    alert(`Task "${task.title}" has been synced to your Study Planner!`);
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'reading': return <BookOpen className="w-4 h-4 text-sky-500" />;
      case 'flashcards': return <Layers className="w-4 h-4 text-emerald-500" />;
      case 'quiz': return <HelpCircle className="w-4 h-4 text-amber-500" />;
      case 'exam': return <GraduationCap className="w-4 h-4 text-rose-500" />;
      case 'revision': return <RotateCw className="w-4 h-4 text-purple-500" />;
      default: return <BookOpen className="w-4 h-4 text-blue-500" />;
    }
  };

  if (!mounted) return <StudyPathsLoading />;

  // Group tasks by stages
  const stageGroups = tasks.reduce((acc, task) => {
    const key = task.stageTitle || `Stage ${task.stageOrder}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, LearningPathTask[]>);

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1D] text-[#0F172A] dark:text-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-[#2563EB]">
                <Route className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Personalized AI Study Paths</h1>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                  Adaptive multi-stage curriculums tailored to your deadlines, daily schedule, and mastery pace
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Study Path</span>
          </button>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* LEFT SIDEBAR: Active Study Paths */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              Your Study Paths ({paths.length})
            </h2>

            {isLoading ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] flex items-center justify-center">
                <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" />
              </div>
            ) : paths.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-dashed border-[#CBD5E1] dark:border-[#334155] text-center space-y-3">
                <Route className="w-8 h-8 text-[#94A3B8] mx-auto" />
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  No study paths generated yet. Create your first roadmap to unlock personalized scheduling!
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] font-bold text-xs hover:bg-blue-100"
                >
                  Generate Path
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {paths.map(p => {
                  const isSelected = selectedPath?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => loadPathDetails(p.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-[#2563EB] shadow-xs'
                          : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#263449] hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F172A] dark:text-white truncate max-w-[160px]">
                          {p.title}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase ${
                          p.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-blue-100 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 truncate">
                        {p.objective}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Progress</span>
                        <span className="font-bold text-[#2563EB]">{p.progressPercentage}%</span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-[#E2E8F0] dark:bg-[#263449] mt-1 overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                          style={{ width: `${p.progressPercentage}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT / MAIN CONTENT: Selected Roadmap Milestones */}
          <div className="lg:col-span-3 space-y-6">
            {selectedPath ? (
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] shadow-xs space-y-6">
                
                {/* Path Overview Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#263449]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-[#2563EB] text-xs font-bold uppercase tracking-wider">
                        {selectedPath.currentLevel} Level
                      </span>
                      <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">• Target: {selectedPath.targetDate}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black">{selectedPath.title}</h2>
                    <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">{selectedPath.objective}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setRescheduleDate(selectedPath.targetDate);
                        setRescheduleMinutes(selectedPath.dailyMinutes);
                        setIsRescheduleOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs font-bold hover:border-[#2563EB] transition-colors"
                      title="Dynamically adjust target date or daily minutes"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Reschedule</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2 bg-[#F8FAFC] dark:bg-[#172033] p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#263449]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold">Overall Roadmap Completion</span>
                    <span className="font-extrabold text-[#2563EB]">{completedCount} of {tasks.length} tasks completed ({progressPct}%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#E2E8F0] dark:bg-[#263449] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#2563EB] to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* STAGE BREAKDOWN */}
                <div className="space-y-6">
                  {Object.entries(stageGroups).map(([stageTitle, stageTasks], idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/70 text-[#2563EB] text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-white">
                          {stageTitle}
                        </h3>
                      </div>

                      <div className="space-y-2 pl-3 border-l-2 border-blue-200 dark:border-blue-900/50 ml-3">
                        {stageTasks.map(t => (
                          <div
                            key={t.id}
                            className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                              t.isCompleted
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-80'
                                : 'bg-[#F8FAFC] dark:bg-[#131D31] border-[#E2E8F0] dark:border-[#263449] hover:border-blue-400'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleToggleTask(t.id)}
                                className="mt-0.5 cursor-pointer text-[#2563EB] transition-transform hover:scale-110"
                                title="Toggle complete"
                              >
                                {t.isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                                ) : (
                                  <Circle className="w-5 h-5 text-[#94A3B8]" />
                                )}
                              </button>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider">
                                    {getTaskIcon(t.taskType)}
                                    <span>{t.taskType}</span>
                                  </div>
                                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">• {t.estimatedMinutes} mins</span>
                                  {t.dueDate && (
                                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" /> Due {t.dueDate}
                                    </span>
                                  )}
                                </div>

                                <h4 className={`text-xs sm:text-sm font-bold ${t.isCompleted ? 'line-through text-[#64748B]' : 'text-[#0F172A] dark:text-white'}`}>
                                  {t.title}
                                </h4>
                                <p className="text-[11px] sm:text-xs text-[#64748B] dark:text-[#94A3B8]">
                                  {t.description}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleSyncToPlanner(t)}
                              className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#2563EB] text-[10px] font-bold text-[#64748B] dark:text-[#CBD5E1] hover:text-[#2563EB] shrink-0 transition-colors"
                              title="Add to daily study planner"
                            >
                              Sync to Planner
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ) : (
              <div className="p-12 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] text-center space-y-4">
                <Route className="w-12 h-12 text-[#94A3B8] mx-auto animate-pulse" />
                <h3 className="text-base font-bold">Select or Generate a Study Path</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto">
                  AI study paths analyze your uploaded notes and target exam dates to structure a progressive step-by-step revision curriculum.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-xs"
                >
                  Generate First Path
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* CREATE STUDY PATH MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#263449]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2563EB]" />
                <h3 className="font-extrabold text-base">Generate Personalized AI Roadmap</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs text-[#94A3B8] hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreatePath} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Path Title</label>
                <input
                  type="text"
                  value={pathTitle}
                  onChange={e => setPathTitle(e.target.value)}
                  placeholder="e.g. Midterm Machine Learning Mastery"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Associate Subject (Optional)</label>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs font-medium"
                >
                  <option value="">General Academic Path</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Target Exam / Goal Date</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Daily Study Time</label>
                  <select
                    value={dailyMinutes}
                    onChange={e => setDailyMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs font-medium"
                  >
                    <option value={15}>15 Minutes / Day</option>
                    <option value={30}>30 Minutes / Day</option>
                    <option value={45}>45 Minutes / Day</option>
                    <option value={60}>60 Minutes / Day</option>
                    <option value={90}>90 Minutes / Day</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Proficiency Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setInitialLevel(lvl)}
                      className={`py-2 rounded-xl border font-bold capitalize transition-all ${
                        initialLevel === lvl
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-[#F8FAFC] dark:bg-[#1E293B] border-[#CBD5E1] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Primary Objective</label>
                <textarea
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  placeholder="e.g. Master all foundational models, loss functions, and ace the practical viva voce."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs font-medium resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#334155] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing Curriculum...</span>
                    </>
                  ) : (
                    <span>Generate AI Study Path</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-[#263449]">
              <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#2563EB]" />
                Dynamic Path Rescheduling
              </h3>
              <button onClick={() => setIsRescheduleOpen(false)} className="text-xs text-[#94A3B8]">Close</button>
            </div>

            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Shift your target deadline or daily study budget. Notionwell will proportionally recalibrate remaining uncompleted milestone dates.
            </p>

            <form onSubmit={handleReschedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">New Target Deadline</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#1E293B]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Daily Study Minutes</label>
                <select
                  value={rescheduleMinutes}
                  onChange={e => setRescheduleMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#1E293B]"
                >
                  <option value={15}>15 Minutes / Day</option>
                  <option value={30}>30 Minutes / Day</option>
                  <option value={45}>45 Minutes / Day</option>
                  <option value={60}>60 Minutes / Day</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(false)}
                  className="px-3 py-1.5 rounded-lg border font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#2563EB] text-white font-bold"
                >
                  Apply Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
