import { createClient, isSupabaseConfigured } from './client';
import { User } from '@/lib/app';
import { isPasswordValid } from '@/lib/passwordValidation';

const SUPABASE_USER_KEY = 'notionwell_user_v1';

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  needsEmailVerification?: boolean;
}

/**
 * Stores the authenticated Supabase user profile in localStorage for instant synchronous retrieval.
 */
export function persistSupabaseUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(SUPABASE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SUPABASE_USER_KEY);
    }
    window.dispatchEvent(new Event('auth-change'));
  } catch (e) {
    console.error('Error persisting Supabase user:', e);
  }
}

/**
 * Retrieves the currently persisted authenticated Supabase user synchronously.
 */
export function getPersistedSupabaseUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SUPABASE_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Registers a new user with Supabase Auth.
 * Automatically initializes user metadata and requests email verification if configured.
 */
export async function signUpUserWithSupabase(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase is not configured. Please provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  if (!isPasswordValid(password)) {
    return {
      success: false,
      error:
        'Password does not meet security requirements. It must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    };
  }

  const supabase = createClient();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  try {
    const redirectUrl =
      typeof window !== 'undefined' && window.location.origin
        ? `${window.location.origin}/api/auth/callback`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
          name: trimmedName,
        },
        ...(redirectUrl ? { emailRedirectTo: redirectUrl } : {}),
      },
    });

    if (error) {
      const msg = error.message || '';
      if (
        msg.toLowerCase().includes('weak') ||
        msg.toLowerCase().includes('least 8') ||
        msg.toLowerCase().includes('should contain') ||
        msg.toLowerCase().includes('pwned') ||
        msg.toLowerCase().includes('compromised')
      ) {
        return {
          success: false,
          error: `Password rejected by security policy: ${msg}`,
        };
      }
      return { success: false, error: msg };
    }

    if (!data.user) {
      return { success: false, error: 'Registration failed to create a user record.' };
    }

    const appUser: User = {
      id: data.user.id,
      name: trimmedName || data.user.email?.split('@')[0] || 'Student',
      email: data.user.email || trimmedEmail,
      createdAt: data.user.created_at || new Date().toISOString(),
    };

    if (data.session) {
      // Auto-confirmed or confirmations disabled in Supabase
      persistSupabaseUser(appUser);
      // Trigger profile creation
      fetch('/api/auth/profile').catch(() => {});
      return { success: true, user: appUser };
    }

    // If confirmation is disabled in Supabase, an immediate signInWithPassword will log the user in directly
    try {
      const signInRes = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInRes.data?.session && signInRes.data?.user) {
        persistSupabaseUser(appUser);
        fetch('/api/auth/profile').catch(() => {});
        return { success: true, user: appUser };
      }
    } catch {
      // Ignore and fallback to confirmation prompt if Supabase requires email verification
    }

    // Email confirmation required by Supabase project settings
    return {
      success: true,
      needsEmailVerification: true,
      user: appUser,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error during signup.' };
  }
}

/**
 * Signs in an existing user using email and password via Supabase Auth.
 */
export async function signInUserWithSupabase(
  email: string,
  password: string
): Promise<AuthResponse> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase is not configured. Please provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  const supabase = createClient();
  const trimmedEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Login succeeded but no user data returned.' };
    }

    const appUser: User = {
      id: data.user.id,
      name:
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email?.split('@')[0] ||
        'Student',
      email: data.user.email || trimmedEmail,
      createdAt: data.user.created_at || new Date().toISOString(),
    };

    persistSupabaseUser(appUser);

    // Sync profile on server
    fetch('/api/auth/profile').catch(() => {});

    return { success: true, user: appUser };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error during login.' };
  }
}

/**
 * Initiates Google OAuth authentication (Sign Up or Sign In) via Supabase Auth using PKCE.
 * Redirects the user's browser to the Google OAuth consent screen.
 */
export async function signInWithGoogle(
  redirectTarget: string = '/dashboard'
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error:
        'Supabase is not configured. Please provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  const supabase = createClient();
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const safeRedirectTarget =
    redirectTarget &&
    redirectTarget.startsWith('/') &&
    !redirectTarget.startsWith('//') &&
    !redirectTarget.startsWith('/\\')
      ? redirectTarget
      : '/dashboard';

  const callbackUrl = `${origin}/api/auth/callback?next=${encodeURIComponent(safeRedirectTarget)}`;

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      const msg = error.message || '';
      if (
        msg.toLowerCase().includes('not enabled') ||
        msg.toLowerCase().includes('unsupported provider') ||
        msg.toLowerCase().includes('disabled')
      ) {
        return {
          success: false,
          error:
            'Google Sign-In is not yet enabled in your Supabase project. Please configure and enable the Google provider in your Supabase Dashboard under Authentication > Providers > Google.',
        };
      }
      return { success: false, error: msg };
    }

    if (typeof window !== 'undefined' && data?.url) {
      window.location.href = data.url;
    }

    return { success: true, url: data?.url };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to initiate Google authentication.',
    };
  }
}

/**
 * Signs out the current user from Supabase and clears all local auth tokens and cookies.
 */
export async function signOutUserFromSupabase(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      await supabase.auth.signOut().catch(() => {});
    }
  } catch (e) {
    console.warn('Supabase signOut error:', e);
  } finally {
    persistSupabaseUser(null);

    // Clear all session markers in localStorage
    try {
      localStorage.removeItem('notionwell_user_v1');
      localStorage.removeItem('notionwell_session_v1');
      localStorage.removeItem('notionwell_account_v1');
      localStorage.removeItem('studypack_session_v1');
      localStorage.removeItem('studypack_account_v1');

      // Clear any sb-* tokens in localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('notionwell_'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('LocalStorage cleanup error on logout:', e);
    }

    // Clear all auth cookies across paths and domains
    try {
      if (typeof document !== 'undefined') {
        document.cookie = 'notionwell_demo_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        document.cookie = 'notionwell_auth_user=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        const cookieList = document.cookie.split(';');
        for (const c of cookieList) {
          const eqIdx = c.indexOf('=');
          const name = eqIdx > -1 ? c.substring(0, eqIdx).trim() : c.trim();
          if (name.startsWith('sb-') || name.startsWith('notionwell_')) {
            document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
          }
        }
      }
    } catch (e) {
      console.warn('Cookie cleanup error on logout:', e);
    }

    window.dispatchEvent(new Event('auth-change'));
  }
}

/**
 * Sends a password reset email using Supabase Auth.
 */
export async function resetPasswordWithSupabase(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const supabase = createClient();
  try {
    const redirectUrl =
      typeof window !== 'undefined' && window.location.origin
        ? `${window.location.origin}/auth?reset=true`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      ...(redirectUrl ? { redirectTo: redirectUrl } : {}),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Password reset request failed.' };
  }
}

/**
 * Updates the authenticated user's password (e.g. following password reset recovery).
 * Enforces the strong password policy and handles backend security errors.
 */
export async function updatePasswordWithSupabase(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  if (!isPasswordValid(newPassword)) {
    return {
      success: false,
      error:
        'Password does not meet security requirements. It must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    };
  }

  const supabase = createClient();
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      const msg = error.message || '';
      if (
        msg.toLowerCase().includes('weak') ||
        msg.toLowerCase().includes('least 8') ||
        msg.toLowerCase().includes('should contain') ||
        msg.toLowerCase().includes('pwned') ||
        msg.toLowerCase().includes('compromised')
      ) {
        return {
          success: false,
          error: `Password rejected by security policy: ${msg}`,
        };
      }
      return { success: false, error: msg };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Password update failed.' };
  }
}

/**
 * Global Supabase Auth listener to keep browser auth state in sync across tabs and page refreshes.
 */
let isListenerInitialized = false;

export function initSupabaseAuthListener(): void {
  if (typeof window === 'undefined' || isListenerInitialized) return;
  if (!isSupabaseConfigured()) return;

  isListenerInitialized = true;
  const supabase = createClient();

  // Immediately check session on init to prime persisted user if cookie session exists
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      const appUser: User = {
        id: session.user.id,
        name:
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split('@')[0] ||
          'Student',
        email: session.user.email || '',
        createdAt: session.user.created_at || new Date().toISOString(),
      };
      persistSupabaseUser(appUser);
    }
  }).catch(() => {});

  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      const appUser: User = {
        id: session.user.id,
        name:
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split('@')[0] ||
          'Student',
        email: session.user.email || '',
        createdAt: session.user.created_at || new Date().toISOString(),
      };
      persistSupabaseUser(appUser);
    } else if (event === 'SIGNED_OUT') {
      persistSupabaseUser(null);
    }
  });
}
