'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error details to console
    console.error('[Application Error Boundary caught]:', {
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F8FAFC] dark:bg-[#0A0F1D] text-[#0F172A] dark:text-[#F8FAFC]">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] shadow-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black">Something went wrong</h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            An unexpected error occurred while rendering this page. Your study data and progress remain safe in your account.
          </p>
        </div>

        {error?.digest && (
          <div className="text-[11px] font-mono text-[#94A3B8] px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            Error Reference: {error.digest}
          </div>
        )}

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#CBD5E1] dark:border-[#334155] hover:border-[#2563EB] text-xs font-bold transition-all text-[#64748B] dark:text-[#CBD5E1]"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
