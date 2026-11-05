export default function DashboardLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* 1. Hero Greeting Banner Skeleton */}
      <div className="rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-32 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="w-24 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="w-64 sm:w-80 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="w-48 sm:w-96 h-4 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
          <div className="w-40 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* 2. Key Metrics 4-Card Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-20 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="w-16 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="w-28 h-3 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>

      {/* 3. Continue Learning & Today's Tasks Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Decks (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-36 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="w-20 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-3"
              >
                <div className="w-24 h-4 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="w-3/4 h-5 rounded-md bg-slate-200 dark:bg-slate-800" />
                <div className="w-1/2 h-3 rounded-md bg-slate-200 dark:bg-slate-800" />
                <div className="pt-2 flex justify-between items-center">
                  <div className="w-16 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
                  <div className="w-20 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Tasks & AI Insights (1 col) */}
        <div className="space-y-6">
          <div className="rounded-2xl p-5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-4">
            <div className="w-32 h-5 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                  <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-800" />
                  <div className="w-40 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
