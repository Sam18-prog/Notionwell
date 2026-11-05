/**
 * Notionwell Phase 5 — Intelligent AI Exam Simulation Engine
 * Authoritative Supabase PostgreSQL Persistence with Zero Filesystem Dependencies.
 * Eliminates /var/task/.exam_storage runtime crashes on Vercel Serverless.
 */

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

function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// ============================================================================
// 2. IN-MEMORY DEMO FALLBACK CACHE (For unauthenticated demo guests only)
// ============================================================================

const demoExamsMap = new Map<string, ExamConfig>();
const demoAttemptsMap = new Map<string, ExamAttempt>();

// ============================================================================
// 3. EXAM CONFIGURATION CRUD (SUPABASE AUTHORITATIVE)
// ============================================================================

export async function saveExamConfig(exam: ExamConfig): Promise<ExamConfig> {
  if (exam.userId === 'demo-guest-user') {
    demoExamsMap.set(exam.id, exam);
    return exam;
  }

  try {
    const admin = createAdminClient();

    // 1. Upsert exam record
    await admin.from('exams').upsert({
      id: exam.id,
      user_id: exam.userId,
      subject_id: isUUID(exam.subjectId) ? exam.subjectId : null,
      deck_id: isUUID(exam.deckId) ? exam.deckId : null,
      title: exam.title,
      description: exam.description || null,
      mode: exam.mode,
      difficulty: exam.difficulty,
      time_limit_minutes: exam.timeLimitMinutes,
      total_questions: exam.totalQuestions,
      negative_marking: exam.negativeMarking,
      negative_mark_value: exam.negativeMarkValue,
      selected_source_ids: exam.selectedSourceIds || [],
      selected_topics: exam.selectedTopics || [],
      question_types: exam.questionTypes || [],
      questions: exam.questions || [],
      subject_name: exam.subjectName || null,
      deck_name: exam.deckName || null,
      created_at: exam.createdAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    // 2. Also populate exam_questions table for relational queries
    if (exam.questions && exam.questions.length > 0) {
      const rows = exam.questions.map((q, idx) => ({
        id: isUUID(q.id) ? q.id : uuidv4(),
        exam_id: exam.id,
        question_index: q.questionIndex ?? idx,
        question_type: q.questionType || 'mcq',
        question: q.question,
        options: q.options || null,
        correct_answer: q.correctAnswer,
        expected_concepts: q.expectedConcepts || null,
        explanation: q.explanation || '',
        topic: q.topic || 'General',
        difficulty: q.difficulty || 'medium',
        source_quote: q.sourceQuote || null,
        source_reference: q.sourceReference || null,
      }));
      await admin.from('exam_questions').upsert(rows, { onConflict: 'id' });
    }
  } catch (err: any) {
    console.warn('[saveExamConfig] Supabase upsert notice:', err?.message);
  }

  return exam;
}

export async function getExamConfigById(id: string): Promise<ExamConfig | null> {
  if (demoExamsMap.has(id)) {
    return demoExamsMap.get(id)!;
  }

  try {
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from('exams')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !row) return null;

    let questions: ExamQuestion[] = Array.isArray(row.questions) && row.questions.length > 0 ? row.questions : [];

    if (questions.length === 0) {
      const { data: qRows } = await admin
        .from('exam_questions')
        .select('*')
        .eq('exam_id', id)
        .order('question_index', { ascending: true });

      if (Array.isArray(qRows)) {
        questions = qRows.map((q) => ({
          id: q.id,
          examId: q.exam_id,
          questionIndex: q.question_index,
          questionType: q.question_type as QuestionType,
          question: q.question,
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: q.correct_answer,
          expectedConcepts: Array.isArray(q.expected_concepts) ? q.expected_concepts : [],
          explanation: q.explanation || '',
          topic: q.topic || 'General',
          difficulty: q.difficulty || 'medium',
          sourceQuote: q.source_quote || undefined,
          sourceReference: q.source_reference || undefined,
        }));
      }
    }

    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description || '',
      subjectId: row.subject_id,
      subjectName: row.subject_name || undefined,
      deckId: row.deck_id,
      deckName: row.deck_name || undefined,
      mode: row.mode as ExamMode,
      difficulty: row.difficulty as ExamDifficulty,
      timeLimitMinutes: row.time_limit_minutes || 15,
      totalQuestions: row.total_questions || questions.length,
      negativeMarking: Boolean(row.negative_marking),
      negativeMarkValue: Number(row.negative_mark_value) || 0.25,
      questionTypes: Array.isArray(row.question_types) ? row.question_types : ['mcq'],
      selectedSourceIds: Array.isArray(row.selected_source_ids) ? row.selected_source_ids : [],
      selectedTopics: Array.isArray(row.selected_topics) ? row.selected_topics : [],
      randomizeOrder: false,
      createdAt: row.created_at,
      questions,
    };
  } catch (err: any) {
    console.warn('[getExamConfigById] Supabase query notice:', err?.message);
    return null;
  }
}

export async function getSanitizedExamForTaking(
  id: string
): Promise<(Omit<ExamConfig, 'questions'> & { questions: SanitizedExamQuestion[] }) | null> {
  const exam = await getExamConfigById(id);
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

export async function getAllExams(userId?: string): Promise<ExamConfig[]> {
  if (!userId) return [];

  if (userId === 'demo-guest-user') {
    return Array.from(demoExamsMap.values()).reverse();
  }

  try {
    const admin = createAdminClient();
    const { data: rows, error } = await admin
      .from('exams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(rows)) {
      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description || '',
        subjectId: row.subject_id,
        subjectName: row.subject_name || undefined,
        deckId: row.deck_id,
        deckName: row.deck_name || undefined,
        mode: row.mode as ExamMode,
        difficulty: row.difficulty as ExamDifficulty,
        timeLimitMinutes: row.time_limit_minutes || 15,
        totalQuestions: row.total_questions || 10,
        negativeMarking: Boolean(row.negative_marking),
        negativeMarkValue: Number(row.negative_mark_value) || 0.25,
        questionTypes: Array.isArray(row.question_types) ? row.question_types : ['mcq'],
        selectedSourceIds: Array.isArray(row.selected_source_ids) ? row.selected_source_ids : [],
        selectedTopics: Array.isArray(row.selected_topics) ? row.selected_topics : [],
        randomizeOrder: false,
        createdAt: row.created_at,
        questions: Array.isArray(row.questions) ? row.questions : [],
      }));
    }
  } catch (err: any) {
    console.warn('[getAllExams] Supabase query notice:', err?.message);
  }

  return [];
}

// ============================================================================
// 4. EXAM ATTEMPTS & EVALUATION STORAGE (SUPABASE AUTHORITATIVE)
// ============================================================================

export async function saveExamAttempt(attempt: ExamAttempt): Promise<ExamAttempt> {
  if (attempt.userId === 'demo-guest-user') {
    demoAttemptsMap.set(attempt.id, attempt);
    return attempt;
  }

  try {
    const admin = createAdminClient();

    // 1. Upsert attempt record
    await admin.from('exam_attempts').upsert({
      id: attempt.id,
      exam_id: attempt.examId,
      user_id: attempt.userId,
      mode: attempt.mode,
      started_at: attempt.startedAt,
      submitted_at: attempt.submittedAt || new Date().toISOString(),
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
      topic_breakdown: attempt.topicBreakdown || [],
      ai_feedback: attempt.aiFeedback || {},
      answers: attempt.userAnswers || {},
      exam_title: attempt.examTitle || null,
      exam_mode: attempt.mode || 'timed',
      created_at: attempt.createdAt || new Date().toISOString(),
    }, { onConflict: 'id' });

    // 2. Also populate exam_answers table for granular relational queries
    if (attempt.evaluatedAnswers && attempt.evaluatedAnswers.length > 0) {
      const answerRows = attempt.evaluatedAnswers.map((ea) => ({
        id: uuidv4(),
        attempt_id: attempt.id,
        question_id: isUUID(ea.questionId) ? ea.questionId : null,
        user_id: attempt.userId,
        user_answer: ea.userAnswer,
        is_correct: ea.isCorrect,
        marks_awarded: ea.marksAwarded,
        is_marked_for_review: attempt.reviewStatus[ea.questionId] || false,
        ai_evaluation_notes: ea.feedback || null,
        time_spent_seconds: 0,
      }));
      await admin.from('exam_answers').upsert(answerRows, { onConflict: 'id' });
    }
  } catch (err: any) {
    console.warn('[saveExamAttempt] Supabase upsert notice:', err?.message);
  }

  return attempt;
}

export async function getExamAttemptById(id: string): Promise<ExamAttempt | null> {
  if (demoAttemptsMap.has(id)) {
    return demoAttemptsMap.get(id)!;
  }

  try {
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from('exam_attempts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !row) return null;

    return {
      id: row.id,
      examId: row.exam_id,
      examTitle: row.exam_title || 'AI Simulated Exam',
      userId: row.user_id,
      mode: row.mode as ExamMode,
      startedAt: row.started_at,
      submittedAt: row.submitted_at || undefined,
      timeSpentSeconds: row.time_spent_seconds || 0,
      timeLimitMinutes: 15,
      status: row.status as 'in_progress' | 'completed' | 'expired',
      totalQuestions: row.total_questions || 0,
      score: Number(row.score) || 0,
      maxPossibleScore: Number(row.max_possible_score) || 0,
      percentage: Number(row.percentage) || 0,
      accuracyPercentage: Number(row.accuracy_percentage) || 0,
      correctCount: row.correct_count || 0,
      incorrectCount: row.incorrect_count || 0,
      unansweredCount: row.unanswered_count || 0,
      negativeMarkingApplied: 0,
      topicBreakdown: Array.isArray(row.topic_breakdown) ? row.topic_breakdown : [],
      aiFeedback: row.ai_feedback || undefined,
      userAnswers: row.answers || {},
      reviewStatus: {},
      createdAt: row.created_at,
    };
  } catch (err: any) {
    console.warn('[getExamAttemptById] Supabase query notice:', err?.message);
    return null;
  }
}

export async function getUserExamAttempts(userId?: string): Promise<ExamAttempt[]> {
  if (!userId) return [];

  if (userId === 'demo-guest-user') {
    return Array.from(demoAttemptsMap.values()).reverse();
  }

  try {
    const admin = createAdminClient();
    const { data: rows, error } = await admin
      .from('exam_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(rows)) {
      return rows.map((row) => ({
        id: row.id,
        examId: row.exam_id,
        examTitle: row.exam_title || 'AI Simulated Exam',
        userId: row.user_id,
        mode: row.mode as ExamMode,
        startedAt: row.started_at,
        submittedAt: row.submitted_at || undefined,
        timeSpentSeconds: row.time_spent_seconds || 0,
        timeLimitMinutes: 15,
        status: row.status as 'in_progress' | 'completed' | 'expired',
        totalQuestions: row.total_questions || 0,
        score: Number(row.score) || 0,
        maxPossibleScore: Number(row.max_possible_score) || 0,
        percentage: Number(row.percentage) || 0,
        accuracyPercentage: Number(row.accuracy_percentage) || 0,
        correctCount: row.correct_count || 0,
        incorrectCount: row.incorrect_count || 0,
        unansweredCount: row.unanswered_count || 0,
        negativeMarkingApplied: 0,
        topicBreakdown: Array.isArray(row.topic_breakdown) ? row.topic_breakdown : [],
        aiFeedback: row.ai_feedback || undefined,
        userAnswers: row.answers || {},
        reviewStatus: {},
        createdAt: row.created_at,
      }));
    }
  } catch (err: any) {
    console.warn('[getUserExamAttempts] Supabase query notice:', err?.message);
  }

  return [];
}

// ============================================================================
// 5. EVALUATION ALGORITHM & RUBRICS
// ============================================================================

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

  const concepts =
    expectedConcepts.length > 0
      ? expectedConcepts
      : correctAnswer.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
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

export async function calculateExamDashboardStats(userId?: string): Promise<ExamDashboardStats> {
  const allAttempts = await getUserExamAttempts(userId);
  const attempts = allAttempts.filter((a) => a.status === 'completed');

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

export async function purgeUserExamData(userId: string): Promise<void> {
  if (userId === 'demo-guest-user') {
    for (const [id, exam] of demoExamsMap.entries()) {
      if (exam.userId === userId) demoExamsMap.delete(id);
    }
    for (const [id, attempt] of demoAttemptsMap.entries()) {
      if (attempt.userId === userId) demoAttemptsMap.delete(id);
    }
    return;
  }

  try {
    const admin = createAdminClient();
    await Promise.allSettled([
      admin.from('exam_attempts').delete().eq('user_id', userId),
      admin.from('exams').delete().eq('user_id', userId),
    ]);
  } catch (err: any) {
    console.warn('[purgeUserExamData] Purge notice:', err?.message);
  }
}
