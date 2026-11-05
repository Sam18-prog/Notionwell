import Link from 'next/link';
import { HelpCircle, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F8FAFC] dark:bg-[#0A0F1D] text-[#0F172A] dark:text-[#F8FAFC]">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] shadow-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center mx-auto shadow-xs">
          <HelpCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="text-3xl font-black text-[#2563EB]">404</div>
          <h2 className="text-xl font-bold">Page Not Found</h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            The study page or resource you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#111827] text-xs font-bold shadow-xs hover:bg-[#F8FAFC] transition-all"
          >
            <Home className="w-4 h-4 text-[#2563EB]" />
            <span>Home</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md transition-all"
          >
            <span>Dashboard</span>
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
