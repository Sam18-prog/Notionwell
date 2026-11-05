export default function ConnectionsLoading() {
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

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="w-32 h-6 rounded bg-slate-200 dark:bg-slate-800" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl p-4 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] space-y-2">
              <div className="w-20 h-4 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="w-48 h-5 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] min-h-[350px] space-y-4">
          <div className="w-56 h-7 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2 pt-4">
            <div className="w-full h-4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-5/6 h-4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-4/6 h-4 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
