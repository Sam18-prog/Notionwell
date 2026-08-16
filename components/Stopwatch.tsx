'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Clock, Save } from 'lucide-react';
import { getTotalStudySeconds } from '@/lib/app';
import {
  getGlobalTimerState,
  startGlobalTimer,
  pauseGlobalTimer,
  resetAndSaveGlobalTimer,
} from '@/lib/timer';

export default function Stopwatch({ isCollapsed }: { isCollapsed?: boolean }) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [totalAccumulated, setTotalAccumulated] = useState(0);

  useEffect(() => {
    setTotalAccumulated(getTotalStudySeconds());

    const initial = getGlobalTimerState();
    setSeconds(initial.seconds);
    setIsRunning(initial.isRunning);

    const handleTimerUpdate = (e: any) => {
      if (e.detail) {
        setSeconds(e.detail.seconds);
        setIsRunning(e.detail.isRunning);
      }
    };

    window.addEventListener('study-timer-update', handleTimerUpdate);
    return () => {
      window.removeEventListener('study-timer-update', handleTimerUpdate);
    };
  }, []);

  const handleToggleTimer = () => {
    if (isRunning) {
      pauseGlobalTimer();
    } else {
      startGlobalTimer();
    }
  };

  const handleSaveAndReset = () => {
    resetAndSaveGlobalTimer();
    setTotalAccumulated(getTotalStudySeconds());
  };

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (isCollapsed) {
    return (
      <div
        className="p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6] cursor-pointer shadow-xs"
        onClick={handleToggleTimer}
        title={`Study Timer: ${formatTime(seconds)} (${isRunning ? 'Click to Pause' : 'Click to Start'})`}
      >
        <Clock className={`w-4 h-4 ${isRunning ? 'animate-spin text-amber-500' : ''}`} />
      </div>
    );
  }

  return (
    <div className="p-3 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] space-y-2 shadow-xs">
      <div className="flex items-center justify-between text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
        <span className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#3B82F6]" />
          <span>Study Timer</span>
        </span>
        <span className="font-mono text-xs text-[#2563EB] dark:text-[#60A5FA]">
          {formatTime(seconds)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={handleToggleTimer}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 text-white shadow-xs ${
            isRunning
              ? 'bg-[#F59E0B] hover:bg-[#D97706]'
              : 'bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6]'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-white" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start</span>
            </>
          )}
        </button>

        {seconds > 0 && (
          <button
            onClick={handleSaveAndReset}
            className="p-1.5 rounded-xl bg-[#ECFDF5] dark:bg-[#052E2B] border border-[#A7F3D0] dark:border-[#065F46] text-[#10B981] hover:bg-[#10B981] hover:text-white transition-all shadow-xs"
            title="Save & Reset Timer"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {totalAccumulated > 0 && (
        <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-medium text-center pt-0.5">
          Total Logged: {formatTime(totalAccumulated)}
        </div>
      )}
    </div>
  );
}
