-- ==============================================================================
-- NOTIONWELL 2.0 — INTELLIGENT AI EXAM SIMULATION SYSTEM SCHEMA
-- Migration: 20261104000001_exam_simulation_system.sql
-- ==============================================================================

-- 1. EXAMS
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    deck_id UUID REFERENCES public.study_decks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    mode TEXT NOT NULL DEFAULT 'timed' CHECK (mode IN ('practice', 'timed', 'topic', 'mock')),
    difficulty TEXT NOT NULL DEFAULT 'mixed' CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
    time_limit_minutes INT NOT NULL DEFAULT 15,
    total_questions INT NOT NULL DEFAULT 10,
    negative_marking BOOLEAN NOT NULL DEFAULT FALSE,
    negative_mark_value NUMERIC(3,2) NOT NULL DEFAULT 0.25,
    selected_source_ids JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. EXAM_QUESTIONS
CREATE TABLE IF NOT EXISTS public.exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    question_index INT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true_false', 'short_answer')),
    question TEXT NOT NULL,
    options JSONB, -- Array of strings for MCQ / True-False
    correct_answer TEXT NOT NULL,
    expected_concepts JSONB, -- Key concept rubrics for short answer scoring
    explanation TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT 'General',
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    source_quote TEXT,
    source_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. EXAM_ATTEMPTS
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'timed' CHECK (mode IN ('practice', 'timed', 'topic', 'mock')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    submitted_at TIMESTAMPTZ,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'expired')),
    total_questions INT NOT NULL DEFAULT 0,
    score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    max_possible_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    accuracy_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    correct_count INT NOT NULL DEFAULT 0,
    incorrect_count INT NOT NULL DEFAULT 0,
    unanswered_count INT NOT NULL DEFAULT 0,
    topic_breakdown JSONB, -- Array of { topic, total, correct, percentage }
    ai_feedback JSONB, -- { summary, strengths, weakTopics, recommendations }
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. EXAM_ANSWERS
CREATE TABLE IF NOT EXISTS public.exam_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN,
    marks_awarded NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    is_marked_for_review BOOLEAN NOT NULL DEFAULT FALSE,
    ai_evaluation_notes TEXT,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. INDEXES FOR FAST RETRIEVAL
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON public.exams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON public.exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON public.exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_id ON public.exam_answers(attempt_id);

-- 6. ENABLE ROW-LEVEL SECURITY (RLS)
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR USER ISOLATION
DO $$
DECLARE
    tbl text;
    exam_tables text[] := ARRAY['exams', 'exam_attempts', 'exam_answers'];
BEGIN
    FOREACH tbl IN ARRAY exam_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%I_user_isolation" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "%I_user_isolation" ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);', tbl, tbl);
    END LOOP;
END $$;

-- Policy for exam_questions: users can access questions of exams they own
DROP POLICY IF EXISTS "exam_questions_user_isolation" ON public.exam_questions;
CREATE POLICY "exam_questions_user_isolation" ON public.exam_questions
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_questions.exam_id AND exams.user_id = auth.uid())
);

-- 8. GRANT PRIVILEGES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
