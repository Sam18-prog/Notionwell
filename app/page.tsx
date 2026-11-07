'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, User, getStoredTheme, setStoredTheme } from '@/lib/app';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  BookOpen,
  HelpCircle,
  RotateCw,
  Clock,
  Layers,
  Award,
  Flame,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  Bot,
  Brain,
  FileText,
  Search,
  Sun,
  Moon,
  ExternalLink,
  Target,
  Check,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Interactive preview card flip state
  const [previewFlipped, setPreviewFlipped] = useState(false);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());

    const initialTheme = getStoredTheme();
    setTheme(initialTheme);

    const handleAuthChange = () => setUser(getCurrentUser());
    const handleThemeChange = () => setTheme(getStoredTheme());

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const handleToggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    setStoredTheme(next);
  };

  const faqItems = [
    {
      q: 'How does Notionwell turn my lecture notes into flashcards and quizzes?',
      a: 'Simply paste your notes or upload slides and textbooks (PDF, Word, or images). Notionwell analyzes the material, extracts key definitions, equations, and core concepts, and automatically generates high-yield active recall flashcards and practice quizzes.',
    },
    {
      q: 'What is spaced repetition and why is it more effective than cramming?',
      a: 'Spaced repetition uses the scientifically proven SuperMemo SM-2 algorithm to schedule card reviews right before your brain forgets them. Difficult concepts appear more frequently, while mastered topics are spaced further apart, achieving up to 90% long-term memory retention in less study time.',
    },
    {
      q: 'Can I test Notionwell without creating an account?',
      a: 'Yes! Notionwell provides a fully functional, zero-friction Interactive Guest Demo preloaded with a full Computer Networks curriculum (3 decks, 30 cards, 2 quizzes, and 1 mock exam). You can explore without signing up or entering credit card details.',
    },
    {
      q: 'How realistic is the AI Exam Simulator?',
      a: 'The Exam Simulator replicates actual university assessment environments with timed countdowns, multiple choice, true/false, and short-answer questions. It provides instant grading, negative marking calculation, score percentiles, and detailed answer rubrics.',
    },
    {
      q: 'What is the AI Viva Voce oral examination practice?',
      a: 'AI Viva Voce is an intelligent conversational simulator that tests your verbal knowledge defense. The AI asks sequential conceptual questions, listens to your answers, and scores your academic accuracy, depth, and clarity just like a real faculty professor.',
    },
    {
      q: 'Is my study data and uploaded coursework private and secure?',
      a: 'Absolutely. Your notes and flashcards are encrypted and isolated in your private account. Notionwell never sells student data or uses your private coursework to train public AI models.',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B1220] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-blue-500/20 font-sans relative overflow-x-hidden">
      {/* ==================================================================== */}
      {/* ETHEREAL LUMINOUS BACKGROUND AURA (EXACT MATCH TO REFERENCE SCREENSHOT) */}
      {/* ==================================================================== */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1050px] overflow-hidden -z-10 transition-opacity"
        style={{
          background:
            theme === 'dark'
              ? 'radial-gradient(ellipse 110% 85% at 50% 25%, rgba(37, 99, 235, 0.25) 0%, rgba(30, 58, 138, 0.12) 45%, rgba(11, 18, 32, 0) 85%)'
              : 'radial-gradient(ellipse 120% 90% at 50% 18%, #CDE2FE 0%, #DFEEFE 32%, #F1F6FE 65%, #FFFFFF 100%)',
        }}
      >
        {/* Soft atmospheric luminous glow halo behind hero typography */}
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-r from-blue-300/40 via-indigo-200/35 to-blue-200/35 blur-3xl rounded-full pointer-events-none" />
      </div>

      {/* ==================================================================== */}
      {/* TOP NAVIGATION BAR (AIRY, MINIMAL, MATCHING REFERENCE SCREENSHOT) */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-50 bg-white/60 dark:bg-[#0B1220]/75 backdrop-blur-md border-b border-[#E2E8F0]/40 dark:border-[#263449]/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* LOGO & BRAND */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="Notionwell"
              className="w-9 h-9 rounded-xl object-contain shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                Notionwell
              </span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#2563EB] dark:text-[#60A5FA]">
                From Notes to Knowledge
              </span>
            </div>
          </Link>

          {/* DESKTOP NAV LINKS (EXACT 3-LINK TRIO: PRODUCTS, COURSES, PRICING) */}
          <nav className="hidden md:flex items-center gap-10 text-xs sm:text-sm font-semibold text-[#475569] dark:text-[#CBD5E1]">
            <a href="#features" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
              Products
            </a>
            <a href="#curriculum" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
              Courses
            </a>
            <a href="#faq" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors">
              Pricing
            </a>
          </nav>

          {/* TOP RIGHT ACTION PILLS */}
          <div className="flex items-center gap-3">
            {/* THEME TOGGLE */}
            {mounted && (
              <button
                onClick={handleToggleTheme}
                className="p-2 rounded-full border border-[#E2E8F0] dark:border-[#263449] bg-white/80 dark:bg-[#111827]/80 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                aria-label="Toggle Theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-[#2563EB]" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>
            )}

            <Link
              href="/auth"
              className="px-3 py-2 text-xs sm:text-sm font-semibold text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white transition-colors"
            >
              Login
            </Link>

            <Link
              href="/demo"
              className="px-5 py-2 rounded-full border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#111827] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              Get a demo
            </Link>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* SECTION 1: HERO SECTION (PIXEL-PERFECT MATCH TO REFERENCE SCREENSHOT) */}
      {/* ==================================================================== */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7 relative z-10">
          {/* MAIN HEADLINE (MATCHING REFERENCE LINE-BREAK & WEIGHT) */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] leading-[1.12] max-w-4xl mx-auto">
            Unlock your potential with AI- <br className="hidden sm:inline" />
            Powered learning
          </h1>

          {/* SUBTITLE */}
          <p className="text-base sm:text-lg text-[#475569] dark:text-[#CBD5E1] max-w-2xl mx-auto font-normal leading-relaxed">
            Personalised courses and expert-driven insights to help <br className="hidden sm:inline" />
            you master new skills and turn your notes into knowledge.
          </p>

          {/* HERO CALL-TO-ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-1">
            <Link
              href="/auth"
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs sm:text-sm font-semibold shadow-xs hover:scale-[1.01] transition-all cursor-pointer"
            >
              <span>Start Learning</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/demo"
              className="px-6 py-2.5 rounded-full border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#111827] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              Get a demo
            </Link>
          </div>

          {/* ================================================================ */}
          {/* HERO PRODUCT PREVIEW WINDOW (PIXEL-PERFECT MATCH TO SCREENSHOT) */}
          {/* ================================================================ */}
          <div className="pt-6 max-w-5xl mx-auto">
            <div className="rounded-2xl sm:rounded-3xl border border-[#CBD5E1]/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] p-4 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] backdrop-blur-md text-left space-y-5">
              {/* TOP HEADER BAR OF PREVIEW MOCKUP */}
              <div className="flex items-center justify-between gap-4 border-b border-[#F1F5F9] dark:border-[#1E293B] pb-4">
                {/* BRAND LOGO */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <img
                    src="/logo.png"
                    alt="Notionwell"
                    className="w-7 h-7 rounded-lg object-contain shadow-xs"
                  />
                  <span className="font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-[#F8FAFC]">
                    Notionwell
                  </span>
                </div>

                {/* SEARCH INPUT SIMULATION WITH BUTTON (MATCHING SCREENSHOT) */}
                <div className="flex-1 max-w-md mx-2 sm:mx-6">
                  <div className="flex items-center justify-between rounded-lg sm:rounded-xl bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] px-3.5 py-1.5">
                    <div className="flex items-center gap-2 flex-1">
                      <Search className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span className="text-xs text-[#94A3B8] truncate">
                        Search for courses, topics, instructors
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#475569] dark:text-[#CBD5E1] bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] px-2.5 py-0.5 rounded-md shadow-2xs shrink-0 cursor-default">
                      Search
                    </span>
                  </div>
                </div>

                {/* RIGHT ACTIONS: NOTIFICATION BELL & AVATAR (GEORGE) */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative p-1.5 rounded-full text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] cursor-pointer">
                    <div className="w-2 h-2 rounded-full bg-[#2563EB] absolute top-1 right-1" />
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-[#E2E8F0] dark:border-[#334155] bg-[#EFF6FF] dark:bg-[#172554] flex items-center justify-center text-xs font-bold text-[#1D4ED8] shadow-2xs">
                    <span>G</span>
                  </div>
                </div>
              </div>

              {/* MOCKUP BODY: MINI-SIDEBAR + DASHBOARD CONTENT */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* LEFT MINI-SIDEBAR (MATCHING SCREENSHOT LIST) */}
                <div className="hidden md:flex flex-col gap-1.5 md:col-span-1 border-r border-[#F1F5F9] dark:border-[#1E293B] pr-4">
                  <Link
                    href="/dashboard"
                    className="px-3.5 py-2.5 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#60A5FA] font-bold text-xs flex items-center gap-2.5 transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/decks"
                    className="px-3.5 py-2.5 rounded-xl text-[#64748B] dark:text-[#94A3B8] font-medium text-xs flex items-center gap-2.5 hover:bg-[#F8FAFC] dark:hover:bg-[#172033] transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>My Courses</span>
                  </Link>
                  <Link
                    href="/planner"
                    className="px-3.5 py-2.5 rounded-xl text-[#64748B] dark:text-[#94A3B8] font-medium text-xs flex items-center gap-2.5 hover:bg-[#F8FAFC] dark:hover:bg-[#172033] transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Schedule</span>
                  </Link>
                  <Link
                    href="/analytics"
                    className="px-3.5 py-2.5 rounded-xl text-[#64748B] dark:text-[#94A3B8] font-medium text-xs flex items-center gap-2.5 hover:bg-[#F8FAFC] dark:hover:bg-[#172033] transition-colors"
                  >
                    <Award className="w-4 h-4" />
                    <span>Achievements</span>
                  </Link>
                </div>

                {/* RIGHT MAIN CONTENT AREA */}
                <div className="md:col-span-4 space-y-5">
                  {/* GREETING & NEW COURSE BUTTON */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-[#F8FAFC]">
                        Welcome Back, George
                      </h3>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                        Your current progress &amp; activity
                      </p>
                    </div>
                    <span
                      className="px-3.5 py-1.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-default select-none pointer-events-none"
                      aria-hidden="true"
                    >
                      <span>+ New Course</span>
                    </span>
                  </div>

                  {/* 4 STATS CARDS (EXACT METRICS & BADGES AS SCREENSHOT) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* 1. LEARNING HOURS */}
                    <div className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] shadow-xs flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] block">
                          Learning Hours
                        </span>
                        <div className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          42.5
                        </div>
                        <span className="text-[11px] text-[#10B981] font-medium flex items-center gap-0.5">
                          ↑ 12.3% vs last week
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#EFF6FF] dark:bg-[#172554] flex items-center justify-center text-[#2563EB] shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>

                    {/* 2. COMPLETED COURSES */}
                    <div className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] shadow-xs flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] block">
                          Completed Courses
                        </span>
                        <div className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          10
                        </div>
                        <span className="text-[11px] text-[#10B981] font-medium flex items-center gap-0.5">
                          ↑ 2 this month
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#F0FDF4] dark:bg-[#064E3B] flex items-center justify-center text-[#10B981] shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    </div>

                    {/* 3. SKILL POINTS */}
                    <div className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] shadow-xs flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] block">
                          Skill Points
                        </span>
                        <div className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          1,250
                        </div>
                        <span className="text-[11px] text-[#10B981] font-medium flex items-center gap-0.5">
                          ↑ 250 this week
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#FFFBEB] dark:bg-[#451A03] flex items-center justify-center text-[#F59E0B] shrink-0">
                        <Flame className="w-4 h-4 fill-[#F59E0B]" />
                      </div>
                    </div>

                    {/* 4. CURRENT COURSE */}
                    <div className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] shadow-xs space-y-1.5">
                      <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] block">
                        Current Course
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] truncate">
                        Figma design system
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-0.5">
                        <span>Progress</span>
                        <span className="font-semibold text-[#2563EB]">65%</span>
                      </div>
                      <div className="w-full bg-[#E2E8F0] dark:bg-[#263449] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#2563EB] h-full rounded-full w-[65%]" />
                      </div>
                      <span className="text-[10px] text-[#94A3B8] block pt-0.5">⏱ 2.5 hours remaining</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 1.5: INTERACTIVE DEMO PREVIEW (COMPUTER NETWORKS PRELOADED) */}
      {/* ==================================================================== */}
      <section id="curriculum" className="py-12 bg-white dark:bg-[#0B1220]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
            <div>
              <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
                Hands-On Interactive Curriculum
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Preloaded Computer Networks Modules
              </h3>
            </div>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline"
            >
              <span>Launch Full Interactive Guest Demo</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/demo?deck=demo-deck-osi-model"
              className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#111827] hover:border-[#2563EB] transition-all group shadow-xs"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[#2563EB]">10 Flashcards</span>
                <span className="text-[10px] text-[#64748B]">Deck 1</span>
              </div>
              <h5 className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] transition-colors">
                1. OSI Model Architecture
              </h5>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                7 layers, encapsulation &amp; PDU flows
              </p>
            </Link>

            <Link
              href="/demo?deck=demo-deck-tcp-ip"
              className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#111827] hover:border-[#2563EB] transition-all group shadow-xs"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[#2563EB]">10 Flashcards</span>
                <span className="text-[10px] text-[#64748B]">Deck 2</span>
              </div>
              <h5 className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] transition-colors">
                2. TCP/IP &amp; Handshakes
              </h5>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                3-way handshake, TCP flow &amp; congestion
              </p>
            </Link>

            <Link
              href="/demo?deck=demo-deck-routing"
              className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#111827] hover:border-[#2563EB] transition-all group shadow-xs"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[#2563EB]">10 Flashcards</span>
                <span className="text-[10px] text-[#64748B]">Deck 3</span>
              </div>
              <h5 className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] transition-colors">
                3. Routing, DNS &amp; NAT
              </h5>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                OSPF, BGP, DNS hierarchy &amp; CIDR
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 2: HOW NOTIONWELL WORKS (3-STEP VISUAL FLOW) */}
      {/* ==================================================================== */}
      <section id="how-it-works" className="py-20 bg-[#F8FAFC] dark:bg-[#0E1626] border-y border-[#E2E8F0] dark:border-[#263449]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
              Simple 3-Step Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
              From Raw Notes to Permanent Recall
            </h2>
            <p className="text-sm sm:text-base text-[#475569] dark:text-[#CBD5E1]">
              Replace disorganized study binders with an intelligent system engineered around cognitive science.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* STEP 1 */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 space-y-4 shadow-xs relative">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-black text-lg">
                1
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Upload Your Materials
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                Drop lecture PDFs, Word documents, textbook chapters, or handwritten notes. Notionwell
                extracts paragraphs and formulas with grounded accuracy.
              </p>
            </div>

            {/* STEP 2 */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 space-y-4 shadow-xs relative">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-black text-lg">
                2
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                AI Builds Smart Study Decks
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                Instant generation of high-yield active recall flashcards, multiple-choice quizzes, and
                mock exams tailored specifically to your syllabus.
              </p>
            </div>

            {/* STEP 3 */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 space-y-4 shadow-xs relative">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-black text-lg">
                3
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Master with Spaced Repetition
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                Study in 15-minute daily sessions. The SM-2 algorithm serves cards right before you forget
                them, cementing knowledge for exam day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 3: FEATURES GRID (CARDS, EXAMS, VIVA, ANALYTICS) */}
      {/* ==================================================================== */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
              Comprehensive Study Arsenal
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
              Everything You Need to Ace Your Exams
            </h2>
            <p className="text-sm sm:text-base text-[#475569] dark:text-[#CBD5E1]">
              Engineered for university students, certification candidates, and lifelong learners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* FEATURE 1: AI FLASHCARDS */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 space-y-4 shadow-xs hover:border-[#2563EB] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Active Recall Flashcards
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                Every flashcard is grounded in your source notes. Easily flip, bookmark, and review cards
                with keyboard shortcuts on desktop or swipe on mobile.
              </p>
            </div>

            {/* FEATURE 2: GRADED QUIZZES */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 space-y-4 shadow-xs hover:border-[#2563EB] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] dark:bg-[#064E3B] text-[#10B981] flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Smart Graded Quizzes
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                Multi-choice practice tests with instant automated rationale. Understand exactly why an
                answer is correct and learn from your mistakes.
              </p>
            </div>

            {/* FEATURE 3: SM-2 SPACED REPETITION */}
            <div id="spaced-repetition" className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 space-y-4 shadow-xs hover:border-[#2563EB] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] dark:bg-[#450A0A] text-[#EF4444] flex items-center justify-center">
                <RotateCw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                SuperMemo SM-2 Science
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                Dynamically tunes review intervals based on card difficulty. Eliminate the stress of
                last-minute cramming with automated daily reviews.
              </p>
            </div>

            {/* FEATURE 4: AI EXAM SIMULATOR */}
            <div id="exam-simulator" className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 space-y-4 shadow-xs hover:border-[#2563EB] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] dark:bg-[#451A03] text-[#F59E0B] flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Realistic Exam Simulator
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                Timed mock exams with realistic countdown clocks, negative marking options, and automated
                evaluation rubrics so you enter test day confident.
              </p>
            </div>

            {/* FEATURE 5: AI VIVA VOCE PREP */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 space-y-4 shadow-xs hover:border-[#2563EB] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] dark:bg-[#2E1065] text-[#8B5CF6] flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                AI Viva Voce Defense Prep
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                Practice answering oral questions out loud. The AI evaluates your depth, clarity, and
                academic terminology to prep you for professor inquiries.
              </p>
            </div>

            {/* FEATURE 6: WEAK-TOPIC DETECTION */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 space-y-4 shadow-xs hover:border-[#2563EB] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] dark:bg-[#064E3B] text-[#059669] flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Weak-Topic Diagnostics
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                Continuous performance analysis automatically pinpoints weak topics and generates targeted
                remedial exercises to close knowledge gaps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 8: FAQ ACCORDION */}
      {/* ==================================================================== */}
      <section id="faq" className="py-20 bg-[#F8FAFC] dark:bg-[#0E1626] border-y border-[#E2E8F0] dark:border-[#263449]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
              Got Questions? We Have Answers.
            </h2>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl overflow-hidden shadow-xs transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-[#F8FAFC]"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-[#2563EB] shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#94A3B8] shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed border-t border-[#F1F5F9] dark:border-[#1E293B] pt-4 animate-in fade-in duration-200">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 9: FINAL CALL TO ACTION (CTA) */}
      {/* ==================================================================== */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] p-8 sm:p-14 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
            <div className="space-y-3 relative z-10">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                Ready to Master Your Coursework?
              </h2>
              <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto">
                Join thousands of students turning lecture notes into high scores with intelligent spaced
                repetition and AI exam preparation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 relative z-10">
              <Link
                href="/demo"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-[#1D4ED8] font-extrabold text-sm shadow-md hover:bg-blue-50 transition-all hover:scale-[1.01]"
              >
                Try Interactive Demo (No Sign Up)
              </Link>

              <Link
                href="/auth?tab=signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-blue-900/40 hover:bg-blue-900/60 border border-white/20 text-white font-extrabold text-sm transition-all"
              >
                Create Student Account
              </Link>
            </div>

            <p className="text-xs text-blue-200 relative z-10 font-medium">
              Free forever tier • Zero setup required • Works on all devices
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 10: MODERN COMPREHENSIVE FOOTER */}
      {/* ==================================================================== */}
      <footer className="border-t border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0B1220] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* BRAND COLUMN */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Notionwell"
                className="w-8 h-8 rounded-xl object-contain shadow-xs"
              />
              <span className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                Notionwell
              </span>
            </Link>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Notionwell — From Notes to Knowledge. Spaced repetition, smart flashcards, and realistic AI
              exam simulation for students everywhere.
            </p>
          </div>

          {/* PRODUCT */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
              Product
            </h4>
            <ul className="space-y-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
              <li>
                <Link href="/demo" className="hover:text-[#2563EB]">
                  Interactive Guest Demo
                </Link>
              </li>
              <li>
                <Link href="/decks" className="hover:text-[#2563EB]">
                  Study Decks &amp; Flashcards
                </Link>
              </li>
              <li>
                <Link href="/exam" className="hover:text-[#2563EB]">
                  AI Exam Simulator
                </Link>
              </li>
              <li>
                <Link href="/review" className="hover:text-[#2563EB]">
                  Spaced Repetition Hub
                </Link>
              </li>
              <li>
                <Link href="/viva" className="hover:text-[#2563EB]">
                  Oral Viva Voce Prep
                </Link>
              </li>
            </ul>
          </div>

          {/* RESOURCES */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
              Resources
            </h4>
            <ul className="space-y-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
              <li>
                <a href="#how-it-works" className="hover:text-[#2563EB]">
                  How Notionwell Works
                </a>
              </li>
              <li>
                <a href="#spaced-repetition" className="hover:text-[#2563EB]">
                  SuperMemo SM-2 Science
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#2563EB]">
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Sam18-prog/Notionwell.git"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#2563EB] flex items-center gap-1"
                >
                  GitHub Repository <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* LEGAL & COMPANY */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
              Company &amp; Legal
            </h4>
            <ul className="space-y-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
              <li>
                <Link href="/privacy" className="hover:text-[#2563EB]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#2563EB]">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/auth?tab=signup" className="hover:text-[#2563EB]">
                  Student Registration
                </Link>
              </li>
              <li>
                <Link href="/auth" className="hover:text-[#2563EB]">
                  Member Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-[#F1F5F9] dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between text-xs text-[#94A3B8] gap-4">
          <p>&copy; {new Date().getFullYear()} Notionwell. All rights reserved. From Notes to Knowledge.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <a href="https://github.com/Sam18-prog/Notionwell.git" target="_blank" rel="noreferrer" className="hover:underline">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
