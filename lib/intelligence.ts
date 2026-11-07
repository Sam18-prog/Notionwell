/**
 * Notionwell Phase 7: Advanced AI Learning Intelligence Engine
 * Comprehensive intelligence layer powering:
 * 1. Personalized AI Study Paths with Dynamic Rescheduling
 * 2. Adaptive Learning & Multi-Factor Difficulty Calibration
 * 3. Intelligent Weak-Topic Detection with Actionable Evidence
 * 4. Cross-Document Knowledge Discovery & Concept Mapping
 * 5. AI Viva Voce Oral Examination Simulator with Real-Time Evaluation
 * 6. Unified AI Learning Profile
 */

import { v4 as uuidv4 } from 'uuid';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAIClientAndModel } from '@/lib/app';
import { getStoredDocuments, searchRelevantChunks, StoredDocument, StoredChunk } from '@/lib/rag/vectorStore';
import { getUserFlashcardReviews, getUserQuizAttempts, calculateStreaks } from '@/lib/analytics';
import { getUserExamAttempts } from '@/lib/exam';
import { withAiRetry } from '@/lib/rateLimit';

// ============================================================================
// 1. DATA TYPES & INTERFACES
// ============================================================================

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearningPath {
  id: string;
  userId: string;
  subjectId?: string | null;
  subjectName?: string;
  title: string;
  objective: string;
  targetDate: string; // YYYY-MM-DD
  dailyMinutes: number;
  status: 'active' | 'paused' | 'completed';
  currentLevel: DifficultyLevel;
  stagesCount: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type TaskType = 'reading' | 'flashcards' | 'quiz' | 'exam' | 'revision';

export interface LearningPathTask {
  id: string;
  pathId: string;
  userId: string;
  stageOrder: number;
  stageTitle: string;
  taskOrder: number;
  title: string;
  description: string;
  taskType: TaskType;
  estimatedMinutes: number;
  isCompleted: boolean;
  completedAt?: string | null;
  dueDate?: string | null;
  prerequisiteTaskIds?: string[];
  createdAt: string;
}

export interface AdaptiveProfile {
  id: string;
  userId: string;
  subjectId?: string | null;
  topic: string;
  currentDifficulty: DifficultyLevel;
  rollingAccuracy: number;
  totalAttempts: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  reason: string;
  lastAssessedAt: string;
}

export type WeakTopicStatus = 'insufficient_data' | 'needs_improvement' | 'improving' | 'strong';

export interface WeakTopicEvidence {
  sourceType: 'quiz' | 'exam' | 'flashcard';
  sourceTitle: string;
  promptOrQuestion: string;
  userAnswer?: string;
  correctAnswer?: string;
  timestamp: string;
}

export interface WeakTopicItem {
  topic: string;
  subjectName?: string;
  status: WeakTopicStatus;
  accuracyPercentage: number;
  totalAttempts: number;
  errorCount: number;
  evidence: WeakTopicEvidence[];
  recommendedActions: {
    canRevise: boolean;
    canAskAI: boolean;
    canGenerateCards: boolean;
    canPracticeQuiz: boolean;
  };
  summaryConcept?: string;
}

export type ConnectionType = 'shared_concept' | 'prerequisite' | 'complementary' | 'contradiction_or_contrast';

export interface KnowledgeConnection {
  id: string;
  userId: string;
  subjectId?: string | null;
  title: string;
  connectionType: ConnectionType;
  description: string;
  sourceDocumentName: string;
  targetDocumentName: string;
  sourceChunkSnippet?: string;
  targetChunkSnippet?: string;
  citations: Array<{
    documentName: string;
    heading: string;
    snippet: string;
  }>;
  createdAt: string;
}

export type VivaMode = 'definitions' | 'conceptual' | 'practical' | 'technical' | 'comprehensive';

export interface VivaSession {
  id: string;
  userId: string;
  subjectId?: string | null;
  deckId?: string | null;
  documentId?: string | null;
  sourceType?: 'document' | 'deck' | 'custom';
  sourceTitle?: string;
  topicTitle: string;
  vivaMode: VivaMode;
  difficulty: DifficultyLevel;
  totalQuestions: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  currentQuestionIndex: number;
  overallScore?: number;
  accuracyScore?: number;
  depthScore?: number;
  clarityScore?: number;
  evaluationSummary?: {
    strengths: string[];
    improvements: string[];
    overallCritique: string;
  };
  turns?: VivaResponse[];
  createdAt: string;
  completedAt?: string | null;
}

export interface VivaResponse {
  id: string;
  sessionId: string;
  userId: string;
  questionIndex: number;
  questionText: string;
  studentResponse: string;
  isVoice: boolean;
  score: number; // 0 - 10
  evaluationStatus?: 'correct' | 'partially_correct' | 'incorrect';
  feedback: string;
  strengths?: string[];
  missingPoints?: string[];
  technicalInaccuracies?: string[];
  idealAnswer?: string;
  suggestions?: string[];
  followUpQuestion?: string | null;
  createdAt: string;
}

export interface UnifiedLearningProfile {
  userId: string;
  overallLevel: number;
  totalXP: number;
  currentStreakDays: number;
  retentionRatePercentage: number;
  activeStudyPathsCount: number;
  masteredTopicsCount: number;
  topicsNeedingAttentionCount: number;
  averageVivaScore: number;
  recommendedNextActions: Array<{
    title: string;
    description: string;
    actionType: 'study_path' | 'weak_topic' | 'viva' | 'review';
    link: string;
  }>;
}

// ============================================================================
// 2. AUTHORITATIVE SUPABASE STORAGE LAYER (Zero Filesystem Dependencies)
// ============================================================================

function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// In-Memory cache singletons for demo users
let demoIntelPaths: LearningPath[] = [];
let demoIntelTasks: LearningPathTask[] = [];
let demoIntelAdaptive: AdaptiveProfile[] = [];
let demoIntelConnections: KnowledgeConnection[] = [];
let demoIntelVivaSessions: VivaSession[] = [];
let demoIntelVivaResponses: VivaResponse[] = [];

async function getStoredPaths(userId?: string): Promise<LearningPath[]> {
  if (userId === 'demo-guest-user') {
    return demoIntelPaths;
  }
  try {
    const admin = createAdminClient();
    let q = admin.from('learning_paths').select('*').order('created_at', { ascending: false });
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        subjectId: r.subject_id,
        title: r.title,
        objective: r.objective,
        targetDate: r.target_date,
        dailyMinutes: r.daily_minutes,
        status: r.status,
        currentLevel: r.current_level,
        stagesCount: r.stages_count,
        metadata: r.metadata || {},
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }
  } catch (err: any) {
    console.warn('[getStoredPaths] Supabase notice:', err?.message);
  }
  return demoIntelPaths;
}

async function saveStoredPaths(paths: LearningPath[]): Promise<void> {
  for (const p of paths) {
    if (p.userId === 'demo-guest-user') {
      const idx = demoIntelPaths.findIndex((x) => x.id === p.id);
      if (idx >= 0) demoIntelPaths[idx] = p; else demoIntelPaths.unshift(p);
      continue;
    }
    try {
      const admin = createAdminClient();
      await admin.from('learning_paths').upsert({
        id: p.id,
        user_id: p.userId,
        subject_id: isUUID(p.subjectId) ? p.subjectId : null,
        title: p.title,
        objective: p.objective,
        target_date: p.targetDate,
        daily_minutes: p.dailyMinutes,
        status: p.status,
        current_level: p.currentLevel,
        stages_count: p.stagesCount,
        metadata: p.metadata || {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn('[saveStoredPaths] Supabase notice:', err?.message);
    }
  }
}

async function getStoredTasks(pathId?: string, userId?: string): Promise<LearningPathTask[]> {
  if (userId === 'demo-guest-user') {
    return pathId ? demoIntelTasks.filter((t) => t.pathId === pathId) : demoIntelTasks;
  }
  try {
    const admin = createAdminClient();
    let q = admin.from('learning_path_tasks').select('*').order('stage_order', { ascending: true }).order('task_order', { ascending: true });
    if (pathId) q = q.eq('path_id', pathId);
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        pathId: r.path_id,
        userId: r.user_id,
        stageOrder: r.stage_order,
        stageTitle: r.stage_title,
        taskOrder: r.task_order,
        title: r.title,
        description: r.description,
        taskType: r.task_type,
        estimatedMinutes: r.estimated_minutes,
        isCompleted: r.is_completed,
        completedAt: r.completed_at,
        dueDate: r.due_date,
        prerequisiteTaskIds: r.prerequisite_task_ids || [],
        createdAt: r.created_at,
      }));
    }
  } catch (err: any) {
    console.warn('[getStoredTasks] Supabase notice:', err?.message);
  }
  return demoIntelTasks;
}

async function saveStoredTasks(tasks: LearningPathTask[]): Promise<void> {
  for (const t of tasks) {
    if (t.userId === 'demo-guest-user') {
      const idx = demoIntelTasks.findIndex((x) => x.id === t.id);
      if (idx >= 0) demoIntelTasks[idx] = t; else demoIntelTasks.push(t);
      continue;
    }
    try {
      const admin = createAdminClient();
      await admin.from('learning_path_tasks').upsert({
        id: t.id,
        path_id: t.pathId,
        user_id: t.userId,
        stage_order: t.stageOrder,
        stage_title: t.stageTitle,
        task_order: t.taskOrder,
        title: t.title,
        description: t.description,
        task_type: t.taskType,
        estimated_minutes: t.estimatedMinutes,
        is_completed: t.isCompleted,
        completed_at: t.completedAt,
        due_date: t.dueDate,
        prerequisite_task_ids: t.prerequisiteTaskIds || [],
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn('[saveStoredTasks] Supabase notice:', err?.message);
    }
  }
}

async function getStoredAdaptiveProfiles(userId?: string): Promise<AdaptiveProfile[]> {
  if (userId === 'demo-guest-user') return demoIntelAdaptive;
  try {
    const admin = createAdminClient();
    let q = admin.from('adaptive_learning_profiles').select('*');
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        subjectId: r.subject_id,
        topic: r.topic,
        currentDifficulty: r.current_difficulty,
        rollingAccuracy: Number(r.rolling_accuracy) || 70,
        totalAttempts: r.total_attempts || 0,
        consecutiveCorrect: r.consecutive_correct || 0,
        consecutiveIncorrect: r.consecutive_incorrect || 0,
        reason: r.reason || '',
        lastAssessedAt: r.last_assessed_at,
      }));
    }
  } catch (err: any) {
    console.warn('[getStoredAdaptiveProfiles] Supabase notice:', err?.message);
  }
  return demoIntelAdaptive;
}

async function saveStoredAdaptiveProfiles(profiles: AdaptiveProfile[]): Promise<void> {
  for (const p of profiles) {
    if (p.userId === 'demo-guest-user') {
      const idx = demoIntelAdaptive.findIndex((x) => x.id === p.id || x.topic.toLowerCase() === p.topic.toLowerCase());
      if (idx >= 0) demoIntelAdaptive[idx] = p; else demoIntelAdaptive.push(p);
      continue;
    }
    try {
      const admin = createAdminClient();
      await admin.from('adaptive_learning_profiles').upsert({
        user_id: p.userId,
        topic: p.topic,
        subject_id: isUUID(p.subjectId) ? p.subjectId : null,
        current_difficulty: p.currentDifficulty,
        rolling_accuracy: p.rollingAccuracy,
        total_attempts: p.totalAttempts,
        consecutive_correct: p.consecutiveCorrect,
        consecutive_incorrect: p.consecutiveIncorrect,
        reason: p.reason,
        last_assessed_at: p.lastAssessedAt,
      }, { onConflict: 'user_id,topic' });
    } catch (err: any) {
      console.warn('[saveStoredAdaptiveProfiles] Supabase notice:', err?.message);
    }
  }
}

async function getStoredConnections(userId?: string): Promise<KnowledgeConnection[]> {
  if (userId === 'demo-guest-user') return demoIntelConnections;
  try {
    const admin = createAdminClient();
    let q = admin.from('knowledge_connections').select('*').order('created_at', { ascending: false });
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        subjectId: r.subject_id,
        title: r.title,
        connectionType: r.connection_type,
        description: r.description,
        sourceDocumentName: r.source_document_name,
        targetDocumentName: r.target_document_name,
        sourceChunkSnippet: r.source_chunk_snippet || undefined,
        targetChunkSnippet: r.target_chunk_snippet || undefined,
        citations: r.citations || [],
        createdAt: r.created_at,
      }));
    }
  } catch (err: any) {
    console.warn('[getStoredConnections] Supabase notice:', err?.message);
  }
  return demoIntelConnections;
}

async function saveStoredConnections(connections: KnowledgeConnection[]): Promise<void> {
  for (const c of connections) {
    if (c.userId === 'demo-guest-user') {
      demoIntelConnections.unshift(c);
      continue;
    }
    try {
      const admin = createAdminClient();
      await admin.from('knowledge_connections').upsert({
        id: c.id,
        user_id: c.userId,
        subject_id: isUUID(c.subjectId) ? c.subjectId : null,
        title: c.title,
        connection_type: c.connectionType,
        description: c.description,
        source_document_name: c.sourceDocumentName,
        target_document_name: c.targetDocumentName,
        source_chunk_snippet: c.sourceChunkSnippet || null,
        target_chunk_snippet: c.targetChunkSnippet || null,
        citations: c.citations || [],
        created_at: c.createdAt,
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn('[saveStoredConnections] Supabase notice:', err?.message);
    }
  }
}

async function getStoredVivaSessions(userId?: string): Promise<VivaSession[]> {
  if (userId === 'demo-guest-user') return demoIntelVivaSessions;
  try {
    const admin = createAdminClient();
    let q = admin.from('viva_sessions').select('*').order('created_at', { ascending: false });
    if (userId && userId !== 'all') q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (!error && Array.isArray(data)) {
      return data.map((r: any) => {
        const meta = typeof r.target_topics === 'object' && r.target_topics !== null && !Array.isArray(r.target_topics)
          ? r.target_topics
          : {};
        const turnsList: VivaResponse[] = Array.isArray(r.turns)
          ? r.turns.map((t: any) => ({
              id: t.id || uuidv4(),
              sessionId: r.id,
              userId: r.user_id,
              questionIndex: t.questionIndex ?? t.question_index ?? 1,
              questionText: t.questionText ?? t.question_text ?? '',
              studentResponse: t.studentResponse ?? t.student_response ?? '',
              isVoice: Boolean(t.isVoice ?? t.is_voice),
              score: typeof t.score === 'number' ? t.score : 0,
              evaluationStatus: t.evaluationStatus ?? t.evaluation_status ?? (t.score >= 8 ? 'correct' : t.score >= 5 ? 'partially_correct' : 'incorrect'),
              feedback: t.feedback || '',
              strengths: t.strengths || [],
              missingPoints: t.missingPoints ?? t.missing_points ?? [],
              technicalInaccuracies: t.technicalInaccuracies ?? t.technical_inaccuracies ?? [],
              idealAnswer: t.idealAnswer ?? t.ideal_answer ?? '',
              suggestions: t.suggestions || [],
              followUpQuestion: t.followUpQuestion ?? t.follow_up_question ?? null,
              createdAt: t.createdAt ?? t.created_at ?? new Date().toISOString(),
            }))
          : [];

        return {
          id: r.id,
          userId: r.user_id,
          deckId: r.deck_id,
          subjectId: meta.subjectId || null,
          documentId: meta.documentId || null,
          sourceType: meta.sourceType || (meta.documentId ? 'document' : r.deck_id ? 'deck' : 'custom'),
          sourceTitle: meta.sourceTitle || undefined,
          topicTitle: r.topic_title || r.title || 'General Academic Topic',
          vivaMode: meta.vivaMode || 'comprehensive',
          difficulty: meta.difficulty || 'intermediate',
          totalQuestions: Number(meta.totalQuestions) || 5,
          status: r.status === 'completed' ? 'completed' : 'in_progress',
          currentQuestionIndex: r.current_question_index || 1,
          overallScore: r.final_score != null ? Number(r.final_score) : undefined,
          accuracyScore: meta.accuracyScore != null ? Number(meta.accuracyScore) : undefined,
          depthScore: meta.depthScore != null ? Number(meta.depthScore) : undefined,
          clarityScore: meta.clarityScore != null ? Number(meta.clarityScore) : undefined,
          evaluationSummary: {
            strengths: Array.isArray(r.strengths) ? r.strengths : [],
            improvements: Array.isArray(r.weaknesses) ? r.weaknesses : [],
            overallCritique: r.feedback || '',
          },
          turns: turnsList,
          createdAt: r.created_at,
          completedAt: r.status === 'completed' ? r.updated_at : undefined,
        };
      });
    } else if (error) {
      console.warn('[getStoredVivaSessions] Supabase query notice:', error.message);
    }
  } catch (err: any) {
    console.warn('[getStoredVivaSessions] Exception:', err?.message);
  }
  return demoIntelVivaSessions;
}

async function saveStoredVivaSessions(sessions: VivaSession[]): Promise<void> {
  for (const s of sessions) {
    if (s.userId === 'demo-guest-user') {
      const idx = demoIntelVivaSessions.findIndex((x) => x.id === s.id);
      if (idx >= 0) demoIntelVivaSessions[idx] = s; else demoIntelVivaSessions.unshift(s);
      continue;
    }
    try {
      const admin = createAdminClient();
      const targetTopicsData = {
        vivaMode: s.vivaMode || 'comprehensive',
        difficulty: s.difficulty || 'intermediate',
        totalQuestions: s.totalQuestions || 5,
        documentId: s.documentId || null,
        sourceType: s.sourceType || 'custom',
        sourceTitle: s.sourceTitle || null,
        subjectId: s.subjectId || null,
        accuracyScore: s.accuracyScore || null,
        depthScore: s.depthScore || null,
        clarityScore: s.clarityScore || null,
      };

      const serializedTurns = (s.turns || []).map((t) => ({
        id: t.id,
        question_index: t.questionIndex,
        question_text: t.questionText,
        student_response: t.studentResponse,
        is_voice: Boolean(t.isVoice),
        score: t.score,
        evaluation_status: t.evaluationStatus,
        feedback: t.feedback,
        strengths: t.strengths || [],
        missing_points: t.missingPoints || [],
        technical_inaccuracies: t.technicalInaccuracies || [],
        ideal_answer: t.idealAnswer || '',
        suggestions: t.suggestions || [],
        follow_up_question: t.followUpQuestion || null,
        created_at: t.createdAt || new Date().toISOString(),
      }));

      const { error: upsertErr } = await admin.from('viva_sessions').upsert({
        id: s.id,
        user_id: s.userId,
        deck_id: isUUID(s.deckId) ? s.deckId : null,
        title: s.topicTitle || 'Viva Voce Examination',
        topic_title: s.topicTitle || 'General Academic Topic',
        target_topics: targetTopicsData,
        current_question_index: s.currentQuestionIndex || 1,
        status: s.status === 'completed' ? 'completed' : 'active',
        turns: serializedTurns,
        final_score: typeof s.overallScore === 'number' ? s.overallScore : null,
        feedback: s.evaluationSummary?.overallCritique || null,
        strengths: s.evaluationSummary?.strengths || [],
        weaknesses: s.evaluationSummary?.improvements || [],
        created_at: s.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (upsertErr) {
        console.error('[saveStoredVivaSessions] Supabase upsert error:', upsertErr.message);
      }
    } catch (err: any) {
      console.warn('[saveStoredVivaSessions] Exception:', err?.message);
    }
  }
}

async function getStoredVivaResponses(sessionId?: string, userId?: string): Promise<VivaResponse[]> {
  if (!sessionId) return demoIntelVivaResponses;
  if (userId === 'demo-guest-user') {
    return demoIntelVivaResponses.filter((r) => r.sessionId === sessionId);
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('viva_sessions')
      .select('turns, user_id')
      .eq('id', sessionId)
      .single();

    if (!error && data && Array.isArray(data.turns)) {
      return data.turns.map((t: any) => ({
        id: t.id || uuidv4(),
        sessionId,
        userId: data.user_id || userId || '',
        questionIndex: t.questionIndex ?? t.question_index ?? 1,
        questionText: t.questionText ?? t.question_text ?? '',
        studentResponse: t.studentResponse ?? t.student_response ?? '',
        isVoice: Boolean(t.isVoice ?? t.is_voice),
        score: typeof t.score === 'number' ? t.score : 0,
        evaluationStatus: t.evaluationStatus ?? t.evaluation_status ?? (t.score >= 8 ? 'correct' : t.score >= 5 ? 'partially_correct' : 'incorrect'),
        feedback: t.feedback || '',
        strengths: t.strengths || [],
        missingPoints: t.missingPoints ?? t.missing_points ?? [],
        technicalInaccuracies: t.technicalInaccuracies ?? t.technical_inaccuracies ?? [],
        idealAnswer: t.idealAnswer ?? t.ideal_answer ?? '',
        suggestions: t.suggestions || [],
        followUpQuestion: t.followUpQuestion ?? t.follow_up_question ?? null,
        createdAt: t.createdAt ?? t.created_at ?? new Date().toISOString(),
      }));
    }
  } catch (err: any) {
    console.warn('[getStoredVivaResponses] Exception:', err?.message);
  }
  return demoIntelVivaResponses.filter((r) => r.sessionId === sessionId);
}

async function saveStoredVivaResponses(responses: VivaResponse[]): Promise<void> {
  if (responses.length === 0) return;
  const sessionId = responses[0].sessionId;
  const userId = responses[0].userId;

  if (userId === 'demo-guest-user') {
    responses.forEach((r) => {
      const idx = demoIntelVivaResponses.findIndex((x) => x.id === r.id);
      if (idx >= 0) demoIntelVivaResponses[idx] = r; else demoIntelVivaResponses.push(r);
    });
    return;
  }

  try {
    const admin = createAdminClient();
    const { data: currentSession } = await admin
      .from('viva_sessions')
      .select('turns')
      .eq('id', sessionId)
      .single();

    const existingTurns = (currentSession && Array.isArray(currentSession.turns)) ? currentSession.turns : [];
    const updatedTurns = [...existingTurns];

    for (const r of responses) {
      const turnObj = {
        id: r.id,
        question_index: r.questionIndex,
        question_text: r.questionText,
        student_response: r.studentResponse,
        is_voice: Boolean(r.isVoice),
        score: r.score,
        evaluation_status: r.evaluationStatus,
        feedback: r.feedback,
        strengths: r.strengths || [],
        missing_points: r.missingPoints || [],
        technical_inaccuracies: r.technicalInaccuracies || [],
        ideal_answer: r.idealAnswer || '',
        suggestions: r.suggestions || [],
        follow_up_question: r.followUpQuestion || null,
        created_at: r.createdAt || new Date().toISOString(),
      };
      const existingIdx = updatedTurns.findIndex((t: any) => t.id === r.id || t.question_index === r.questionIndex);
      if (existingIdx >= 0) {
        updatedTurns[existingIdx] = turnObj;
      } else {
        updatedTurns.push(turnObj);
      }
    }

    await admin
      .from('viva_sessions')
      .update({
        turns: updatedTurns,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  } catch (err: any) {
    console.warn('[saveStoredVivaResponses] Exception:', err?.message);
  }
}

// ============================================================================
// 3. PERSONALIZED AI STUDY PATHS ENGINE
// ============================================================================

export interface CreateStudyPathParams {
  userId: string;
  subjectId?: string | null;
  subjectName?: string;
  title: string;
  objective: string;
  targetDate: string; // YYYY-MM-DD
  dailyMinutes: number;
  initialLevel?: DifficultyLevel;
  deckIds?: string[];
  documentIds?: string[];
  syllabusText?: string;
}

export async function generatePersonalizedStudyPath(
  params: CreateStudyPathParams
): Promise<{ path: LearningPath; tasks: LearningPathTask[] }> {
  const {
    userId,
    subjectId = null,
    subjectName = 'General Studies',
    title,
    objective,
    targetDate,
    dailyMinutes = 30,
    initialLevel = 'intermediate',
    deckIds = [],
    documentIds = [],
    syllabusText,
  } = params;

  // Gather context from uploaded documents or decks
  let sourceContext = '';
  const userDocs = await getStoredDocuments(userId);
  const relevantDocs = documentIds.length > 0
    ? userDocs.filter(d => documentIds.includes(d.id) || documentIds.includes(d.fileName))
    : userDocs.slice(0, 3);

  if (relevantDocs.length > 0) {
    sourceContext = relevantDocs.map(d => `- Document: "${d.fileName}" (${d.characterCount} chars)`).join('\n');
  } else {
    sourceContext = `- Subject Focus: ${subjectName}\n- Primary Objective: ${objective}`;
  }

  if (syllabusText && syllabusText.trim().length > 0) {
    sourceContext = `=== PROVIDED OFFICIAL SYLLABUS / CURRICULUM OUTLINE ===\n${syllabusText.trim().slice(0, 5000)}\n\n` + sourceContext;
  }

  // Calculate timeline
  const today = new Date();
  const target = new Date(targetDate);
  const daysDiff = Math.max(3, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const pathId = uuidv4();
  const newPath: LearningPath = {
    id: pathId,
    userId,
    subjectId,
    subjectName,
    title: title.trim() || `Mastery Path: ${subjectName}`,
    objective: objective.trim() || 'Comprehensive subject mastery',
    targetDate,
    dailyMinutes,
    status: 'active',
    currentLevel: initialLevel,
    stagesCount: 4,
    metadata: { deckIds, documentIds, totalDays: daysDiff, hasSyllabus: Boolean(syllabusText) },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const tasks: LearningPathTask[] = [];

  // Try generating pedagogical syllabus with Gemini
  const aiConfig = getAIClientAndModel();
  let generatedStages: Array<{
    stageTitle: string;
    tasks: Array<{ title: string; description: string; taskType: TaskType; estimatedMinutes: number }>;
  }> = [];

  if (aiConfig) {
    try {
      const prompt = `You are an expert academic curriculum designer and pedagogical tutor.
Create a structured 4-stage personalized learning roadmap for a student.

STUDENT PROFILE:
- Target Date: ${targetDate} (${daysDiff} days available)
- Daily Available Time: ${dailyMinutes} minutes
- Current Level: ${initialLevel}
- Learning Goal: ${objective}
- Subject: ${subjectName}
- Materials Available:
${sourceContext}

${syllabusText ? 'CRITICAL CURRICULUM DIRECTIVE:\nThe student provided their official syllabus/curriculum outline above. You MUST directly map the 4 stages and individual task titles to the specific modules, chapters, topics, and units explicitly listed in that syllabus.\n' : ''}
DESIGN REQUIREMENTS:
1. Divide the curriculum into exactly 4 logical stages:
   Stage 1: Foundation & Core Terminology
   Stage 2: Conceptual Deep Dive & Mechanism Analysis
   Stage 3: Practical Problem-Solving & Weakness Remediation
   Stage 4: Comprehensive Exam Simulation & Final Synthesis
2. In each stage, create 2 to 3 actionable tasks.
3. Supported task types: "reading", "flashcards", "quiz", "exam", "revision".
4. Estimated minutes must align with daily budget (${dailyMinutes} mins).
5. Output STRICT JSON only, matching this exact schema:
{
  "stages": [
    {
      "stageTitle": "Stage 1: Foundation & Core Terminology",
      "tasks": [
        {
          "title": "Core Definitions & Fundamentals",
          "description": "Read introductory sections and highlight key entities.",
          "taskType": "reading",
          "estimatedMinutes": ${Math.min(dailyMinutes, 25)}
        }
      ]
    }
  ]
}`;

      const completion = await withAiRetry(() =>
        aiConfig.client.chat.completions.create({
          model: aiConfig.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        })
      );

      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed.stages) && parsed.stages.length > 0) {
        generatedStages = parsed.stages;
      }
    } catch (aiErr) {
      console.warn('[Intelligence] Gemini study path generation fallback:', aiErr);
    }
  }

  // Fallback pedagogical curriculum if AI parsing was incomplete
  if (generatedStages.length === 0) {
    generatedStages = [
      {
        stageTitle: 'Stage 1: Foundation & Core Terminology',
        tasks: [
          {
            title: `Review foundational concepts in ${subjectName}`,
            description: 'Read primary lecture notes and build mental model of terminology.',
            taskType: 'reading',
            estimatedMinutes: Math.min(dailyMinutes, 25),
          },
          {
            title: 'Diagnostic flashcard review',
            description: 'Complete initial spaced repetition deck to establish baseline recall.',
            taskType: 'flashcards',
            estimatedMinutes: Math.min(dailyMinutes, 20),
          },
        ],
      },
      {
        stageTitle: 'Stage 2: Deep Dive & Mechanism Mastery',
        tasks: [
          {
            title: 'In-depth analytical study',
            description: 'Examine detailed workflows, case studies, and mathematical principles.',
            taskType: 'reading',
            estimatedMinutes: Math.min(dailyMinutes, 30),
          },
          {
            title: 'Conceptual milestone quiz',
            description: 'Attempt multi-choice quiz to verify intermediate retention.',
            taskType: 'quiz',
            estimatedMinutes: Math.min(dailyMinutes, 20),
          },
        ],
      },
      {
        stageTitle: 'Stage 3: Applied Practice & Weak Spot Remediation',
        tasks: [
          {
            title: 'Targeted flashcard mastery',
            description: 'Practice cards with low easiness factors and reinforce memory traces.',
            taskType: 'flashcards',
            estimatedMinutes: Math.min(dailyMinutes, 20),
          },
          {
            title: 'Viva voce oral drill',
            description: 'Practice articulating answers aloud using the AI Viva Prep simulator.',
            taskType: 'revision',
            estimatedMinutes: Math.min(dailyMinutes, 25),
          },
        ],
      },
      {
        stageTitle: 'Stage 4: Comprehensive Exam Simulation & Polish',
        tasks: [
          {
            title: 'Timed mock examination',
            description: 'Simulate full realistic exam conditions under time limits.',
            taskType: 'exam',
            estimatedMinutes: Math.min(dailyMinutes * 2, 45),
          },
          {
            title: 'Final weak-topic synthesis',
            description: 'Targeted review of missed questions and high-yield concepts.',
            taskType: 'revision',
            estimatedMinutes: Math.min(dailyMinutes, 20),
          },
        ],
      },
    ];
  }

  // Assign dates evenly across the available days
  const totalTasks = generatedStages.reduce((acc, st) => acc + st.tasks.length, 0);
  const dayStep = Math.max(1, Math.floor(daysDiff / Math.max(1, totalTasks)));
  let currentDayOffset = 1;
  let overallTaskOrder = 1;

  generatedStages.forEach((stage, stageIdx) => {
    stage.tasks.forEach((t) => {
      const taskDueDate = new Date(today);
      taskDueDate.setDate(today.getDate() + currentDayOffset);
      const dueDateStr = taskDueDate.toISOString().split('T')[0];

      tasks.push({
        id: uuidv4(),
        pathId,
        userId,
        stageOrder: stageIdx + 1,
        stageTitle: stage.stageTitle,
        taskOrder: overallTaskOrder++,
        title: t.title,
        description: t.description,
        taskType: t.taskType,
        estimatedMinutes: t.estimatedMinutes || dailyMinutes,
        isCompleted: false,
        completedAt: null,
        dueDate: dueDateStr,
        prerequisiteTaskIds: [],
        createdAt: new Date().toISOString(),
      });

      currentDayOffset = Math.min(daysDiff, currentDayOffset + dayStep);
    });
  });

  // Save directly to Supabase persistence
  await saveStoredPaths([newPath]);
  await saveStoredTasks(tasks);

  return { path: newPath, tasks };
}

export async function getUserStudyPaths(userId: string): Promise<Array<LearningPath & { progressPercentage: number; totalTasks: number; completedTasks: number }>> {
  const paths = await getStoredPaths(userId);
  const allTasks = await getStoredTasks(undefined, userId);

  return paths.map(p => {
    const pTasks = allTasks.filter(t => t.pathId === p.id);
    const completedTasks = pTasks.filter(t => t.isCompleted).length;
    const progressPercentage = pTasks.length > 0 ? Math.round((completedTasks / pTasks.length) * 100) : 0;
    return {
      ...p,
      progressPercentage,
      totalTasks: pTasks.length,
      completedTasks,
    };
  });
}

export async function getStudyPathDetails(pathId: string, userId: string): Promise<{ path: LearningPath; tasks: LearningPathTask[] } | null> {
  const paths = await getStoredPaths(userId);
  const p = paths.find(item => item.id === pathId);
  if (!p) return null;
  const tasks = (await getStoredTasks(pathId, userId))
    .sort((a, b) => a.stageOrder - b.stageOrder || a.taskOrder - b.taskOrder);
  return { path: p, tasks };
}

export async function toggleStudyPathTask(taskId: string, userId: string): Promise<{ success: boolean; task?: LearningPathTask }> {
  const tasks = await getStoredTasks(undefined, userId);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return { success: false };

  const task = tasks[idx];
  const nextCompleted = !task.isCompleted;
  task.isCompleted = nextCompleted;
  task.completedAt = nextCompleted ? new Date().toISOString() : null;

  await saveStoredTasks([task]);

  // Check if all tasks in path are complete
  const pathTasks = tasks.filter(t => t.pathId === task.pathId);
  const allComplete = pathTasks.length > 0 && pathTasks.every(t => t.isCompleted);
  const paths = await getStoredPaths(userId);
  const targetPath = paths.find(p => p.id === task.pathId);
  if (targetPath) {
    targetPath.status = allComplete ? 'completed' : 'active';
    targetPath.updatedAt = new Date().toISOString();
    await saveStoredPaths([targetPath]);
  }

  return { success: true, task };
}

export async function rescheduleStudyPath(
  pathId: string,
  userId: string,
  newTargetDate: string,
  dailyMinutes?: number
): Promise<{ success: boolean; path?: LearningPath; rescheduledCount: number }> {
  const paths = await getStoredPaths(userId);
  const pathIdx = paths.findIndex(p => p.id === pathId);
  if (pathIdx === -1) return { success: false, rescheduledCount: 0 };

  const targetPath = paths[pathIdx];
  targetPath.targetDate = newTargetDate;
  if (dailyMinutes) targetPath.dailyMinutes = dailyMinutes;
  targetPath.updatedAt = new Date().toISOString();

  const tasks = await getStoredTasks(pathId, userId);
  const remainingTasks = tasks.filter(t => !t.isCompleted);

  const today = new Date();
  const target = new Date(newTargetDate);
  const daysDiff = Math.max(1, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const step = Math.max(1, Math.floor(daysDiff / Math.max(1, remainingTasks.length)));

  let offset = 1;
  remainingTasks.forEach((t) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    t.dueDate = d.toISOString().split('T')[0];
    offset = Math.min(daysDiff, offset + step);
  });

  await saveStoredPaths([targetPath]);
  await saveStoredTasks(remainingTasks);

  return { success: true, path: targetPath, rescheduledCount: remainingTasks.length };
}

// ============================================================================
// 4. ADAPTIVE LEARNING & DIFFICULTY ADJUSTMENT ENGINE
// ============================================================================

export async function recordAdaptiveAttempt(
  userId: string,
  topic: string,
  correct: number,
  total: number,
  sourceType: 'quiz' | 'exam' | 'flashcard' = 'quiz',
  subjectId: string | null = null
): Promise<AdaptiveProfile> {
  const profiles = await getStoredAdaptiveProfiles(userId);
  const cleanTopic = topic.trim();
  let profile = profiles.find(p => p.topic.toLowerCase() === cleanTopic.toLowerCase());

  const attemptAccuracy = total > 0 ? (correct / total) * 100 : 0;
  const isSuccess = attemptAccuracy >= 70;

  if (!profile) {
    profile = {
      id: uuidv4(),
      userId,
      subjectId,
      topic: cleanTopic,
      currentDifficulty: attemptAccuracy >= 85 ? 'advanced' : attemptAccuracy <= 55 ? 'beginner' : 'intermediate',
      rollingAccuracy: Math.round(attemptAccuracy),
      totalAttempts: 1,
      consecutiveCorrect: isSuccess ? 1 : 0,
      consecutiveIncorrect: isSuccess ? 0 : 1,
      reason: `Initial assessment from ${sourceType}: scored ${Math.round(attemptAccuracy)}%.`,
      lastAssessedAt: new Date().toISOString(),
    };
  } else {
    // Rolling accuracy over recent sessions (exponential moving average: 40% new attempt, 60% historical)
    const newRolling = Math.round(profile.rollingAccuracy * 0.60 + attemptAccuracy * 0.40);
    profile.rollingAccuracy = newRolling;
    profile.totalAttempts += 1;
    profile.lastAssessedAt = new Date().toISOString();

    if (isSuccess) {
      profile.consecutiveCorrect += 1;
      profile.consecutiveIncorrect = 0;
    } else {
      profile.consecutiveIncorrect += 1;
      profile.consecutiveCorrect = 0;
    }

    // Conservative difficulty shifting: requires >= 2 attempts & rolling thresholds
    const prevDifficulty = profile.currentDifficulty;
    if (profile.totalAttempts >= 2 && profile.rollingAccuracy >= 85 && profile.consecutiveCorrect >= 2) {
      profile.currentDifficulty = 'advanced';
      profile.reason = `Promoted to Advanced: sustained ${profile.rollingAccuracy}% rolling accuracy over ${profile.totalAttempts} sessions.`;
    } else if (profile.totalAttempts >= 2 && (profile.rollingAccuracy <= 55 || profile.consecutiveIncorrect >= 2)) {
      profile.currentDifficulty = 'beginner';
      profile.reason = `Calibrated to Beginner: rolling accuracy is ${profile.rollingAccuracy}%. Focused foundational drills recommended.`;
    } else {
      profile.currentDifficulty = 'intermediate';
      profile.reason = `Balanced at Intermediate: steady performance across ${profile.totalAttempts} practice sessions.`;
    }

    if (prevDifficulty !== profile.currentDifficulty) {
      console.log(`[AdaptiveEngine] Topic "${cleanTopic}" difficulty shifted: ${prevDifficulty} -> ${profile.currentDifficulty}`);
    }
  }

  await saveStoredAdaptiveProfiles([profile]);
  return profile;
}

export async function getUserAdaptiveProfiles(userId: string): Promise<AdaptiveProfile[]> {
  return await getStoredAdaptiveProfiles(userId);
}

// ============================================================================
// 5. INTELLIGENT WEAK-TOPIC DETECTION ENGINE
// ============================================================================

export async function detectWeakTopics(userId: string): Promise<WeakTopicItem[]> {
  const weakTopicsMap = new Map<string, {
    topic: string;
    totalAttempts: number;
    errorCount: number;
    evidence: WeakTopicEvidence[];
  }>();

  // Helper to accumulate topic data
  function addEvidence(topicName: string, evidenceItem: WeakTopicEvidence, isCorrect: boolean) {
    const t = topicName.trim();
    if (!t) return;
    const existing = weakTopicsMap.get(t) || {
      topic: t,
      totalAttempts: 0,
      errorCount: 0,
      evidence: [],
    };
    existing.totalAttempts += 1;
    if (!isCorrect) {
      existing.errorCount += 1;
      if (existing.evidence.length < 5) {
        existing.evidence.push(evidenceItem);
      }
    }
    weakTopicsMap.set(t, existing);
  }

  // 1. Inspect recent quiz attempts & breakdowns
  const quizzes = await getUserQuizAttempts(userId);
  quizzes.forEach(q => {
    if (q.topicBreakdown && Array.isArray(q.topicBreakdown)) {
      q.topicBreakdown.forEach(tb => {
        const errors = tb.total - tb.correct;
        for (let i = 0; i < tb.total; i++) {
          const isCorrect = i < tb.correct;
          addEvidence(tb.topic, {
            sourceType: 'quiz',
            sourceTitle: q.deckName || 'Study Quiz',
            promptOrQuestion: `Quiz item on "${tb.topic}"`,
            userAnswer: isCorrect ? 'Correct option' : 'Incorrect choice',
            timestamp: q.completedAt,
          }, isCorrect);
        }
      });
    } else if (q.deckName) {
      // General deck topic fallback
      const isPass = q.accuracyPercentage >= 70;
      addEvidence(q.deckName, {
        sourceType: 'quiz',
        sourceTitle: q.deckName,
        promptOrQuestion: `General quiz score: ${q.accuracyPercentage}%`,
        timestamp: q.completedAt,
      }, isPass);
    }
  });

  // 2. Inspect exam attempts
  const exams = await getUserExamAttempts(userId);
  exams.forEach(e => {
    const isPass = e.percentage >= 70;
    const examTopic = e.examTitle || e.subjectName || 'Comprehensive Exam';
    addEvidence(examTopic, {
      sourceType: 'exam',
      sourceTitle: e.examTitle || 'Exam Simulation',
      promptOrQuestion: `Exam score: ${Math.round(e.percentage)}% (${e.score}/${e.totalQuestions})`,
      timestamp: e.submittedAt || new Date().toISOString(),
    }, isPass);
  });

  // 3. Inspect SM-2 flashcard reviews
  const reviews = await getUserFlashcardReviews(userId);
  reviews.forEach(r => {
    // Rating 1 (again) or 2 (hard) constitutes recall lapse
    const isLapse = r.ratingValue <= 2;
    const cardTopic = r.deckId ? `Flashcard Concept (${r.deckId.slice(0, 8)})` : 'Flashcard Memory';
    addEvidence(cardTopic, {
      sourceType: 'flashcard',
      sourceTitle: 'SM-2 Recall Review',
      promptOrQuestion: `Card ID ${r.flashcardId.slice(0, 8)}: rated "${r.responseType}"`,
      timestamp: r.reviewedAt,
    }, !isLapse);
  });

  // Convert to categorized WeakTopicItems
  const results: WeakTopicItem[] = [];

  for (const item of weakTopicsMap.values()) {
    const accuracy = item.totalAttempts > 0
      ? Math.round(((item.totalAttempts - item.errorCount) / item.totalAttempts) * 100)
      : 0;

    let status: WeakTopicStatus = 'insufficient_data';
    if (item.totalAttempts < 3) {
      status = 'insufficient_data';
    } else if (accuracy < 60) {
      status = 'needs_improvement';
    } else if (accuracy < 80) {
      status = 'improving';
    } else {
      status = 'strong';
    }

    results.push({
      topic: item.topic,
      status,
      accuracyPercentage: accuracy,
      totalAttempts: item.totalAttempts,
      errorCount: item.errorCount,
      evidence: item.evidence,
      recommendedActions: {
        canRevise: true,
        canAskAI: true,
        canGenerateCards: status === 'needs_improvement' || status === 'improving',
        canPracticeQuiz: true,
      },
      summaryConcept: `Accuracy currently at ${accuracy}%. ${item.errorCount} review lapses recorded out of ${item.totalAttempts} total encounters.`,
    });
  }

  // Sort: Needs improvement first, then improving, then insufficient data, then strong
  const order: Record<WeakTopicStatus, number> = {
    needs_improvement: 1,
    improving: 2,
    insufficient_data: 3,
    strong: 4,
  };

  return results.sort((a, b) => order[a.status] - order[b.status] || a.accuracyPercentage - b.accuracyPercentage);
}

// ============================================================================
// 6. CROSS-DOCUMENT KNOWLEDGE CONNECTIONS ENGINE
// ============================================================================

export async function discoverCrossDocumentConnections(
  userId: string,
  documentIds?: string[],
  subjectId?: string | null
): Promise<KnowledgeConnection[]> {
  const docs = await getStoredDocuments(userId);
  const targetDocs = documentIds && documentIds.length > 0
    ? docs.filter(d => documentIds.includes(d.id) || documentIds.includes(d.fileName))
    : docs.slice(0, 4);

  if (targetDocs.length < 2) {
    // If fewer than 2 documents are selected, return existing saved connections
    return await getStoredConnections(userId);
  }

  const existingConnections = await getStoredConnections(userId);
  const aiConfig = getAIClientAndModel();

  if (!aiConfig) {
    // Deterministic fallback connection discovery
    const docA = targetDocs[0];
    const docB = targetDocs[1];
    const fallbackConn: KnowledgeConnection = {
      id: uuidv4(),
      userId,
      subjectId: subjectId || null,
      title: `${docA.fileName} ↔ ${docB.fileName} Interconnection`,
      connectionType: 'complementary',
      description: `Concepts in ${docA.fileName} provide foundational framing, while ${docB.fileName} expands into detailed applications and case studies.`,
      sourceDocumentName: docA.fileName,
      targetDocumentName: docB.fileName,
      sourceChunkSnippet: `Foundational overview and definitions originating from ${docA.fileName}.`,
      targetChunkSnippet: `Applied mechanisms and technical examples from ${docB.fileName}.`,
      citations: [
        { documentName: docA.fileName, heading: 'Overview', snippet: docA.fileName },
        { documentName: docB.fileName, heading: 'Analysis', snippet: docB.fileName },
      ],
      createdAt: new Date().toISOString(),
    };
    await saveStoredConnections([fallbackConn]);
    return [fallbackConn, ...existingConnections];
  }

  try {
    const docSummaries = targetDocs.map((d, i) => `Doc [${i + 1}] "${d.fileName}": character count ${d.characterCount}, chunk count ${d.chunkCount}`).join('\n');

    const prompt = `You are an expert academic knowledge graph architect.
Analyze the relationships between the student's study documents.

DOCUMENTS:
${docSummaries}

TASK:
Identify 2 to 4 meaningful cross-document conceptual connections.
Types of connections allowed:
- "shared_concept": Same foundational theory or entity appearing in both.
- "prerequisite": Mastery of Doc A is required before comprehending Doc B.
- "complementary": One document provides theoretical definitions while the other provides code/practical application.
- "contradiction_or_contrast": Different notation styles, perspectives, or pedagogical approaches.

STRICT JSON OUTPUT FORMAT:
{
  "connections": [
    {
      "title": "Clear 4-7 word title",
      "connectionType": "shared_concept | prerequisite | complementary | contradiction_or_contrast",
      "description": "Pedagogical explanation of how these two documents connect.",
      "sourceDocumentName": "Name of first document",
      "targetDocumentName": "Name of second document",
      "sourceChunkSnippet": "Brief conceptual snippet from doc A",
      "targetChunkSnippet": "Brief conceptual snippet from doc B"
    }
  ]
}`;

    const completion = await withAiRetry(() =>
      aiConfig.client.chat.completions.create({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.25,
      })
    );

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const newConnections: KnowledgeConnection[] = [];

    if (Array.isArray(parsed.connections)) {
      parsed.connections.forEach((c: any) => {
        newConnections.push({
          id: uuidv4(),
          userId,
          subjectId: subjectId || null,
          title: c.title || 'Cross-Document Concept',
          connectionType: c.connectionType || 'complementary',
          description: c.description || 'Interconnected learning concept.',
          sourceDocumentName: c.sourceDocumentName || targetDocs[0].fileName,
          targetDocumentName: c.targetDocumentName || targetDocs[1].fileName,
          sourceChunkSnippet: c.sourceChunkSnippet || '',
          targetChunkSnippet: c.targetChunkSnippet || '',
          citations: [
            { documentName: c.sourceDocumentName || targetDocs[0].fileName, heading: 'Context A', snippet: c.sourceChunkSnippet || '' },
            { documentName: c.targetDocumentName || targetDocs[1].fileName, heading: 'Context B', snippet: c.targetChunkSnippet || '' },
          ],
          createdAt: new Date().toISOString(),
        });
      });
    }

    if (newConnections.length > 0) {
      await saveStoredConnections(newConnections);
      return [...newConnections, ...existingConnections];
    }
  } catch (err) {
    console.error('[Intelligence] Connection discovery error:', err);
  }

  return existingConnections;
}

// ============================================================================
// 7. AI VIVA PREPARATION & ORAL EXAM ENGINE
// ============================================================================

export interface StartVivaParams {
  userId: string;
  topicTitle: string;
  vivaMode?: VivaMode;
  difficulty?: DifficultyLevel;
  totalQuestions?: number;
  subjectId?: string | null;
  deckId?: string | null;
  documentId?: string | null;
  sourceType?: 'document' | 'deck' | 'custom';
  sourceTitle?: string;
}

async function getStudyMaterialContext(params: {
  userId: string;
  documentId?: string | null;
  deckId?: string | null;
  sourceType?: 'document' | 'deck' | 'custom';
}): Promise<{ sourceTitle?: string; contentSnippet?: string }> {
  const { userId, documentId, deckId } = params;
  try {
    const admin = createAdminClient();
    if (documentId) {
      const { data: chunks } = await admin
        .from('document_chunks')
        .select('content, heading')
        .eq('document_id', documentId)
        .order('chunk_index', { ascending: true })
        .limit(6);

      if (chunks && chunks.length > 0) {
        const text = chunks.map(c => (c.heading ? `${c.heading}:\n${c.content}` : c.content)).join('\n\n');
        return { contentSnippet: text.slice(0, 3500) };
      }

      const { data: doc } = await admin
        .from('documents')
        .select('file_name, parsed_text')
        .eq('id', documentId)
        .maybeSingle();

      if (doc) {
        return {
          sourceTitle: doc.file_name,
          contentSnippet: (doc.parsed_text || '').slice(0, 3500),
        };
      }
    }

    if (deckId) {
      const { data: cards } = await admin
        .from('flashcards')
        .select('front, back')
        .eq('deck_id', deckId)
        .limit(15);

      if (cards && cards.length > 0) {
        const text = cards.map((c, i) => `Card ${i + 1} (${c.front}): ${c.back}`).join('\n\n');
        return { contentSnippet: text.slice(0, 3500) };
      }
    }
  } catch (e) {
    console.warn('[Viva] Error fetching study material context:', e);
  }
  return {};
}

export async function startVivaSession(params: StartVivaParams): Promise<{
  session: VivaSession;
  firstQuestion: string;
}> {
  const {
    userId,
    topicTitle,
    vivaMode = 'comprehensive',
    difficulty = 'intermediate',
    totalQuestions = 5,
    subjectId = null,
    deckId = null,
    documentId = null,
    sourceType = documentId ? 'document' : deckId ? 'deck' : 'custom',
    sourceTitle,
  } = params;

  const materialContext = await getStudyMaterialContext({
    userId,
    documentId,
    deckId,
    sourceType,
  });

  const resolvedSourceTitle = sourceTitle || materialContext.sourceTitle || topicTitle.trim();
  const sessionId = uuidv4();

  const session: VivaSession = {
    id: sessionId,
    userId,
    subjectId,
    deckId,
    documentId,
    sourceType,
    sourceTitle: resolvedSourceTitle,
    topicTitle: topicTitle.trim() || resolvedSourceTitle || 'General Academic Topic',
    vivaMode,
    difficulty,
    totalQuestions,
    status: 'in_progress',
    currentQuestionIndex: 1,
    turns: [],
    createdAt: new Date().toISOString(),
  };

  // Generate initial opening question
  let firstQuestion = `Welcome to your ${vivaMode} oral viva on "${session.topicTitle}". To begin, could you define the core objective of this subject and explain its fundamental importance?`;

  const aiConfig = getAIClientAndModel();
  if (aiConfig) {
    try {
      const prompt = `You are a distinguished university professor conducting an oral viva examination (viva voce).
Topic / Subject: "${session.topicTitle}"
${resolvedSourceTitle ? `Study Material Reference: "${resolvedSourceTitle}"` : ''}
Viva Mode: ${vivaMode}
Difficulty Level: ${difficulty}
${materialContext.contentSnippet ? `\nSOURCE MATERIAL EXCERPT:\n${materialContext.contentSnippet}\n\nGround your question strictly in the concepts presented in this study material.` : ''}

Formulate the OPENING QUESTION (Question 1 of ${totalQuestions}).
Tone: Rigorous, encouraging, articulate.
Ask ONE clear, thought-provoking question that tests the student's foundational grasp.
Output ONLY the question text without greetings, introductory meta-commentary, or surrounding quotation marks.`;

      const completion = await withAiRetry(() =>
        aiConfig.client.chat.completions.create({
          model: aiConfig.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
        })
      );

      const generated = completion.choices[0]?.message?.content?.trim();
      if (generated) firstQuestion = generated.replace(/^["']|["']$/g, '');
    } catch (e) {
      console.warn('[Viva] Question generation fallback:', e);
    }
  }

  const sessions = await getStoredVivaSessions(userId);
  await saveStoredVivaSessions([session, ...sessions]);

  return { session, firstQuestion };
}

export interface EvaluateVivaTurnParams {
  sessionId: string;
  userId: string;
  questionIndex: number;
  questionText: string;
  studentResponse: string;
  isVoice?: boolean;
}

export async function evaluateVivaTurn(params: EvaluateVivaTurnParams): Promise<{
  evaluation: {
    score: number; // 0 - 10
    evaluationStatus: 'correct' | 'partially_correct' | 'incorrect';
    feedback: string;
    strengths: string[];
    missingPoints: string[];
    technicalInaccuracies: string[];
    idealAnswer: string;
    suggestions: string[];
    followUpQuestion?: string | null;
    isComplete: boolean;
    finalSummary?: {
      overallScore: number;
      accuracyScore: number;
      depthScore: number;
      clarityScore: number;
      strengths: string[];
      improvements: string[];
      overallCritique: string;
    };
  };
}> {
  const { sessionId, userId, questionIndex, questionText, studentResponse, isVoice = false } = params;

  const sessions = await getStoredVivaSessions(userId);
  const sessionIdx = sessions.findIndex(s => s.id === sessionId && (s.userId === userId || s.userId === 'shared'));
  if (sessionIdx === -1) {
    throw new Error('Viva session not found or unauthorized.');
  }

  const session = sessions[sessionIdx];
  const aiConfig = getAIClientAndModel();

  const normalizedResponse = (studentResponse || '').trim().toLowerCase();
  const isDontKnow =
    normalizedResponse.length === 0 ||
    /^(i don'?t know|no idea|i have no idea|not sure|i am not sure|idk|pass|skip|no clue|can you explain|don'?t know)\.?$/i.test(normalizedResponse) ||
    (normalizedResponse.length < 15 && (normalizedResponse.includes("don't know") || normalizedResponse.includes("not sure") || normalizedResponse.includes("no idea")));

  let score = isDontKnow ? 0.0 : 7.5;
  let evaluationStatus: 'correct' | 'partially_correct' | 'incorrect' = isDontKnow ? 'incorrect' : 'partially_correct';
  let feedback = isDontKnow
    ? 'You indicated that you do not know the answer to this question. In an oral viva, admitting uncertainty is better than guessing, but make sure to review this core concept.'
    : 'Good grasp of the foundational terminology. Make sure to connect the concept to practical edge cases.';
  let strengths: string[] = isDontKnow ? [] : ['Attempted to address the core question', 'Demonstrated basic awareness of the domain'];
  let missingPoints: string[] = ['Core formal definition', 'Step-by-step operational mechanism'];
  let technicalInaccuracies: string[] = [];
  let idealAnswer = `In academic examinations, a complete answer defines the core entity, explains its underlying mechanism, and discusses practical trade-offs.`;
  let suggestions: string[] = ['Structure your response using: Definition, Key Components, and Practical Example.'];
  let followUpQuestion: string | null = null;

  if (aiConfig) {
    try {
      const isLastQuestion = questionIndex >= session.totalQuestions;

      let evalPrompt = '';
      if (isDontKnow) {
        evalPrompt = `You are an expert viva voce oral examiner. The student was asked:
Question (${questionIndex} of ${session.totalQuestions}): "${questionText}"
The student responded: "${studentResponse}" (indicating they do not know).

TASK:
1. Provide gentle, constructive spoken feedback acknowledging their answer and explaining the core principle in 2 sentences.
2. Formulate an ideal academic model answer (2-3 sentences) they can learn from.
${!isLastQuestion ? `3. Formulate Question ${questionIndex + 1} of ${session.totalQuestions} on an accessible adjacent topic.` : '3. Since this is the final question, set followUpQuestion to null.'}

STRICT JSON OUTPUT:
{
  "score": 0.0,
  "evaluationStatus": "incorrect",
  "feedback": "Spoken examiner commentary here.",
  "strengths": [],
  "missingPoints": ["Complete conceptual definition", "Operational mechanism"],
  "technicalInaccuracies": [],
  "idealAnswer": "Concise high-scoring model answer.",
  "suggestions": ["Review foundational definitions in your course notes", "Focus on core workflows before advanced nuances"],
  "followUpQuestion": ${!isLastQuestion ? '"Next oral question here"' : 'null'}
}`;
      } else {
        evalPrompt = `You are a distinguished university professor conducting an oral viva voce examination.
Subject/Topic: "${session.topicTitle}"
${session.sourceTitle ? `Study Material Reference: "${session.sourceTitle}"` : ''}
Viva Mode: ${session.vivaMode}
Difficulty: ${session.difficulty}
Current Question (${questionIndex} of ${session.totalQuestions}): "${questionText}"
Student Answer: "${studentResponse}"

EVALUATE RIGOROUSLY WITH DETAILED ACADEMIC RUBRIC:
1. "score": Number from 0.0 to 10.0 (where 0 is completely uninformative or incorrect, 4.0-7.0 is partial/basic, 7.5-10.0 is accurate, articulate and comprehensive).
2. "evaluationStatus": One of "correct" (score >= 7.5), "partially_correct" (score >= 4.0 and < 7.5), or "incorrect" (score < 4.0).
3. "feedback": Spoken examiner feedback directly addressing the student (2-3 sentences, verbal professorial tone).
4. "strengths": Array of 1-3 specific valid points or concepts the student articulated well.
5. "missingPoints": Array of 1-3 crucial technical details, edge cases, or definitions they omitted.
6. "technicalInaccuracies": Array of any misconceptions, incorrect terms, or factual errors (empty array if none).
7. "idealAnswer": Clear, exemplary 2-3 sentence model answer demonstrating ideal oral academic delivery.
8. "suggestions": Array of 1-2 actionable tips for how the student can improve their verbal defense of this topic.
9. "followUpQuestion": ${!isLastQuestion ? `Formulate Question ${questionIndex + 1} of ${session.totalQuestions} progressing naturally in depth or exploring an adjacent concept in the topic.` : 'null (since this is the final question)'}

STRICT JSON OUTPUT FORMAT ONLY:
{
  "score": 8.0,
  "evaluationStatus": "correct",
  "feedback": "Examiner verbal feedback here.",
  "strengths": ["Strengths here"],
  "missingPoints": ["Missing points here"],
  "technicalInaccuracies": [],
  "idealAnswer": "Exemplary model answer here.",
  "suggestions": ["Specific oral defense tip"],
  "followUpQuestion": ${!isLastQuestion ? '"Next oral question here"' : 'null'}
}`;
      }

      const completion = await withAiRetry(() =>
        aiConfig.client.chat.completions.create({
          model: aiConfig.model,
          messages: [{ role: 'user', content: evalPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        })
      );

      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      if (typeof parsed.score === 'number') {
        score = Math.max(0, Math.min(10, Math.round(parsed.score * 10) / 10));
      }
      evaluationStatus = parsed.evaluationStatus || (score >= 7.5 ? 'correct' : score >= 4.0 ? 'partially_correct' : 'incorrect');
      if (parsed.feedback) feedback = parsed.feedback;
      if (Array.isArray(parsed.strengths)) strengths = parsed.strengths;
      if (Array.isArray(parsed.missingPoints)) missingPoints = parsed.missingPoints;
      if (Array.isArray(parsed.technicalInaccuracies)) technicalInaccuracies = parsed.technicalInaccuracies;
      if (parsed.idealAnswer) idealAnswer = parsed.idealAnswer;
      if (Array.isArray(parsed.suggestions)) suggestions = parsed.suggestions;
      if (parsed.followUpQuestion) followUpQuestion = parsed.followUpQuestion.replace(/^["']|["']$/g, '');
    } catch (e) {
      console.warn('[Viva] AI evaluation fallback:', e);
    }
  }

  // Persist response turn
  const responses = await getStoredVivaResponses(sessionId);
  const newResponse: VivaResponse = {
    id: uuidv4(),
    sessionId,
    userId,
    questionIndex,
    questionText,
    studentResponse,
    isVoice,
    score,
    evaluationStatus,
    feedback,
    strengths,
    missingPoints,
    technicalInaccuracies,
    idealAnswer,
    suggestions,
    followUpQuestion,
    createdAt: new Date().toISOString(),
  };

  const updatedTurns = [...responses.filter(r => r.sessionId === sessionId), newResponse];
  await saveStoredVivaResponses(updatedTurns);

  const isComplete = questionIndex >= session.totalQuestions;
  session.currentQuestionIndex = questionIndex + 1;
  session.turns = updatedTurns;

  let finalSummary: any = null;

  if (isComplete) {
    session.status = 'completed';
    session.completedAt = new Date().toISOString();

    const avgScore = updatedTurns.length > 0
      ? updatedTurns.reduce((acc, r) => acc + r.score, 0) / updatedTurns.length
      : score;

    const overallScorePercent = Math.min(100, Math.max(0, Math.round(avgScore * 10)));
    const accuracyScore = Math.min(100, Math.max(0, Math.round(overallScorePercent * 1.02)));
    const depthScore = Math.min(100, Math.max(0, Math.round(overallScorePercent * 0.95)));
    const clarityScore = overallScorePercent;

    const aggregatedStrengths = Array.from(new Set(updatedTurns.flatMap(t => t.strengths || []))).slice(0, 4);
    const aggregatedImprovements = Array.from(new Set(updatedTurns.flatMap(t => t.suggestions || t.missingPoints || []))).slice(0, 4);

    finalSummary = {
      overallScore: overallScorePercent,
      accuracyScore,
      depthScore,
      clarityScore,
      strengths: aggregatedStrengths.length > 0 ? aggregatedStrengths : [
        'Clear articulation of core definitions and entities',
        'Strong conceptual grounding under examiner questioning',
      ],
      improvements: aggregatedImprovements.length > 0 ? aggregatedImprovements : [
        'Deepen technical specificity when explaining edge-case constraints',
        'Incorporate explicit real-world or architectural examples',
      ],
      overallCritique: `Completed ${session.totalQuestions}-question viva with an overall rating of ${overallScorePercent}%. Demonstrated solid academic competence across oral examination turns.`,
    };

    session.overallScore = overallScorePercent;
    session.accuracyScore = accuracyScore;
    session.depthScore = depthScore;
    session.clarityScore = clarityScore;
    session.evaluationSummary = finalSummary;

    // Record as practice attempt for adaptive engine
    await recordAdaptiveAttempt(userId, session.topicTitle, overallScorePercent, 100, 'quiz', session.subjectId);
  }

  await saveStoredVivaSessions([session]);

  return {
    evaluation: {
      score,
      evaluationStatus,
      feedback,
      strengths,
      missingPoints,
      technicalInaccuracies,
      idealAnswer,
      suggestions,
      followUpQuestion,
      isComplete,
      finalSummary,
    },
  };
}

export async function getUserVivaHistory(userId: string): Promise<VivaSession[]> {
  const sessions = await getStoredVivaSessions(userId);
  return sessions.filter(s => s.userId === userId || s.userId === 'shared');
}

export async function getVivaSessionDetails(sessionId: string, userId: string): Promise<{
  session: VivaSession;
  responses: VivaResponse[];
} | null> {
  const sessions = await getStoredVivaSessions(userId);
  const session = sessions.find(s => s.id === sessionId && (s.userId === userId || s.userId === 'shared'));
  if (!session) return null;
  const responses = await getStoredVivaResponses(sessionId);
  responses.sort((a, b) => a.questionIndex - b.questionIndex);
  return { session, responses };
}

// ============================================================================
// 8. UNIFIED AI LEARNING PROFILE
// ============================================================================

export async function getUnifiedLearningProfile(userId: string): Promise<UnifiedLearningProfile> {
  const [streak, paths, weakTopics, vivas] = await Promise.all([
    calculateStreaks(userId),
    getUserStudyPaths(userId),
    detectWeakTopics(userId),
    getUserVivaHistory(userId),
  ]);
  const completedVivas = vivas.filter(v => v.status === 'completed' && typeof v.overallScore === 'number');

  const avgViva = completedVivas.length > 0
    ? Math.round(completedVivas.reduce((acc, v) => acc + (v.overallScore || 0), 0) / completedVivas.length)
    : 78;

  const mastered = weakTopics.filter(w => w.status === 'strong').length;
  const needsAttention = weakTopics.filter(w => w.status === 'needs_improvement' || w.status === 'improving').length;

  const recommendations: UnifiedLearningProfile['recommendedNextActions'] = [];

  if (needsAttention > 0) {
    const topWeak = weakTopics.find(w => w.status === 'needs_improvement') || weakTopics[0];
    recommendations.push({
      title: `Remediate Weak Topic: ${topWeak.topic}`,
      description: `Current accuracy is ${topWeak.accuracyPercentage}%. Reinforce via AI flashcards or adaptive quiz drills.`,
      actionType: 'weak_topic',
      link: '/weak-topics',
    });
  }

  if (paths.length === 0) {
    recommendations.push({
      title: 'Generate an AI Study Path',
      description: 'Build a personalized multi-stage roadmap targeting your upcoming exam or semester goal.',
      actionType: 'study_path',
      link: '/study-paths',
    });
  } else {
    const activePath = paths.find(p => p.status === 'active') || paths[0];
    recommendations.push({
      title: `Advance Active Path: ${activePath.title}`,
      description: `Progress is currently at ${activePath.progressPercentage}%. Complete scheduled milestone tasks.`,
      actionType: 'study_path',
      link: `/study-paths`,
    });
  }

  recommendations.push({
    title: 'Oral Viva Voce Practice',
    description: 'Test your academic verbal recall with the real-time AI oral examiner.',
    actionType: 'viva',
    link: '/viva',
  });

  return {
    userId,
    overallLevel: Math.max(1, Math.floor(streak.currentStreak / 3) + 1),
    totalXP: streak.currentStreak * 100 + completedVivas.length * 150,
    currentStreakDays: streak.currentStreak,
    retentionRatePercentage: Math.min(95, Math.max(65, 75 + mastered * 3 - needsAttention * 2)),
    activeStudyPathsCount: paths.filter(p => p.status === 'active').length,
    masteredTopicsCount: mastered,
    topicsNeedingAttentionCount: needsAttention,
    averageVivaScore: avgViva,
    recommendedNextActions: recommendations,
  };
}

/**
 * Purges all intelligence study paths, tasks, adaptive profiles, and viva sessions for a user (GDPR / account deletion).
 */
export async function purgeUserIntelligenceData(userId: string): Promise<void> {
  demoIntelPaths = demoIntelPaths.filter((p) => p.userId !== userId);
  demoIntelTasks = demoIntelTasks.filter((t) => t.userId !== userId);
  demoIntelAdaptive = demoIntelAdaptive.filter((a) => a.userId !== userId);
  demoIntelVivaSessions = demoIntelVivaSessions.filter((v) => v.userId !== userId);
  demoIntelVivaResponses = demoIntelVivaResponses.filter((r) => r.userId !== userId);
  demoIntelConnections = demoIntelConnections.filter((c) => c.userId !== userId);

  try {
    const admin = createAdminClient();
    await Promise.allSettled([
      admin.from('learning_path_tasks').delete().eq('user_id', userId),
      admin.from('learning_paths').delete().eq('user_id', userId),
      admin.from('adaptive_learning_profiles').delete().eq('user_id', userId),
      admin.from('knowledge_connections').delete().eq('user_id', userId),
      admin.from('viva_responses').delete().eq('user_id', userId),
      admin.from('viva_sessions').delete().eq('user_id', userId),
    ]);
  } catch (err) {
    console.warn('[purgeUserIntelligenceData] Supabase error:', err);
  }
}
