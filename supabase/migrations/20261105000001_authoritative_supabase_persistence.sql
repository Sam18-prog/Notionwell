-- ============================================================================
-- NOTIONWELL: AUTHORITATIVE SUPABASE PERSISTENCE & CLOUD MIGRATION
-- Migration: 20261105000001_authoritative_supabase_persistence.sql
-- ============================================================================

-- 1. EXPAND PUBLIC.EXAMS & PUBLIC.EXAM_ATTEMPTS WITH STRUCTURED JSON PAYLOADS
-- Allows resilient atomic persistence of complete exam configurations and attempts
ALTER TABLE public.exams
    ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS selected_topics JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS question_types JSONB DEFAULT '["mcq"]'::jsonb,
    ADD COLUMN IF NOT EXISTS subject_name TEXT,
    ADD COLUMN IF NOT EXISTS deck_name TEXT;

ALTER TABLE public.exam_attempts
    ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS exam_title TEXT,
    ADD COLUMN IF NOT EXISTS exam_mode TEXT DEFAULT 'timed';

-- 2. MAKE QUIZ_ID NULLABLE IN QUIZ_ATTEMPTS FOR DYNAMIC & STANDALONE QUIZZES
DO $$
BEGIN
    ALTER TABLE public.quiz_attempts ALTER COLUMN quiz_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.exam_answers ALTER COLUMN question_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. ENSURE ALL 16 OFFICIAL ACHIEVEMENT BADGES ARE REGISTERED IN ACHIEVEMENTS CATALOG
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

-- 4. ENSURE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_exams_user_created ON public.exams(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_created ON public.exam_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_user_created ON public.xp_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.learning_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_user_date ON public.streak_history(user_id, active_date DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_user_completed ON public.quiz_attempts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_time ON public.flashcard_reviews(user_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_lookup ON public.user_achievements(user_id, achievement_id);

-- 5. GRANTS FOR APPLICATION ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
