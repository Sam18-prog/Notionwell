export default function ExamLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* Hero Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] flex items-center justify-between">
        <div className="space-y-3">
          <div className="w-48 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="w-72 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-96 h-4 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="w-36 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-2">
            <div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-16 h-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>

      {/* Form & Recent Attempts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-4">
          <div className="w-40 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-900/60" />
            ))}
          </div>
        </div>
        <div className="rounded-3xl p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-4">
          <div className="w-32 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-50 dark:bg-slate-900/60" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
