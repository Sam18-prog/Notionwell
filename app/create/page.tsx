'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter as useNextNavRouter, useSearchParams } from 'next/navigation';
import {
  Upload,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  HelpCircle,
  GraduationCap,
  FileCheck,
  Edit3,
  Folder,
  Plus,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  saveDeck,
  saveDeckSource,
  getCurrentUser,
  getSubjects,
  saveSubject,
  Subject,
  Flashcard,
  QuizQuestion,
  Deck,
  DeckSource,
} from '@/lib/app';
import { compressImageFile, readFileAsDataUrl } from '@/lib/imageUtils';

function CreateDeckForm() {
  const router = useNextNavRouter();
  const searchParams = useSearchParams();
  const preselectedSubjectId = searchParams?.get('subjectId') || '';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Inline new subject state
  const [isCreatingNewSubject, setIsCreatingNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#2563EB');

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const [step, setStep] = useState<'input' | 'checkpoint' | 'generating' | 'preview'>('input');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [extractedText, setExtractedText] = useState('');
  const [sourceType, setSourceType] = useState<'pdf' | 'docx' | 'text' | 'image'>('text');
  const [extractedImageUrl, setExtractedImageUrl] = useState<string | undefined>(undefined);
  const [fileDataUrl, setFileDataUrl] = useState<string | undefined>(undefined);
  const [isScannedOcr, setIsScannedOcr] = useState(false);
  const [hasUnclearSections, setHasUnclearSections] = useState(false);
  const [unclearCount, setUnclearCount] = useState(0);
  const [docType, setDocType] = useState('');
  const [deckName, setDeckName] = useState('');

  const [activeDeckId, setActiveDeckId] = useState<string>(() => uuidv4());

  const [generatedFlashcards, setGeneratedFlashcards] = useState<Flashcard[]>([]);
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/auth?redirect=/create');
      return;
    }
    const loadedSubjects = getSubjects();
    setSubjects(loadedSubjects);

    if (preselectedSubjectId && loadedSubjects.some((s) => s.id === preselectedSubjectId)) {
      setSelectedSubjectId(preselectedSubjectId);
    } else {
      const uncategorized = loadedSubjects.find(
        (s) => s.name.toLowerCase() === 'uncategorized' || s.id === 'subject-uncategorized'
      );
      if (uncategorized) {
        setSelectedSubjectId(uncategorized.id);
      } else if (loadedSubjects.length > 0) {
        setSelectedSubjectId(loadedSubjects[0].id);
      }
    }
  }, [router, preselectedSubjectId]);

  const handleInlineCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const newSub: Subject = {
      id: `subject-${uuidv4().slice(0, 8)}`,
      name: newSubjectName.trim(),
      colorTag: newSubjectColor,
      icon: 'Folder',
      createdAt: new Date().toISOString(),
    };

    saveSubject(newSub);
    const updated = getSubjects();
    setSubjects(updated);
    setSelectedSubjectId(newSub.id);
    setNewSubjectName('');
    setIsCreatingNewSubject(false);
  };

  const handleExtractText = async () => {
    setErrorMsg(null);

    if (!selectedSubjectId) {
      setErrorMsg('Please select or create a Subject for this deck before proceeding.');
      return;
    }

    if (activeTab === 'upload') {
      if (!file) {
        setErrorMsg('Please select a PDF, DOCX, TXT, or Image file to upload.');
        return;
      }
      setLoading(true);
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      setLoadingStatus(
        isPdf
          ? 'Multimodal Analysis: Evaluating text quality & reading handwriting, equations, code & diagrams...'
          : `Parsing file ${file.name}...`
      );

      try {
        let rawDataUrl: string | undefined = undefined;
        try {
          if (file.type.startsWith('image/')) {
            rawDataUrl = await compressImageFile(file);
            setExtractedImageUrl(rawDataUrl);
          } else {
            rawDataUrl = await readFileAsDataUrl(file);
          }
          setFileDataUrl(rawDataUrl);
        } catch (e) {
          console.warn('Failed to read file as Data URL:', e);
        }

        const formData = new FormData();
        formData.append('file', file);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        let res: Response;
        try {
          res = await fetch('/api/study?action=ingest', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        const data = await res.json();
        if (!res.ok || data.error || !data.text || data.text.trim().length < 150) {
          throw new Error(
            data.error ||
              "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option."
          );
        }

        setExtractedText(data.text);
        setSourceType(data.sourceType);
        setIsScannedOcr(Boolean(data.isScannedOcr));
        setHasUnclearSections(Boolean(data.hasUnclearSections));
        setUnclearCount(data.unclearCount || 0);
        setDocType(data.documentType || '');

        if (data.imageUrl) {
          setExtractedImageUrl(data.imageUrl);
        }
        setDeckName(file.name.replace(/\.[^/.]+$/, ''));
        setStep('checkpoint');
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setErrorMsg(
            "Extraction timed out. The multi-page document may be too long or complex. Try a shorter document or a clearer scan."
          );
        } else {
          setErrorMsg(
            err.message ||
              "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option."
          );
        }
        setStep('input');
      } finally {
        setLoading(false);
      }
    } else {
      if (!pastedText.trim() || pastedText.trim().length < 150) {
        setErrorMsg(
          "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option."
        );
        return;
      }

      if (pastedText.trim().length > 20000) {
        setErrorMsg(
          "This demo is limited to shorter documents (~15-20 pages) to keep the experience fast and available for everyone. Try a shorter excerpt."
        );
        return;
      }

      setLoading(true);
      setLoadingStatus('Validating pasted text...');
      try {
        const res = await fetch('/api/study?action=ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedText }),
        });

        const data = await res.json();
        if (!res.ok || data.error || !data.text || data.text.trim().length < 150) {
          throw new Error(
            data.error ||
              "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option."
          );
        }

        setExtractedText(data.text);
        setSourceType('text');
        setIsScannedOcr(false);
        setHasUnclearSections(false);
        setUnclearCount(0);
        setExtractedImageUrl(undefined);
        setDeckName('Custom Study Deck');
        setStep('checkpoint');
      } catch (err: any) {
        setErrorMsg(
          err.message ||
            "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option."
        );
        setStep('input');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGenerateAI = async () => {
    setErrorMsg(null);

    // Guardrail check: Stop AI generation if extracted text is below 150 chars
    if (!extractedText || extractedText.trim().length < 150) {
      setErrorMsg(
        "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option."
      );
      setStep('input');
      return;
    }

    setLoading(true);
    setLoadingStatus('AI is synthesizing flashcards & quiz questions with topic tags across all sections...');
    setStep('generating');

    try {
      const res = await fetch('/api/study?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractedText,
          deckId: activeDeckId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI material generation failed.');
      }

      setGeneratedFlashcards(data.flashcards || []);
      setGeneratedQuiz(data.quiz || []);
      setStep('preview');

      if (data.quotaNotice) {
        setErrorMsg(data.quotaNotice);
      } else if (data.skippedChunks && data.skippedChunks > 0) {
        setErrorMsg(
          `Deck generated with ${data.flashcards?.length || 0} cards — ${data.skippedChunks} section(s) couldn't be processed and were skipped.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate study deck. Please try again.');
      setStep('checkpoint');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeck = () => {
    const finalDeck: Deck = {
      id: activeDeckId,
      subjectId: selectedSubjectId || subjects[0]?.id || 'subject-uncategorized',
      name: deckName.trim() || 'Untitled Study Deck',
      createdAt: new Date().toISOString(),
      sourceType: sourceType as any,
      flashcards: generatedFlashcards.map((fc) => ({
        ...fc,
        deckId: activeDeckId,
      })),
      quizQuestions: generatedQuiz,
    };

    saveDeck(finalDeck);

    // Save initial DeckSource with real extracted text & compressed image URL
    const initialSource: DeckSource = {
      id: uuidv4(),
      deckId: activeDeckId,
      fileName: file ? file.name : `${deckName.trim() || 'Custom Study Deck'} (Pasted Notes)`,
      fileType: (sourceType === 'text' ? 'txt' : sourceType) as any,
      extractedText,
      imageUrl: extractedImageUrl,
      fileDataUrl: fileDataUrl || (activeTab === 'paste' ? `data:text/plain;base64,${Buffer.from(extractedText).toString('base64')}` : undefined),
      addedAt: new Date().toISOString(),
      cardsGenerated: generatedFlashcards.length,
    };
    saveDeckSource(initialSource);

    router.push(`/deck/${activeDeckId}?mode=study`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Create New Study Deck</h1>
        <p className="text-[#475569] dark:text-[#CBD5E1] text-sm mt-1 font-normal">
          Assign a subject folder, upload documents or paste study notes to extract text and generate AI flashcards.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#EF4444] dark:border-[#F87171] rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-start gap-3 text-[#EF4444] dark:text-[#F87171]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-sm">Demo Notice</p>
              <p className="mt-1 text-xs opacity-90 leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs hover:underline font-bold"
            >
              Dismiss
            </button>
          </div>
          {errorMsg.includes('Demo generation limit reached') && (
            <div className="pt-1 flex items-center gap-3">
              <a
                href="/decks"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs"
              >
                <BookOpen className="w-4 h-4" />
                <span>Explore Sample Biology Deck</span>
              </a>
            </div>
          )}
        </div>
      )}

      {step === 'input' && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          {/* SUBJECT SELECTOR STEP */}
          <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                <span>Assign to Subject Folder (Required)</span>
              </label>

              <button
                type="button"
                onClick={() => setIsCreatingNewSubject(!isCreatingNewSubject)}
                className="text-xs font-bold text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreatingNewSubject ? 'Cancel New Subject' : '+ Create New Subject'}</span>
              </button>
            </div>

            {!isCreatingNewSubject ? (
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setIsCreatingNewSubject(true);
                  } else {
                    setSelectedSubjectId(e.target.value);
                  }
                }}
                className="w-full bg-white dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#334155] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] font-bold focus:outline-none focus:border-[#2563EB]"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    📁 {sub.name}
                  </option>
                ))}
                <option value="__NEW__">➕ + Create New Subject...</option>
              </select>
            ) : (
              <form onSubmit={handleInlineCreateSubject} className="space-y-3 pt-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Enter new subject name (e.g. Physics)"
                    className="flex-1 bg-white dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#334155] rounded-xl px-4 py-2 text-sm text-[#0F172A] dark:text-[#F8FAFC] font-semibold focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Save Subject
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="flex items-center gap-4 border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 pb-2 font-bold text-sm transition-all border-b-2 ${
                activeTab === 'upload'
                  ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#2563EB] dark:text-[#3B82F6]'
                  : 'border-transparent text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Document (PDF / DOCX / TXT)
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-2 pb-2 font-bold text-sm transition-all border-b-2 ${
                activeTab === 'paste'
                  ? 'border-[#2563EB] dark:border-[#3B82F6] text-[#2563EB] dark:text-[#3B82F6]'
                  : 'border-transparent text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Paste Raw Text
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
                isDragOver
                  ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#172554]'
                  : 'border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#172033] hover:border-[#2563EB]'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center mx-auto mb-4 shadow-xs">
                <Upload className="w-8 h-8" />
              </div>

              {file ? (
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#2563EB] dark:bg-[#3B82F6] text-white text-sm font-bold shadow-xs">
                    <FileCheck className="w-4 h-4" />
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-xs text-[#EF4444] dark:text-[#F87171] hover:underline font-bold mt-2"
                    >
                      Remove file
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[#0F172A] dark:text-[#F8FAFC] font-extrabold text-lg">
                    Drag and drop your study file here
                  </p>
                  <p className="text-[#475569] dark:text-[#CBD5E1] text-xs font-medium">
                    Supports PDF, DOCX, or TXT documents
                  </p>
                  <label className="inline-block mt-4 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs font-semibold cursor-pointer transition-all shadow-xs">
                    Browse File
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Paste lecture notes, article, or textbook excerpt:
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your study material here (minimum 20 characters)..."
                rows={10}
                className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB] font-mono"
              />
              <div className="text-right text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
                {pastedText.length} characters
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleExtractText}
              disabled={loading}
              className="px-6 py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-semibold text-sm shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-[1.01]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Extract Text Checkpoint</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'checkpoint' && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
            <div className="flex items-center gap-2 text-[#10B981] dark:text-[#34D399] font-black text-lg">
              <CheckCircle className="w-5 h-5" />
              <span>Phase 1 Ingestion Complete — Text Checkpoint</span>
            </div>

            <button
              onClick={() => setStep('input')}
              className="text-xs text-[#475569] dark:text-[#CBD5E1] hover:underline font-bold"
            >
              Back to Input
            </button>
          </div>

          {isScannedOcr && (
            <div className="bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA] rounded-2xl p-4 flex items-start gap-3 text-xs font-semibold shadow-xs">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-[#2563EB] dark:text-[#60A5FA]" />
              <div>
                <p className="font-extrabold text-sm">Multimodal Vision Processing Complete</p>
                <p className="mt-0.5 opacity-90">
                  Handwriting, math equations, code blocks, and diagrams were transcribed using Multimodal Vision AI. Please review the extracted text below.
                </p>
              </div>
            </div>
          )}

          {hasUnclearSections && (
            <div className="bg-[#FFFBEB] dark:bg-[#451A03] border border-[#FCD34D] dark:border-[#B45309] text-[#B45309] dark:text-[#FBBF24] rounded-2xl p-4 flex items-start gap-3 text-xs font-semibold shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309] dark:text-[#FBBF24]" />
              <div>
                <p className="font-extrabold text-sm">Needs Review: Unclear Handwriting Marked ({unclearCount} section{unclearCount > 1 ? 's' : ''})</p>
                <p className="mt-0.5 opacity-90">
                  A few parts of your notes were difficult to read and marked with [UNCLEAR]. Please review the text below and edit any marked sections if needed.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                Study Deck Title
              </label>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] font-bold focus:outline-none focus:border-[#2563EB]"
                placeholder="e.g. Organic Chemistry Chapter 4"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-extrabold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider mb-2">
                <span>Extracted Raw Text ({extractedText.length} chars)</span>
                <span className="text-[#2563EB] dark:text-[#3B82F6]">Source: {sourceType}</span>
              </div>
              <div className="max-h-60 overflow-y-auto bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 text-xs font-mono text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed whitespace-pre-wrap">
                {extractedText}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#263449] pt-6">
            <button
              onClick={() => setStep('input')}
              className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] font-semibold text-sm hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] transition-colors border border-[#E2E8F0] dark:border-[#334155]"
            >
              Re-upload / Change Input
            </button>

            <button
              onClick={handleGenerateAI}
              disabled={loading}
              className="px-6 py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-semibold text-sm shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-[1.01]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Flashcards & Quiz</span>
            </button>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-12 text-center space-y-6 shadow-xs">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-[#EFF6FF] dark:bg-[#172554] animate-spin blur-xs" />
            <div className="relative w-20 h-20 rounded-2xl bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-10 h-10 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
              Synthesizing Study Materials
            </h3>
            <p className="text-sm text-[#2563EB] dark:text-[#3B82F6] font-bold animate-pulse">
              {loadingStatus}
            </p>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
              Generating exactly 12 concise flashcards and 5 multiple-choice questions with explanation & topic tagging.
            </p>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6]" />
                AI Generation Preview — Ready to Save
              </h2>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-0.5 font-medium">
                Generated {generatedFlashcards.length} flashcards and {generatedQuiz.length} quiz questions.
              </p>
            </div>

            <button
              onClick={handleSaveDeck}
              className="px-6 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] dark:bg-[#34D399] dark:hover:bg-[#10B981] text-white font-semibold text-sm shadow-xs transition-all flex items-center gap-2 hover:scale-[1.01]"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save & Start Studying</span>
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
              Flashcards Preview ({generatedFlashcards.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {generatedFlashcards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 space-y-2 hover:border-[#CBD5E1] transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#2563EB] dark:text-[#3B82F6] font-bold">
                      Card #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] font-bold">
                      {card.topic}
                    </span>
                  </div>

                  <p className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Q: {card.question}</p>
                  <p className="text-xs text-[#475569] dark:text-[#CBD5E1] line-clamp-2">A: {card.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#E2E8F0] dark:border-[#263449]">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Multiple-Choice Quiz Preview ({generatedQuiz.length})
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {generatedQuiz.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">
                      Quiz #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] font-bold">
                      {q.topic}
                    </span>
                  </div>
                  <p className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Q: {q.question}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2 rounded-xl border text-xs ${
                          opt === q.correctAnswer
                            ? 'bg-[#ECFDF5] dark:bg-[#052E2B] text-[#10B981] dark:text-[#34D399] font-bold border-[#A7F3D0] dark:border-[#065F46]'
                            : 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#263449] text-[#475569] dark:text-[#CBD5E1]'
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#263449] pt-6">
            <button
              onClick={handleGenerateAI}
              className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] font-semibold text-sm hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] transition-colors flex items-center gap-2 border border-[#E2E8F0] dark:border-[#334155]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Regenerate with AI</span>
            </button>

            <button
              onClick={handleSaveDeck}
              className="px-8 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] dark:bg-[#34D399] dark:hover:bg-[#10B981] text-white font-semibold text-sm shadow-xs transition-all flex items-center gap-2 hover:scale-[1.01]"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save Study Deck to Library</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateDeckPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Loading Create Deck Interface...</div>}>
      <CreateDeckForm />
    </Suspense>
  );
}
