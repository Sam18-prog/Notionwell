-- ============================================================================
-- NOTIONWELL PHASE 7: ADVANCED AI LEARNING INTELLIGENCE SCHEMA
-- Migration: 20261104000003_phase7_learning_intelligence.sql
-- ============================================================================

-- 1. LEARNING PATHS TABLE (Personalized Multi-Stage AI Study Roadmaps)
CREATE TABLE IF NOT EXISTS public.learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    target_date DATE NOT NULL,
    daily_minutes INT NOT NULL DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    current_level TEXT NOT NULL DEFAULT 'intermediate' CHECK (current_level IN ('beginner', 'intermediate', 'advanced')),
    stages_count INT NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON public.learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_status ON public.learning_paths(status);

-- 2. LEARNING PATH TASKS TABLE (Ordered Milestones & Activities)
CREATE TABLE IF NOT EXISTS public.learning_path_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage_order INT NOT NULL DEFAULT 1,
    stage_title TEXT NOT NULL,
    task_order INT NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('reading', 'flashcards', 'quiz', 'exam', 'revision')),
    estimated_minutes INT NOT NULL DEFAULT 20,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ NULL,
    due_date DATE NULL,
    prerequisite_task_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_learning_path_tasks_path ON public.learning_path_tasks(path_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_tasks_user ON public.learning_path_tasks(user_id);

-- 3. ADAPTIVE LEARNING PROFILES (Dynamically Tuned Topic Difficulty Engine)
CREATE TABLE IF NOT EXISTS public.adaptive_learning_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    current_difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (current_difficulty IN ('beginner', 'intermediate', 'advanced')),
    rolling_accuracy NUMERIC(5,2) NOT NULL DEFAULT 70.00,
    total_attempts INT NOT NULL DEFAULT 0,
    consecutive_correct INT NOT NULL DEFAULT 0,
    consecutive_incorrect INT NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT 'Initial diagnostic baseline established.',
    last_assessed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_adaptive_user_topic UNIQUE (user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_adaptive_profiles_user ON public.adaptive_learning_profiles(user_id);

-- 4. KNOWLEDGE CONNECTIONS TABLE (Cross-Document Interconnected Concepts)
CREATE TABLE IF NOT EXISTS public.knowledge_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    connection_type TEXT NOT NULL CHECK (connection_type IN ('shared_concept', 'prerequisite', 'complementary', 'contradiction_or_contrast')),
    description TEXT NOT NULL,
    source_document_name TEXT NOT NULL,
    target_document_name TEXT NOT NULL,
    source_chunk_snippet TEXT,
    target_chunk_snippet TEXT,
    citations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_knowledge_connections_user ON public.knowledge_connections(user_id);

-- 5. VIVA SESSIONS TABLE (AI Oral Exam Sessions & Reports)
CREATE TABLE IF NOT EXISTS public.viva_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    deck_id UUID REFERENCES public.decks(id) ON DELETE SET NULL,
    document_id TEXT NULL,
    title TEXT NOT NULL,
    viva_mode TEXT NOT NULL DEFAULT 'comprehensive' CHECK (viva_mode IN ('definitions', 'conceptual', 'practical', 'technical', 'comprehensive')),
    difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    total_questions INT NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    overall_score NUMERIC(5,2) NULL,
    accuracy_score NUMERIC(5,2) NULL,
    depth_score NUMERIC(5,2) NULL,
    clarity_score NUMERIC(5,2) NULL,
    evaluation_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_viva_sessions_user ON public.viva_sessions(user_id);

-- 6. VIVA RESPONSES TABLE (Turn-by-turn Oral Q&A and Evaluator Feedback)
CREATE TABLE IF NOT EXISTS public.viva_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.viva_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_index INT NOT NULL,
    question_text TEXT NOT NULL,
    student_response TEXT NOT NULL,
    is_voice BOOLEAN NOT NULL DEFAULT FALSE,
    score NUMERIC(4,2) NOT NULL,
    feedback TEXT NOT NULL,
    follow_up_question TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_viva_responses_session ON public.viva_responses(session_id);

-- 7. ENABLE ROW-LEVEL SECURITY (RLS) FOR ALL NEW TABLES
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_responses ENABLE ROW LEVEL SECURITY;

-- 8. STRICT MULTI-TENANT ISOLATION POLICIES (Users manage only their own data)
CREATE POLICY "Users can manage their own learning paths"
    ON public.learning_paths FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own learning path tasks"
    ON public.learning_path_tasks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own adaptive profiles"
    ON public.adaptive_learning_profiles FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own knowledge connections"
    ON public.knowledge_connections FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own viva sessions"
    ON public.viva_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own viva responses"
    ON public.viva_responses FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 9. SERVICE ROLE BYPASS FOR BACKGROUND ANALYTICS & AI ENGINE
CREATE POLICY "Service role can manage all learning paths"
    ON public.learning_paths FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all learning path tasks"
    ON public.learning_path_tasks FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all adaptive profiles"
    ON public.adaptive_learning_profiles FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all knowledge connections"
    ON public.knowledge_connections FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all viva sessions"
    ON public.viva_sessions FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all viva responses"
    ON public.viva_responses FOR ALL
    USING (auth.role() = 'service_role');
