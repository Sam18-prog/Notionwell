-- ============================================================================
-- NOTIONWELL PHASE 8: PRODUCTION HARDENING, INDEXES & DATA RELIABILITY
-- Migration: 20261105000000_production_hardening_and_indexes.sql
-- ============================================================================

-- 1. HIGH-PERFORMANCE QUERY INDEXES (Eliminates full-table sequential scans)
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_deck_id ON public.documents(deck_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON public.document_chunks(user_id);

CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_deck_id ON public.exams(deck_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON public.exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_created_at ON public.exam_attempts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_chat_sessions_user_id ON public.study_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_chat_messages_session_id ON public.study_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_study_chat_messages_user_id ON public.study_chat_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON public.flashcards(next_review_date);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user_card ON public.flashcard_reviews(user_id, flashcard_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_at ON public.quiz_attempts(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON public.user_achievements(user_id, is_unlocked);

-- 2. SECURE DELETION & INTEGRITY CONSTRAINTS
-- Ensure cascade deletion from public.profiles propagates to all user data
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_profile_cascade'
    ) THEN
        ALTER TABLE public.documents
        DROP CONSTRAINT IF EXISTS documents_user_id_fkey,
        ADD CONSTRAINT fk_documents_profile_cascade
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
