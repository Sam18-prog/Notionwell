'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Public marketing & auth pages that should NOT have the internal dashboard sidebar
  const isPublicPage =
    pathname === '/' ||
    pathname === '/auth' ||
    pathname === '/terms' ||
    pathname === '/privacy';

  if (isPublicPage) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-[#0B1220]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* REUSABLE COLLAPSIBLE SIDEBAR */}
      <Sidebar />

      {/* MAIN APP CONTENT AREA — OFFSET NEXT TO FIXED SIDEBAR */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-[#E2E8F0] dark:border-[#263449] py-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8] bg-[#F6F8FC] dark:bg-[#0B1220]">
          <p>Notionwell &copy; {new Date().getFullYear()} — From Notes to Knowledge</p>
        </footer>
      </div>
    </div>
  );
}
