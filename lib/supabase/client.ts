import { createBrowserClient } from '@supabase/ssr';

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

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    anonKey &&
    !url.includes('your-project-id') &&
    !anonKey.includes('your-anon-key')
  );
}

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const url = normalizeSupabaseUrl(rawUrl);
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key').trim();

  if (typeof window === 'undefined') {
    // Non-browser fallback with in-memory cookies to prevent SSR pre-rendering crashes
    return createBrowserClient(url, anonKey, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    });
  }

  return createBrowserClient(url, anonKey);
}
