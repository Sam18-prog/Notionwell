import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: No active authenticated Supabase session.' },
        { status: 401 }
      );
    }

    // 1. Try fetching profile via authenticated client (enforces RLS: id = auth.uid())
    let profile = null;
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (userProfile) {
      profile = userProfile;
    } else {
      // 2. Profile does not exist yet; initialize it
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Student';

      const initialProfile = {
        id: user.id,
        email: user.email || '',
        display_name: displayName,
        streak_days: 0,
        total_xp: 0,
        current_level: 1,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert(initialProfile)
        .select()
        .maybeSingle();

      if (inserted) {
        profile = inserted;
      } else {
        // Fallback: try service client if authenticated insert was blocked by permissions
        try {
          const admin = createAdminClient();
          const { data: adminInserted } = await admin
            .from('profiles')
            .upsert(initialProfile, { onConflict: 'id' })
            .select()
            .maybeSingle();
          profile = adminInserted || initialProfile;
        } catch {
          profile = initialProfile;
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: profile?.display_name || user.user_metadata?.full_name || 'Student',
        createdAt: user.created_at,
      },
      profile,
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve profile.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: No active authenticated Supabase session.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { displayName, avatarUrl } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (displayName !== undefined) updates.display_name = displayName.trim();
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update profile.' },
      { status: 500 }
    );
  }
}
