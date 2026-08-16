'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUser, signupUser, demoLoginUser, getCurrentUser } from '@/lib/app';
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
} from 'lucide-react';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get('redirect') || '/';

  const [tab, setTab] = useState<'login' | 'signup'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (current) {
      router.push(redirectTarget);
    }
  }, [router, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await loginUser(email, password);
        if (!res.success) {
          setError(res.error || 'Login failed.');
          setLoading(false);
          if (res.noAccount) {
            setTab('signup');
          }
        } else {
          router.push(redirectTarget);
        }
      } else {
        const res = await signupUser(name, email, password, confirmPassword);
        if (!res.success) {
          setError(res.error || 'Signup failed.');
          setLoading(false);
          if (res.accountExists) {
            setTab('login');
          }
        } else {
          router.push(redirectTarget);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error.');
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    const res = await demoLoginUser();
    if (res.success) {
      router.push(redirectTarget);
    } else {
      setError(res.error || 'Demo login failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 shadow-xs relative overflow-hidden">
        <div className="text-center relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center mx-auto shadow-xs mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            {tab === 'login' ? 'Student Sign In' : 'Create Student Account'}
          </h2>
          <p className="text-[#475569] dark:text-[#CBD5E1] text-xs sm:text-sm mt-1 font-medium">
            {tab === 'login'
              ? 'Sign in to access your study decks and spaced repetition progress'
              : 'Start synthesizing intelligent study decks with Notionwell AI'}
          </p>
        </div>

        <div className="bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] rounded-2xl p-4 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2 text-[#2563EB] dark:text-[#60A5FA] font-bold">
            <Zap className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
            <span>Quick Access:</span>
          </div>
          <button
            onClick={handleDemoLogin}
            type="button"
            className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-bold transition-all shadow-xs"
          >
            1-Click Demo Login
          </button>
        </div>

        <div className="flex rounded-2xl bg-[#F8FAFC] dark:bg-[#172033] p-1.5 border border-[#E2E8F0] dark:border-[#263449]">
          <button
            onClick={() => {
              setTab('login');
              setError(null);
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

        {error && (
          <div className="bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#EF4444] dark:border-[#F87171] rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-[#EF4444] dark:text-[#F87171]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
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

          <div>
            <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
              Password (Min 6 chars)
            </label>
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
            className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-extrabold text-sm shadow-xs transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
          >
            <span>{loading ? 'Authenticating...' : tab === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-[#64748B] dark:text-[#94A3B8] pt-2 border-t border-[#E2E8F0] dark:border-[#263449] font-medium">
          Secure Local Client Auth • SHA-256 Web Crypto Hashing
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center text-[#0F172A] dark:text-[#F8FAFC] text-sm">Loading Authentication...</div>}>
      <AuthForm />
    </Suspense>
  );
}
