import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function normalizeSupabaseUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = new URL(trimmed);
      return parsed.origin;
    }
  } catch {}
  return trimmed.replace(/\/rest\/v1\/?.*$/, '').replace(/\/+$/, '');
}

export function isSupabaseConfiguredServer(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    anonKey &&
    !url.includes('your-project-id') &&
    !anonKey.includes('your-anon-key')
  );
}

export function createClient(cookieStore?: ReturnType<typeof cookies>) {
  const resolvedCookieStore = cookieStore || cookies();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const url = normalizeSupabaseUrl(rawUrl);
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key').trim();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return resolvedCookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            resolvedCookieStore.set(name, value, options);
          });
        } catch {
          // setAll was called from a Server Component.
          // Ignored if middleware is refreshing sessions.
        }
      },
    },
  });
}
