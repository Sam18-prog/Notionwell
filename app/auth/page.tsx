'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signUpUserWithSupabase,
  signInUserWithSupabase,
  signInWithGoogle,
  resetPasswordWithSupabase,
  updatePasswordWithSupabase,
  initSupabaseAuthListener,
  persistSupabaseUser,
} from '@/lib/supabase/auth';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  checkPasswordRequirements,
  calculatePasswordStrength,
  isPasswordValid,
} from '@/lib/passwordValidation';
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
  Check,
  ShieldCheck,
} from 'lucide-react';

function getFriendlyErrorMessage(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case 'oauth_canceled':
    case 'access_denied':
      return 'Google sign-in was cancelled. Please try again when you are ready.';
    case 'missing_code':
      return 'Authentication code missing from Google response. Please try signing in again.';
    case 'auth-code-error':
    case 'oauth_exchange_failed':
      return 'Could not complete Google authentication. The link may have expired or is invalid. Please try again.';
    case 'oauth_provider_error':
      return 'Authentication provider encountered an error. Please try again or sign in with email.';
    case 'oauth_provider_disabled':
      return 'Google sign-in is not enabled in your Supabase project. Please configure the Google provider in your Supabase dashboard.';
    default:
      return 'Authentication session expired or invalid. Please sign in.';
  }
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get('redirect');
  const redirectTarget = rawRedirect && rawRedirect !== '/' ? rawRedirect : '/dashboard';
  const urlError = searchParams?.get('error');

  const isResetParam = searchParams?.get('reset') === 'true';
  const initialTab = isResetParam
    ? 'updatePassword'
    : searchParams?.get('tab') === 'signup'
    ? 'signup'
    : 'login';
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot' | 'updatePassword'>(initialTab);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Real-time password requirements, strength, and match calculations
  const passwordReqs = checkPasswordRequirements(password);
  const passwordStrength = calculatePasswordStrength(password);
  const allRequirementsMet = isPasswordValid(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const [error, setError] = useState<string | null>(getFriendlyErrorMessage(urlError));
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createClient();

    // Check if an existing valid session is already established
    supabase.auth.getSession().then(({ data: { session }, error: sessionErr }) => {
      if (!isMounted) return;

      if (!session || sessionErr) {
        // Case 1: No existing valid session. User remains on the login page unauthenticated.
        persistSupabaseUser(null);
        return;
      }

      // Case 2: Verify active session with the Supabase auth server
      supabase.auth.getUser().then(({ data: { user }, error: userErr }) => {
        if (!isMounted) return;

        if (user && !userErr) {
          // Valid verified existing session -> redirect to target
          router.push(redirectTarget);
        } else {
          // Case 3: Expired or invalid session -> clean up and allow reauthentication
          persistSupabaseUser(null);
          supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        router.push(redirectTarget);
      } else if (event === 'SIGNED_OUT') {
        persistSupabaseUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
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

        if (!allRequirementsMet) {
          setError('Password does not meet all security requirements. Please verify that all 5 checklist items are satisfied.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match. Please ensure both password fields are identical.');
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
            setPassword('');
            setConfirmPassword('');
            setLoading(false);
          } else {
            router.push(redirectTarget);
            router.refresh();
          }
        } else {
          setError(res.error || 'Registration failed. Please try again.');
          setLoading(false);
        }
        return;
      }

      if (tab === 'updatePassword') {
        if (!allRequirementsMet) {
          setError('New password does not meet all security requirements. Please verify that all 5 checklist items are satisfied.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match. Please ensure both password fields are identical.');
          setLoading(false);
          return;
        }

        const res = await updatePasswordWithSupabase(password);
        if (res.success) {
          setSuccessMsg('Your password has been updated successfully! Please sign in with your new password.');
          setTab('login');
          setPassword('');
          setConfirmPassword('');
          setLoading(false);
        } else {
          setError(res.error || 'Failed to update password.');
          setLoading(false);
        }
        return;
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

    router.push(rawRedirect || '/demo');
    router.refresh();
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setGoogleLoading(true);

    try {
      const res = await signInWithGoogle(redirectTarget);
      if (!res.success) {
        setError(res.error || 'Failed to initialize Google sign in.');
        setGoogleLoading(false);
      }
      // Browser navigates to Google OAuth if res.success is true
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to Google.');
      setGoogleLoading(false);
    }
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
              : tab === 'updatePassword'
              ? 'Set New Password'
              : 'Reset Account Password'}
          </h2>
          <p className="text-[#475569] dark:text-[#CBD5E1] text-xs sm:text-sm mt-1 font-medium">
            {tab === 'login'
              ? 'Sign in to access your cloud study decks and spaced repetition'
              : tab === 'signup'
              ? 'Start synthesizing intelligent study decks with Notionwell AI'
              : tab === 'updatePassword'
              ? 'Enter and confirm your new secure account password'
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

        {tab !== 'forgot' && tab !== 'updatePassword' && (
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

        {(tab === 'login' || tab === 'signup') && (
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full py-3 px-4 rounded-xl bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-[#273549] text-[#0F172A] dark:text-[#F8FAFC] font-bold text-sm border border-[#CBD5E1] dark:border-[#334155] shadow-xs transition-all flex items-center justify-center gap-3 hover:scale-[1.005] disabled:opacity-50"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-[#CBD5E1] border-t-[#2563EB] rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-[#E2E8F0] dark:border-[#263449]"></div>
              <span className="absolute bg-white dark:bg-[#111827] px-3 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-[#64748B]">
                OR
              </span>
            </div>
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

          {tab !== 'updatePassword' && (
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
          )}

          {tab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {tab === 'login'
                    ? 'Password'
                    : tab === 'signup'
                    ? 'Create Password'
                    : 'New Password'}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-label="Password"
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-3 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* LIVE PASSWORD STRENGTH INDICATOR & 5-REQUIREMENTS CHECKLIST (SIGNUP & PASSWORD RESET ONLY) */}
              {(tab === 'signup' || tab === 'updatePassword') && (
                <div className="mt-3 p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#475569] dark:text-[#CBD5E1] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                      <span>Password Strength:</span>
                    </span>
                    <span className={`font-extrabold ${passwordStrength.textColor}`}>
                      {password ? passwordStrength.label : 'None'}
                    </span>
                  </div>

                  {/* 4-Segment Strength Meter Bar */}
                  <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                    <div
                      className={`rounded-full transition-all duration-300 ${
                        password && passwordStrength.score >= 1
                          ? passwordStrength.color
                          : 'bg-[#E2E8F0] dark:bg-[#263449]'
                      }`}
                    />
                    <div
                      className={`rounded-full transition-all duration-300 ${
                        password && passwordStrength.score >= 2
                          ? passwordStrength.color
                          : 'bg-[#E2E8F0] dark:bg-[#263449]'
                      }`}
                    />
                    <div
                      className={`rounded-full transition-all duration-300 ${
                        password && passwordStrength.score >= 3
                          ? passwordStrength.color
                          : 'bg-[#E2E8F0] dark:bg-[#263449]'
                      }`}
                    />
                    <div
                      className={`rounded-full transition-all duration-300 ${
                        password && passwordStrength.score >= 4
                          ? passwordStrength.color
                          : 'bg-[#E2E8F0] dark:bg-[#263449]'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    {passwordStrength.feedback}
                  </p>

                  {/* 5-Rule Checklist */}
                  <div className="pt-2.5 border-t border-[#E2E8F0] dark:border-[#263449] space-y-1.5">
                    <div className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1]">
                      Password must satisfy:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {/* 1. At least 8 characters */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            passwordReqs.hasMinLength
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155]'
                          }`}
                        >
                          {passwordReqs.hasMinLength ? (
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] dark:bg-[#64748B]" />
                          )}
                        </span>
                        <span
                          className={`text-[11px] transition-colors ${
                            passwordReqs.hasMinLength
                              ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                              : 'text-[#64748B] dark:text-[#94A3B8]'
                          }`}
                        >
                          At least 8 characters
                        </span>
                      </div>

                      {/* 2. Uppercase letter */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            passwordReqs.hasUppercase
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155]'
                          }`}
                        >
                          {passwordReqs.hasUppercase ? (
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] dark:bg-[#64748B]" />
                          )}
                        </span>
                        <span
                          className={`text-[11px] transition-colors ${
                            passwordReqs.hasUppercase
                              ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                              : 'text-[#64748B] dark:text-[#94A3B8]'
                          }`}
                        >
                          One uppercase letter (A-Z)
                        </span>
                      </div>

                      {/* 3. Lowercase letter */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            passwordReqs.hasLowercase
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155]'
                          }`}
                        >
                          {passwordReqs.hasLowercase ? (
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] dark:bg-[#64748B]" />
                          )}
                        </span>
                        <span
                          className={`text-[11px] transition-colors ${
                            passwordReqs.hasLowercase
                              ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                              : 'text-[#64748B] dark:text-[#94A3B8]'
                          }`}
                        >
                          One lowercase letter (a-z)
                        </span>
                      </div>

                      {/* 4. Number */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            passwordReqs.hasNumber
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155]'
                          }`}
                        >
                          {passwordReqs.hasNumber ? (
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] dark:bg-[#64748B]" />
                          )}
                        </span>
                        <span
                          className={`text-[11px] transition-colors ${
                            passwordReqs.hasNumber
                              ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                              : 'text-[#64748B] dark:text-[#94A3B8]'
                          }`}
                        >
                          One number (0-9)
                        </span>
                      </div>

                      {/* 5. Special character */}
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            passwordReqs.hasSpecialChar
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155]'
                          }`}
                        >
                          {passwordReqs.hasSpecialChar ? (
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] dark:bg-[#64748B]" />
                          )}
                        </span>
                        <span
                          className={`text-[11px] transition-colors ${
                            passwordReqs.hasSpecialChar
                              ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                              : 'text-[#64748B] dark:text-[#94A3B8]'
                          }`}
                        >
                          One special symbol (!@#$%^&*...)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONFIRM PASSWORD (SIGNUP & PASSWORD RESET ONLY) */}
          {(tab === 'signup' || tab === 'updatePassword') && (
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-label="Confirm Password"
                  className={`w-full bg-[#F8FAFC] dark:bg-[#172033] border rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#64748B]/50 focus:outline-none transition-colors ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-emerald-500 focus:border-emerald-500'
                        : 'border-red-400 focus:border-red-500'
                      : 'border-[#E2E8F0] dark:border-[#263449] focus:border-[#2563EB]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-3.5 top-3 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Real-time Match Status Feedback */}
              {confirmPassword.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium">
                  {passwordsMatch ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-red-500 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}
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
                : tab === 'forgot'
                ? 'Send Reset Link'
                : 'Update Password'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {(tab === 'forgot' || tab === 'updatePassword') && (
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
