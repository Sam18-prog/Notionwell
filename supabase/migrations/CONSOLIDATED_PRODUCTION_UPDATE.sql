-- ==============================================================================
-- NOTIONWELL: CONSOLIDATED PRODUCTION DATABASE UPDATE
-- File: supabase/migrations/CONSOLIDATED_PRODUCTION_UPDATE.sql
-- 
-- Safe, idempotent script to bring the remote Supabase database up to date.
-- Run this once in the Supabase Dashboard -> SQL Editor -> New Query -> Run.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. SCHEMA ROLE PERMISSIONS (Fixes 'permission denied for table profiles')
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 3. EXPAND EXISTING TABLES (quiz_attempts & flashcard_reviews)
ALTER TABLE IF EXISTS public.quiz_attempts
    ADD COLUMN IF NOT EXISTS deck_id UUID REFERENCES public.study_decks(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deck_name TEXT,
    ADD COLUMN IF NOT EXISTS topic_breakdown JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
    ALTER TABLE public.quiz_attempts ALTER COLUMN quiz_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE IF EXISTS public.flashcard_reviews
    ADD COLUMN IF NOT EXISTS response_type TEXT NOT NULL DEFAULT 'good',
    ADD COLUMN IF NOT EXISTS easiness_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
    ADD COLUMN IF NOT EXISTS review_duration_ms INT NOT NULL DEFAULT 0;

-- 4. GAMIFICATION & ANALYTICS TABLES
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    source TEXT NOT NULL,
    description TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_xp_user_activity UNIQUE (user_id, activity_id)
);

CREATE TABLE IF NOT EXISTS public.learning_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    daily_study_minutes INT NOT NULL DEFAULT 20,
    daily_cards_reviewed INT NOT NULL DEFAULT 15,
    daily_questions_practiced INT NOT NULL DEFAULT 5,
    weekly_study_hours NUMERIC(4,1) NOT NULL DEFAULT 2.5,
    weekly_decks_completed INT NOT NULL DEFAULT 2,
    weekly_quizzes_attempted INT NOT NULL DEFAULT 3,
    weekly_exams_completed INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_learning_goals_user UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.streak_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    active_date DATE NOT NULL,
    activity_type TEXT NOT NULL DEFAULT 'study',
    duration_seconds INT NOT NULL DEFAULT 0,
    cards_reviewed INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_streak_user_date UNIQUE (user_id, active_date)
);

-- 5. AI EXAM SIMULATION TABLES
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    deck_id UUID REFERENCES public.study_decks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    mode TEXT NOT NULL DEFAULT 'timed',
    difficulty TEXT NOT NULL DEFAULT 'mixed',
    time_limit_minutes INT NOT NULL DEFAULT 15,
    total_questions INT NOT NULL DEFAULT 10,
    negative_marking BOOLEAN NOT NULL DEFAULT FALSE,
    negative_mark_value NUMERIC(3,2) NOT NULL DEFAULT 0.25,
    questions JSONB DEFAULT '[]'::jsonb,
    selected_topics JSONB DEFAULT '[]'::jsonb,
    question_types JSONB DEFAULT '["mcq"]'::jsonb,
    subject_name TEXT,
    deck_name TEXT,
    selected_source_ids JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    question_index INT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'mcq',
    question TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT NOT NULL,
    expected_concepts JSONB,
    explanation TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT 'General',
    difficulty TEXT NOT NULL DEFAULT 'medium',
    source_quote TEXT,
    source_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'timed',
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    submitted_at TIMESTAMPTZ,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_progress',
    total_questions INT NOT NULL DEFAULT 0,
    score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    max_possible_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    accuracy_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    correct_count INT NOT NULL DEFAULT 0,
    incorrect_count INT NOT NULL DEFAULT 0,
    unanswered_count INT NOT NULL DEFAULT 0,
    answers JSONB DEFAULT '{}'::jsonb,
    exam_title TEXT,
    exam_mode TEXT DEFAULT 'timed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.exam_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.exam_questions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    points_awarded NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    ai_evaluation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. PHASE 7 INTELLIGENCE TABLES
CREATE TABLE IF NOT EXISTS public.viva_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    deck_id UUID REFERENCES public.study_decks(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Viva Voce Examination',
    topic_title TEXT,
    target_topics JSONB DEFAULT '[]'::jsonb,
    current_question_index INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    turns JSONB DEFAULT '[]'::jsonb,
    final_score NUMERIC(5,2) DEFAULT 0.00,
    feedback TEXT,
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    target_date DATE NOT NULL,
    daily_minutes INT NOT NULL DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'active',
    current_level TEXT NOT NULL DEFAULT 'intermediate',
    stages_count INT NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.learning_path_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage_order INT NOT NULL DEFAULT 1,
    stage_title TEXT NOT NULL,
    task_order INT NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    task_type TEXT NOT NULL,
    estimated_minutes INT NOT NULL DEFAULT 20,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ NULL,
    due_date DATE NULL,
    prerequisite_task_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.adaptive_learning_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    current_difficulty TEXT NOT NULL DEFAULT 'intermediate',
    rolling_accuracy NUMERIC(5,2) NOT NULL DEFAULT 70.00,
    total_attempts INT NOT NULL DEFAULT 0,
    consecutive_correct INT NOT NULL DEFAULT 0,
    consecutive_incorrect INT NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT 'Initial diagnostic baseline established.',
    last_assessed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_adaptive_user_topic UNIQUE (user_id, topic)
);

CREATE TABLE IF NOT EXISTS public.cross_document_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    target_document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    source_concept TEXT NOT NULL,
    target_concept TEXT NOT NULL,
    relationship_type TEXT NOT NULL DEFAULT 'conceptually_related',
    similarity_score NUMERIC(4,3) NOT NULL DEFAULT 0.750,
    shared_keywords JSONB DEFAULT '[]'::jsonb,
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    concept TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    evidence TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. OFFICIAL 16 ACHIEVEMENTS SEED
INSERT INTO public.achievements (id, title, description, icon, required_threshold, category, xp_reward)
VALUES
    ('first_deck', 'Pioneer Scholar', 'Created your very first study deck', '🌱', 1, 'milestones', 50),
    ('quiz_whiz', 'Quiz Virtuoso', 'Scored a perfect 100% on any practice quiz', '🎯', 1, 'mastery', 100),
    ('streak_3', 'Habit Builder', 'Studied for 3 consecutive days in a row', '🔥', 3, 'streaks', 75),
    ('streak_7', 'Unstoppable Momentum', 'Maintained a flawless 7-day study streak', '⚡', 7, 'streaks', 150),
    ('streak_30', 'Iron Discipline', 'Achieved an extraordinary 30-day active study streak', '👑', 30, 'streaks', 500),
    ('time_1h', 'Deep Diver', 'Invested 1 hour of active study focus', '⏱️', 3600, 'time', 75),
    ('time_5h', 'Marathon Scholar', 'Dedicated 5 hours of total learning time', '🏆', 18000, 'time', 200),
    ('cards_50', 'Flash Focus', 'Reviewed 50 flashcards across all decks', '🃏', 50, 'cards', 75),
    ('cards_200', 'Memory Master', 'Reviewed 200 flashcards using spaced repetition', '🧠', 200, 'cards', 200),
    ('exam_rookie', 'Trial by Fire', 'Completed your first full AI simulated exam', '📝', 1, 'exams', 100),
    ('exam_distinction', 'Academic Distinction', 'Scored 90%+ with Distinction on a simulated exam', '🎖️', 1, 'exams', 250),
    ('polymath', 'Renaissance Learner', 'Studied across 3 or more distinct subject domains', '🌐', 3, 'mastery', 150),
    ('retention_centurion', 'Centurion of Retention', 'Mastered 100 flashcards with long-term SM-2 retention', '💎', 100, 'milestones', 250),
    ('weakness_slayer', 'Weakness Slayer', 'Remediated 5 detected weak topics to full accuracy', '⚔️', 5, 'mastery', 150),
    ('viva_scholar', 'Articulate Scholar', 'Completed an AI Viva Voce oral examination session', '🎙️', 1, 'mastery', 150),
    ('knowledge_architect', 'Knowledge Architect', 'Discovered cross-document knowledge connections', '🗺️', 1, 'mastery', 150)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    required_threshold = EXCLUDED.required_threshold,
    category = EXCLUDED.category,
    xp_reward = EXCLUDED.xp_reward;

-- 8. VECTOR RETRIEVAL (RAG) STORED PROCEDURE
CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.50,
    match_count INT DEFAULT 5,
    p_user_id UUID DEFAULT NULL,
    p_document_ids UUID[] DEFAULT NULL,
    p_deck_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    chunk_index INT,
    heading TEXT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.chunk_index,
        dc.heading,
        dc.content,
        (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.document_chunks dc
    WHERE dc.embedding IS NOT NULL
      AND (p_user_id IS NULL OR dc.user_id = p_user_id)
      AND (p_deck_id IS NULL OR dc.deck_id = p_deck_id)
      AND (p_document_ids IS NULL OR dc.document_id = ANY(p_document_ids))
      AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY dc.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_document_chunks TO anon, authenticated, service_role;

-- 9. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_document_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- xp_transactions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'xp_transactions' AND policyname = 'xp_user_select') THEN
        CREATE POLICY xp_user_select ON public.xp_transactions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'xp_transactions' AND policyname = 'xp_user_insert') THEN
        CREATE POLICY xp_user_insert ON public.xp_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- learning_goals
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learning_goals' AND policyname = 'goals_user_select') THEN
        CREATE POLICY goals_user_select ON public.learning_goals FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learning_goals' AND policyname = 'goals_user_upsert') THEN
        CREATE POLICY goals_user_upsert ON public.learning_goals FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- streak_history
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'streak_history' AND policyname = 'streak_user_all') THEN
        CREATE POLICY streak_user_all ON public.streak_history FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- exams & attempts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exams' AND policyname = 'exams_user_all') THEN
        CREATE POLICY exams_user_all ON public.exams FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exam_attempts' AND policyname = 'exam_attempts_user_all') THEN
        CREATE POLICY exam_attempts_user_all ON public.exam_attempts FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'viva_sessions' AND policyname = 'viva_user_all') THEN
        CREATE POLICY viva_user_all ON public.viva_sessions FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learning_paths' AND policyname = 'learning_paths_user_all') THEN
        CREATE POLICY learning_paths_user_all ON public.learning_paths FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'adaptive_learning_profiles' AND policyname = 'adaptive_user_all') THEN
        CREATE POLICY adaptive_user_all ON public.adaptive_learning_profiles FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 10. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_exams_user_created ON public.exams(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_created ON public.exam_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_user_created ON public.xp_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.learning_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_user_date ON public.streak_history(user_id, active_date DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_user_completed ON public.quiz_attempts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_time ON public.flashcard_reviews(user_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_lookup ON public.user_achievements(user_id, achievement_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON public.document_chunks(user_id);

-- FINAL GRANT CONFIRMATION
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
