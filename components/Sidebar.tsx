'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  getCurrentUser,
  logoutUser,
  getStoredTheme,
  setStoredTheme,
  User,
} from '@/lib/app';
import {
  Sparkles,
  LayoutDashboard,
  Folder,
  Layers,
  HelpCircle,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogIn,
  PlusCircle,
  GraduationCap,
  Bot,
  RotateCw,
  Route,
  AlertCircle,
  Mic,
} from 'lucide-react';
import SettingsModal from '@/components/SettingsModal';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Sidebar layout states
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard' || pathname === '/',
    },
    {
      label: 'AI Study Assistant',
      href: '/assistant',
      icon: Bot,
      active: pathname.startsWith('/assistant'),
    },
    {
      label: 'My Study Decks',
      href: '/decks',
      icon: Folder,
      active: pathname.startsWith('/decks') && !pathname.includes('tab=quiz') && !pathname.includes('tab=flashcards'),
    },
    {
      label: 'Flashcards',
      href: '/decks?tab=flashcards',
      icon: Layers,
      active: pathname.startsWith('/decks') && pathname.includes('tab=flashcards'),
    },
    {
      label: 'Quizzes',
      href: '/decks?tab=quizzes',
      icon: HelpCircle,
      active: pathname.startsWith('/decks') && pathname.includes('tab=quizzes'),
    },
    {
      label: 'Exam Simulator',
      href: '/exam',
      icon: GraduationCap,
      active: pathname.startsWith('/exam'),
    },
    {
      label: 'Study Paths',
      href: '/study-paths',
      icon: Route,
      active: pathname.startsWith('/study-paths'),
    },
    {
      label: 'Weak Topics',
      href: '/weak-topics',
      icon: AlertCircle,
      active: pathname.startsWith('/weak-topics'),
    },
    {
      label: 'AI Viva Prep',
      href: '/viva',
      icon: Mic,
      active: pathname.startsWith('/viva'),
    },
    {
      label: 'Review Hub',
      href: '/review',
      icon: RotateCw,
      active: pathname.startsWith('/review'),
    },
    {
      label: 'Study Planner',
      href: '/planner',
      icon: Calendar,
      active: pathname.startsWith('/planner'),
    },
    {
      label: 'Analytics',
      href: '/insights',
      icon: BarChart3,
      active: pathname.startsWith('/insights'),
    },
  ];

  return (
    <>
      {/* MOBILE TOP BAR (Narrow Viewports) */}
      <div className="lg:hidden bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#263449] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Notionwell"
            className="w-8 h-8 rounded-xl object-contain shadow-xs"
          />
          <div className="flex flex-col">
            <span className="font-extrabold text-base leading-none text-[#0F172A] dark:text-[#F8FAFC]">
              Notionwell
            </span>
            <span className="text-[9px] text-[#2563EB] dark:text-[#3B82F6] font-bold tracking-wider uppercase mt-0.5">
              From Notes to Knowledge
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/create"
            className="p-2 rounded-xl bg-[#2563EB] text-white shadow-xs"
            title="Create New Deck"
          >
            <PlusCircle className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#334155] dark:text-[#CBD5E1]"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER BACKDROP OVERLAY */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white dark:bg-[#0F172A] border-r border-[#E2E8F0] dark:border-[#263449] flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen
            ? 'translate-x-0 w-64 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* TOP SECTION: BRAND + ACTION BUTTON */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-210px)]">
          {/* BRAND LOGO */}
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 overflow-hidden group">
              <img
                src="/logo.png"
                alt="Notionwell"
                className="w-10 h-10 rounded-2xl object-contain shrink-0 shadow-xs group-hover:scale-105 transition-transform"
              />

              {!isCollapsed && (
                <div className="flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300">
                  <span className="font-extrabold text-base leading-none text-[#0F172A] dark:text-[#F8FAFC]">
                    Notionwell
                  </span>
                  <span className="text-[9px] text-[#2563EB] dark:text-[#3B82F6] font-bold tracking-wider uppercase mt-1">
                    From Notes to Knowledge
                  </span>
                </div>
              )}
            </Link>

            {/* DESKTOP COLLAPSE/EXPAND TOGGLE BUTTON */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* PRIMARY CTA: "+ GENERATE WITH AI" */}
          <Link
            href="/create"
            className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] dark:from-[#3B82F6] dark:to-[#2563EB] hover:opacity-95 text-white font-extrabold transition-all shadow-md hover:scale-[1.01] ${
              isCollapsed ? 'p-3' : 'px-4 py-3 w-full'
            }`}
            title="Generate Study Deck with AI"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="text-xs whitespace-nowrap tracking-wide">Generate with AI</span>}
          </Link>

          {/* PRIMARY NAV LINKS LIST */}
          <nav className="space-y-1 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    item.active
                      ? 'bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] border-l-4 border-[#2563EB] dark:border-[#3B82F6] font-bold'
                      : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#172033]'
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

            {/* SETTINGS NAV LINK */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="w-full group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#172033] transition-all text-left"
            >
              <Settings className="w-4 h-4 shrink-0 text-[#64748B] dark:text-[#94A3B8] group-hover:text-[#0F172A] dark:hover:text-white" />
              {!isCollapsed && <span className="whitespace-nowrap">Settings & Profile</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#0F172A] dark:bg-[#F8FAFC] text-white dark:text-[#0F172A] text-xs font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-md">
                  Settings
                </div>
              )}
            </button>
          </nav>
        </div>

        {/* BOTTOM SECTION: THEME TOGGLE, USER PROFILE */}
        <div className="p-3 border-t border-[#E2E8F0] dark:border-[#263449] space-y-2 bg-[#F8FAFC]/50 dark:bg-[#172033]/50">
          {/* THEME TOGGLE */}
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

          {/* USER PROFILE CARD */}
          {user ? (
            <div className="flex items-center justify-between p-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#111827]">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 overflow-hidden text-left flex-1"
                title="Open Settings"
              >
                <div className="w-7 h-7 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] flex items-center justify-center font-extrabold text-[11px] text-[#2563EB] dark:text-[#60A5FA] uppercase shrink-0">
                  {user.name ? user.name.slice(0, 2) : 'ST'}
                </div>

                {!isCollapsed && (
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate">
                      {user.email}
                    </span>
                  </div>
                )}
              </button>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#EF4444] dark:hover:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A] transition-colors shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors shadow-xs"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Sign In</span>}
            </Link>
          )}
        </div>
      </aside>

      {/* GLOBAL SETTINGS MODAL */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
