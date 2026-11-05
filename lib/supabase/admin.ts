import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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

/**
 * Privileged administrative client using SUPABASE_SERVICE_ROLE_KEY.
 * NEVER import this file into client components or expose this key to the browser.
 */
export function createAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!rawUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Administrative client requires both.'
    );
  }

  const url = normalizeSupabaseUrl(rawUrl);

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
