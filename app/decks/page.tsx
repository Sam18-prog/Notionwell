'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getSubjects,
  getDecks,
  saveSubject,
  deleteSubject,
  deleteDeck,
  renameDeck,
  getCurrentUser,
  detectSubjectIcon,
  Subject,
  Deck,
  getTodayDateString,
} from '@/lib/app';
import SubjectIcon from '@/components/SubjectIcon';
import MoveDeckModal from '@/components/MoveDeckModal';
import {
  Folder,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
  X,
  Search,
  Layers,
  HelpCircle,
  Clock,
  GraduationCap,
  Timer,
  FileText,
  FileCode,
  FolderInput,
  SlidersHorizontal,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import DecksLoading from './loading';

function DecksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') || 'folders';

  const [activeTab, setActiveTab] = useState<'folders' | 'decks' | 'flashcards' | 'quizzes'>(
    initialTab === 'flashcards' || initialTab === 'quizzes' || initialTab === 'decks'
      ? initialTab
      : 'folders'
  );

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'cards' | 'title'>('recent');
  const [movingDeck, setMovingDeck] = useState<Deck | null>(null);
  const [mounted, setMounted] = useState(false);

  // Modal State for Subjects
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState('#2563EB');
  const [selectedIcon, setSelectedIcon] = useState('Folder');
  const [isIconManuallySelected, setIsIconManuallySelected] = useState(false);

  // Modal State for Renaming Decks
  const [renamingDeck, setRenamingDeck] = useState<Deck | null>(null);
  const [newDeckTitle, setNewDeckTitle] = useState('');

  const colorOptions = [
    '#2563EB', // Blue
    '#10B981', // Emerald Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#EF4444', // Red
    '#64748B', // Slate Gray
  ];

  const iconOptions = [
    { name: 'Atom', label: 'Science' },
    { name: 'Calculator', label: 'Math' },
    { name: 'Landmark', label: 'History' },
    { name: 'Code', label: 'Tech' },
    { name: 'BookOpen', label: 'Language' },
    { name: 'Palette', label: 'Art' },
    { name: 'Music', label: 'Music' },
    { name: 'Globe', label: 'Geography' },
    { name: 'TrendingUp', label: 'Business' },
    { name: 'Brain', label: 'Psychology' },
    { name: 'HeartPulse', label: 'Medicine' },
    { name: 'Folder', label: 'General' },
  ];

  const loadData = () => {
    setSubjects(getSubjects());
    setDecks(getDecks());
  };

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (!user) {
      router.push('/auth?redirect=/decks');
      return;
    }
    loadData();
  }, [router]);

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'flashcards' || tabParam === 'quizzes' || tabParam === 'decks' || tabParam === 'folders') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  if (!mounted) return <DecksLoading />;

  const handleOpenCreateModal = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectColor('#2563EB');
    setSelectedIcon('Folder');
    setIsIconManuallySelected(false);
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, subject: Subject) => {
    e.stopPropagation();
    setEditingSubject(subject);
    setSubjectName(subject.name);
    setSubjectColor(subject.colorTag || '#2563EB');
    setSelectedIcon(subject.icon || detectSubjectIcon(subject.name));
    setIsIconManuallySelected(true);
    setIsSubjectModalOpen(true);
  };

  const handleSubjectNameChange = (val: string) => {
    setSubjectName(val);
    if (!isIconManuallySelected) {
      const autoIcon = detectSubjectIcon(val);
      setSelectedIcon(autoIcon);
    }
  };

  const handleSaveSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    const finalIcon = selectedIcon || detectSubjectIcon(subjectName);

    const newOrUpdatedSubject: Subject = {
      id: editingSubject ? editingSubject.id : uuidv4(),
      name: subjectName.trim(),
      colorTag: subjectColor,
      icon: finalIcon,
      createdAt: editingSubject ? editingSubject.createdAt : new Date().toISOString(),
    };

    saveSubject(newOrUpdatedSubject);
    setIsSubjectModalOpen(false);
    loadData();
  };

  const handleDeleteSubjectClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (
      confirm(
        `Are you sure you want to delete subject folder "${name}"? Decks in this subject will be reassigned to "Uncategorized".`
      )
    ) {
      deleteSubject(id);
      loadData();
    }
  };

  const handleDeleteDeck = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete deck "${name}"?`)) {
      deleteDeck(id);
      loadData();
    }
  };

  const handleOpenRenameDeck = (e: React.MouseEvent, deck: Deck) => {
    e.stopPropagation();
    setRenamingDeck(deck);
    setNewDeckTitle(deck.name);
  };

  const handleSaveRenameDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingDeck || !newDeckTitle.trim()) return;
    renameDeck(renamingDeck.id, newDeckTitle.trim());
    setRenamingDeck(null);
    loadData();
  };

  // Filtered Subjects
  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Filtered and Sorted Decks
  const filteredDecks = decks
    .filter((deck) => {
      const matchesSearch = deck.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === 'flashcards') return deck.flashcards.length > 0;
      if (activeTab === 'quizzes') return deck.quizQuestions.length > 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'cards') return b.flashcards.length - a.flashcards.length;
      if (sortBy === 'title') return a.name.localeCompare(b.name);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#263449] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA] text-xs font-semibold mb-3">
            <Folder className="w-3.5 h-3.5" />
            <span>Study Library & Organization</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            My Study Decks
          </h1>
          <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mt-1 font-medium">
            Organize study materials by academic subject folders, review flashcards, and take quizzes.
          </p>
        </div>

        {/* ACTIONS GROUP */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleOpenCreateModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] font-bold text-xs shadow-xs transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#2563EB]" />
            <span>+ New Subject Folder</span>
          </button>

          <Link
            href="/create"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-extrabold text-xs shadow-xs transition-all hover:scale-[1.01] whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate with AI</span>
          </Link>
        </div>
      </div>

      {/* VIEW SELECTOR & SEARCH CONTROLS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* TAB SWITCHER */}
        <div className="flex rounded-2xl bg-[#F8FAFC] dark:bg-[#172033] p-1.5 border border-[#E2E8F0] dark:border-[#263449] overflow-x-auto">
          <button
            onClick={() => setActiveTab('folders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'folders'
                ? 'bg-white dark:bg-[#111827] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Subject Folders ({subjects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('decks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'decks'
                ? 'bg-white dark:bg-[#111827] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>All Decks ({decks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('flashcards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'flashcards'
                ? 'bg-white dark:bg-[#111827] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flashcards</span>
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'quizzes'
                ? 'bg-white dark:bg-[#111827] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Quizzes</span>
          </button>
        </div>

        {/* SEARCH & SORT */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'folders' ? 'Search subjects...' : 'Search study decks...'}
              className="w-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-xl pl-9 pr-8 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] font-semibold placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeTab !== 'folders' && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-xl px-2.5 py-2 text-xs font-bold text-[#475569] dark:text-[#CBD5E1] shadow-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#2563EB]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none cursor-pointer"
              >
                <option value="recent">Recent</option>
                <option value="cards">Most Cards</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: SUBJECT FOLDERS VIEW */}
      {activeTab === 'folders' && (
        <>
          {filteredSubjects.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] border border-dashed border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-12 text-center flex flex-col items-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center mb-3 shadow-xs">
                <Folder className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                No subjects found
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1] max-w-sm mb-4 font-medium">
                Create folders like &quot;Computer Science&quot; or &quot;Biology&quot; to categorize your decks.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-xs hover:bg-[#1D4ED8] transition-all shadow-xs"
              >
                + Create Subject Folder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubjects.map((subject) => {
                const subjectDecks = decks.filter((d) => d.subjectId === subject.id);
                let totalCards = 0;
                let masteredCards = 0;

                subjectDecks.forEach((d) => {
                  d.flashcards.forEach((c) => {
                    totalCards += 1;
                    if (c.masteryLevel === 'mastered') {
                      masteredCards += 1;
                    }
                  });
                });

                const overallMastery = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

                return (
                  <div
                    key={subject.id}
                    onClick={() => router.push(`/decks/${subject.id}`)}
                    className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#CBD5E1] dark:hover:border-[#334155] rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-xs group"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs"
                          style={{ backgroundColor: subject.colorTag || '#2563EB' }}
                        >
                          <SubjectIcon name={subject.icon || 'Folder'} className="w-6 h-6" />
                        </div>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleOpenEditModal(e, subject)}
                            className="p-1.5 rounded-xl text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-[#172554] transition-colors"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {subject.name.toLowerCase() !== 'uncategorized' && (
                            <button
                              onClick={(e) => handleDeleteSubjectClick(e, subject.id, subject.name)}
                              className="p-1.5 rounded-xl text-[#64748B] dark:text-[#94A3B8] hover:text-[#EF4444] dark:hover:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A] transition-colors"
                              title="Delete Subject"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6] transition-colors">
                        {subject.name}
                      </h3>

                      <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-1 font-medium">
                        {subjectDecks.length} {subjectDecks.length === 1 ? 'study deck' : 'study decks'} • {totalCards} cards
                      </p>

                      {totalCards > 0 && (
                        <div className="mt-4 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-[#64748B] dark:text-[#94A3B8]">Subject Mastery</span>
                            <span className="text-[#10B981] dark:text-[#34D399]">{overallMastery}%</span>
                          </div>
                          <div className="w-full bg-[#E2E8F0] dark:bg-[#263449] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#10B981] dark:bg-[#34D399] h-full rounded-full transition-all duration-500"
                              style={{ width: `${overallMastery}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#263449] flex items-center justify-between text-xs font-bold text-[#2563EB] dark:text-[#60A5FA]">
                      <span>Open Subject Folder</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2, 3, 4: DECKS / FLASHCARDS / QUIZZES VIEW */}
      {activeTab !== 'folders' && (
        <>
          {filteredDecks.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] border border-dashed border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-12 text-center flex flex-col items-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center mb-3 shadow-xs">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                No matching study decks found
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1] max-w-sm mb-4 font-medium">
                Upload notes or documents to synthesize your next intelligent study deck.
              </p>
              <Link
                href="/create"
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-extrabold text-xs shadow-xs hover:bg-[#1D4ED8] transition-all"
              >
                + Generate with AI
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDecks.map((deck) => {
                const today = getTodayDateString();
                const dueCount = deck.flashcards.filter((c) => c.nextReviewDate <= today).length;
                const masteredCount = deck.flashcards.filter((c) => c.masteryLevel === 'mastered').length;
                const deckMastery =
                  deck.flashcards.length > 0
                    ? Math.round((masteredCount / deck.flashcards.length) * 100)
                    : 0;
                const deckSubject = subjects.find((s) => s.id === deck.subjectId);

                return (
                  <div
                    key={deck.id}
                    className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#CBD5E1] dark:hover:border-[#334155] rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-xs group"
                  >
                    <div>
                      {/* Top Header: Subject Badge + Actions */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#263449]">
                            {deck.sourceType === 'pdf' ? (
                              <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                            ) : deck.sourceType === 'docx' ? (
                              <FileCode className="w-3.5 h-3.5 text-purple-600" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </span>
                          {deckSubject && (
                            <span
                              className="text-[10px] font-extrabold tracking-wider px-2.5 py-0.5 rounded-md text-white uppercase truncate max-w-[130px]"
                              style={{ backgroundColor: deckSubject.colorTag || '#2563EB' }}
                            >
                              {deckSubject.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleOpenRenameDeck(e, deck)}
                            className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] p-1.5 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-[#172554] transition-colors"
                            title="Rename study deck"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMovingDeck(deck);
                            }}
                            className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] p-1.5 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-[#172554] transition-colors"
                            title="Move to another folder"
                          >
                            <FolderInput className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteDeck(e, deck.id, deck.name)}
                            className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#EF4444] p-1.5 rounded-xl hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A] transition-colors"
                            title="Delete deck"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6] transition-colors line-clamp-2">
                        {deck.name}
                      </h3>

                      {/* Meta counts */}
                      <div className="mt-3 flex items-center justify-between text-xs text-[#475569] dark:text-[#CBD5E1] border-t border-[#E2E8F0] dark:border-[#263449] pt-2.5 font-medium">
                        <span>{deck.flashcards.length} Flashcards</span>
                        <span>{deck.quizQuestions.length} Quiz Items</span>
                      </div>

                      {/* Mastery Progress */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-[#64748B] dark:text-[#94A3B8]">Retention Mastery</span>
                          <span className="text-[#10B981] dark:text-[#34D399]">{deckMastery}%</span>
                        </div>
                        <div className="w-full bg-[#E2E8F0] dark:bg-[#263449] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#10B981] dark:bg-[#34D399] h-full rounded-full transition-all duration-500"
                            style={{ width: `${deckMastery}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA Buttons */}
                    <div className="mt-5 pt-3 border-t border-[#E2E8F0] dark:border-[#263449] space-y-2">
                      {activeTab === 'quizzes' ? (
                        <Link
                          href={`/deck/${deck.id}?mode=quiz`}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Start Quiz</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/deck/${deck.id}?mode=study`}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Study Flashcards</span>
                        </Link>
                      )}

                      <div className="grid grid-cols-2 gap-1.5">
                        {activeTab !== 'quizzes' && (
                          <Link
                            href={`/deck/${deck.id}?mode=quiz`}
                            className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-semibold transition-all"
                          >
                            <HelpCircle className="w-3 h-3 text-[#2563EB]" />
                            <span>Quiz</span>
                          </Link>
                        )}
                        <Link
                          href={`/deck/${deck.id}?mode=exam`}
                          className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-semibold transition-all"
                        >
                          <Timer className="w-3 h-3 text-pink-500" />
                          <span>Timed Exam</span>
                        </Link>
                        {activeTab === 'quizzes' && (
                          <Link
                            href={`/deck/${deck.id}?mode=study`}
                            className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-semibold transition-all"
                          >
                            <GraduationCap className="w-3 h-3 text-[#2563EB]" />
                            <span>Flashcards</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
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

      {/* CREATE / EDIT SUBJECT MODAL */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
              <h2 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                {editingSubject ? 'Edit Subject Folder' : 'Create Subject Folder'}
              </h2>
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="p-1 rounded-xl text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                  Subject Folder Name
                </label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => handleSubjectNameChange(e.target.value)}
                  placeholder="e.g. Molecular Biology, Calculus II, World History"
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] font-semibold focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Color Tag Picker */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Folder Color Tag
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSubjectColor(color)}
                      className={`w-7 h-7 rounded-xl transition-all ${
                        subjectColor === color ? 'ring-2 ring-offset-2 ring-[#2563EB] scale-110' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Folder Icon
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {iconOptions.map(({ name, label }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(name);
                        setIsIconManuallySelected(true);
                      }}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        selectedIcon === name
                          ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB]'
                          : 'border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[#64748B]'
                      }`}
                    >
                      <SubjectIcon name={name} className="w-4 h-4" />
                      <span className="text-[10px] font-bold">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#263449]">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold shadow-xs transition-all"
                >
                  {editingSubject ? 'Save Changes' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME DECK MODAL */}
      {renamingDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-lg text-[#0F172A] dark:text-[#F8FAFC]">
                  Rename Study Deck
                </h3>
              </div>
              <button
                onClick={() => setRenamingDeck(null)}
                className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRenameDeck} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Deck Title
                </label>
                <input
                  type="text"
                  required
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="Enter new deck name..."
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] font-semibold focus:outline-none focus:border-[#2563EB]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#263449]">
                <button
                  type="button"
                  onClick={() => setRenamingDeck(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDeckTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold shadow-xs transition-all disabled:opacity-50"
                >
                  Save Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubjectDecksPage() {
  return (
    <Suspense fallback={<DecksLoading />}>
      <DecksContent />
    </Suspense>
  );
}
