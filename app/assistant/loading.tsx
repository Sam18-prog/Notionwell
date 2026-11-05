export default function AssistantLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] -mt-4 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden bg-[#F6F8FC] dark:bg-[#0B1220] animate-pulse">
      {/* Top Header */}
      <div className="h-14 px-6 bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#263449] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-48 h-5 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-28 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* 3-Column Studio Layout Skeleton */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Sources (Hidden on Mobile) */}
        <div className="hidden md:flex w-72 flex-col bg-white dark:bg-[#0F172A] border-r border-[#E2E8F0] dark:border-[#263449] p-4 space-y-4">
          <div className="w-32 h-5 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="w-full h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 space-y-2">
                <div className="w-3/4 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-1/2 h-3 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Center Column: Chat Stream */}
        <div className="flex-1 flex flex-col justify-between p-6 space-y-6">
          <div className="space-y-4 max-w-2xl mx-auto w-full">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="w-3/4 h-20 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] p-4" />
            </div>
            <div className="flex items-start gap-3 justify-end">
              <div className="w-2/3 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 p-4" />
            </div>
          </div>
          <div className="max-w-2xl mx-auto w-full h-12 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449]" />
        </div>

        {/* Right Column: Studio Tools */}
        <div className="hidden lg:flex w-80 flex-col bg-white dark:bg-[#0F172A] border-l border-[#E2E8F0] dark:border-[#263449] p-4 space-y-4">
          <div className="w-28 h-5 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-900/60" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
