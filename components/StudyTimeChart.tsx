'use client';

import { useEffect, useState } from 'react';
import { getDailyStudyTimeLastNDays } from '@/lib/app';
import { Clock } from 'lucide-react';

export default function StudyTimeChart({ detailed = false }: { detailed?: boolean }) {
  const [data, setData] = useState<
    Array<{
      dateStr: string;
      dayLabel: string;
      durationSeconds: number;
      durationMinutes: number;
    }>
  >([]);
  const [maxMinutes, setMaxMinutes] = useState(60);

  useEffect(() => {
    const dailyData = getDailyStudyTimeLastNDays(7);
    setData(dailyData);

    const maxMins = Math.max(
      60, // Fixed 60-minute reference benchmark ceiling
      ...dailyData.map((d) => d.durationMinutes)
    );
    setMaxMinutes(maxMins);
  }, []);

  const totalMinutesThisWeek = data.reduce((acc, d) => acc + d.durationMinutes, 0);

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
              7-Day Study Time Activity
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Total: {totalMinutesThisWeek} study mins logged this week
            </p>
          </div>
        </div>

        {detailed && (
          <span className="text-xs font-mono font-bold text-[#2563EB] dark:text-[#60A5FA] bg-[#EFF6FF] dark:bg-[#172554] px-2.5 py-1 rounded-lg border border-[#DBEAFE] dark:border-[#1E3A8A]">
            {Math.round((totalMinutesThisWeek / 60) * 10) / 10} hrs total
          </span>
        )}
      </div>

      {/* PURE CSS BAR CHART WITH 60-MINUTE REFERENCE SCALING */}
      <div className="pt-4 pb-2">
        <div className="h-36 sm:h-40 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-[#E2E8F0] dark:border-[#263449]">
          {data.map((day) => {
            const heightPercent =
              day.durationMinutes > 0
                ? Math.min(
                    100,
                    Math.max(6, Math.round((day.durationMinutes / maxMinutes) * 100))
                  )
                : 0;

            return (
              <div
                key={day.dateStr}
                className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative"
              >
                {/* TOOLTIP ON HOVER */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0F172A] dark:bg-[#F8FAFC] text-white dark:text-[#0F172A] text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap shadow-md z-20">
                  {day.durationMinutes} mins ({day.dateStr})
                </div>

                {/* BAR COLUMN */}
                <div className="w-full bg-[#F1F5F9] dark:bg-[#172033] rounded-t-xl h-full flex items-end overflow-hidden p-0.5">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      day.durationMinutes > 0
                        ? 'bg-[#2563EB] dark:bg-[#3B82F6] group-hover:bg-[#1D4ED8] dark:group-hover:bg-[#60A5FA]'
                        : 'bg-transparent'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* X-AXIS LABELS */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-2 mt-2">
          {data.map((day) => (
            <div
              key={day.dateStr}
              className="flex-1 text-center text-xs font-bold text-[#64748B] dark:text-[#94A3B8]"
            >
              <span>{day.dayLabel}</span>
              {detailed && (
                <div className="text-[10px] text-[#94A3B8] dark:text-[#64748B] font-medium">
                  {day.durationMinutes}m
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
