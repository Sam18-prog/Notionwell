'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  getDeckById,
  getCardsByWeakTopic,
  markCardsWeakTopicReviewed,
  saveSessionLog,
  updateFlashcardRating,
  recordQuizAnswerPerformance,
  touchDeckViewDate,
  toggleFlashcardBookmark,
  getSubjectById,
  generateEli5,
  getEli5Cache,
  setEli5Cache,
  getStats,
  saveStudyTimeLog,
  getTodayDateString,
  Deck,
  Flashcard,
  QuizQuestion,
  SessionLog,
  Subject,
} from '@/lib/app';
import { exportDeckToPDF } from '@/lib/pdf';
import SubjectIcon from '@/components/SubjectIcon';
import ManageSourcesModal from '@/components/ManageSourcesModal';
import {
  Folder,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Sparkles,
  Award,
  ChevronRight,
  Bookmark,
  Lightbulb,
  GraduationCap,
  HelpCircle,
  Timer,
  Clock,
  Flame,
  Download,
  Paperclip,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  getGlobalTimerState,
  startGlobalTimer,
  pauseGlobalTimer,
  resetAndSaveGlobalTimer,
} from '@/lib/timer';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default function DeckDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const deckId = params?.id as string;
  const isTopicSession = searchParams.get('type') === 'topic';
  const topicName = searchParams.get('topic') || 'Weak Topic';
  const initialMode = searchParams.get('mode') || 'study';

  const [deck, setDeck] = useState<Deck | null>(null);
  const [activeTab, setActiveTab] = useState<'study' | 'quiz' | 'exam'>('study');
  const [mounted, setMounted] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isManageSourcesOpen, setIsManageSourcesOpen] = useState(false);

  // FLASHCARD STUDY SESSION STATE
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [cardsReviewedCount, setCardsReviewedCount] = useState(0);
  const [easyCount, setEasyCount] = useState(0);
  const [mediumCount, setMediumCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<string>('');
  const [studyStartMs, setStudyStartMs] = useState<number>(0);
  const [finalSessionDuration, setFinalSessionDuration] = useState<number>(0);

  // ELI5 STATE
  const [eli5Explanation, setEli5Explanation] = useState<string | null>(null);
  const [loadingEli5, setLoadingEli5] = useState(false);
  const [eli5Error, setEli5Error] = useState<string | null>(null);

  // SHARED TIMER ENGINE STATE
  const [sharedTimerSeconds, setSharedTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // QUIZ SESSION STATE
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizStartMs, setQuizStartMs] = useState<number>(0);
  const [finalQuizDuration, setFinalQuizDuration] = useState<number>(0);

  // EXAM SESSION STATE
  const [examItems, setExamItems] = useState<any[]>([]);
  const [examCurrentIndex, setExamCurrentIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [examTimeLeft, setExamTimeLeft] = useState(300); // 5 minute countdown
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examScore, setExamScore] = useState(0);
  const [examStartMs, setExamStartMs] = useState<number>(0);
  const [finalExamDuration, setFinalExamDuration] = useState<number>(0);

  // SUBSCRIBE TO UNIFIED GLOBAL STUDY TIMER ENGINE
  useEffect(() => {
    const syncState = getGlobalTimerState();
    setSharedTimerSeconds(syncState.seconds);
    setIsTimerRunning(syncState.isRunning);

    const handleTimerUpdate = (e: CustomEvent) => {
      setSharedTimerSeconds(e.detail.seconds);
      setIsTimerRunning(e.detail.isRunning);
    };

    window.addEventListener('study-timer-update', handleTimerUpdate as EventListener);
    return () => {
      window.removeEventListener('study-timer-update', handleTimerUpdate as EventListener);
    };
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!deckId) return;

    if (isTopicSession) {
      const topicCards = getCardsByWeakTopic(topicName);
      const dummyDeck: Deck = {
        id: `topic-${encodeURIComponent(topicName)}`,
        subjectId: 'subject-uncategorized',
        name: `Studying: ${topicName} (weak cards)`,
        createdAt: new Date().toISOString(),
        sourceType: 'text',
        flashcards: topicCards,
        quizQuestions: [],
      };
      setDeck(dummyDeck);
      initStudySession(dummyDeck);
      return;
    }

    touchDeckViewDate(deckId);

    const loaded = getDeckById(deckId);
    if (loaded) {
      setDeck(loaded);
      initStudySession(loaded);
      initQuizSession(loaded);
      initExamSession(loaded);
    }
  }, [deckId, isTopicSession, topicName]);

  useEffect(() => {
    if (initialMode && ['study', 'quiz', 'exam'].includes(initialMode)) {
      setActiveTab(initialMode as 'study' | 'quiz' | 'exam');
    }
  }, [initialMode]);

  // AUTO-START SHARED TIMER ON STUDY SESSION ENTRY
  useEffect(() => {
    if (activeTab === 'study' && !sessionCompleted && studyCards.length > 0) {
      startGlobalTimer();
    } else if (activeTab === 'quiz' && !quizCompleted && quizQuestions.length > 0) {
      startGlobalTimer();
    } else if (activeTab === 'exam' && !examSubmitted && examItems.length > 0) {
      startGlobalTimer();
    }
  }, [activeTab, sessionCompleted, quizCompleted, examSubmitted, studyCards.length, quizQuestions.length, examItems.length]);

  const initStudySession = (d: Deck) => {
    const queue = d.flashcards || [];

    const sortedQueue = [...queue].sort((a, b) => {
      if (a.masteryLevel === 'new' && b.masteryLevel !== 'new') return -1;
      if (a.masteryLevel !== 'new' && b.masteryLevel === 'new') return 1;
      return (b.timesIncorrect || 0) - (a.timesIncorrect || 0);
    });

    setStudyCards(sortedQueue);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
    setEli5Explanation(null);
    setEasyCount(0);
    setMediumCount(0);
    setHardCount(0);
    setCardsReviewedCount(0);
    setSessionStartTime(new Date().toISOString());
    setStudyStartMs(Date.now());
    setFinalSessionDuration(0);

    startGlobalTimer();
  };

  const handleEndStudySession = useCallback(() => {
    const elapsedMs = studyStartMs > 0 ? Date.now() - studyStartMs : 0;
    const activeSecs = Math.max(1, Math.round(elapsedMs / 1000));
    setFinalSessionDuration(activeSecs);

    pauseGlobalTimer();

    if (isTopicSession && studyCards.length > 0) {
      const reviewedCards = studyCards.slice(0, currentCardIndex + 1).map((c) => ({
        deckId: c.deckId,
        cardId: c.id,
      }));
      markCardsWeakTopicReviewed(reviewedCards);
    }

    const endTime = new Date().toISOString();
    const log: SessionLog = {
      id: uuidv4(),
      deckId: deck?.id || null,
      startTime: sessionStartTime || endTime,
      endTime,
      cardsReviewed: cardsReviewedCount || (currentCardIndex + 1),
      easyCount,
      mediumCount: mediumCount || cardsReviewedCount,
      hardCount,
      durationSeconds: activeSecs,
    };

    saveSessionLog(log);
    saveStudyTimeLog({
      id: uuidv4(),
      date: getTodayDateString(),
      durationSeconds: activeSecs,
      startedAt: sessionStartTime || endTime,
    });
    setSessionCompleted(true);
  }, [deck, sessionStartTime, studyStartMs, cardsReviewedCount, currentCardIndex, easyCount, mediumCount, hardCount, isTopicSession, studyCards]);

  const handleAdvanceNext = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      const currentCard = studyCards[currentCardIndex];
      if (!currentCard || !deck) return;

      if (isTopicSession) {
        markCardsWeakTopicReviewed([{ deckId: currentCard.deckId, cardId: currentCard.id }]);
      } else {
        const updated = updateFlashcardRating(deck.id, currentCard.id, 'medium');
        if (updated) {
          const updatedFlashcards = deck.flashcards.map((c) =>
            c.id === updated.id ? updated : c
          );
          setDeck({
            ...deck,
            flashcards: updatedFlashcards,
          });

          const updatedQueue = studyCards.map((c) =>
            c.id === updated.id ? updated : c
          );
          setStudyCards(updatedQueue);
        }
      }

      setCardsReviewedCount((prev) => prev + 1);
      setMediumCount((prev) => prev + 1);
      setIsFlipped(false);
      setEli5Explanation(null);

      if (currentCardIndex + 1 < studyCards.length) {
        setCurrentCardIndex((prev) => prev + 1);
      } else {
        handleEndStudySession();
      }
    },
    [studyCards, currentCardIndex, deck, isTopicSession, handleEndStudySession]
  );

  const handlePreviousCard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
      setIsFlipped(false);
      setEli5Explanation(null);
    }
  };

  const handleRateCard = useCallback(
    (rating: 'easy' | 'medium' | 'hard') => {
      const currentCard = studyCards[currentCardIndex];
      if (!currentCard || !deck) return;

      if (!isTopicSession) {
        const updated = updateFlashcardRating(deck.id, currentCard.id, rating);
        if (updated) {
          const updatedFlashcards = deck.flashcards.map((c) =>
            c.id === updated.id ? updated : c
          );
          setDeck({
            ...deck,
            flashcards: updatedFlashcards,
          });

          const updatedQueue = studyCards.map((c) =>
            c.id === updated.id ? updated : c
          );
          setStudyCards(updatedQueue);
        }
      } else {
        markCardsWeakTopicReviewed([{ deckId: currentCard.deckId, cardId: currentCard.id }]);
      }

      setCardsReviewedCount((prev) => prev + 1);
      if (rating === 'easy') setEasyCount((prev) => prev + 1);
      if (rating === 'medium') setMediumCount((prev) => prev + 1);
      if (rating === 'hard') setHardCount((prev) => prev + 1);

      setIsFlipped(false);
      setEli5Explanation(null);

      if (currentCardIndex + 1 < studyCards.length) {
        setCurrentCardIndex((prev) => prev + 1);
      } else {
        handleEndStudySession();
      }
    },
    [studyCards, currentCardIndex, deck, isTopicSession, handleEndStudySession]
  );

  const handleToggleBookmark = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const currentCard = studyCards[currentCardIndex];
      if (!currentCard || !deck || isTopicSession) return;

      const newBookmarked = toggleFlashcardBookmark(deck.id, currentCard.id);
      const updatedCards = studyCards.map((c) =>
        c.id === currentCard.id ? { ...c, isBookmarked: newBookmarked } : c
      );
      setStudyCards(updatedCards);
      setDeck({
        ...deck,
        flashcards: updatedCards,
      });
    },
    [studyCards, currentCardIndex, deck, isTopicSession]
  );

  // KEYBOARD NAVIGATION SHORTCUTS FOR STUDY MODE
  useEffect(() => {
    if (activeTab !== 'study' || sessionCompleted || studyCards.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === '1') {
        e.preventDefault();
        handleRateCard('hard');
      } else if (e.key === '2') {
        e.preventDefault();
        handleRateCard('hard');
      } else if (e.key === '3') {
        e.preventDefault();
        handleRateCard('medium');
      } else if (e.key === '4') {
        e.preventDefault();
        handleRateCard('easy');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleToggleBookmark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, sessionCompleted, studyCards.length, handleRateCard, handleToggleBookmark]);

  const handleFetchEli5 = async () => {
    const currentCard = studyCards[currentCardIndex];
    if (!currentCard) return;

    setLoadingEli5(true);
    setEli5Error(null);

    const cached = getEli5Cache(currentCard.id);
    if (cached) {
      setEli5Explanation(cached);
      setLoadingEli5(false);
      return;
    }

    try {
      const explanation = await generateEli5(currentCard.question, currentCard.answer);
      setEli5Cache(currentCard.id, explanation);
      setEli5Explanation(explanation);
    } catch (err: any) {
      setEli5Error('Could not simplify this explanation right now.');
    } finally {
      setLoadingEli5(false);
    }
  };

  // KEYBOARD SHORTCUT LISTENER
  useEffect(() => {
    if (activeTab !== 'study' || sessionCompleted || studyCards.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyN') {
        e.preventDefault();
        handleAdvanceNext();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyP') {
        e.preventDefault();
        handlePreviousCard();
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        const currentCard = studyCards[currentCardIndex];
        if (currentCard && deck && !isTopicSession) {
          toggleFlashcardBookmark(deck.id, currentCard.id);
          const updatedCards = studyCards.map((c) =>
            c.id === currentCard.id ? { ...c, isBookmarked: !c.isBookmarked } : c
          );
          setStudyCards(updatedCards);
        }
      } else if (e.code === 'Digit1' || e.code === 'KeyE') {
        handleRateCard('easy');
      } else if (e.code === 'Digit2' || e.code === 'KeyM') {
        handleRateCard('medium');
      } else if (e.code === 'Digit3' || e.code === 'KeyH') {
        handleRateCard('hard');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, sessionCompleted, studyCards, currentCardIndex, deck, isTopicSession, handleAdvanceNext]);

  // QUIZ SESSION HANDLERS
  const initQuizSession = (d: Deck | null) => {
    if (!d) return;
    const questions = d.quizQuestions || [];
    setQuizQuestions(questions);
    setCurrentQuizIndex(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizCompleted(false);
    setQuizStartMs(Date.now());
    setFinalQuizDuration(0);

    startGlobalTimer();
  };

  const handleSelectQuizOption = (option: string) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);

    const currentQ = quizQuestions[currentQuizIndex];
    const isCorrect = option === currentQ.correctAnswer;

    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
    }

    if (deck && !isTopicSession) {
      recordQuizAnswerPerformance(deck.id, currentQ.topic, currentQ.question, isCorrect);
      const reloaded = getDeckById(deck.id);
      if (reloaded) setDeck(reloaded);
    }
  };

  const handleNextQuizQuestion = () => {
    if (currentQuizIndex + 1 < quizQuestions.length) {
      setCurrentQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      const elapsedMs = quizStartMs > 0 ? Date.now() - quizStartMs : 0;
      const activeSecs = Math.max(1, Math.round(elapsedMs / 1000));
      setFinalQuizDuration(activeSecs);

      pauseGlobalTimer();

      const log: SessionLog = {
        id: uuidv4(),
        deckId: deck?.id || null,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        cardsReviewed: quizQuestions.length,
        easyCount: quizScore,
        mediumCount: 0,
        hardCount: quizQuestions.length - quizScore,
        durationSeconds: activeSecs,
      };
      saveSessionLog(log);
      saveStudyTimeLog({
        id: uuidv4(),
        date: getTodayDateString(),
        durationSeconds: activeSecs,
        startedAt: new Date().toISOString(),
      });
      setQuizCompleted(true);
    }
  };

  // EXAM SESSION HANDLERS
  const initExamSession = (d: Deck | null) => {
    if (!d) return;
    const quizItems = (d.quizQuestions || []).map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      topic: q.topic,
      type: 'quiz' as const,
    }));

    const allFlashcardAnswers = (d.flashcards || []).map((fc) => fc.answer.trim());

    const cardItems = (d.flashcards || [])
      .filter((c) => {
        const otherAnswers = allFlashcardAnswers.filter((a) => a !== c.answer.trim());
        return otherAnswers.length >= 3;
      })
      .map((c) => {
        const otherAnswers = allFlashcardAnswers.filter((a) => a !== c.answer.trim());
        const randomDistractors = [...otherAnswers].sort(() => Math.random() - 0.5).slice(0, 3);
        const opts = [c.answer, ...randomDistractors].sort(() => Math.random() - 0.5);

        return {
          id: c.id,
          question: c.question,
          options: opts,
          correctAnswer: c.answer,
          topic: c.topic,
          type: 'flashcard' as const,
        };
      });

    const combined = [...quizItems, ...cardItems];
    const shuffled = combined.sort(() => Math.random() - 0.5).slice(0, 15);
    setExamItems(shuffled);
    setExamCurrentIndex(0);
    setExamAnswers({});
    setExamTimeLeft(300);
    setExamSubmitted(false);
    setExamScore(0);
    setExamStartMs(Date.now());
    setFinalExamDuration(0);

    startGlobalTimer();
  };

  const handleExamOptionSelect = (option: string) => {
    setExamAnswers((prev) => ({
      ...prev,
      [examCurrentIndex]: option,
    }));
  };

  const handleSubmitExam = () => {
    let score = 0;
    examItems.forEach((item, idx) => {
      const isCorrect = examAnswers[idx] === item.correctAnswer;
      if (isCorrect) {
        score += 1;
      }
      if (deck && !isTopicSession) {
        recordQuizAnswerPerformance(deck.id, item.topic, item.question, isCorrect);
      }
    });

    if (deck && !isTopicSession) {
      const reloaded = getDeckById(deck.id);
      if (reloaded) setDeck(reloaded);
    }

    const elapsedMs = examStartMs > 0 ? Date.now() - examStartMs : 0;
    const activeSecs = Math.max(1, Math.round(elapsedMs / 1000));
    setFinalExamDuration(activeSecs);

    pauseGlobalTimer();

    const log: SessionLog = {
      id: uuidv4(),
      deckId: deck?.id || null,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      cardsReviewed: examItems.length,
      easyCount: score,
      mediumCount: 0,
      hardCount: examItems.length - score,
      durationSeconds: activeSecs,
    };
    saveSessionLog(log);
    saveStudyTimeLog({
      id: uuidv4(),
      date: getTodayDateString(),
      durationSeconds: activeSecs,
      startedAt: new Date().toISOString(),
    });

    setExamScore(score);
    setExamSubmitted(true);
  };

  if (!mounted) return null;

  if (!deck) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
          Study Deck Not Found
        </h2>
        <Link
          href="/decks"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Subject Decks</span>
        </Link>
      </div>
    );
  }

  const parentSubject = getSubjectById(deck.subjectId);
  const bookmarkedCount = deck.flashcards.filter((c) => c.isBookmarked).length;

  const returnUrl = isTopicSession
    ? '/insights'
    : deck.subjectId
    ? `/decks/${deck.subjectId}`
    : '/decks';
  const returnLabel = isTopicSession
    ? 'Return to Insights'
    : parentSubject
    ? `Return to ${parentSubject.name}`
    : 'Return to Subject Decks';

  const currentCard = studyCards[currentCardIndex];
  const cardMastery = currentCard?.masteryLevel || 'new';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* NAVIGATION BACK LINK */}
      <div>
        <Link
          href={returnUrl}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#2563EB] dark:text-[#94A3B8] dark:hover:text-[#3B82F6] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{returnLabel}</span>
        </Link>
      </div>

      {/* HEADER CARD */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#263449] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs"
                style={{ backgroundColor: parentSubject?.colorTag || '#2563EB' }}
              >
                <SubjectIcon iconName={parentSubject?.icon} name={parentSubject?.name} className="w-3.5 h-3.5 fill-white/20" />
              </div>
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                {parentSubject?.name || 'Uncategorized'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
              {deck.name}
            </h1>

            <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
              <span>{deck.flashcards.length} Flashcards</span>
              <span>•</span>
              <span>{deck.quizQuestions.length} Quiz Questions</span>
              {bookmarkedCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-500 font-bold flex items-center gap-1">
                    <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    {bookmarkedCount} Bookmarked
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isTopicSession && (
              <>
                <button
                  onClick={() => setIsManageSourcesOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5 transition-all shadow-xs"
                  title="Manage Linked Sources & Upload Files"
                >
                  <Paperclip className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#3B82F6]" />
                  <span>Sources</span>
                </button>

                <button
                  onClick={() => {
                    if (!deck) return;
                    setIsExportingPDF(true);
                    setTimeout(() => {
                      exportDeckToPDF(deck, parentSubject?.name);
                      setIsExportingPDF(false);
                    }, 100);
                  }}
                  disabled={isExportingPDF}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5 transition-all shadow-xs"
                  title="Export Deck as Printable PDF"
                >
                  <Download className={`w-3.5 h-3.5 text-[#2563EB] dark:text-[#3B82F6] ${isExportingPDF ? 'animate-bounce' : ''}`} />
                  <span>{isExportingPDF ? 'Exporting...' : 'Export PDF'}</span>
                </button>
              </>
            )}

            <div className="px-3 py-1.5 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] capitalize flex items-center gap-1.5">
              {activeTab === 'study' && <GraduationCap className="w-4 h-4" />}
              {activeTab === 'quiz' && <HelpCircle className="w-4 h-4" />}
              {activeTab === 'exam' && <Timer className="w-4 h-4" />}
              <span>{isTopicSession ? 'Topic Review Mode' : `${activeTab} Mode Active`}</span>
            </div>
          </div>
        </div>

        {/* TAB SWITCHER */}
        {!isTopicSession && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('study');
                initStudySession(deck);
              }}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'study'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F8FAFC] dark:bg-[#172033] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Flashcard Study</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('quiz');
                initQuizSession(deck);
              }}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'quiz'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F8FAFC] dark:bg-[#172033] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Practice Quiz ({deck.quizQuestions.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('exam');
                initExamSession(deck);
              }}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'exam'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F8FAFC] dark:bg-[#172033] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <Timer className="w-4 h-4" />
              <span>Exam Simulator</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: FLASHCARD STUDY MODE */}
      {activeTab === 'study' && (
        <div className="space-y-6">
          {sessionCompleted || studyCards.length === 0 ? (
            /* END-OF-SESSION SUMMARY SCREEN */
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-8 sm:p-10 space-y-6 shadow-xs max-w-2xl mx-auto text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#ECFDF5] dark:bg-[#052E2B] border border-[#A7F3D0] dark:border-[#065F46] text-[#10B981] dark:text-[#34D399] flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                  {isTopicSession ? 'Weak Topic Review Complete!' : 'Study Session Complete!'}
                </h2>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-1 font-medium">
                  {isTopicSession
                    ? `Reviewed all weak cards under topic "${topicName}".`
                    : 'All cards in this session reviewed with SM-2 Spaced Repetition logic.'}
                </p>
              </div>

              {/* STATS BREAKDOWN GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                    Reviewed
                  </span>
                  <p className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] mt-1">
                    {cardsReviewedCount || studyCards.length}
                  </p>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                    Time Spent
                  </span>
                  <p className="text-2xl font-black text-[#2563EB] dark:text-[#3B82F6] mt-1">
                    {formatTimer(finalSessionDuration)}
                  </p>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                    Streak
                  </span>
                  <p className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1">
                    <Flame className="w-5 h-5 fill-amber-500" />
                    <span>{getStats().streakDays || 1}d</span>
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => initStudySession(deck)}
                  className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs hover:scale-[1.01] transition-all"
                >
                  Study Again
                </button>
                <Link
                  href={returnUrl}
                  className="px-6 py-3 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white font-bold text-xs border border-[#E2E8F0] dark:border-[#334155] transition-colors"
                >
                  {returnLabel}
                </Link>
              </div>
            </div>
          ) : (
            /* ACTIVE FLASHCARD CAROUSEL CARD */
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              {/* TOP SESSION HEADER */}
              <div className="flex items-center justify-between text-xs font-bold text-[#475569] dark:text-[#CBD5E1]">
                <div className="flex items-center gap-3">
                  <span>
                    Card {currentCardIndex + 1} of {studyCards.length}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA]">
                    {studyCards[currentCardIndex]?.topic}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* UNIFIED SHARED TIMER HEADER DISPLAY */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] text-xs font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC] cursor-pointer"
                    onClick={() => {
                      if (isTimerRunning) pauseGlobalTimer();
                      else startGlobalTimer();
                    }}
                    title="Unified Study Timer (Click to Pause/Play)"
                  >
                    <Clock className={`w-3.5 h-3.5 ${isTimerRunning ? 'text-amber-500 animate-spin' : 'text-[#2563EB]'}`} />
                    <span>{formatTimer(sharedTimerSeconds)}</span>
                  </div>

                  <button
                    onClick={handleEndStudySession}
                    className="px-3 py-1 rounded-xl bg-[#FEF2F2] dark:bg-[#450A0A] border border-[#EF4444] text-[#EF4444] font-bold text-xs hover:bg-[#EF4444] hover:text-white transition-all"
                  >
                    End Session
                  </button>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="w-full bg-[#E2E8F0] dark:bg-[#263449] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#2563EB] dark:bg-[#3B82F6] h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(((currentCardIndex + 1) / studyCards.length) * 100)}%`,
                  }}
                />
              </div>

              {/* 3D FLIP CARD CONTAINER */}
              <div className="perspective-1000 w-full min-h-[340px] relative">
                {/* VISIBLE CORNER MASTERY BADGE */}
                <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border shadow-xs ${
                      cardMastery === 'mastered'
                        ? 'bg-[#ECFDF5] dark:bg-[#052E2B] text-[#10B981] dark:text-[#34D399] border-[#A7F3D0] dark:border-[#065F46]'
                        : cardMastery === 'learning'
                        ? 'bg-[#FFFBEB] dark:bg-[#422006] text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[#78350F]'
                        : 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] border-[#CBD5E1] dark:border-[#334155]'
                    }`}
                  >
                    {cardMastery}
                  </span>
                </div>

                {!isTopicSession && (
                  <button
                    onClick={handleToggleBookmark}
                    className="absolute top-4 right-4 z-30 p-2 rounded-xl bg-white/80 dark:bg-[#172033]/80 border border-[#E2E8F0] dark:border-[#263449] text-[#64748B] hover:text-amber-500 transition-all shadow-xs"
                    title="Bookmark Card (Press B)"
                  >
                    <Bookmark
                      className={`w-5 h-5 ${
                        studyCards[currentCardIndex]?.isBookmarked
                          ? 'fill-amber-400 text-amber-500'
                          : ''
                      }`}
                    />
                  </button>
                )}

                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`relative w-full min-h-[340px] rounded-3xl p-8 sm:p-12 cursor-pointer transform-style-3d transition-transform duration-500 bg-white dark:bg-[#111827] border-2 border-[#E2E8F0] dark:border-[#263449] hover:border-[#CBD5E1] dark:hover:border-[#334155] shadow-xs flex flex-col justify-between ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* FRONT SIDE (QUESTION) */}
                  <div className="backface-hidden flex flex-col justify-between h-full space-y-6 pt-4">
                    <div className="flex items-center justify-between text-xs text-[#475569] dark:text-[#CBD5E1] font-bold uppercase tracking-wider">
                      <span>Question</span>
                      <span className="text-[11px] text-[#2563EB] dark:text-[#3B82F6]">
                        Click or Space to flip
                      </span>
                    </div>

                    <div className="my-auto text-left px-2 sm:px-4">
                      <MarkdownRenderer content={studyCards[currentCardIndex]?.question || ''} />
                    </div>

                    {/* CENTERED "SHOW ANSWER" BUTTON */}
                    <div className="text-center">
                      <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#2563EB] dark:bg-[#3B82F6] text-white text-xs font-bold shadow-xs hover:scale-105 transition-all">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Show Answer</span>
                      </span>
                    </div>
                  </div>

                  {/* BACK SIDE (ANSWER + ELI5) */}
                  <div className="rotate-y-180 backface-hidden flex flex-col justify-between h-full space-y-6 pt-4">
                    <div className="flex items-center justify-between text-xs text-[#475569] dark:text-[#CBD5E1] font-bold uppercase tracking-wider">
                      <span>Answer</span>
                      <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        Click to flip back
                      </span>
                    </div>

                    <div className="my-auto text-left space-y-4 px-2 sm:px-4">
                      <MarkdownRenderer content={studyCards[currentCardIndex]?.answer || ''} />

                      {/* ELI5 SIMPLIFIER BUTTON */}
                      {!eli5Explanation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFetchEli5();
                          }}
                          disabled={loadingEli5}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] border border-[#DBEAFE] dark:border-[#1E3A8A] text-xs font-extrabold shadow-xs hover:bg-[#2563EB] hover:text-white transition-all"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          <span>{loadingEli5 ? 'Simplifying...' : 'Explain Like I’m 5 (ELI5)'}</span>
                        </button>
                      )}

                      {/* ELI5 DISPLAY BOX */}
                      {eli5Explanation && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 text-left text-xs space-y-1.5 shadow-xs"
                        >
                          <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase text-[10px]">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>ELI5 Simplified View</span>
                          </div>
                          <p className="leading-relaxed text-xs text-[#475569] dark:text-[#CBD5E1]">
                            {eli5Explanation}
                          </p>
                        </div>
                      )}

                      {eli5Error && <p className="text-xs text-[#EF4444]">{eli5Error}</p>}
                    </div>

                    {/* REPOSISTIONED "NEXT →" AND SECONDARY "← PREVIOUS" BUTTON */}
                    <div className="flex items-center justify-center gap-4">
                      {currentCardIndex > 0 && (
                        <button
                          onClick={handlePreviousCard}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition-all"
                        >
                          ← Previous
                        </button>
                      )}

                      <button
                        onClick={handleAdvanceNext}
                        className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-xs font-extrabold shadow-xs transition-all flex items-center gap-1.5 hover:scale-105"
                      >
                        <span>Next</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUIZ MODE */}
      {activeTab === 'quiz' && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          {quizCompleted ? (
            <div className="text-center space-y-6 py-8 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center mx-auto shadow-xs">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                  Quiz Completed!
                </h2>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-1 font-medium">
                  Great job practicing your knowledge on this subject deck.
                </p>
              </div>

              {/* STATS BREAKDOWN GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                    Questions
                  </span>
                  <p className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] mt-1">
                    {quizQuestions.length}
                  </p>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                    Time Spent
                  </span>
                  <p className="text-2xl font-black text-[#2563EB] dark:text-[#3B82F6] mt-1">
                    {formatTimer(finalQuizDuration)}
                  </p>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                    Score
                  </span>
                  <p className="text-2xl font-black text-[#10B981] mt-1">
                    {Math.round((quizScore / quizQuestions.length) * 100)}%
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => initQuizSession(deck)}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-bold text-xs shadow-xs transition-all"
                >
                  Retry Quiz
                </button>
                <Link
                  href={returnUrl}
                  className="px-5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white font-bold text-xs border border-[#E2E8F0] dark:border-[#334155] transition-colors"
                >
                  {returnLabel}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs font-bold text-[#475569] dark:text-[#CBD5E1] border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
                <span>
                  Question {currentQuizIndex + 1} of {quizQuestions.length}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#EFF6FF] dark:bg-[#172554] border border-[#DBEAFE] dark:border-[#1E3A8A] text-[#2563EB] dark:text-[#60A5FA]">
                  {quizQuestions[currentQuizIndex]?.topic}
                </span>
              </div>

              <div className="text-left py-1">
                <MarkdownRenderer content={quizQuestions[currentQuizIndex]?.question || ''} />
              </div>

              <div className="space-y-3">
                {quizQuestions[currentQuizIndex]?.options.map((option, idx) => {
                  const currentQ = quizQuestions[currentQuizIndex];
                  const isSelected = selectedOption === option;
                  const isCorrect = option === currentQ.correctAnswer;

                  let optionStyle =
                    'bg-[#F8FAFC] dark:bg-[#172033] border-[#E2E8F0] dark:border-[#263449] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB]';

                  if (selectedOption !== null) {
                    if (isCorrect) {
                      optionStyle =
                        'bg-[#10B981] dark:bg-[#34D399] border-[#10B981] text-white font-bold shadow-xs';
                    } else if (isSelected) {
                      optionStyle =
                        'bg-[#EF4444] dark:bg-[#F87171] border-[#EF4444] text-white font-bold';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectQuizOption(option)}
                      disabled={selectedOption !== null}
                      className={`w-full p-4 rounded-2xl border text-left text-sm transition-all flex items-center justify-between ${optionStyle}`}
                    >
                      <span>{option}</span>
                      {selectedOption !== null && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                      )}
                      {selectedOption !== null && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="space-y-4 pt-4 border-t border-[#E2E8F0] dark:border-[#263449]">
                  <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 space-y-1 text-xs">
                    <p className="font-bold text-[#2563EB] dark:text-[#3B82F6] uppercase tracking-wider text-[10px]">
                      Explanation
                    </p>
                    <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed font-medium">
                      {quizQuestions[currentQuizIndex]?.explanation}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleNextQuizQuestion}
                      className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-bold text-xs shadow-xs hover:scale-[1.01] transition-all flex items-center gap-1.5"
                    >
                      <span>
                        {currentQuizIndex + 1 === quizQuestions.length
                          ? 'Complete Quiz'
                          : 'Next Question'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXAM MODE */}
      {activeTab === 'exam' && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          {examSubmitted ? (
            <div className="text-center space-y-6 py-8 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#2563EB] dark:bg-[#3B82F6] text-white flex items-center justify-center mx-auto shadow-xs">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                  Exam Completed!
                </h2>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-1 font-medium">
                  Combined Exam Simulator evaluation complete.
                </p>
              </div>

              {/* STATS BREAKDOWN GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                    Questions
                  </span>
                  <p className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] mt-1">
                    {examItems.length}
                  </p>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                    Time Spent
                  </span>
                  <p className="text-2xl font-black text-[#2563EB] dark:text-[#3B82F6] mt-1">
                    {formatTimer(finalExamDuration)}
                  </p>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#172033] border border-[#E2E8F0] dark:border-[#263449] rounded-2xl p-4 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-extrabold uppercase text-[#64748B] dark:text-[#94A3B8]">
                    Score
                  </span>
                  <p className="text-2xl font-black text-[#10B981] mt-1">
                    {Math.round((examScore / examItems.length) * 100)}%
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => initExamSession(deck)}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-bold text-xs shadow-xs transition-all"
                >
                  Retake Exam
                </button>
                <Link
                  href={returnUrl}
                  className="px-5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#172033] text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white font-bold text-xs border border-[#E2E8F0] dark:border-[#334155] transition-colors"
                >
                  {returnLabel}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs font-bold text-[#475569] dark:text-[#CBD5E1] border-b border-[#E2E8F0] dark:border-[#263449] pb-3">
                <div className="flex items-center gap-2 text-[#F59E0B] dark:text-[#FBBF24]">
                  <Clock className="w-4 h-4" />
                  <span>
                    Time Remaining: {Math.floor(examTimeLeft / 60)}:
                    {String(examTimeLeft % 60).padStart(2, '0')}
                  </span>
                </div>
                <span>
                  Question {examCurrentIndex + 1} of {examItems.length}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                {examItems[examCurrentIndex]?.question}
              </h3>

              <div className="space-y-3">
                {examItems[examCurrentIndex]?.options.map((option: string, idx: number) => {
                  const isSelected = examAnswers[examCurrentIndex] === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleExamOptionSelect(option)}
                      className={`w-full p-4 rounded-2xl border text-left text-sm transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#2563EB] text-white font-bold border-[#2563EB] shadow-xs'
                          : 'bg-[#F8FAFC] dark:bg-[#172033] border-[#E2E8F0] dark:border-[#263449] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#2563EB]'
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0] dark:border-[#263449]">
                <button
                  onClick={() => setExamCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={examCurrentIndex === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] dark:text-[#94A3B8] disabled:opacity-40"
                >
                  ← Previous
                </button>

                {examCurrentIndex + 1 === examItems.length ? (
                  <button
                    onClick={handleSubmitExam}
                    className="px-6 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-xs transition-all"
                  >
                    Submit Final Exam
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setExamCurrentIndex((prev) =>
                        Math.min(examItems.length - 1, prev + 1)
                      )
                    }
                    className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white font-bold text-xs shadow-xs transition-all"
                  >
                    Next Question →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANAGE SOURCES MODAL */}
      {deck && (
        <ManageSourcesModal
          deck={deck}
          isOpen={isManageSourcesOpen}
          onClose={() => setIsManageSourcesOpen(false)}
          onDeckUpdated={(updated) => setDeck(updated)}
        />
      )}
    </div>
  );
}
