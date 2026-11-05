'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signUpUserWithSupabase,
  signInUserWithSupabase,
  resetPasswordWithSupabase,
  initSupabaseAuthListener,
} from '@/lib/supabase/auth';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  GraduationCap,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  CheckCircle2,
} from 'lucide-react';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get('redirect') || '/';
  const urlError = searchParams?.get('error');

  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(
    urlError ? 'Authentication session expired or invalid. Please sign in.' : null
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initSupabaseAuthListener();

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          router.push(redirectTarget);
        }
      });
    }
  }, [router, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (tab === 'forgot') {
        if (!email.trim()) {
          setError('Please enter your account email address.');
          setLoading(false);
          return;
        }

        const res = await resetPasswordWithSupabase(email);
        if (res.success) {
          setSuccessMsg('Password reset link sent! Please check your email inbox.');
        } else {
          setError(res.error || 'Failed to send password reset email.');
        }
        setLoading(false);
        return;
      }

      if (tab === 'login') {
        if (!email.trim() || !password) {
          setError('Please provide both email and password.');
          setLoading(false);
          return;
        }

        const res = await signInUserWithSupabase(email, password);
        if (res.success && res.user) {
          router.push(redirectTarget);
          router.refresh();
        } else {
          setError(res.error || 'Invalid email or password.');
          setLoading(false);
        }
        return;
      }

      if (tab === 'signup') {
        if (!name.trim()) {
          setError('Please provide your full name.');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }

        const res = await signUpUserWithSupabase(name, email, password);
        if (res.success) {
          if (res.needsEmailVerification) {
            setSuccessMsg(
              `Account created! A confirmation email has been sent to ${email}. Please verify your email before logging in.`
            );
            setTab('login');
            setLoading(false);
          } else {
            router.push(redirectTarget);
            router.refresh();
          }
        } else {
          setError(res.error || 'Registration failed. Please try again.');
          setLoading(false);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error.');
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Set isolated guest demo cookie recognized by middleware
    document.cookie = 'notionwell_demo_session=1; path=/; max-age=86400; SameSite=Lax';

    // Dispatch auth update for client state
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }

    router.push(redirectTarget);
    router.refresh();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 shadow-xs relative overflow-hidden">
        <div className="text-center relative z-10">
          <img
            src="/logo.png"
            alt="Notionwell"
            className="w-16 h-16 rounded-2xl mx-auto shadow-md mb-4 object-contain"
          />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            {tab === 'login'
              ? 'Student Sign In'
              : tab === 'signup'
              ? 'Create Student Account'
              : 'Reset Account Password'}
          </h2>
          <p className="text-[#475569] dark:text-[#CBD5E1] text-xs sm:text-sm mt-1 font-medium">
            {tab === 'login'
              ? 'Sign in to access your cloud study decks and spaced repetition'
              : tab === 'signup'
              ? 'Start synthesizing intelligent study decks with Notionwell AI'
              : 'Enter your email to receive a password reset link'}
          </p>
        </div>

        {/* 1-CLICK DEMO LOGIN (ISOLATED GUEST EXPERIENCE) */}
        <div className="bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] rounded-2xl p-4 flex items-center justify-between text-xs shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-[#2563EB] dark:text-[#60A5FA] font-bold">
              <Zap className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
              <span>Explore Demo Mode:</span>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Guest preview with local sample decks (offline)
            </p>
          </div>
          <button
            onClick={handleDemoLogin}
            type="button"
            className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-bold transition-all shadow-xs shrink-0"
          >
            Guest Demo
          </button>
        </div>

        {tab !== 'forgot' && (
          <div className="flex rounded-2xl bg-[#F8FAFC] dark:bg-[#172033] p-1.5 border border-[#E2E8F0] dark:border-[#263449]">
            <button
              onClick={() => {
                setTab('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                tab === 'login'
                  ? 'bg-[#2563EB] dark:bg-[#3B82F6] text-white shadow-xs'
                  : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                tab === 'signup'
                  ? 'bg-[#2563EB] dark:bg-[#3B82F6] text-white shadow-xs'
                  : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div className="bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#EF4444] dark:border-[#F87171] rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-[#EF4444] dark:text-[#F87171]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-[#ECFDF5] dark:bg-[#064E3B] border border-[#10B981] dark:border-[#34D399] rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-[#065F46] dark:text-[#A7F3D0]">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {tab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Password (Min 6 chars)
                </label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-extrabold text-sm shadow-xs transition-all flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
          >
            <span>
              {loading
                ? 'Processing...'
                : tab === 'login'
                ? 'Sign In'
                : tab === 'signup'
                ? 'Create Account'
                : 'Send Reset Link'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {tab === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className="w-full py-2 text-xs font-bold text-[#475569] dark:text-[#CBD5E1] hover:underline"
            >
              ← Back to Sign In
            </button>
          )}
        </form>

        <div className="text-center text-xs text-[#64748B] dark:text-[#94A3B8] pt-2 border-t border-[#E2E8F0] dark:border-[#263449] font-medium">
          Protected by Supabase Auth & PostgreSQL Row-Level Security
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-[#0F172A] dark:text-[#F8FAFC] text-sm">
          Loading Authentication...
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
