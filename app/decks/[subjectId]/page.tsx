'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getSubjectById,
  getDecksBySubject,
  deleteDeck,
  getCurrentUser,
  Subject,
  Deck,
  getTodayDateString,
} from '@/lib/app';
import { exportDeckToPDF } from '@/lib/pdf';
import SubjectIcon from '@/components/SubjectIcon';
import ManageSourcesModal from '@/components/ManageSourcesModal';
import MoveDeckModal from '@/components/MoveDeckModal';
import {
  Folder,
  Plus,
  ArrowLeft,
  GraduationCap,
  HelpCircle,
  Timer,
  Trash2,
  FileText,
  FileCode,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Paperclip,
  FolderInput,
} from 'lucide-react';

export default function SubjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = params?.subjectId as string;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedSourcesDeck, setSelectedSourcesDeck] = useState<Deck | null>(null);
  const [movingDeck, setMovingDeck] = useState<Deck | null>(null);
  const [mounted, setMounted] = useState(false);

  const loadData = () => {
    if (!subjectId) return;
    const sub = getSubjectById(subjectId);
    setSubject(sub);
    setDecks(getDecksBySubject(subjectId));
  };

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (!user) {
      router.push(`/auth?redirect=/decks/${subjectId}`);
      return;
    }
    loadData();
  }, [subjectId, router]);

  if (!mounted) return null;

  if (!subject) {
    return (
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-12 text-center space-y-4 shadow-xs">
        <p className="text-[#0F172A] dark:text-[#F8FAFC] text-sm font-bold">Subject Folder Not Found.</p>
        <Link href="/decks" className="text-xs text-[#2563EB] dark:text-[#3B82F6] underline font-bold">
          Return to All Subject Decks
        </Link>
      </div>
    );
  }

  const handleDeleteDeck = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete deck "${name}"?`)) {
      deleteDeck(id);
      loadData();
    }
  };

  let totalCardsInSubject = 0;
  let totalMasteredInSubject = 0;

  decks.forEach((d) => {
    d.flashcards.forEach((c) => {
      totalCardsInSubject += 1;
      if (c.masteryLevel === 'mastered') {
        totalMasteredInSubject += 1;
      }
    });
  });

  const subjectMastery = totalCardsInSubject > 0 ? Math.round((totalMasteredInSubject / totalCardsInSubject) * 100) : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="border-b border-[#E2E8F0] dark:border-[#263449] pb-6 space-y-4">
        <Link
          href="/decks"
          className="inline-flex items-center gap-1.5 text-xs text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white transition-colors font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to All Subject Decks
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: subject.colorTag || '#2563EB' }}
            >
              <SubjectIcon iconName={subject.icon} name={subject.name} className="w-6 h-6 fill-white/20" />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                {subject.name}
              </h1>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-0.5 font-semibold">
                {decks.length} study decks • {totalCardsInSubject} total flashcards • {subjectMastery}% Mastery
              </p>
            </div>
          </div>

          <Link
            href={`/create?subjectId=${subject.id}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add Deck to {subject.name}</span>
          </Link>
        </div>
      </div>

      {/* DECKS GRID IN THIS SUBJECT */}
      {decks.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] border border-dashed border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-12 text-center flex flex-col items-center shadow-xs">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xs"
            style={{ backgroundColor: subject.colorTag || '#2563EB' }}
          >
            <Folder className="w-8 h-8 fill-white/20" />
          </div>
          <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
            No Decks in {subject.name}
          </h3>
          <p className="text-[#475569] dark:text-[#CBD5E1] text-sm max-w-md mb-6 font-medium">
            Create a new study deck assigned to this subject folder to start learning.
          </p>
          <Link
            href={`/create?subjectId=${subject.id}`}
            className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-bold text-xs shadow-xs hover:bg-[#1D4ED8] transition-all"
          >
            Create First Deck
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => {
            const today = getTodayDateString();
            const dueCount = deck.flashcards.filter(
              (c) => c.nextReviewDate <= today
            ).length;
            const masteredCount = deck.flashcards.filter(
              (c) => c.masteryLevel === 'mastered'
            ).length;
            const deckMastery =
              deck.flashcards.length > 0
                ? Math.round((masteredCount / deck.flashcards.length) * 100)
                : 0;

            let masteryBadgeClass = 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8] border-[#CBD5E1] dark:border-[#334155]';
            if (deckMastery >= 75) {
              masteryBadgeClass = 'bg-[#ECFDF5] dark:bg-[#052E2B] text-[#10B981] dark:text-[#34D399] border-[#A7F3D0] dark:border-[#065F46]';
            } else if (deckMastery >= 40) {
              masteryBadgeClass = 'bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] border-[#DBEAFE] dark:border-[#1E3A8A]';
            } else if (deckMastery > 0) {
              masteryBadgeClass = 'bg-[#FFFBEB] dark:bg-[#422006] text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[#78350F]';
            }

            return (
              <div
                key={deck.id}
                className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#CBD5E1] rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#263449]">
                        {deck.sourceType === 'pdf' ? (
                          <FileText className="w-4 h-4 text-[#2563EB]" />
                        ) : deck.sourceType === 'docx' ? (
                          <FileCode className="w-4 h-4 text-purple-600" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-emerald-600" />
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSourcesDeck(deck);
                        }}
                        className="text-[#64748B] hover:text-[#2563EB] p-1.5 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-[#172554] transition-colors"
                        title="Manage Deck Sources"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportDeckToPDF(deck, subject.name);
                        }}
                        className="text-[#64748B] hover:text-[#2563EB] p-1.5 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-[#172554] transition-colors"
                        title="Export Deck as PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingDeck(deck);
                        }}
                        className="text-[#64748B] hover:text-[#2563EB] p-1.5 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-[#172554] transition-colors"
                        title="Move Deck to Another Subject"
                      >
                        <FolderInput className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteDeck(deck.id, deck.name)}
                        className="text-[#64748B] hover:text-[#EF4444] p-1.5 rounded-xl hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A] transition-colors"
                        title="Delete Deck"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-lg text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6] transition-colors line-clamp-2">
                    {deck.name}
                  </h3>

                  <div className="mt-4 flex items-center justify-between text-xs text-[#475569] dark:text-[#CBD5E1] border-t border-[#E2E8F0] dark:border-[#263449] pt-3 font-medium">
                    <span>{deck.flashcards.length} Cards</span>
                    <span>{deck.quizQuestions.length} Practice Items</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <div className={`flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg border text-xs ${masteryBadgeClass}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{deckMastery}% Mastery</span>
                    </div>

                    {dueCount > 0 ? (
                      <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] dark:bg-[#422006] text-[#B45309] dark:text-[#FBBF24] font-bold text-xs border border-[#FDE68A] dark:border-[#78350F]">
                        {dueCount} Due
                      </span>
                    ) : (
                      <span className="text-[#64748B] dark:text-[#94A3B8] text-xs font-medium">
                        Up to date
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#263449] space-y-2">
                  <Link
                    href={`/deck/${deck.id}?mode=study`}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <GraduationCap className="w-4 h-4" />
                    Study Deck
                  </Link>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/deck/${deck.id}?mode=quiz`}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] hover:bg-[#E2E8F0] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold transition-all"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#2563EB]" />
                      Quiz
                    </Link>

                    <Link
                      href={`/deck/${deck.id}?mode=exam`}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] hover:bg-[#E2E8F0] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold transition-all"
                    >
                      <Timer className="w-3.5 h-3.5 text-pink-600" />
                      Exam
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* MANAGE SOURCES MODAL */}
      {selectedSourcesDeck && (
        <ManageSourcesModal
          deck={selectedSourcesDeck}
          isOpen={Boolean(selectedSourcesDeck)}
          onClose={() => setSelectedSourcesDeck(null)}
          onDeckUpdated={() => loadData()}
        />
      )}

      {/* MOVE DECK MODAL */}
      {movingDeck && (
        <MoveDeckModal
          deck={movingDeck}
          isOpen={Boolean(movingDeck)}
          onClose={() => setMovingDeck(null)}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}
