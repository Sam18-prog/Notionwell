export default function DecksLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="w-48 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-72 h-4 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-36 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-28 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>

      {/* Decks Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-3xl p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="w-20 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-2">
              <div className="w-3/4 h-5 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="w-1/2 h-3.5 rounded-md bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#263449] flex items-center justify-between">
              <div className="w-20 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="w-24 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
