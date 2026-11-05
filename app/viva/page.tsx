'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Award,
  BookOpen,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Clock,
  User as UserIcon,
  Bot,
} from 'lucide-react';
import { getCurrentUser, getDecks, getSubjects, Deck, Subject, User } from '@/lib/app';
import { VivaSession, VivaResponse, VivaMode, DifficultyLevel } from '@/lib/intelligence';
import VivaLoading from './loading';

export default function VivaPrepPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  // Configuration modal & setup states
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [topicTitle, setTopicTitle] = useState('Machine Learning Fundamentals');
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
    feedback: string;
  }>>([]);

  // Student answer inputs
  const [answerInput, setAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Speech Recognition (STT)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Speech Synthesis (TTS)
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Final Report state
  const [finalReport, setFinalReport] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());
    setSubjects(getSubjects());
    setDecks(getDecks());

    // Check Web Speech API support
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        setSpeechSupported(true);
        const recog = new SpeechRec();
        recog.continuous = false;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          const text = Array.from(event.results)
            .map((res: any) => res[0].transcript)
            .join('');
          setAnswerInput(text);
        };

        recog.onerror = (err: any) => {
          console.warn('[Viva STT Error]:', err);
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

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('STT Start failed:', e);
      }
    }
  };

  const handleStartViva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() || isStarting) return;

    try {
      setIsStarting(true);
      stopSpeaking();

      const res = await fetch('/api/study/viva/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle,
          vivaMode,
          difficulty,
          totalQuestions,
        }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        setSession(data.session);
        setCurrentQuestion(data.firstQuestion);
        setQuestionIndex(1);
        setTranscriptHistory([]);
        setFinalReport(null);
        setIsConfigOpen(false);
        setAnswerInput('');

        // Speak the first question aloud
        speakText(`Question 1. ${data.firstQuestion}`);
      }
    } catch (err) {
      console.error('Failed to start viva session:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmitAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!answerInput.trim() || isSubmitting || !session) return;

    try {
      setIsSubmitting(true);
      if (isListening) {
        recognitionRef.current?.stop();
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
          studentResponse: answerInput.trim(),
          isVoice: isListening,
        }),
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        const ev = data.evaluation;

        // Record turn in transcript history
        setTranscriptHistory(prev => [
          ...prev,
          {
            qIndex: questionIndex,
            question: currentQuestion,
            studentAnswer: answerInput.trim(),
            score: ev.score,
            feedback: ev.feedback,
          },
        ]);

        setAnswerInput('');

        if (ev.isComplete) {
          setFinalReport(ev.finalSummary);
          speakText(`Viva complete. Your overall evaluation is ${ev.finalSummary.overallScore} percent. Well done.`);
        } else {
          setQuestionIndex(prev => prev + 1);
          const nextQ = ev.followUpQuestion || `Could you elaborate further on how this applies to real-world edge cases?`;
          setCurrentQuestion(nextQ);
          speakText(`${ev.feedback} ... Next Question. ${nextQ}`);
        }
      }
    } catch (err) {
      console.error('Failed to evaluate viva turn:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return <VivaLoading />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1D] text-[#0F172A] dark:text-[#F8FAFC]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 text-indigo-600">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">AI Viva Voce Simulator</h1>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                Real-time interactive oral examination testing accuracy, conceptual depth, and verbal articulation
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopSpeaking();
              setIsConfigOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-xs font-bold hover:border-[#2563EB] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>New Viva Session</span>
          </button>
        </div>

        {/* ACTIVE SESSION VIEW */}
        {session && !finalReport ? (
          <div className="rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] p-6 shadow-xs space-y-6">
            
            {/* Top Session Progress Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#263449]">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 font-extrabold uppercase">
                  {session.vivaMode} Mode
                </span>
                <span className="text-[#64748B] dark:text-[#94A3B8]">• {session.difficulty} difficulty</span>
                <span className="text-[#64748B] dark:text-[#94A3B8]">• "{session.topicTitle}"</span>
              </div>

              <div className="text-xs font-extrabold text-[#2563EB]">
                Question {questionIndex} of {session.totalQuestions}
              </div>
            </div>

            {/* EXAMINER QUESTION BOX */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/50 dark:from-[#131D31] dark:to-[#172033] border border-blue-200 dark:border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#2563EB]">
                  <Bot className="w-4 h-4" />
                  <span>Academic Viva Examiner:</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => isSpeaking ? stopSpeaking() : speakText(currentQuestion)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#0F172A] border border-blue-200 dark:border-blue-800 text-[11px] font-bold text-[#2563EB] hover:bg-blue-50"
                  >
                    {isSpeaking ? (
                      <>
                        <Square className="w-3 h-3 fill-current animate-pulse text-amber-500" />
                        <span>Stop Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3" />
                        <span>Repeat Question</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white leading-relaxed">
                "{currentQuestion}"
              </p>
            </div>

            {/* PREVIOUS EXCHANGES */}
            {transcriptHistory.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                  Previous Q&A Turns ({transcriptHistory.length})
                </h3>
                <div className="space-y-2.5">
                  {transcriptHistory.map((turn, tIdx) => (
                    <div
                      key={tIdx}
                      className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#131D31] border border-[#E2E8F0] dark:border-[#263449] text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#2563EB]">Turn {turn.qIndex}</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">Score: {turn.score} / 10</span>
                      </div>
                      <p className="text-[#0F172A] dark:text-white font-medium"><strong>Q:</strong> {turn.question}</p>
                      <p className="text-[#334155] dark:text-[#CBD5E1] italic"><strong>Your Answer:</strong> "{turn.studentAnswer}"</p>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        <strong>Examiner Feedback:</strong> {turn.feedback}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STUDENT ANSWER AREA */}
            <form onSubmit={handleSubmitAnswer} className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                <span>Your Verbal or Written Response:</span>
                {speechSupported && (
                  <span className="text-[11px] font-normal text-slate-500">
                    {isListening ? '🎙️ Mic active • Speaking...' : 'Click microphone to answer aloud'}
                  </span>
                )}
              </div>

              {isListening && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-pulse">
                  <Mic className="w-4 h-4 text-rose-500" />
                  <span>Listening to your spoken answer... speak clearly into your microphone.</span>
                </div>
              )}

              <div className="relative">
                <textarea
                  value={answerInput}
                  onChange={e => setAnswerInput(e.target.value)}
                  placeholder="Articulate your answer clearly here, or click the mic button to speak your response aloud..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-hidden focus:border-[#2563EB] resize-none shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                {speechSupported ? (
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB]'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isListening ? 'Finish Speaking' : 'Answer via Voice'}</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-[#94A3B8]">Voice input ready via keyboard</div>
                )}

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
                      <span>Submit Verbal Response</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

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
                Topic: "{session?.topicTitle}" • Evaluated across {session?.totalQuestions} oral questions
              </p>
            </div>

            {/* PERFORMANCE RADAR / METRIC CARDS */}
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
                      <span className="font-bold text-emerald-600">Graded {t.score} / 10</span>
                    </div>
                    <p className="font-bold text-[#0F172A] dark:text-white">"{t.question}"</p>
                    <p className="text-[#475569] dark:text-[#94A3B8] italic">Student Answer: "{t.studentAnswer}"</p>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                      <strong>Critique:</strong> {t.feedback}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => {
                  setSession(null);
                  setFinalReport(null);
                  setIsConfigOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                Practice Another Viva
              </button>
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

      {/* CONFIGURATION MODAL */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#263449]">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-[#2563EB]" />
                <h3 className="font-extrabold text-base">Configure AI Viva Voce Simulation</h3>
              </div>
              {session && (
                <button onClick={() => setIsConfigOpen(false)} className="text-xs text-[#94A3B8]">
                  Close
                </button>
              )}
            </div>

            <form onSubmit={handleStartViva} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Examination Topic</label>
                <input
                  type="text"
                  required
                  value={topicTitle}
                  onChange={e => setTopicTitle(e.target.value)}
                  placeholder="e.g. Operating Systems: Paging and Virtual Memory"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs font-medium"
                />
              </div>

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
                      className={`p-2 rounded-xl border font-bold text-center transition-all ${
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B]"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
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
                    <option value={7}>7 Questions (Rigorous Defense)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                {session && (
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="px-4 py-2 rounded-xl border font-bold"
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
                      <span>Examiner Preparing Questions...</span>
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
