export default function WeakTopicsLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="w-56 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-80 h-4 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="w-32 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-2">
            <div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-16 h-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>

      {/* Topics List Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] flex items-center justify-between gap-4"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-20 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="w-48 h-5 rounded-md bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="w-64 h-3.5 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-28 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="w-28 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
