import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  isDemo?: boolean;
}

/**
 * Validates the authenticated Supabase session on the server.
 * Priority:
 * 1. Bearer Token in Authorization header (checked against supabase.auth.getUser(token))
 * 2. Next.js SSR Cookie session (checked against supabase.auth.getUser())
 * 3. Demo guest session cookie (only if notionwell_demo_session=1 cookie is present)
 *
 * NEVER trusts client-supplied query/body parameters for user identity.
 */
export async function getAuthenticatedUserSession(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const supabase = createClient();

    // 1. Check Bearer Token header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const {
          data: { user },
          error: tokenErr,
        } = await supabase.auth.getUser(token);

        if (user && !tokenErr) {
          return {
            id: user.id,
            email: user.email,
          };
        }
      }
    }

    // 2. Check Cookie session via @supabase/ssr
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (user && !userErr) {
      return {
        id: user.id,
        email: user.email,
      };
    }

    // 3. Fallback to Demo Guest Session if explicitly set in cookies
    const cookieHeader = req.headers.get('cookie') || '';
    if (cookieHeader.includes('notionwell_demo_session=1')) {
      return {
        id: 'demo-guest-user',
        email: 'demo@notionwell.ai',
        isDemo: true,
      };
    }

    return null;
  } catch (error) {
    console.error('[getAuthenticatedUserSession Error]:', error);
    return null;
  }
}
