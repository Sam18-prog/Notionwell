export default function InsightsLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="w-56 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-80 h-4 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-36 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-28 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* 4 Metrics Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-3">
            <div className="w-28 h-4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-20 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="w-36 h-3 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>

      {/* Chart & Retention Overview Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-4">
          <div className="w-48 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-64 rounded-2xl bg-slate-50 dark:bg-slate-900/60" />
        </div>
        <div className="rounded-3xl p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-4">
          <div className="w-36 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900/60" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
