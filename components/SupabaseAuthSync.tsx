'use client';

import { useEffect } from 'react';
import { initSupabaseAuthListener } from '@/lib/supabase/auth';

export default function SupabaseAuthSync() {
  useEffect(() => {
    initSupabaseAuthListener();
  }, []);

  return null;
}
