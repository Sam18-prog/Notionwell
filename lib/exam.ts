/**
 * Notionwell Phase 5 — Intelligent AI Exam Simulation Engine
 * Core types, evaluation algorithms, and resilient dual-persistence storage layer.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createAdminClient } from '@/lib/supabase/admin';

// ============================================================================
// 1. DATA STRUCTURES & INTERFACES
// ============================================================================

export type ExamMode = 'practice' | 'timed' | 'topic' | 'mock';
export type ExamDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type QuestionType = 'mcq' | 'true_false' | 'short_answer';

export interface ExamQuestion {
  id: string;
  examId: string;
  questionIndex: number;
  questionType: QuestionType;
  question: string;
  options?: string[]; // for mcq & true_false
  correctAnswer: string;
  expectedConcepts?: string[]; // key phrases or rubric concepts for short answers
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceQuote?: string;
  sourceReference?: string;
}

export interface SanitizedExamQuestion {
  id: string;
  examId: string;
  questionIndex: number;
  questionType: QuestionType;
  question: string;
  options?: string[];
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceReference?: string;
}

export interface ExamConfig {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subjectId?: string | null;
  subjectName?: string;
  deckId?: string | null;
  deckName?: string;
  mode: ExamMode;
  difficulty: ExamDifficulty;
  timeLimitMinutes: number; // e.g. 15, 30, 45, 60 or 0 for untimed
  totalQuestions: number;
  negativeMarking: boolean;
  negativeMarkValue: number; // default 0.25
  questionTypes: QuestionType[];
  selectedSourceIds?: string[];
  selectedTopics?: string[];
  randomizeOrder: boolean;
  createdAt: string;
  questions?: ExamQuestion[];
}

export interface TopicPerformance {
  topic: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percentage: number;
}

export interface ExamAiFeedback {
  performanceTier: 'Distinction' | 'Proficient' | 'Developing' | 'Needs Improvement';
  summary: string;
  strengths: string[];
  weakTopics: string[];
  frequentlyMissedConcepts: string[];
  recommendations: {
    action: string;
    suggestedQuery?: string;
    relatedDeckId?: string;
  }[];
}

export interface AnswerEvaluation {
  questionId: string;
  questionIndex: number;
  questionType: QuestionType;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  feedback?: string;
  explanation: string;
  topic: string;
  sourceQuote?: string;
  sourceReference?: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  subjectName?: string;
  userId: string;
  mode: ExamMode;
  startedAt: string;
  submittedAt?: string;
  timeSpentSeconds: number;
  timeLimitMinutes: number;
  status: 'in_progress' | 'completed' | 'expired';
  totalQuestions: number;
  score: number;
  maxPossibleScore: number;
  percentage: number;
  accuracyPercentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  negativeMarkingApplied: number;
  topicBreakdown: TopicPerformance[];
  aiFeedback?: ExamAiFeedback;
  userAnswers: Record<string, string>; // questionId -> answer
  reviewStatus: Record<string, boolean>; // questionId -> isMarkedForReview
  evaluatedAnswers?: AnswerEvaluation[];
  createdAt: string;
}

export interface ExamDashboardStats {
  examsCompleted: number;
  averageScore: number;
  highestScore: number;
  totalTimeSpentSeconds: number;
  recentAttempts: ExamAttempt[];
  weakTopics: string[];
  strongTopics: string[];
}

// ============================================================================
// 2. SERVER PERSISTENCE LAYER (.exam_storage/)
// ============================================================================

const STORAGE_DIR = path.join(process.cwd(), '.exam_storage');
const EXAMS_FILE = path.join(STORAGE_DIR, 'exams.json');
const ATTEMPTS_FILE = path.join(STORAGE_DIR, 'attempts.json');

const memoryExams: Map<string, ExamConfig> = new Map();
const memoryAttempts: Map<string, ExamAttempt> = new Map();
let isStorageLoaded = false;

function ensureStorageLoaded() {
  if (isStorageLoaded) return;
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    if (fs.existsSync(EXAMS_FILE)) {
      const data: ExamConfig[] = JSON.parse(fs.readFileSync(EXAMS_FILE, 'utf8'));
      data.forEach((e) => memoryExams.set(e.id, e));
    }

    if (fs.existsSync(ATTEMPTS_FILE)) {
      const data: ExamAttempt[] = JSON.parse(fs.readFileSync(ATTEMPTS_FILE, 'utf8'));
      data.forEach((a) => memoryAttempts.set(a.id, a));
    }

    isStorageLoaded = true;
  } catch (err: any) {
    console.warn('[ExamStore] Notice: Disk storage load error:', err?.message);
  }
}

function persistStorageToDisk() {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(EXAMS_FILE, JSON.stringify(Array.from(memoryExams.values()), null, 2), 'utf8');
    fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(Array.from(memoryAttempts.values()), null, 2), 'utf8');
  } catch (err: any) {
    console.warn('[ExamStore] Notice: Disk storage write error:', err?.message);
  }
}

// ============================================================================
// 3. EXAM CONFIGURATION CRUD OPERATIONS
// ============================================================================

export function saveExamConfig(exam: ExamConfig): ExamConfig {
  ensureStorageLoaded();
  memoryExams.set(exam.id, exam);
  persistStorageToDisk();

  // Async background sync to Supabase
  try {
    const admin = createAdminClient();
    (async () => {
      try {
        await admin.from('exams').upsert({
          id: exam.id,
          user_id: exam.userId,
          subject_id: exam.subjectId || null,
          deck_id: exam.deckId || null,
          title: exam.title,
          description: exam.description || null,
          mode: exam.mode,
          difficulty: exam.difficulty,
          time_limit_minutes: exam.timeLimitMinutes,
          total_questions: exam.totalQuestions,
          negative_marking: exam.negativeMarking,
          negative_mark_value: exam.negativeMarkValue,
          selected_source_ids: exam.selectedSourceIds || [],
        });

        if (exam.questions && exam.questions.length > 0) {
          const rows = exam.questions.map((q) => ({
            id: q.id,
            exam_id: exam.id,
            question_index: q.questionIndex,
            question_type: q.questionType,
            question: q.question,
            options: q.options || null,
            correct_answer: q.correctAnswer,
            expected_concepts: q.expectedConcepts || null,
            explanation: q.explanation,
            topic: q.topic,
            difficulty: q.difficulty,
            source_quote: q.sourceQuote || null,
            source_reference: q.sourceReference || null,
          }));
          await admin.from('exam_questions').upsert(rows);
        }
      } catch (err) {
        // Non-blocking fallback
      }
    })();
  } catch {}

  return exam;
}

export function getExamConfigById(id: string): ExamConfig | null {
  ensureStorageLoaded();
  return memoryExams.get(id) || null;
}

export function getSanitizedExamForTaking(id: string): (Omit<ExamConfig, 'questions'> & { questions: SanitizedExamQuestion[] }) | null {
  ensureStorageLoaded();
  const exam = memoryExams.get(id);
  if (!exam) return null;

  const sanitizedQuestions: SanitizedExamQuestion[] = (exam.questions || []).map((q) => ({
    id: q.id,
    examId: q.examId,
    questionIndex: q.questionIndex,
    questionType: q.questionType,
    question: q.question,
    options: q.options,
    topic: q.topic,
    difficulty: q.difficulty,
    sourceReference: q.sourceReference,
  }));

  return {
    ...exam,
    questions: sanitizedQuestions,
  };
}

export function getAllExams(userId?: string): ExamConfig[] {
  ensureStorageLoaded();
  if (!userId) return [];
  const list = Array.from(memoryExams.values());
  return list
    .filter((e) => e.userId === userId || (e.userId === 'default-user' && userId === 'default-user') || e.userId === 'shared')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============================================================================
// 4. EXAM ATTEMPTS & EVALUATION STORAGE
// ============================================================================

export function saveExamAttempt(attempt: ExamAttempt): ExamAttempt {
  ensureStorageLoaded();
  memoryAttempts.set(attempt.id, attempt);
  persistStorageToDisk();

  // Async background sync to Supabase
  try {
    const admin = createAdminClient();
    (async () => {
      try {
        await admin.from('exam_attempts').upsert({
          id: attempt.id,
          exam_id: attempt.examId,
          user_id: attempt.userId,
          mode: attempt.mode,
          started_at: attempt.startedAt,
          submitted_at: attempt.submittedAt || null,
          time_spent_seconds: attempt.timeSpentSeconds,
          status: attempt.status,
          total_questions: attempt.totalQuestions,
          score: attempt.score,
          max_possible_score: attempt.maxPossibleScore,
          percentage: attempt.percentage,
          accuracy_percentage: attempt.accuracyPercentage,
          correct_count: attempt.correctCount,
          incorrect_count: attempt.incorrectCount,
          unanswered_count: attempt.unansweredCount,
          topic_breakdown: attempt.topicBreakdown,
          ai_feedback: attempt.aiFeedback,
        });

        if (attempt.evaluatedAnswers && attempt.evaluatedAnswers.length > 0) {
          const answerRows = attempt.evaluatedAnswers.map((ea) => ({
            attempt_id: attempt.id,
            question_id: ea.questionId,
            user_id: attempt.userId,
            user_answer: ea.userAnswer,
            is_correct: ea.isCorrect,
            marks_awarded: ea.marksAwarded,
            is_marked_for_review: attempt.reviewStatus[ea.questionId] || false,
            ai_evaluation_notes: ea.feedback || null,
            time_spent_seconds: 0,
          }));
          await admin.from('exam_answers').upsert(answerRows);
        }
      } catch (err) {
        // Non-blocking fallback
      }
    })();
  } catch {}

  return attempt;
}

export function getExamAttemptById(id: string): ExamAttempt | null {
  ensureStorageLoaded();
  return memoryAttempts.get(id) || null;
}

export function getUserExamAttempts(userId?: string): ExamAttempt[] {
  ensureStorageLoaded();
  if (!userId) return [];
  const list = Array.from(memoryAttempts.values());
  return list
    .filter((a) => a.userId === userId || (a.userId === 'default-user' && userId === 'default-user'))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============================================================================
// 5. EVALUATION ALGORITHM & RUBRICS
// ============================================================================

/**
 * Evaluates objective answers (MCQ & True/False) with optional negative marking.
 */
export function evaluateObjectiveQuestion(params: {
  userAnswer: string;
  correctAnswer: string;
  negativeMarking: boolean;
  negativeMarkValue: number;
}): { isCorrect: boolean; marksAwarded: number } {
  const { userAnswer, correctAnswer, negativeMarking, negativeMarkValue } = params;

  const cleanUser = (userAnswer || '').trim().toLowerCase();
  const cleanCorrect = (correctAnswer || '').trim().toLowerCase();

  if (!cleanUser) {
    return { isCorrect: false, marksAwarded: 0 };
  }

  // Exact or initial letter match (e.g. "A) Option" vs "Option" or "A")
  const isMatch =
    cleanUser === cleanCorrect ||
    cleanUser.startsWith(cleanCorrect) ||
    cleanCorrect.startsWith(cleanUser) ||
    cleanUser.slice(0, 1) === cleanCorrect.slice(0, 1);

  if (isMatch) {
    return { isCorrect: true, marksAwarded: 1.0 };
  } else {
    const penalty = negativeMarking ? -Math.abs(negativeMarkValue) : 0;
    return { isCorrect: false, marksAwarded: penalty };
  }
}

/**
 * Evaluates short-answer questions against expected concepts and keywords.
 * Awards partial credit (0, 0.5, or 1.0).
 */
export function evaluateShortAnswerLocal(params: {
  userAnswer: string;
  correctAnswer: string;
  expectedConcepts?: string[];
}): { isCorrect: boolean; marksAwarded: number; feedback: string } {
  const { userAnswer, correctAnswer, expectedConcepts = [] } = params;
  const cleanUser = (userAnswer || '').trim().toLowerCase();

  if (!cleanUser || cleanUser.length < 3) {
    return {
      isCorrect: false,
      marksAwarded: 0,
      feedback: 'No substantive answer provided.',
    };
  }

  // Check expected concept keyword matches
  const concepts = expectedConcepts.length > 0 ? expectedConcepts : correctAnswer.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  let matchedCount = 0;

  for (const c of concepts) {
    if (cleanUser.includes(c.toLowerCase().trim())) {
      matchedCount++;
    }
  }

  const matchRatio = concepts.length > 0 ? matchedCount / concepts.length : 0;

  if (matchRatio >= 0.65 || cleanUser.includes(correctAnswer.toLowerCase().trim())) {
    return {
      isCorrect: true,
      marksAwarded: 1.0,
      feedback: 'Excellent response. Core concepts accurately addressed.',
    };
  } else if (matchRatio >= 0.3) {
    return {
      isCorrect: true,
      marksAwarded: 0.5,
      feedback: 'Partially correct. Addressed some key points, but missed essential details.',
    };
  } else {
    return {
      isCorrect: false,
      marksAwarded: 0,
      feedback: 'Answer did not cover the essential expected concepts.',
    };
  }
}

// ============================================================================
// 6. DASHBOARD & ANALYTICS HELPER
// ============================================================================

export function calculateExamDashboardStats(userId?: string): ExamDashboardStats {
  const attempts = getUserExamAttempts(userId).filter((a) => a.status === 'completed');

  if (attempts.length === 0) {
    return {
      examsCompleted: 0,
      averageScore: 0,
      highestScore: 0,
      totalTimeSpentSeconds: 0,
      recentAttempts: [],
      weakTopics: [],
      strongTopics: [],
    };
  }

  const totalScore = attempts.reduce((acc, a) => acc + a.percentage, 0);
  const highestScore = Math.max(...attempts.map((a) => a.percentage));
  const totalTime = attempts.reduce((acc, a) => acc + a.timeSpentSeconds, 0);

  // Aggregate topic accuracy
  const topicMap: Record<string, { total: number; correct: number }> = {};
  for (const a of attempts) {
    for (const t of a.topicBreakdown || []) {
      if (!topicMap[t.topic]) topicMap[t.topic] = { total: 0, correct: 0 };
      topicMap[t.topic].total += t.total;
      topicMap[t.topic].correct += t.correct;
    }
  }

  const weakTopics: string[] = [];
  const strongTopics: string[] = [];

  for (const [topic, stats] of Object.entries(topicMap)) {
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    if (pct < 60) {
      weakTopics.push(topic);
    } else if (pct >= 80) {
      strongTopics.push(topic);
    }
  }

  return {
    examsCompleted: attempts.length,
    averageScore: Math.round(totalScore / attempts.length),
    highestScore: Math.round(highestScore),
    totalTimeSpentSeconds: totalTime,
    recentAttempts: attempts.slice(0, 5),
    weakTopics: weakTopics.slice(0, 4),
    strongTopics: strongTopics.slice(0, 4),
  };
}

/**
 * Purges all exams and exam attempts for a user (GDPR / account deletion).
 */
export function purgeUserExamData(userId: string): void {
  ensureStorageLoaded();
  for (const [id, exam] of memoryExams.entries()) {
    if (exam.userId === userId) {
      memoryExams.delete(id);
    }
  }
  for (const [id, attempt] of memoryAttempts.entries()) {
    if (attempt.userId === userId) {
      memoryAttempts.delete(id);
    }
  }
  persistStorageToDisk();
}
