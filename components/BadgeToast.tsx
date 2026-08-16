'use client';

import { useEffect, useState } from 'react';
import { AchievementBadge } from '@/lib/app';
import { Award, X } from 'lucide-react';

export default function BadgeToast() {
  const [activeBadge, setActiveBadge] = useState<AchievementBadge | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleBadgeUnlocked = (e: any) => {
      if (e.detail?.badge) {
        setActiveBadge(e.detail.badge);
        setVisible(true);

        const timer = setTimeout(() => {
          setVisible(false);
        }, 4000);

        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('badge-unlocked', handleBadgeUnlocked);
    return () => {
      window.removeEventListener('badge-unlocked', handleBadgeUnlocked);
    };
  }, []);

  if (!visible || !activeBadge) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div className="bg-[#0F172A] dark:bg-[#F8FAFC] text-white dark:text-[#0F172A] border border-[#334155] dark:border-[#E2E8F0] rounded-2xl p-4 shadow-xl flex items-center gap-3.5 max-w-sm">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white text-xl flex items-center justify-center shrink-0 shadow-xs">
          {activeBadge.icon || '🏆'}
        </div>

        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-amber-400 dark:text-amber-600 font-extrabold text-[10px] uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            <span>Badge Unlocked!</span>
          </div>
          <h4 className="text-sm font-extrabold truncate">{activeBadge.name}</h4>
          <p className="text-xs text-[#94A3B8] dark:text-[#64748B] truncate">
            {activeBadge.description}
          </p>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="text-[#94A3B8] hover:text-white dark:hover:text-[#0F172A] p-1 rounded-lg transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
