export default function StudyPathsLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="w-56 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-80 h-4 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="w-40 h-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Path Cards List */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="w-32 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="w-64 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="w-96 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="w-28 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#263449] space-y-2">
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-900/60" />
              <div className="flex justify-between">
                <div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-16 h-4 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
