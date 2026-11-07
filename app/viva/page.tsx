'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Volume2,
  Square,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send,
  Award,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Bot,
  FileText,
  Layers,
  ChevronRight,
  Check,
  Info,
} from 'lucide-react';
import { getCurrentUser, getDecks, Deck, User } from '@/lib/app';
import { VivaSession, VivaMode, DifficultyLevel } from '@/lib/intelligence';
import VivaLoading from './loading';

interface StoredDoc {
  id: string;
  fileName: string;
  fileType: string;
  characterCount: number;
  chunkCount: number;
  createdAt: string;
}

export default function VivaPrepPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  // Available study materials
  const [availableDocs, setAvailableDocs] = useState<StoredDoc[]>([]);
  const [availableDecks, setAvailableDecks] = useState<Deck[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  // Configuration modal & source selection states
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [sourceType, setSourceType] = useState<'document' | 'deck' | 'custom'>('document');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [topicTitle, setTopicTitle] = useState('Operating Systems: Virtual Memory & Paging');
  const [vivaMode, setVivaMode] = useState<VivaMode>('comprehensive');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [isStarting, setIsStarting] = useState(false);

  // Active Session states
  const [session, setSession] = useState<VivaSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [questionIndex, setQuestionIndex] = useState(1);
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{
    qIndex: number;
    question: string;
    studentAnswer: string;
    score: number;
    evaluationStatus?: 'correct' | 'partially_correct' | 'incorrect';
    feedback: string;
    strengths?: string[];
    missingPoints?: string[];
    technicalInaccuracies?: string[];
    idealAnswer?: string;
  }>>([]);

  // Student answer inputs
  const [answerInput, setAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Speech Recognition (Web Speech API)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechAccumulatedRef = useRef<string>('');

  // Speech Synthesis (TTS)
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Final Report state
  const [finalReport, setFinalReport] = useState<any | null>(null);

  // Turn Evaluation state & error
  const [currentEvaluation, setCurrentEvaluation] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load study materials & check for active saved session
  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    setUser(currentUser);
    const localDecks = getDecks();
    setAvailableDecks(localDecks);

    // Fetch user indexed documents
    setIsLoadingSources(true);
    fetch('/api/assistant/index-document')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.documents) && data.documents.length > 0) {
          setAvailableDocs(data.documents);
          // Default selection to first uploaded document
          setSelectedDocId(data.documents[0].id);
          setTopicTitle(data.documents[0].fileName.replace(/\.[^/.]+$/, ''));
          setSourceType('document');
        } else if (localDecks.length > 0) {
          setSelectedDeckId(localDecks[0].id);
          setTopicTitle(localDecks[0].name);
          setSourceType('deck');
        } else {
          setSourceType('custom');
        }
      })
      .catch(err => {
        console.warn('Failed to fetch documents for viva selection:', err);
        if (localDecks.length > 0) {
          setSelectedDeckId(localDecks[0].id);
          setTopicTitle(localDecks[0].name);
          setSourceType('deck');
        }
      })
      .finally(() => setIsLoadingSources(false));

    // Restore active session if present in localStorage
    try {
      const savedSessionId = localStorage.getItem('notionwell_active_viva_session_id');
      if (savedSessionId) {
        fetch(`/api/study/viva/session/${savedSessionId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.session && data.session.status === 'in_progress') {
              setSession(data.session);
              setIsConfigOpen(false);
              const responses = data.responses || [];
              if (responses.length > 0) {
                const history = responses.map((r: any) => ({
                  qIndex: r.questionIndex,
                  question: r.questionText,
                  studentAnswer: r.studentResponse,
                  score: r.score,
                  evaluationStatus: r.evaluationStatus,
                  feedback: r.feedback,
                  strengths: r.strengths,
                  missingPoints: r.missingPoints,
                  technicalInaccuracies: r.technicalInaccuracies,
                  idealAnswer: r.idealAnswer,
                }));
                setTranscriptHistory(history);
                const nextQIdx = responses.length + 1;
                setQuestionIndex(nextQIdx);
                const lastTurn = responses[responses.length - 1];
                if (lastTurn.followUpQuestion) {
                  setCurrentQuestion(lastTurn.followUpQuestion);
                } else {
                  setCurrentQuestion(`Question ${nextQIdx}: Explain the key performance trade-offs in this topic.`);
                }
              }
            }
          })
          .catch(() => {});
      }
    } catch {}

    // Initialize Web Speech API for voice recording
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        setSpeechSupported(true);
        const recog = new SpeechRec();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              speechAccumulatedRef.current += (speechAccumulatedRef.current ? ' ' : '') + transcript.trim();
            } else {
              interimTranscript += transcript;
            }
          }
          const fullText = speechAccumulatedRef.current + (interimTranscript ? ` ${interimTranscript}` : '');
          setAnswerInput(fullText.trim());
        };

        recog.onerror = (err: any) => {
          console.warn('[Viva Voice STT Error]:', err);
          if (err?.error === 'not-allowed') {
            setMicPermissionDenied(true);
          }
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recog;
      }
    }
  }, []);

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const clean = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) return;
    setMicPermissionDenied(false);

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        speechAccumulatedRef.current = answerInput.trim();
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Voice recording start failed:', e);
      }
    }
  };

  const handleSelectDocument = (doc: StoredDoc) => {
    setSelectedDocId(doc.id);
    setSelectedDeckId('');
    setSourceType('document');
    setTopicTitle(doc.fileName.replace(/\.[^/.]+$/, ''));
  };

  const handleSelectDeck = (deck: Deck) => {
    setSelectedDeckId(deck.id);
    setSelectedDocId('');
    setSourceType('deck');
    setTopicTitle(deck.name);
  };

  const handleStartViva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() || isStarting) return;

    try {
      setIsStarting(true);
      stopSpeaking();
      setSubmitError(null);

      let sourceTitle = topicTitle.trim();
      let documentId: string | undefined = undefined;
      let deckId: string | undefined = undefined;

      if (sourceType === 'document' && selectedDocId) {
        documentId = selectedDocId;
        const matchedDoc = availableDocs.find(d => d.id === selectedDocId);
        if (matchedDoc) sourceTitle = matchedDoc.fileName;
      } else if (sourceType === 'deck' && selectedDeckId) {
        deckId = selectedDeckId;
        const matchedDeck = availableDecks.find(d => d.id === selectedDeckId);
        if (matchedDeck) sourceTitle = matchedDeck.name;
      }

      const res = await fetch('/api/study/viva/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: topicTitle.trim(),
          vivaMode,
          difficulty,
          totalQuestions,
          sourceType,
          sourceTitle,
          documentId,
          deckId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.session) {
        throw new Error(data.error || 'Failed to start viva session. Please try again.');
      }

      setSession(data.session);
      setCurrentQuestion(data.firstQuestion);
      setQuestionIndex(1);
      setTranscriptHistory([]);
      setFinalReport(null);
      setCurrentEvaluation(null);
      setSubmitError(null);
      setIsConfigOpen(false);
      setAnswerInput('');

      // Persist active session ID in localStorage
      try {
        localStorage.setItem('notionwell_active_viva_session_id', data.session.id);
      } catch {}

      // Examiner speaks the first oral question
      speakText(`Question 1. ${data.firstQuestion}`);
    } catch (err: any) {
      console.error('Failed to start viva session:', err);
      setSubmitError(err.message || 'Could not initiate examination session.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmitAnswer = async (e?: React.FormEvent, customAnswer?: string) => {
    if (e) e.preventDefault();
    const finalAnswer = (customAnswer !== undefined ? customAnswer : answerInput).trim();
    if (!finalAnswer || isSubmitting || !session) return;

    setSubmitError(null);
    try {
      setIsSubmitting(true);
      const wasVoice = isListening;
      if (isListening) {
        try {
          recognitionRef.current?.stop();
        } catch {}
        setIsListening(false);
      }
      stopSpeaking();

      const res = await fetch('/api/study/viva/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          questionIndex,
          questionText: currentQuestion,
          studentResponse: finalAnswer,
          isVoice: wasVoice,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.evaluation) {
        throw new Error(data.error || 'Failed to evaluate your response. Please try again.');
      }

      const ev = data.evaluation;

      // Record turn in transcript history
      setTranscriptHistory(prev => [
        ...prev,
        {
          qIndex: questionIndex,
          question: currentQuestion,
          studentAnswer: finalAnswer,
          score: ev.score,
          evaluationStatus: ev.evaluationStatus,
          feedback: ev.feedback,
          strengths: ev.strengths,
          missingPoints: ev.missingPoints,
          technicalInaccuracies: ev.technicalInaccuracies,
          idealAnswer: ev.idealAnswer,
        },
      ]);

      setCurrentEvaluation(ev);
      speakText(ev.feedback);
    } catch (err: any) {
      console.error('Failed to evaluate viva turn:', err);
      setSubmitError(err?.message || 'Failed to evaluate response. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePassQuestion = () => {
    handleSubmitAnswer(undefined, "I do not know the answer to this question.");
  };

  const handleProceedToNextQuestion = () => {
    if (!currentEvaluation || !session) return;

    if (currentEvaluation.isComplete) {
      setFinalReport(currentEvaluation.finalSummary);
      try {
        localStorage.removeItem('notionwell_active_viva_session_id');
      } catch {}
      speakText(`Viva voce complete. Your overall examination rating is ${currentEvaluation.finalSummary?.overallScore || 80} percent. Well defended.`);
    } else {
      setQuestionIndex(prev => prev + 1);
      const nextQ = currentEvaluation.followUpQuestion || `Could you elaborate further on how this applies to practical scenarios?`;
      setCurrentQuestion(nextQ);
      speakText(`Question ${questionIndex + 1}. ${nextQ}`);
    }
    setCurrentEvaluation(null);
    setAnswerInput('');
    speechAccumulatedRef.current = '';
    setSubmitError(null);
  };

  const handleStartNewSession = () => {
    stopSpeaking();
    try {
      localStorage.removeItem('notionwell_active_viva_session_id');
    } catch {}
    setSession(null);
    setFinalReport(null);
    setCurrentEvaluation(null);
    setTranscriptHistory([]);
    setAnswerInput('');
    setIsConfigOpen(true);
  };

  if (!mounted) return <VivaLoading />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1D] text-[#0F172A] dark:text-[#F8FAFC]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* TOP BREADCRUMB & HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-[#2563EB]">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                <Link href="/dashboard" className="hover:text-[#2563EB]">Dashboard</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#2563EB] dark:text-[#60A5FA]">AI Viva Voce Defense</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">AI Viva Voce Simulator</h1>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                Interactive oral examination grounded in your course notes, testing conceptual depth and verbal defense
              </p>
            </div>
          </div>

          <button
            onClick={handleStartNewSession}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-xs font-bold hover:border-[#2563EB] transition-colors cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>New Viva Session</span>
          </button>
        </div>

        {/* ACTIVE SESSION VIEW */}
        {session && !finalReport ? (
          <div className="rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] p-6 sm:p-7 shadow-xs space-y-6">
            
            {/* Top Session Progress Bar & Grounding Reference */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0] dark:border-[#263449]">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-950/80 text-[#2563EB] dark:text-[#60A5FA] font-extrabold uppercase text-[10px]">
                  {session.vivaMode} Mode
                </span>
                <span className="text-[#64748B] dark:text-[#94A3B8]">• {session.difficulty} level</span>
                {session.sourceTitle && (
                  <span className="flex items-center gap-1 font-bold text-[#0F172A] dark:text-[#E2E8F0]">
                    • <BookOpen className="w-3 h-3 text-[#2563EB]" />
                    <span>Source: {session.sourceTitle}</span>
                  </span>
                )}
              </div>

              <div className="text-xs font-black text-[#2563EB] dark:text-[#60A5FA]">
                Question {questionIndex} of {session.totalQuestions}
              </div>
            </div>

            {/* EXAMINER QUESTION BOX */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/60 dark:from-[#131D31] dark:to-[#172033] border border-blue-200 dark:border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#2563EB]">
                  <Bot className="w-4 h-4" />
                  <span>Viva Examiner:</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => isSpeaking ? stopSpeaking() : speakText(currentQuestion)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#0F172A] border border-blue-200 dark:border-blue-800 text-[11px] font-bold text-[#2563EB] hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    {isSpeaking ? (
                      <>
                        <Square className="w-3 h-3 fill-current animate-pulse text-amber-500" />
                        <span>Stop Voice Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3" />
                        <span>Repeat Question Aloud</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white leading-relaxed">
                "{currentQuestion}"
              </p>
            </div>

            {/* PREVIOUS EXCHANGES TRANSCRIPT */}
            {transcriptHistory.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                  Previous Q&A Defense Turns ({transcriptHistory.length})
                </h3>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {transcriptHistory.map((turn, tIdx) => (
                    <div
                      key={tIdx}
                      className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#131D31] border border-[#E2E8F0] dark:border-[#263449] text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#2563EB]">Turn {turn.qIndex}</span>
                        <span className={`font-black ${
                          turn.score >= 7.5 ? 'text-emerald-600 dark:text-emerald-400' :
                          turn.score >= 4.0 ? 'text-amber-600 dark:text-amber-400' :
                          'text-rose-600 dark:text-rose-400'
                        }`}>
                          Score: {turn.score.toFixed(1)} / 10
                        </span>
                      </div>
                      <p className="text-[#0F172A] dark:text-white font-medium"><strong>Q:</strong> {turn.question}</p>
                      <p className="text-[#334155] dark:text-[#CBD5E1] italic"><strong>Your Answer:</strong> "{turn.studentAnswer}"</p>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                        <strong>Examiner Feedback:</strong> {turn.feedback}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBMIT ERROR NOTIFICATION */}
            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{submitError}</span>
                </div>
                <button
                  onClick={() => setSubmitError(null)}
                  className="text-xs underline text-rose-600 hover:text-rose-800 dark:text-rose-400 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* MIC PERMISSION WARNING */}
            {micPermissionDenied && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Microphone access was denied. Please allow microphone permissions in your browser or type your answer using the keyboard below.</span>
              </div>
            )}

            {/* STRUCTURED EVALUATION REVIEW CARD */}
            {currentEvaluation ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-[#131D31] border-2 border-indigo-200 dark:border-indigo-900/60 space-y-5 shadow-sm animate-in fade-in duration-200">
                {/* Header: Status Badge and Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0] dark:border-[#263449]">
                  <div className="flex items-center gap-2.5">
                    {currentEvaluation.score >= 7.5 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Correct &amp; Well Articulated
                      </span>
                    ) : currentEvaluation.score >= 4.0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Partially Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5" />
                        Incorrect / Incomplete
                      </span>
                    )}
                    <span className="text-xs font-extrabold text-[#64748B] dark:text-[#94A3B8]">
                      Question {questionIndex} Evaluation
                    </span>
                  </div>

                  <div className="text-base font-black text-[#2563EB] dark:text-[#60A5FA]">
                    Score: {currentEvaluation.score.toFixed(1)} / 10
                  </div>
                </div>

                {/* Examiner Verbal Critique Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#0F172A] dark:text-white uppercase tracking-wider text-[10px]">
                      Examiner Verbal Critique:
                    </span>
                    <button
                      onClick={() => speakText(currentEvaluation.feedback)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Listen to Feedback</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1] leading-relaxed font-medium bg-[#F8FAFC] dark:bg-[#0F172A] p-4 rounded-xl border border-[#E2E8F0] dark:border-[#263449]">
                    {currentEvaluation.feedback}
                  </p>
                </div>

                {/* Rubric Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Strengths */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 space-y-1.5">
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>What Was Answered Correctly</span>
                    </div>
                    {currentEvaluation.strengths && currentEvaluation.strengths.length > 0 ? (
                      <ul className="space-y-1 text-[#334155] dark:text-[#CBD5E1]">
                        {currentEvaluation.strengths.map((s: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[#64748B] italic">No solid academic points established.</p>
                    )}
                  </div>

                  {/* Missing Points */}
                  <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-1.5">
                    <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      <span>Missing Concepts &amp; Nuances</span>
                    </div>
                    {currentEvaluation.missingPoints && currentEvaluation.missingPoints.length > 0 ? (
                      <ul className="space-y-1 text-[#334155] dark:text-[#CBD5E1]">
                        {currentEvaluation.missingPoints.map((m: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-emerald-600 font-medium">All essential concepts covered.</p>
                    )}
                  </div>
                </div>

                {/* Technical Inaccuracies (if any) */}
                {currentEvaluation.technicalInaccuracies && currentEvaluation.technicalInaccuracies.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs space-y-1">
                    <div className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Technical Inaccuracies Identified</span>
                    </div>
                    <ul className="space-y-1 text-[#334155] dark:text-[#CBD5E1]">
                      {currentEvaluation.technicalInaccuracies.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ideal Academic Model Answer */}
                {currentEvaluation.idealAnswer && (
                  <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs space-y-1.5">
                    <div className="font-bold text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ideal Academic Model Answer</span>
                    </div>
                    <p className="text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
                      {currentEvaluation.idealAnswer}
                    </p>
                  </div>
                )}

                {/* Suggestions for Oral Defense */}
                {currentEvaluation.suggestions && currentEvaluation.suggestions.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <span className="font-bold text-[#475569] dark:text-[#94A3B8]">
                      Oral Defense Tip:
                    </span>
                    <ul className="space-y-1 text-[#334155] dark:text-[#CBD5E1]">
                      {currentEvaluation.suggestions.map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-blue-500 font-bold">→</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Question Progression Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleProceedToNextQuestion}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs shadow-md transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <span>
                      {currentEvaluation.isComplete
                        ? 'View Final Viva Report →'
                        : `Next Question (${questionIndex + 1} of ${session.totalQuestions}) →`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* STUDENT ANSWER INPUT FORM */
              <form onSubmit={handleSubmitAnswer} className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                  <span>Your Verbal or Written Response:</span>
                  {speechSupported && (
                    <span className="text-[11px] font-normal text-slate-500">
                      {isListening ? '🎙️ Voice Recording Active • Speaking...' : 'Speak aloud or type your answer'}
                    </span>
                  )}
                </div>

                {isListening && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-pulse">
                    <Mic className="w-4 h-4 text-rose-500" />
                    <span>Listening to your voice answer... Speak clearly into your microphone. Click Finish Speaking when done.</span>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    value={answerInput}
                    onChange={e => setAnswerInput(e.target.value)}
                    placeholder="Articulate your answer clearly here, or click 'Answer via Voice' to speak your response aloud..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-2xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-hidden focus:border-[#2563EB] resize-none shadow-inner"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={toggleVoiceRecording}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isListening
                            ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB]'
                        }`}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        <span>{isListening ? 'Finish Speaking' : 'Answer via Voice'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handlePassQuestion}
                      disabled={isSubmitting}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                      title="Admit uncertainty and receive examiner model answer"
                    >
                      I don't know / Pass
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!answerInput.trim() || isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Evaluating Response...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Response</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        ) : finalReport ? (
          /* FINAL DIAGNOSTIC VIVA REPORT */
          <div className="rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] p-6 sm:p-8 shadow-xs space-y-8">
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <Award className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black">Viva Voce Diagnostic Examination Report</h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Topic: "{session?.topicTitle}" • Evaluated across {session?.totalQuestions} oral defense turns
              </p>
            </div>

            {/* PERFORMANCE METRIC CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-center">
                <span className="text-[11px] font-bold text-[#2563EB] uppercase">Overall Rating</span>
                <div className="text-3xl font-black text-[#0F172A] dark:text-white mt-1">
                  {finalReport.overallScore}%
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-center">
                <span className="text-[11px] font-bold text-emerald-600 uppercase">Accuracy</span>
                <div className="text-3xl font-black text-[#0F172A] dark:text-white mt-1">
                  {finalReport.accuracyScore}%
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 text-center">
                <span className="text-[11px] font-bold text-purple-600 uppercase">Conceptual Depth</span>
                <div className="text-3xl font-black text-[#0F172A] dark:text-white mt-1">
                  {finalReport.depthScore}%
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-center">
                <span className="text-[11px] font-bold text-amber-600 uppercase">Verbal Clarity</span>
                <div className="text-3xl font-black text-[#0F172A] dark:text-white mt-1">
                  {finalReport.clarityScore}%
                </div>
              </div>
            </div>

            {/* STRENGTHS & IMPROVEMENTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#131D31] border border-[#E2E8F0] dark:border-[#263449] space-y-2">
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Demonstrated Strengths
                </h4>
                <ul className="space-y-1.5 text-xs text-[#334155] dark:text-[#CBD5E1]">
                  {finalReport.strengths?.map((s: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#131D31] border border-[#E2E8F0] dark:border-[#263449] space-y-2">
                <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Areas for Oral Refinement
                </h4>
                <ul className="space-y-1.5 text-xs text-[#334155] dark:text-[#CBD5E1]">
                  {finalReport.improvements?.map((imp: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* FULL ANNOTATED TRANSCRIPT */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Full Evaluated Q&A Transcript
              </h3>
              <div className="space-y-3">
                {transcriptHistory.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#131D31] border border-[#E2E8F0] dark:border-[#263449] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#2563EB]">Question {t.qIndex}</span>
                      <span className="font-bold text-emerald-600">Graded {t.score.toFixed(1)} / 10</span>
                    </div>
                    <p className="font-bold text-[#0F172A] dark:text-white">"{t.question}"</p>
                    <p className="text-[#475569] dark:text-[#94A3B8] italic">Student Answer: "{t.studentAnswer}"</p>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                      <strong>Examiner Feedback:</strong> {t.feedback}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={handleStartNewSession}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                Practice Another Viva
              </button>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Return to Dashboard
              </Link>
            </div>

          </div>
        ) : (
          /* EMPTY STATE */
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] space-y-3">
            <Mic className="w-10 h-10 text-[#94A3B8] mx-auto animate-pulse" />
            <h3 className="text-base font-bold">Configure Your Viva Examination</h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto">
              Simulate college viva voce defenses with real-time academic questioning, speech recognition, and diagnostic grading.
            </p>
          </div>
        )}

      </div>

      {/* CONFIGURATION & SOURCE SELECTION MODAL */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#263449]">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-[#2563EB]" />
                <h3 className="font-extrabold text-base">Configure AI Viva Voce Simulation</h3>
              </div>
              {session && (
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="text-xs text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>

            <form onSubmit={handleStartViva} className="space-y-4 text-xs">
              
              {/* STEP 1: CHOOSE STUDY SOURCE */}
              <div className="space-y-2">
                <label className="block font-bold">Step 1: Select Examination Material (Grounding)</label>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType('document')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      sourceType === 'document'
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-[#F8FAFC] dark:bg-[#1E293B] border-[#CBD5E1] dark:border-[#334155] text-[#64748B] dark:text-[#CBD5E1]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Uploaded Docs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('deck')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      sourceType === 'deck'
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-[#F8FAFC] dark:bg-[#1E293B] border-[#CBD5E1] dark:border-[#334155] text-[#64748B] dark:text-[#CBD5E1]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Study Decks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('custom')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      sourceType === 'custom'
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-[#F8FAFC] dark:bg-[#1E293B] border-[#CBD5E1] dark:border-[#334155] text-[#64748B] dark:text-[#CBD5E1]'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Custom Topic</span>
                  </button>
                </div>

                {/* Sub-selection list based on source tab */}
                {sourceType === 'document' && (
                  <div className="space-y-1.5 mt-2">
                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      Choose an uploaded document to ground examiner questions:
                    </span>
                    {availableDocs.length > 0 ? (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/40">
                        {availableDocs.map(doc => (
                          <div
                            key={doc.id}
                            onClick={() => handleSelectDocument(doc)}
                            className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer border transition-colors ${
                              selectedDocId === doc.id
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-[#2563EB]'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                              <span className="font-semibold truncate">{doc.fileName}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 uppercase font-mono">
                              {doc.fileType}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
                        No uploaded documents found. <Link href="/assistant" className="text-[#2563EB] underline">Upload a PDF</Link> or choose a Study Deck above.
                      </div>
                    )}
                  </div>
                )}

                {sourceType === 'deck' && (
                  <div className="space-y-1.5 mt-2">
                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      Choose a study deck to test your knowledge against:
                    </span>
                    {availableDecks.length > 0 ? (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/40">
                        {availableDecks.map(deck => (
                          <div
                            key={deck.id}
                            onClick={() => handleSelectDeck(deck)}
                            className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer border transition-colors ${
                              selectedDeckId === deck.id
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-[#2563EB]'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Layers className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                              <span className="font-semibold truncate">{deck.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {deck.flashcards?.length || 0} cards
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
                        No decks found. Select Custom Topic below.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TOPIC TITLE INPUT */}
              <div>
                <label className="block font-bold mb-1">Examination Topic / Chapter</label>
                <input
                  type="text"
                  required
                  value={topicTitle}
                  onChange={e => setTopicTitle(e.target.value)}
                  placeholder="e.g. Operating Systems: Paging and Virtual Memory"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs font-medium"
                />
              </div>

              {/* VIVA MODE */}
              <div>
                <label className="block font-bold mb-1">Viva Mode</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'definitions', label: 'Definitions' },
                    { id: 'conceptual', label: 'Conceptual' },
                    { id: 'practical', label: 'Practical' },
                    { id: 'technical', label: 'Technical' },
                    { id: 'comprehensive', label: 'Mixed All-Round' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setVivaMode(m.id as VivaMode)}
                      className={`p-2 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        vivaMode === m.id
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-[#F8FAFC] dark:bg-[#1E293B] border-[#CBD5E1] dark:border-[#334155] text-[#64748B] dark:text-[#CBD5E1]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* DIFFICULTY & QUESTION COUNT */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B]"
                  >
                    <option value="beginner">Beginner (Undergraduate 1st Year)</option>
                    <option value="intermediate">Intermediate (Standard College)</option>
                    <option value="advanced">Advanced (Rigorous Defense)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Question Count</label>
                  <select
                    value={totalQuestions}
                    onChange={e => setTotalQuestions(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B]"
                  >
                    <option value={3}>3 Questions (Quick Drill)</option>
                    <option value={5}>5 Questions (Standard Viva)</option>
                    <option value={7}>7 Questions (Comprehensive Viva)</option>
                    <option value={10}>10 Questions (Mastery Defense)</option>
                  </select>
                </div>
              </div>

              {/* SUBMIT MODAL ACTIONS */}
              <div className="pt-3 flex justify-end gap-2">
                {session && (
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="px-4 py-2 rounded-xl border font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isStarting}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-extrabold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isStarting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Examiner Reviewing Material...</span>
                    </>
                  ) : (
                    <span>Begin Viva Voce</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
