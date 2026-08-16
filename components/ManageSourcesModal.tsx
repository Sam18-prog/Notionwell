'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Paperclip,
  FileText,
  FileCode,
  Image as ImageIcon,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  HelpCircle,
  Eye,
  ExternalLink,
  Download,
  File,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  Deck,
  DeckSource,
  Flashcard,
  QuizQuestion,
  getDeckSources,
  saveDeckSource,
  deleteDeckSource,
  saveDeck,
  getTodayDateString,
} from '@/lib/app';
import { compressImageFile, readFileAsDataUrl } from '@/lib/imageUtils';

interface ManageSourcesModalProps {
  deck: Deck;
  isOpen: boolean;
  onClose: () => void;
  onDeckUpdated: (updatedDeck: Deck) => void;
}

export default function ManageSourcesModal({
  deck,
  isOpen,
  onClose,
  onDeckUpdated,
}: ManageSourcesModalProps) {
  const [sources, setSources] = useState<DeckSource[]>([]);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  // ADD SOURCE FLOW STATE
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const [step, setStep] = useState<'input' | 'extracting' | 'generating' | 'confirmation'>('input');
  const [loadingStatus, setLoadingStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [extractedText, setExtractedText] = useState('');
  const [sourceType, setSourceType] = useState<'pdf' | 'docx' | 'txt' | 'image'>('txt');
  const [newFileName, setNewFileName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState<string | undefined>(undefined);
  const [newFileDataUrl, setNewFileDataUrl] = useState<string | undefined>(undefined);
  const [isScannedOcrModal, setIsScannedOcrModal] = useState(false);
  const [hasUnclearModal, setHasUnclearModal] = useState(false);
  const [unclearCountModal, setUnclearCountModal] = useState(0);
  const [showAiTextMap, setShowAiTextMap] = useState<Record<string, boolean>>({});

  const [pendingFlashcards, setPendingFlashcards] = useState<Flashcard[]>([]);
  const [pendingQuiz, setPendingQuiz] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    if (isOpen && deck) {
      const loaded = getDeckSources(deck.id);
      setSources(loaded);
      setIsAddingSource(false);
      resetAddSourceForm();
    }
  }, [isOpen, deck]);

  if (!isOpen || !deck) return null;

  const resetAddSourceForm = () => {
    setFile(null);
    setPastedText('');
    setStep('input');
    setErrorMsg(null);
    setLoadingStatus('');
    setExtractedText('');
    setSourceType('txt');
    setNewFileName('');
    setNewImageUrl(undefined);
    setNewFileDataUrl(undefined);
    setIsScannedOcrModal(false);
    setHasUnclearModal(false);
    setUnclearCountModal(0);
    setPendingFlashcards([]);
    setPendingQuiz([]);
  };

  const handleDeleteSource = (e: React.MouseEvent, source: DeckSource) => {
    e.stopPropagation();
    if (
      confirm(
        `Are you sure you want to remove source "${source.fileName}"? (Existing flashcards generated from this file will be preserved.)`
      )
    ) {
      deleteDeckSource(source.id);
      const updated = getDeckSources(deck.id);
      setSources(updated);
    }
  };

  const handleExtractText = async () => {
    setErrorMsg(null);

    if (activeTab === 'upload') {
      if (!file) {
        setErrorMsg('Please select a PDF, DOCX, TXT, or Image file to upload.');
        return;
      }
      setStep('extracting');
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      setLoadingStatus(
        isPdf
          ? 'Multimodal Analysis: Evaluating text quality & reading handwriting, equations, code & diagrams...'
          : `Extracting content from ${file.name}...`
      );

      try {
        let compressedUrl: string | undefined = undefined;
        let rawDataUrl: string | undefined = undefined;
        try {
          if (file.type.startsWith('image/')) {
            compressedUrl = await compressImageFile(file);
            rawDataUrl = compressedUrl;
          } else {
            rawDataUrl = await readFileAsDataUrl(file);
          }
          setNewFileDataUrl(rawDataUrl);
        } catch (e) {
          console.warn('Failed to read file Data URL:', e);
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

        const validSourceType = (data.sourceType === 'text' ? 'txt' : data.sourceType) || 'txt';
        setExtractedText(data.text);
        setSourceType(validSourceType);
        setIsScannedOcrModal(Boolean(data.isScannedOcr));
        setHasUnclearModal(Boolean(data.hasUnclearSections));
        setUnclearCountModal(data.unclearCount || 0);
        setNewFileName(file.name);
        setNewImageUrl(compressedUrl || data.imageUrl);
        await handleGenerateAI(data.text, file.name, validSourceType);
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
      }
    } else {
      if (!pastedText.trim() || pastedText.trim().length < 150) {
        setErrorMsg(
          "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option."
        );
        return;
      }

      setStep('extracting');
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

        const customName = `Pasted Notes (${new Date().toLocaleDateString()})`;
        setExtractedText(data.text);
        setSourceType('txt');
        setNewFileName(customName);
        setNewImageUrl(undefined);
        await handleGenerateAI(data.text, customName, 'txt');
      } catch (err: any) {
        setErrorMsg(
          err.message ||
            "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option."
        );
        setStep('input');
      }
    }
  };

  const handleGenerateAI = async (textToProcess: string, fileName: string, type: string) => {
    setErrorMsg(null);

    // Guardrail check: Stop AI generation if extracted text is below 150 chars
    if (!textToProcess || textToProcess.trim().length < 150) {
      setErrorMsg(
        "We couldn't extract enough readable text from this file. Please upload a typed document or a clearer file, or paste the text directly using the 'Paste Raw Text' option."
      );
      setStep('input');
      return;
    }

    setStep('generating');
    setLoadingStatus('AI is synthesizing new flashcards & quiz questions...');

    try {
      const res = await fetch('/api/study?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToProcess, deckId: deck.id }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'AI generation failed.');
      }

      setPendingFlashcards(data.flashcards || []);
      setPendingQuiz(data.quiz || []);
      setStep('confirmation');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating flashcards.');
      setStep('input');
    }
  };

  const handleConfirmAppendSource = () => {
    const today = getTodayDateString();

    const formattedCards: Flashcard[] = pendingFlashcards.map((c) => ({
      ...c,
      id: uuidv4(),
      deckId: deck.id,
      intervalDays: 0,
      nextReviewDate: today,
      timesReviewed: 0,
      timesIncorrect: 0,
      isBookmarked: false,
      masteryLevel: 'new',
      correctReviewCount: 0,
      lastReviewedDate: null,
      isWeakTopicReviewed: false,
    }));

    const formattedQuiz: QuizQuestion[] = pendingQuiz.map((q) => ({
      ...q,
      id: uuidv4(),
    }));

    const newSource: DeckSource = {
      id: uuidv4(),
      deckId: deck.id,
      fileName: newFileName || 'Additional Source',
      fileType: sourceType as any,
      extractedText,
      addedAt: new Date().toISOString(),
      cardsGenerated: formattedCards.length,
      imageUrl: newImageUrl,
      fileDataUrl: newFileDataUrl || (activeTab === 'paste' ? `data:text/plain;base64,${Buffer.from(extractedText).toString('base64')}` : undefined),
    };

    saveDeckSource(newSource);

    const updatedDeck: Deck = {
      ...deck,
      flashcards: [...(deck.flashcards || []), ...formattedCards],
      quizQuestions: [...(deck.quizQuestions || []), ...formattedQuiz],
    };

    saveDeck(updatedDeck);
    onDeckUpdated(updatedDeck);
    setSources(getDeckSources(deck.id));
    setIsAddingSource(false);
    resetAddSourceForm();
  };

  const renderSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-purple-500" />;
      case 'txt':
      default:
        return <FileCode className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0F172A] dark:text-[#F8FAFC]">
                Manage Sources
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
                {deck.name} • {sources.length} Linked File{sources.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#172033] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VIEW 1: SOURCES LIST */}
        {!isAddingSource && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                Linked Source Files (Click row to view content)
              </span>

              <button
                onClick={() => {
                  setIsAddingSource(true);
                  resetAddSourceForm();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] text-white font-bold text-xs shadow-xs transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Add Source</span>
              </button>
            </div>

            {sources.length === 0 ? (
              <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-dashed border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-8 text-center space-y-2">
                <Paperclip className="w-8 h-8 text-[#64748B] mx-auto opacity-50" />
                <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  No sources recorded for this deck.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sources.map((src) => {
                  const isExpanded = expandedSourceId === src.id;
                  const isImage = src.fileType === 'image' || Boolean(src.imageUrl);

                  return (
                    <div
                      key={src.id}
                      className={`bg-[#F8FAFC] dark:bg-[#172033] border rounded-2xl p-4 space-y-4 shadow-xs transition-all ${
                        isExpanded
                          ? 'border-[#2563EB] ring-1 ring-[#2563EB]/30'
                          : 'border-[#E2E8F0] dark:border-[#263449] hover:border-[#CBD5E1]'
                      }`}
                    >
                      {/* CLICKABLE SOURCE ROW HEADER */}
                      <div
                        onClick={() => setExpandedSourceId(isExpanded ? null : src.id)}
                        className="flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] flex items-center justify-center shrink-0 shadow-2xs">
                            {renderSourceIcon(src.fileType)}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-[#0F172A] dark:text-[#F8FAFC] truncate flex items-center gap-2">
                              <span>{src.fileName}</span>
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                              <span className="uppercase font-bold tracking-wider">{src.fileType}</span>
                              <span>•</span>
                              <span>Added {new Date(src.addedAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="text-[#2563EB] dark:text-[#60A5FA] font-bold">
                                {src.cardsGenerated} Cards Generated
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSourceId(isExpanded ? null : src.id);
                            }}
                            className={`p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-white dark:hover:bg-[#111827] transition-all flex items-center gap-1 ${
                              isExpanded ? 'text-[#2563EB] font-bold' : ''
                            }`}
                            title="Toggle source content"
                          >
                            <span className="text-[11px] font-bold hidden sm:inline">
                              {isExpanded ? 'Hide Content' : 'View Content'}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={(e) => handleDeleteSource(e, src)}
                            className="p-2 rounded-xl text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A] transition-colors"
                            title="Delete Source"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* INLINE ACCORDION EXPANDED VIEW — NATIVE ORIGINAL FILE VIEWERS */}
                      {isExpanded && (
                        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          {/* 1. PDF SOURCE VIEWER */}
                          {src.fileType === 'pdf' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-[#2563EB] dark:text-[#60A5FA]">
                                  <FileText className="w-4 h-4 text-red-500" />
                                  <span>Original PDF Document Viewer</span>
                                </div>
                                {src.fileDataUrl && (
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (src.fileDataUrl) {
                                          try {
                                            const parts = src.fileDataUrl.split(',');
                                            const mimeMatch = parts[0].match(/:(.*?);/);
                                            const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
                                            const bstr = atob(parts[1]);
                                            let n = bstr.length;
                                            const u8arr = new Uint8Array(n);
                                            while (n--) {
                                              u8arr[n] = bstr.charCodeAt(n);
                                            }
                                            const blob = new Blob([u8arr], { type: mimeType });
                                            const blobUrl = URL.createObjectURL(blob);
                                            window.open(blobUrl, '_blank');
                                            setTimeout(() => {
                                              URL.revokeObjectURL(blobUrl);
                                            }, 60000);
                                          } catch (err) {
                                            console.error('Error creating Blob URL:', err);
                                            window.open(src.fileDataUrl, '_blank');
                                          }
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer"
                                    >
                                      <span>Open in New Tab</span>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>

                                    <span className="text-[#CBD5E1] dark:text-[#334155]">•</span>

                                    <a
                                      href={src.fileDataUrl}
                                      download={src.fileName}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download</span>
                                    </a>
                                  </div>
                                )}
                              </div>

                              {src.fileDataUrl ? (
                                <iframe
                                  src={src.fileDataUrl}
                                  title={src.fileName}
                                  className="w-full h-80 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-slate-50 shadow-xs"
                                />
                              ) : (
                                <div className="p-6 text-center bg-[#F8FAFC] dark:bg-[#172033] border border-dashed border-[#CBD5E1] dark:border-[#334155] rounded-2xl space-y-2">
                                  <FileText className="w-8 h-8 text-red-400 mx-auto" />
                                  <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                                    Original PDF binary unavailable for this legacy source
                                  </p>
                                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                    This source was uploaded prior to full PDF binary retention enablement.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 2. IMAGE SOURCE VIEWER */}
                          {src.fileType === 'image' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-[#2563EB] dark:text-[#60A5FA]">
                                  <ImageIcon className="w-4 h-4 text-purple-500" />
                                  <span>Original Uploaded Image</span>
                                </div>
                                {(src.fileDataUrl || src.imageUrl) && (
                                  <a
                                    href={src.fileDataUrl || src.imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                                  >
                                    <span>Open Image in New Tab</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>

                              <div className="bg-[#F8FAFC] dark:bg-[#172033] p-3 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] flex items-center justify-center">
                                {src.fileDataUrl || src.imageUrl ? (
                                  <img
                                    src={src.fileDataUrl || src.imageUrl || ''}
                                    alt={src.fileName}
                                    className="max-h-80 rounded-xl border border-[#E2E8F0] dark:border-[#263449] object-contain shadow-xs"
                                  />
                                ) : (
                                  <div className="py-8 text-center text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">
                                    🖼️ Image upload recorded for {src.fileName}.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 3. DOCX SOURCE VIEWER */}
                          {src.fileType === 'docx' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-[#2563EB] dark:text-[#60A5FA]">
                                  <FileCode className="w-4 h-4 text-blue-500" />
                                  <span>Original DOCX File</span>
                                </div>
                              </div>

                              <div className="p-6 bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl text-center space-y-3">
                                <FileCode className="w-10 h-10 text-blue-500 mx-auto" />
                                <div>
                                  <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                                    DOCX files cannot be previewed directly inside web browsers.
                                  </p>
                                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                                    Download your original Microsoft Word document to view its formatted pages.
                                  </p>
                                </div>

                                {src.fileDataUrl ? (
                                  <a
                                    href={src.fileDataUrl}
                                    download={src.fileName}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs transition-all"
                                  >
                                    <Download className="w-4 h-4" />
                                    <span>Download Original File ({src.fileName})</span>
                                  </a>
                                ) : (
                                  <p className="text-xs text-[#64748B] font-semibold italic">
                                    (Original DOCX binary unavailable for legacy record)
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 4. TXT / PASTED TEXT SOURCE VIEWER */}
                          {src.fileType === 'txt' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                                  <FileCode className="w-3.5 h-3.5 text-[#2563EB]" />
                                  <span>Raw Plain Text Content</span>
                                </div>
                                <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8]">
                                  {src.extractedText.length} characters
                                </span>
                              </div>

                              {src.extractedText ? (
                                <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl p-3.5 text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                                  <div className="max-h-56 overflow-y-auto leading-relaxed font-mono text-[11.5px] whitespace-pre-wrap pr-2 text-[#475569] dark:text-[#CBD5E1]">
                                    {src.extractedText}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-4 text-center text-xs text-[#64748B] dark:text-[#94A3B8] bg-[#F8FAFC] dark:bg-[#172033] border border-dashed border-[#CBD5E1] dark:border-[#334155] rounded-xl space-y-1">
                                  <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                                    Original text unavailable for this legacy source
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 5. COLLAPSIBLE ADVANCED AI TEXT LOG (TECHNICAL DETAILS) */}
                          <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#263449]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAiTextMap((prev) => ({ ...prev, [src.id]: !prev[src.id] }));
                              }}
                              className="text-[11px] font-bold text-[#64748B] hover:text-[#2563EB] dark:text-[#94A3B8] dark:hover:text-[#3B82F6] flex items-center gap-1.5 transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{showAiTextMap[src.id] ? 'Hide AI Extracted Text' : 'Advanced: Show AI Extracted Text'}</span>
                            </button>

                            {showAiTextMap[src.id] && (
                              <div className="mt-2 bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto text-[#475569] dark:text-[#CBD5E1]">
                                {src.extractedText || 'No AI text captured.'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: ADD SOURCE WORKFLOW */}
        {isAddingSource && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
              <h3 className="font-extrabold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                Add New Source File to &ldquo;{deck.name}&rdquo;
              </h3>
              <button
                onClick={() => setIsAddingSource(false)}
                className="text-xs font-bold text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
              >
                Back to Sources List
              </button>
            </div>

            {errorMsg && (
              <div className="bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#EF4444] text-[#EF4444] rounded-2xl p-4 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {step === 'input' && (
              <div className="space-y-4">
                {/* TAB SELECTOR */}
                <div className="flex items-center gap-2 bg-[#F8FAFC] dark:bg-[#172033] p-1.5 rounded-2xl border border-[#E2E8F0] dark:border-[#263449]">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      activeTab === 'upload'
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
                    }`}
                  >
                    Upload Document / Image
                  </button>

                  <button
                    onClick={() => setActiveTab('paste')}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      activeTab === 'paste'
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
                    }`}
                  >
                    Paste Text Notes
                  </button>
                </div>

                {/* TAB 1: FILE UPLOAD ZONE */}
                {activeTab === 'upload' && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                      isDragOver
                        ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#172554]'
                        : 'border-[#CBD5E1] dark:border-[#334155] hover:border-[#2563EB]'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-[#2563EB] mx-auto mb-2" />
                    <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {file ? file.name : 'Drag & drop your study file or image here'}
                    </p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                      Supports PDF, DOCX, TXT, and JPG/PNG Images
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="source-file-upload-modal"
                    />
                    <label
                      htmlFor="source-file-upload-modal"
                      className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] font-bold text-xs border border-[#DBEAFE] dark:border-[#1E3A8A] cursor-pointer hover:bg-[#2563EB] hover:text-white transition-all"
                    >
                      Browse File
                    </label>
                  </div>
                )}

                {/* TAB 2: PASTE TEXT */}
                {activeTab === 'paste' && (
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste lecture notes, chapter summaries, or definitions..."
                    className="w-full bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 text-xs font-mono text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                  />
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsAddingSource(false)}
                    className="px-4 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExtractText}
                    className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs"
                  >
                    Extract & Synthesize
                  </button>
                </div>
              </div>
            )}

            {(step === 'extracting' || step === 'generating') && (
              <div className="py-12 text-center space-y-4">
                <RefreshCw className="w-8 h-8 text-[#2563EB] animate-spin mx-auto" />
                <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {loadingStatus}
                </p>
              </div>
            )}

            {/* CONFIRMATION PREVIEW STEP */}
            {step === 'confirmation' && (
              <div className="space-y-6">
                <div className="bg-[#ECFDF5] dark:bg-[#052E2B] border border-[#A7F3D0] dark:border-[#065F46] rounded-2xl p-4 text-left space-y-1">
                  <div className="flex items-center gap-2 text-[#10B981] font-extrabold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Source Synthesis Ready</span>
                  </div>
                  <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] font-semibold leading-relaxed">
                    This will add approximately{' '}
                    <strong className="text-[#2563EB] dark:text-[#3B82F6]">
                      {pendingFlashcards.length} new flashcards
                    </strong>{' '}
                    and{' '}
                    <strong className="text-[#10B981]">
                      {pendingQuiz.length} quiz questions
                    </strong>{' '}
                    to &ldquo;{deck.name}&rdquo;.
                  </p>
                </div>

                {isScannedOcrModal && (
                  <div className="bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA] rounded-2xl p-4 flex items-start gap-3 text-xs font-semibold shadow-xs">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-sm">Multimodal Vision Processing Complete</p>
                      <p className="mt-[#0.5] opacity-90">
                        Handwriting, math equations, code blocks, and diagrams were transcribed using Multimodal Vision AI.
                      </p>
                    </div>
                  </div>
                )}

                {hasUnclearModal && (
                  <div className="bg-[#FFFBEB] dark:bg-[#451A03] border border-[#FCD34D] dark:border-[#B45309] text-[#B45309] dark:text-[#FBBF24] rounded-2xl p-4 flex items-start gap-3 text-xs font-semibold shadow-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-sm">Needs Review: Unclear Handwriting Marked ({unclearCountModal} section{unclearCountModal > 1 ? 's' : ''})</p>
                      <p className="mt-0.5 opacity-90">
                        A few parts of your notes were difficult to read and marked with [UNCLEAR]. Please review generated flashcards for accuracy.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  <p className="text-xs font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                    Generated Cards Preview ({pendingFlashcards.length})
                  </p>
                  {pendingFlashcards.slice(0, 3).map((fc, idx) => (
                    <div
                      key={idx}
                      className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-xl p-3 text-xs space-y-1"
                    >
                      <span className="text-[10px] font-bold text-[#2563EB] uppercase">
                        {fc.topic}
                      </span>
                      <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        Q: {fc.question}
                      </p>
                      <p className="text-[#475569] dark:text-[#CBD5E1]">A: {fc.answer}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0] dark:border-[#263449]">
                  <button
                    onClick={() => setIsAddingSource(false)}
                    className="px-4 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAppendSource}
                    className="px-6 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-xs"
                  >
                    Confirm & Append to Deck
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
