export default function DeckDetailLoading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#263449]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-16 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="w-24 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="w-64 h-7 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-28 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-32 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>

      {/* Big 3D Flashcard Skeleton Box */}
      <div className="rounded-3xl p-8 sm:p-12 bg-white dark:bg-[#111827] border-2 border-[#E2E8F0] dark:border-[#263449] min-h-[360px] flex flex-col justify-between space-y-6">
        <div className="flex items-center justify-between">
          <div className="w-24 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="space-y-3 py-8 text-center max-w-lg mx-auto w-full flex flex-col items-center">
          <div className="w-4/5 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="w-3/5 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0] dark:border-[#263449]">
          <div className="w-32 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="w-28 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
