-- ============================================================================
-- NOTIONWELL PHASE 6: GAMIFICATION, ADVANCED ANALYTICS & INTELLIGENT SM-2 SCHEMA
-- Migration: 20261104000002_gamification_analytics_system.sql
-- ============================================================================

-- 1. XP TRANSACTIONS TABLE (Server-verified gamification and level progression)
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('flashcard_review', 'quiz_completed', 'exam_completed', 'daily_goal', 'streak_milestone', 'topic_mastered', 'achievement_unlocked')),
    description TEXT NOT NULL,
    activity_id TEXT NOT NULL, -- Idempotency key preventing duplicate rewards
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_xp_user_activity UNIQUE (user_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON public.xp_transactions(created_at);

-- 2. LEARNING GOALS TABLE (Configurable daily and weekly study targets)
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

CREATE INDEX IF NOT EXISTS idx_learning_goals_user_id ON public.learning_goals(user_id);

-- 3. STREAK HISTORY TABLE (Auditable record of active study days)
CREATE TABLE IF NOT EXISTS public.streak_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    active_date DATE NOT NULL,
    activity_type TEXT NOT NULL, -- e.g. 'flashcards', 'quiz', 'exam', 'timer'
    duration_seconds INT NOT NULL DEFAULT 0,
    cards_reviewed INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_streak_user_date UNIQUE (user_id, active_date)
);

CREATE INDEX IF NOT EXISTS idx_streak_history_user_date ON public.streak_history(user_id, active_date);

-- 4. EXPAND FLASHCARD REVIEWS IF NOT PRESENT
CREATE TABLE IF NOT EXISTS public.flashcard_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 0 AND rating <= 5),
    response_type TEXT NOT NULL DEFAULT 'good' CHECK (response_type IN ('again', 'hard', 'good', 'easy')),
    scheduled_days INT NOT NULL DEFAULT 1,
    easiness_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
    review_duration_ms INT NOT NULL DEFAULT 0,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user_id ON public.flashcard_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_reviewed_at ON public.flashcard_reviews(reviewed_at);

-- 5. EXPAND QUIZ ATTEMPTS TABLE (Detailed record for analytics)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    deck_id UUID REFERENCES public.study_decks(id) ON DELETE SET NULL,
    deck_name TEXT,
    score INT NOT NULL DEFAULT 0,
    total_items INT NOT NULL DEFAULT 0,
    accuracy_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    duration_seconds INT NOT NULL DEFAULT 0,
    topic_breakdown JSONB DEFAULT '[]'::jsonb,
    answers JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_at ON public.quiz_attempts(completed_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- xp_transactions policies
CREATE POLICY "Users can view own xp transactions"
    ON public.xp_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage xp transactions"
    ON public.xp_transactions FOR ALL
    USING (true)
    WITH CHECK (true);

-- learning_goals policies
CREATE POLICY "Users can view own learning goals"
    ON public.learning_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning goals"
    ON public.learning_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning goals"
    ON public.learning_goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage learning goals"
    ON public.learning_goals FOR ALL
    USING (true)
    WITH CHECK (true);

-- streak_history policies
CREATE POLICY "Users can view own streak history"
    ON public.streak_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak history"
    ON public.streak_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage streak history"
    ON public.streak_history FOR ALL
    USING (true)
    WITH CHECK (true);

-- flashcard_reviews policies
CREATE POLICY "Users can view own flashcard reviews"
    ON public.flashcard_reviews FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flashcard reviews"
    ON public.flashcard_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage flashcard reviews"
    ON public.flashcard_reviews FOR ALL
    USING (true)
    WITH CHECK (true);

-- quiz_attempts policies
CREATE POLICY "Users can view own quiz attempts"
    ON public.quiz_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts"
    ON public.quiz_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage quiz attempts"
    ON public.quiz_attempts FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON public.xp_transactions TO anon, authenticated, service_role;
GRANT ALL ON public.learning_goals TO anon, authenticated, service_role;
GRANT ALL ON public.streak_history TO anon, authenticated, service_role;
GRANT ALL ON public.flashcard_reviews TO anon, authenticated, service_role;
GRANT ALL ON public.quiz_attempts TO anon, authenticated, service_role;
