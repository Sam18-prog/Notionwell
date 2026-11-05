'use client';

import { useState, useEffect } from 'react';
import {
  User,
  getCurrentUser,
  logoutUser,
  getStoredTheme,
  setStoredTheme,
  getDecks,
} from '@/lib/app';
import {
  X,
  User as UserIcon,
  Mail,
  Shield,
  Moon,
  Sun,
  Download,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Key,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cur = getCurrentUser();
      setUser(cur);
      setDisplayName(cur?.name || '');
      setTheme(getStoredTheme());
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setSaving(true);
    setStatusMsg(null);

    try {
      // 1. Update on server via Supabase authenticated session
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      if (res.ok) {
        // 2. Update local cached user
        const raw = localStorage.getItem('notionwell_user_v1');
        if (raw) {
          const u = JSON.parse(raw);
          u.name = displayName.trim();
          localStorage.setItem('notionwell_user_v1', JSON.stringify(u));
        }
        window.dispatchEvent(new Event('auth-change'));
        setStatusMsg({ type: 'success', text: 'Profile name updated successfully!' });
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to update cloud profile.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Error saving profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = () => {
    try {
      const decks = getDecks();
      const exportBlob = new Blob([JSON.stringify(decks, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(exportBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notionwell_study_decks_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg({ type: 'success', text: 'Study decks exported successfully!' });
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to export study data.' });
    }
  };

  const handleToggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    setStoredTheme(newTheme);
  };

  const handleLogout = () => {
    logoutUser();
    onClose();
    window.location.href = '/auth';
  };

  const isDemo = user?.id === 'demo-guest-user';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-[#E2E8F0] dark:border-[#263449] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] flex items-center justify-center text-[#2563EB] dark:text-[#60A5FA]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Account & Settings
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Manage your student identity, cloud preferences, and data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#10B981]'
                  : 'bg-[#FEF2F2] dark:bg-[#450A0A] text-[#EF4444] dark:text-[#F87171] border border-[#EF4444]'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* User Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#475569] dark:text-[#CBD5E1]">
              Student Profile
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                  placeholder="Your Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type="email"
                  disabled
                  value={user?.email || 'student@notionwell.ai'}
                  className="w-full bg-[#F1F5F9] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#263449] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#64748B] dark:text-[#94A3B8] cursor-not-allowed"
                />
              </div>
            </div>

            {user?.id && (
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                  Account Identifier (UUID)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    disabled
                    value={user.id}
                    className="w-full bg-[#F1F5F9] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#263449] rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] cursor-not-allowed truncate"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Status:{' '}
                <strong className={isDemo ? 'text-amber-500' : 'text-emerald-500'}>
                  {isDemo ? 'Guest Demo Mode' : 'Cloud Verified Account'}
                </strong>
              </span>

              <button
                type="submit"
                disabled={saving || isDemo}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update Name'}
              </button>
            </div>
          </form>

          {/* Appearance */}
          <div className="space-y-3 pt-4 border-t border-[#E2E8F0] dark:border-[#263449]">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#475569] dark:text-[#CBD5E1]">
              Visual Appearance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleToggleTheme('light')}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  theme === 'light'
                    ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB]'
                    : 'border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#64748B]'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="text-xs font-bold">Light Theme</div>
                  <div className="text-[10px] text-[#64748B]">Clean daylight UI</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleToggleTheme('dark')}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  theme === 'dark'
                    ? 'border-[#3B82F6] bg-[#172554] text-[#60A5FA]'
                    : 'border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#64748B]'
                }`}
              >
                <Moon className="w-5 h-5 text-[#3B82F6]" />
                <div>
                  <div className="text-xs font-bold">Dark Navy</div>
                  <div className="text-[10px] text-[#94A3B8]">Deep contrast SaaS</div>
                </div>
              </button>
            </div>
          </div>

          {/* Data Export & Backup */}
          <div className="space-y-3 pt-4 border-t border-[#E2E8F0] dark:border-[#263449]">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#475569] dark:text-[#CBD5E1]">
              Data Management & Backup
            </h3>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449]">
              <div>
                <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Export Study Materials
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Download a JSON archive of all your flashcards and quizzes
                </div>
              </div>
              <button
                onClick={handleExportData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#111827] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB] transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC]/60 dark:bg-[#172033]/60 flex items-center justify-between">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0F172A] dark:bg-[#F8FAFC] text-white dark:text-[#0F172A] text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
