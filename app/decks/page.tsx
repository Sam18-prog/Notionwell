'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getSubjects,
  getDecks,
  saveSubject,
  deleteSubject,
  getCurrentUser,
  detectSubjectIcon,
  Subject,
  Deck,
} from '@/lib/app';
import SubjectIcon from '@/components/SubjectIcon';
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
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function SubjectDecksPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  // Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState('#2563EB');
  const [selectedIcon, setSelectedIcon] = useState('Folder');
  const [isIconManuallySelected, setIsIconManuallySelected] = useState(false);

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

  if (!mounted) return null;

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

  const handleSelectIconOverride = (iconName: string) => {
    setSelectedIcon(iconName);
    setIsIconManuallySelected(true);
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
    if (confirm(`Are you sure you want to delete subject folder "${name}"? Decks within this subject will be reassigned to "Uncategorized".`)) {
      deleteSubject(id);
      loadData();
    }
  };

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#263449] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA] text-xs font-semibold mb-3">
            <Folder className="w-3.5 h-3.5" />
            <span>Subject Deck Organization Layer</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            My Subject Decks
          </h1>
          <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mt-1 font-normal">
            Select a subject folder to view and manage all decks assigned to that category.
          </p>
        </div>

        {/* SEARCH BAR & ACTION BUTTONS GROUP */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* SEARCH INPUT */}
          <div className="relative w-full sm:w-64 lg:w-72">
            <Search className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subjects..."
              className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl pl-9 pr-8 py-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] font-semibold placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreateModal}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] font-bold text-xs shadow-xs transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#2563EB]" />
              <span>+ New Subject Folder</span>
            </button>

            <Link
              href="/create"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.01] whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create New Deck</span>
            </Link>
          </div>
        </div>
      </div>

      {/* SUBJECT FOLDERS GRID */}
      {filteredSubjects.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] border border-dashed border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-12 text-center flex flex-col items-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center mb-3 shadow-xs">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
            No subjects found for &ldquo;{searchQuery}&rdquo;
          </h3>
          <p className="text-xs text-[#475569] dark:text-[#CBD5E1] max-w-sm mb-4 font-medium">
            Check your spelling or try searching for a different subject name.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] border border-[#DBEAFE] dark:border-[#1E3A8A] font-bold text-xs hover:bg-[#2563EB] hover:text-white transition-all"
          >
            Clear Search
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
                className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] rounded-3xl p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    {/* DYNAMIC SUBJECT ICON WITH COLOR TAG BACKGROUND */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: subject.colorTag || '#2563EB' }}
                    >
                      <SubjectIcon iconName={subject.icon} name={subject.name} className="w-6 h-6 fill-white/20" />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenEditModal(e, subject)}
                        className="p-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#172033] transition-colors"
                        title="Edit Subject"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {subject.id !== 'subject-uncategorized' && (
                        <button
                          onClick={(e) => handleDeleteSubjectClick(e, subject.id, subject.name)}
                          className="p-1.5 rounded-xl text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A] transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-extrabold text-lg text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6] transition-colors line-clamp-1">
                    {subject.name}
                  </h3>

                  <div className="mt-4 flex items-center justify-between text-xs text-[#475569] dark:text-[#CBD5E1] font-bold border-t border-[#E2E8F0] dark:border-[#263449] pt-3">
                    <span>{subjectDecks.length} Decks</span>
                    <span>{totalCards} Flashcards</span>
                  </div>
                </div>

                <div className="mt-5 space-y-2 pt-3 border-t border-[#E2E8F0] dark:border-[#263449]/60">
                  <div className="flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                    <span>Mastery Score</span>
                    <span className="text-[#10B981]">{overallMastery}%</span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] dark:bg-[#263449] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${overallMastery}%`,
                        backgroundColor: subject.colorTag || '#2563EB',
                      }}
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#2563EB] dark:text-[#3B82F6]">
                    <span>Explore Subject Decks</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT SUBJECT MODAL DIALOG */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <SubjectIcon iconName={selectedIcon} name={subjectName} className="w-5 h-5 text-[#2563EB]" />
                {editingSubject ? 'Edit Subject Folder' : 'Create New Subject Folder'}
              </h3>
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => handleSubjectNameChange(e.target.value)}
                  placeholder="e.g. Organic Chemistry, European History"
                  className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] font-semibold focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* MANUAL ICON OVERRIDE SELECTION GRID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Subject Icon
                  </label>
                  {!isIconManuallySelected && subjectName && (
                    <span className="text-[10px] text-[#2563EB] dark:text-[#60A5FA] font-semibold">
                      Auto-detected
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-6 gap-2 bg-[#F8FAFC] dark:bg-[#172033] p-2.5 rounded-2xl border border-[#E2E8F0] dark:border-[#263449]">
                  {iconOptions.map((opt) => (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => handleSelectIconOverride(opt.name)}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                        selectedIcon === opt.name
                          ? 'bg-[#2563EB] text-white font-bold shadow-xs'
                          : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B]'
                      }`}
                      title={opt.label}
                    >
                      <SubjectIcon iconName={opt.name} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                  Folder Color Tag
                </label>
                <div className="flex items-center gap-2.5">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSubjectColor(c)}
                      className={`w-7 h-7 rounded-xl transition-all ${
                        subjectColor === c ? 'ring-2 ring-offset-2 ring-[#2563EB] scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0] dark:border-[#263449]">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs"
                >
                  Save Subject Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
