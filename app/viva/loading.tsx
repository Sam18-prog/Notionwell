export default function VivaLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] flex items-center justify-between">
        <div className="space-y-3">
          <div className="w-48 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="w-72 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-96 h-4 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="w-36 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Oral Examiner Arena Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl p-8 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] min-h-[400px] flex flex-col justify-between space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="w-32 h-5 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
          <div className="space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40">
            <div className="w-full h-4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-4/5 h-4 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="flex items-center justify-center pt-4 border-t border-[#E2E8F0] dark:border-[#263449]">
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        <div className="rounded-3xl p-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-4">
          <div className="w-36 h-6 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-900/40" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
