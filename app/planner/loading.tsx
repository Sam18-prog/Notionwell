export default function PlannerLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="w-56 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-80 h-4 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="w-36 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Calendar Grid & Task List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-36 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
          {/* Calendar day grid */}
          <div className="grid grid-cols-7 gap-2 pt-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2" />
            ))}
          </div>
        </div>

        {/* Task List (1 col) */}
        <div className="rounded-3xl p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-4">
          <div className="w-32 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900/60" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
