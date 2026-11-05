'use client';

import { useState, useEffect } from 'react';
import { CloudUpload, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getDecks, getSubjects, getPlannerTasks } from '@/lib/app';

export default function MigrationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deckCount, setDeckCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || typeof window === 'undefined') return;

    // Check if user is authenticated with Supabase
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Check if already migrated
        const alreadyMigrated = localStorage.getItem('notionwell_migrated_v1');
        if (alreadyMigrated) return;

        // Check for local decks
        const localDecks = getDecks();
        if (localDecks.length > 0) {
          setDeckCount(localDecks.length);
          setShowBanner(true);
        }
      }
    });
  }, []);

  if (!showBanner) return null;

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrationError(null);
    setMigrationStatus('Transferring local study materials to cloud database...');

    try {
      const subjects = getSubjects();
      const decks = getDecks();
      const tasks = getPlannerTasks();

      const res = await fetch('/api/sync/migrate-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects, decks, tasks }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to migrate study data.');
      }

      const { migrated } = data;
      setMigrationStatus(
        `Successfully backed up ${migrated.decks} decks, ${migrated.flashcards} flashcards, and ${migrated.quizQuestions} quiz questions to your cloud account!`
      );
      localStorage.setItem('notionwell_migrated_v1', new Date().toISOString());

      setTimeout(() => {
        setShowBanner(false);
      }, 5000);
    } catch (err: any) {
      setMigrationError(err.message || 'Migration error occurred. Your local data remains safe.');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] dark:from-[#172554] dark:to-[#1E3A8A] border border-[#BFDBFE] dark:border-[#1E40AF] p-4 sm:p-5 shadow-xs transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#2563EB] text-white shrink-0 mt-0.5">
            <CloudUpload className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <span>Cloud Sync Available</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2563EB] text-white">
                {deckCount} Local Deck{deckCount !== 1 ? 's' : ''} Found
              </span>
            </h4>
            <p className="text-xs text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
              Back up your locally saved study decks, flashcards, and spaced repetition schedules into your cloud Supabase database for cross-device synchronization.
            </p>

            {migrationStatus && (
              <div className="pt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{migrationStatus}</span>
              </div>
            )}

            {migrationError && (
              <div className="pt-2 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{migrationError}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!migrationStatus && (
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 hover:scale-[1.01]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{migrating ? 'Syncing...' : 'Sync to Cloud'}</span>
            </button>
          )}
          <button
            onClick={() => setShowBanner(false)}
            className="p-1.5 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
