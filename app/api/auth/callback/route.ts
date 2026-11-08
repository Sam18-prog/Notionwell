import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function getSanitizedRedirectUrl(nextParam: string | null, origin: string): string {
  if (!nextParam) return `${origin}/dashboard`;
  // Open-redirect protection: target must begin with single '/' and not start with '//' or '/\'
  if (nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.startsWith('/\\')) {
    return `${origin}${nextParam}`;
  }
  return `${origin}/dashboard`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = searchParams.get('next');
  const targetUrl = getSanitizedRedirectUrl(next, origin);

  // 1. Handle OAuth cancellations and provider errors
  if (error) {
    console.warn(`[OAuth Callback] Provider reported error: ${error} (${errorDescription || 'no description'})`);
    const isCancel =
      error === 'access_denied' ||
      errorDescription?.toLowerCase().includes('cancel') ||
      errorDescription?.toLowerCase().includes('denied');
    const errorCode = isCancel ? 'oauth_canceled' : 'oauth_provider_error';
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(errorCode)}`);
  }

  // 2. Handle missing authorization code
  if (!code) {
    // Check if session is already established (e.g. duplicate request, refreshed tab)
    try {
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return NextResponse.redirect(targetUrl);
      }
    } catch {}

    return NextResponse.redirect(`${origin}/auth?error=missing_code`);
  }

  // 3. Prepare response with redirect to target
  const cookieStore = cookies();
  const response = NextResponse.redirect(targetUrl);
  const supabase = createClient(cookieStore, response);

  try {
    // 4. Exchange PKCE authorization code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.warn('[OAuth Callback] exchangeCodeForSession failed:', exchangeError.message);
      // Resilience check for duplicate callback: If session was already established on an earlier attempt
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return response;
      }
      return NextResponse.redirect(`${origin}/auth?error=auth-code-error`);
    }

    // 5. Ensure profile exists and synchronize user info
    if (data?.user) {
      const user = data.user;
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Student';

      // Check existing profile
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          const initialProfile = {
            id: user.id,
            email: user.email || '',
            display_name: displayName,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            streak_days: 0,
            total_xp: 0,
            current_level: 1,
          };

          try {
            const admin = createAdminClient();
            await admin.from('profiles').upsert(initialProfile, { onConflict: 'id' });
          } catch {
            try {
              await supabase.from('profiles').upsert(initialProfile, { onConflict: 'id' });
            } catch {}
          }
        }
      } catch (profileErr: any) {
        console.warn('[OAuth Callback] Profile sync note:', profileErr?.message);
      }

      // 6. Set lightweight cookie for instant synchronous client hydration
      const authUserPayload = encodeURIComponent(
        JSON.stringify({
          id: user.id,
          name: displayName,
          email: user.email,
          createdAt: user.created_at,
        })
      );

      response.cookies.set('notionwell_auth_user', authUserPayload, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return response;
  } catch (err: any) {
    console.error('[OAuth Callback] Unexpected processing error:', err);
    return NextResponse.redirect(`${origin}/auth?error=auth-code-error`);
  }
}
