'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Knowledge Map has been removed from the navigation.
// Direct access is redirected to the dashboard.
export default function ConnectionsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
