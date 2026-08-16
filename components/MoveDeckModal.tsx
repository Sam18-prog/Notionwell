'use client';

import { useState, useEffect } from 'react';
import { getSubjects, moveDeckToSubject, Subject, Deck } from '@/lib/app';
import SubjectIcon from '@/components/SubjectIcon';
import { X, FolderInput, Check, ArrowRight, Folder } from 'lucide-react';

interface MoveDeckModalProps {
  deck: Deck | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSubjectId: string) => void;
}

export default function MoveDeckModal({ deck, isOpen, onClose, onSuccess }: MoveDeckModalProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && deck) {
      const allSubjects = getSubjects();
      setSubjects(allSubjects);
      // Preselect the first available subject that is NOT the current deck's subject
      const available = allSubjects.filter((s) => s.id !== deck.subjectId);
      if (available.length > 0) {
        setSelectedSubjectId(available[0].id);
      } else {
        setSelectedSubjectId('');
      }
    }
  }, [isOpen, deck]);

  if (!isOpen || !deck) return null;

  const currentSubject = subjects.find((s) => s.id === deck.subjectId);
  const targetSubjects = subjects.filter((s) => s.id !== deck.subjectId);

  const handleConfirmMove = () => {
    if (!selectedSubjectId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      moveDeckToSubject(deck.id, selectedSubjectId);
      onSuccess(selectedSubjectId);
      onClose();
    } catch (err) {
      console.error('Failed to move deck:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] border border-[#DBEAFE] dark:border-[#1E3A8A]">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                Move Deck to Subject
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium truncate max-w-[240px]">
                "{deck.name}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#172033] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CURRENT LOCATION INFO */}
        <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <span className="text-[#64748B] dark:text-[#94A3B8] font-bold">Current Subject:</span>
          <div className="flex items-center gap-1.5 font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: currentSubject?.colorTag || '#2563EB' }}
            />
            <span>{currentSubject?.name || 'Uncategorized'}</span>
          </div>
        </div>

        {/* TARGET SUBJECT SELECTOR LIST */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
            Select Destination Subject Folder
          </label>

          {targetSubjects.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[#FFFBEB] dark:bg-[#422006] border border-[#FDE68A] dark:border-[#78350F] text-xs text-[#D97706] dark:text-[#FBBF24] font-medium text-center">
              No other subject folders exist yet. Create a new subject folder first to move this deck!
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {targetSubjects.map((sub) => {
                const isSelected = selectedSubjectId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#EFF6FF] dark:bg-[#172554] border-[#2563EB] dark:border-[#3B82F6] ring-1 ring-[#2563EB]'
                        : 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#263449] hover:border-[#CBD5E1] dark:hover:border-[#334155]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: sub.colorTag || '#2563EB' }}
                      >
                        <SubjectIcon iconName={sub.icon} name={sub.name} className="w-4 h-4 fill-white/20" />
                      </div>
                      <div>
                        <p className="font-extrabold text-xs text-[#0F172A] dark:text-[#F8FAFC] line-clamp-1">
                          {sub.name}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-[#263449]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] text-xs font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedSubjectId || targetSubjects.length === 0 || isSubmitting}
            onClick={handleConfirmMove}
            className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderInput className="w-4 h-4" />
            <span>Confirm Move</span>
          </button>
        </div>
      </div>
    </div>
  );
}
