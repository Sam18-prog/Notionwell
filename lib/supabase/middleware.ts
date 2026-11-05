import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeSupabaseUrl } from './client';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !rawAnonKey || rawUrl.includes('placeholder') || rawAnonKey.includes('placeholder')) {
    return supabaseResponse;
  }

  const url = normalizeSupabaseUrl(rawUrl);
  const anonKey = rawAnonKey.trim();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected route checking
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/create') ||
    pathname.startsWith('/deck') ||
    pathname.startsWith('/decks') ||
    pathname.startsWith('/planner') ||
    pathname.startsWith('/insights') ||
    pathname.startsWith('/assistant') ||
    pathname.startsWith('/exam') ||
    pathname.startsWith('/review') ||
    pathname.startsWith('/study-paths') ||
    pathname.startsWith('/weak-topics') ||
    pathname.startsWith('/connections') ||
    pathname.startsWith('/viva');

  // If Supabase is configured and user is not authenticated on a protected route, redirect to /auth
  // Note: /auth and public paths are always accessible.
  if (isProtectedRoute && !user && !request.cookies.get('notionwell_demo_session')?.value) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
