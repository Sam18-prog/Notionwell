'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logoutUser, getStoredTheme, setStoredTheme, User } from '@/lib/app';
import { GraduationCap, PlusCircle, LayoutDashboard, LogIn, LogOut, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    const syncUser = () => setUser(getCurrentUser());
    syncUser();

    const initialTheme = getStoredTheme();
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const syncTheme = () => {
      setTheme(getStoredTheme());
    };

    window.addEventListener('auth-change', syncUser);
    window.addEventListener('theme-change', syncTheme);
    return () => {
      window.removeEventListener('auth-change', syncUser);
      window.removeEventListener('theme-change', syncTheme);
    };
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    router.push('/auth');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#263449] shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="Notionwell"
            className="w-9 h-9 rounded-xl shadow-xs group-hover:scale-105 transition-transform duration-200 object-contain"
          />
          <div className="flex flex-col">
            <span className="font-extrabold text-base leading-none text-[#0F172A] dark:text-[#F8FAFC]">
              Notionwell
            </span>
            <span className="text-[10px] text-[#2563EB] dark:text-[#3B82F6] font-bold tracking-wider uppercase mt-0.5">
              SMART STUDY PLATFORM
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/create"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white shadow-xs transition-all hover:scale-[1.01]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Deck</span>
          </Link>

          {/* LIGHT / DARK THEME TOGGLE BUTTON */}
          {mounted && (
            <button
              onClick={handleToggleTheme}
              className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] transition-all flex items-center gap-1.5 text-xs font-semibold shadow-xs"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-[#2563EB]" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              )}
            </button>
          )}

          {mounted && user ? (
            <div className="flex items-center gap-2.5 border-l border-[#E2E8F0] dark:border-[#263449] pl-3 ml-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] flex items-center justify-center font-bold text-xs text-[#2563EB] dark:text-[#60A5FA] uppercase">
                  {user.name.slice(0, 2)}
                </div>
                <span className="hidden md:block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  {user.name}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-xl text-[#64748B] dark:text-[#94A3B8] hover:text-[#EF4444] dark:hover:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A] transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
