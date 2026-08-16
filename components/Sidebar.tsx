'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  getCurrentUser,
  logoutUser,
  resetAllAppData,
  getStoredTheme,
  setStoredTheme,
  User,
} from '@/lib/app';
import {
  GraduationCap,
  PlusCircle,
  LayoutDashboard,
  Folder,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogIn,
  Calendar,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import Stopwatch from '@/components/Stopwatch';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Sidebar states
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Reset Demo Data confirmation modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

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

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

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

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      label: 'My Subject Decks',
      href: '/decks',
      icon: Folder,
      active: pathname.startsWith('/decks'),
    },
    {
      label: 'Study Planner',
      href: '/planner',
      icon: Calendar,
      active: pathname.startsWith('/planner'),
    },
    {
      label: 'Insights',
      href: '/insights',
      icon: BarChart3,
      active: pathname.startsWith('/insights'),
    },
  ];

  if (!mounted) return null;

  return (
    <>
      {/* MOBILE TOP BAR (Narrow Viewports) */}
      <div className="lg:hidden bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#263449] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            Notionwell
          </span>
        </Link>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#334155] dark:text-[#CBD5E1]"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER BACKDROP OVERLAY */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white dark:bg-[#0F172A] border-r border-[#E2E8F0] dark:border-[#263449] flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* TOP SECTION: BRAND + ACTION BUTTON */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]">
          {/* BRAND LOGO */}
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>

              {!isCollapsed && (
                <div className="flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300">
                  <span className="font-extrabold text-base leading-none text-[#0F172A] dark:text-[#F8FAFC]">
                    Notionwell
                  </span>
                  <span className="text-[9px] text-[#2563EB] dark:text-[#3B82F6] font-extrabold tracking-wider uppercase mt-1">
                    SMART STUDY PLATFORM
                  </span>
                </div>
              )}
            </Link>

            {/* DESKTOP COLLAPSE/EXPAND TOGGLE BUTTON */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* DISTINCT "+ NEW DECK" ACTION BUTTON */}
          <Link
            href="/create"
            className={`flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-bold transition-all shadow-xs hover:scale-[1.01] ${
              isCollapsed ? 'p-3' : 'px-4 py-3 w-full'
            }`}
            title="Create New Study Deck"
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="text-sm whitespace-nowrap">+ New Deck</span>}
          </Link>

          {/* PRIMARY NAV LINKS LIST */}
          <nav className="space-y-1.5 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                    item.active
                      ? 'bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] border-l-4 border-[#2563EB] dark:border-[#3B82F6]'
                      : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#172033]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      item.active
                        ? 'text-[#2563EB] dark:text-[#60A5FA]'
                        : 'text-[#64748B] dark:text-[#94A3B8] group-hover:text-[#0F172A] dark:group-hover:text-white'
                    }`}
                  />

                  {!isCollapsed && (
                    <span className="whitespace-nowrap">{item.label}</span>
                  )}

                  {/* HOVER TOOLTIP IN COLLAPSED MODE */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#0F172A] dark:bg-[#F8FAFC] text-white dark:text-[#0F172A] text-xs font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-md">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM SECTION: STOPWATCH WIDGET, THEME TOGGLE, USER PROFILE */}
        <div className="p-3 border-t border-[#E2E8F0] dark:border-[#263449] space-y-2.5 bg-[#F8FAFC]/50 dark:bg-[#172033]/50">
          {/* MANUAL STOPWATCH WIDGET */}
          <Stopwatch isCollapsed={isCollapsed} />

          {/* DARK / LIGHT THEME TOGGLE */}
          <button
            onClick={handleToggleTheme}
            className="w-full flex items-center justify-between p-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white transition-all text-xs font-semibold shadow-xs"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            <div className="flex items-center gap-2">
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-[#2563EB] shrink-0" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              {!isCollapsed && (
                <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-[#94A3B8]">
                {theme}
              </span>
            )}
          </button>

          {/* USER PROFILE & LOGOUT */}
          {user ? (
            <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0] dark:border-[#263449]">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] flex items-center justify-center font-bold text-[11px] text-[#2563EB] dark:text-[#60A5FA] uppercase shrink-0">
                  {user.name ? user.name.slice(0, 2) : 'DE'}
                </div>

                {!isCollapsed && (
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                      {user.name}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="p-1 rounded-xl text-[#64748B] dark:text-[#94A3B8] hover:text-[#EF4444] dark:hover:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A] transition-colors shrink-0"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] transition-colors"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Sign In / Register</span>}
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
