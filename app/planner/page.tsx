'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getPlannerTasks,
  savePlannerTask,
  togglePlannerTask,
  deletePlannerTask,
  getSubjects,
  getDecks,
  getCurrentUser,
  getTodayDateString,
  PlannerTask,
  Subject,
  Deck,
} from '@/lib/app';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckSquare,
  Square,
  Trash2,
  X,
  BookOpen,
  ArrowLeft,
  Clock,
  Sparkles,
  BookMarked,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function StudyPlannerPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [mounted, setMounted] = useState(false);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayDateString());

  // Task Modal Form State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubjectId, setNewTaskSubjectId] = useState<string>('');
  const [newTaskDeckId, setNewTaskDeckId] = useState<string>('');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  const loadData = () => {
    setTasks(getPlannerTasks());
    setSubjects(getSubjects());
    setDecks(getDecks());
  };

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (!user) {
      router.push('/auth?redirect=/planner');
      return;
    }
    loadData();
  }, [router]);

  if (!mounted) return null;

  const todayStr = getTodayDateString();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
  };

  const handleOpenAddTaskModal = () => {
    if (selectedDateStr < todayStr) {
      alert('You cannot add study tasks for past dates. Please select today or a future date.');
      return;
    }
    setNewTaskTitle('');
    setNewTaskSubjectId('');
    setNewTaskDeckId('');
    setNewTaskNotes('');
    setIsTaskModalOpen(true);
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    if (selectedDateStr < todayStr) {
      alert('You cannot add study tasks for past dates.');
      return;
    }

    const newTask: PlannerTask = {
      id: uuidv4(),
      date: selectedDateStr,
      title: newTaskTitle.trim(),
      notes: newTaskNotes.trim() || undefined,
      linkedSubjectId: newTaskSubjectId || null,
      linkedDeckId: newTaskDeckId || null,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };

    savePlannerTask(newTask);
    setIsTaskModalOpen(false);
    loadData();
  };

  const handleToggleTask = (taskId: string) => {
    togglePlannerTask(taskId);
    loadData();
  };

  const handleDeleteTask = (taskId: string) => {
    deletePlannerTask(taskId);
    loadData();
  };

  const dayTasks = tasks.filter((t) => t.date === selectedDateStr);
  const isPastSelectedDate = selectedDateStr < todayStr;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#263449] pb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white mb-2 transition-colors font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>Study Planner Calendar</span>
          </h1>
          <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mt-1 font-normal">
            Schedule study sessions, set goals for today & future days, and track daily completions.
          </p>
        </div>

        <button
          onClick={handleOpenAddTaskModal}
          disabled={isPastSelectedDate}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-xs transition-all ${
            isPastSelectedDate
              ? 'bg-[#E2E8F0] dark:bg-[#1E293B] text-[#94A3B8] cursor-not-allowed border border-[#CBD5E1] dark:border-[#334155]'
              : 'bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white hover:scale-[1.01]'
          }`}
          title={isPastSelectedDate ? 'Cannot add tasks to past dates' : 'Add Task for Selected Date'}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Task for {selectedDateStr === todayStr ? 'Today' : selectedDateStr}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* MONTH VIEW CALENDAR GRID */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
              {monthNames[month]} {year}
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDateStr(getTodayDateString());
                }}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-xs font-bold text-[#2563EB] dark:text-[#60A5FA]"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-[#64748B] dark:text-[#94A3B8] border-b border-[#E2E8F0] dark:border-[#263449] pb-3 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-2xl bg-transparent" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDateStr;
              const isPast = dateStr < todayStr;

              const dateTasks = tasks.filter((t) => t.date === dateStr);
              const pendingCount = dateTasks.filter((t) => !t.isCompleted).length;

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  className={`h-16 sm:h-20 p-2 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#2563EB] dark:border-[#3B82F6] bg-[#EFF6FF] dark:bg-[#172554] ring-2 ring-[#2563EB]/20 shadow-xs'
                      : isToday
                      ? 'border-[#10B981] dark:border-[#34D399] bg-[#ECFDF5]/50 dark:bg-[#052E2B]/50'
                      : isPast
                      ? 'border-[#E2E8F0]/60 dark:border-[#263449]/60 bg-[#F8FAFC]/50 dark:bg-[#172033]/30 opacity-70'
                      : 'border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#111827] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black rounded-lg px-1.5 py-0.5 ${
                        isToday
                          ? 'bg-[#10B981] text-white'
                          : isSelected
                          ? 'bg-[#2563EB] text-white'
                          : 'text-[#0F172A] dark:text-[#F8FAFC]'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {dateTasks.length > 0 && (
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          pendingCount === 0
                            ? 'bg-[#ECFDF5] dark:bg-[#052E2B] text-[#10B981]'
                            : 'bg-[#FFFBEB] dark:bg-[#422006] text-[#D97706]'
                        }`}
                      >
                        {dateTasks.length}
                      </span>
                    )}
                  </div>

                  {dateTasks.length > 0 && (
                    <div className="flex items-center gap-1 overflow-hidden pt-1">
                      {dateTasks.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          className={`h-1.5 flex-1 rounded-full ${
                            t.isCompleted ? 'bg-[#10B981]' : 'bg-[#2563EB]'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* DAY TASK PANEL (RIGHT COLUMN) */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 shadow-xs space-y-6 sticky top-6">
          <div className="border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-[#2563EB] dark:text-[#60A5FA] tracking-wider">
                {selectedDateStr === todayStr ? 'Today’s Tasks' : 'Selected Date'}
              </span>
              <span className="text-xs font-mono font-bold text-[#64748B] dark:text-[#94A3B8]">
                {selectedDateStr}
              </span>
            </div>
            <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F8FAFC] mt-1">
              Planned Tasks ({dayTasks.length})
            </h3>
          </div>

          {isPastSelectedDate && (
            <div className="p-3 rounded-2xl bg-[#FFFBEB] dark:bg-[#422006] border border-[#FDE68A] dark:border-[#78350F] text-xs text-[#B45309] dark:text-[#FBBF24] font-medium leading-relaxed">
              ⚠️ Note: This date is in the past. Creating new study tasks for past days is disabled.
            </div>
          )}

          {dayTasks.length === 0 ? (
            <div className="py-8 text-center space-y-3 border border-dashed border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-6">
              <BookMarked className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
                No study tasks scheduled for this day.
              </p>
              {!isPastSelectedDate && (
                <button
                  onClick={handleOpenAddTaskModal}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-xs hover:bg-[#1D4ED8] transition-all"
                >
                  Add Task Now
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {dayTasks.map((task) => {
                const linkedSub = subjects.find((s) => s.id === task.linkedSubjectId);
                const linkedDeck = decks.find((d) => d.id === task.linkedDeckId);

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                      task.isCompleted
                        ? 'bg-[#F8FAFC] dark:bg-[#172033]/50 border-[#E2E8F0] dark:border-[#263449] opacity-65'
                        : 'bg-[#F8FAFC] dark:bg-[#172033] border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        onClick={() => {
                          if (task.linkedDeckId) {
                            router.push(`/deck/${task.linkedDeckId}?mode=study`);
                          } else {
                            handleToggleTask(task.id);
                          }
                        }}
                        className="flex items-start gap-2.5 cursor-pointer overflow-hidden flex-1"
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTask(task.id);
                          }}
                          className="pt-0.5"
                        >
                          {task.isCompleted ? (
                            <CheckSquare className="w-4 h-4 text-[#10B981] shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-[#64748B] shrink-0" />
                          )}
                        </div>

                        <div className="space-y-1 overflow-hidden">
                          <p
                            className={`text-xs font-extrabold leading-snug ${
                              task.isCompleted
                                ? 'line-through text-[#64748B]'
                                : 'text-[#0F172A] dark:text-[#F8FAFC]'
                            }`}
                          >
                            {task.title}
                          </p>

                          {task.notes && (
                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-normal line-clamp-2">
                              {task.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-[#64748B] hover:text-[#EF4444] p-1 rounded-lg hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A] transition-colors shrink-0"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* LINKED SUBJECT / DECK BADGES */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#E2E8F0] dark:border-[#263449]/60 text-[10px]">
                      {linkedDeck && (
                        <span
                          onClick={() => router.push(`/deck/${linkedDeck.id}?mode=study`)}
                          className="px-2 py-0.5 rounded-md bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] font-bold border border-[#DBEAFE] dark:border-[#1E3A8A] cursor-pointer hover:underline"
                        >
                          📘 {linkedDeck.name}
                        </span>
                      )}

                      {!linkedDeck && linkedSub && (
                        <span
                          className="px-2 py-0.5 rounded-md text-white font-bold"
                          style={{ backgroundColor: linkedSub.colorTag }}
                        >
                          📁 {linkedSub.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ADD TASK MODAL DIALOG */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6]" />
                Add Study Task for {selectedDateStr}
              </h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                  Task Goal / Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Review Mitochondria flashcards, complete Biology quiz"
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] font-semibold focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* LINKED DECK SELECTOR */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                  Link Specific Study Deck (Optional)
                </label>
                <select
                  value={newTaskDeckId}
                  onChange={(e) => {
                    const deckId = e.target.value;
                    setNewTaskDeckId(deckId);
                    const selDeck = decks.find((d) => d.id === deckId);
                    if (selDeck) {
                      setNewTaskSubjectId(selDeck.subjectId);
                    }
                  }}
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">-- No Specific Deck Linked --</option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      📘 {d.name} ({d.flashcards.length} cards)
                    </option>
                  ))}
                </select>
              </div>

              {/* LINKED SUBJECT SELECTOR */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                  Link Subject Folder (Optional)
                </label>
                <select
                  value={newTaskSubjectId}
                  onChange={(e) => setNewTaskSubjectId(e.target.value)}
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">-- Unlinked / General --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      📁 {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                  Notes / Focus Details (Optional)
                </label>
                <textarea
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Focus on hard cards and weak subtopics..."
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl p-3 text-xs text-[#0F172A] dark:text-[#F8FAFC] font-medium focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0] dark:border-[#263449]">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
