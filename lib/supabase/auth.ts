import { createClient, isSupabaseConfigured } from './client';
import { User } from '@/lib/app';

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
      return { success: false, error: error.message };
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
      // Auto-confirmed or confirmations disabled
      persistSupabaseUser(appUser);
      // Trigger profile creation
      fetch('/api/auth/profile').catch(() => {});
      return { success: true, user: appUser };
    } else {
      // Email confirmation required
      return {
        success: true,
        needsEmailVerification: true,
        user: appUser,
      };
    }
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
 * Global Supabase Auth listener to keep browser auth state in sync across tabs and page refreshes.
 */
let isListenerInitialized = false;

export function initSupabaseAuthListener(): void {
  if (typeof window === 'undefined' || isListenerInitialized) return;
  if (!isSupabaseConfigured()) return;

  isListenerInitialized = true;
  const supabase = createClient();

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
