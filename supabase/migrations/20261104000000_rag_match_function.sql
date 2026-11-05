-- ==============================================================================
-- NOTIONWELL 2.0 — VECTOR RETRIEVAL (RAG) STORE PROCEDURE
-- Migration: 20261104000000_rag_match_function.sql
-- ==============================================================================

-- 1. Create HNSW index for fast vector similarity search on document_chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
ON public.document_chunks
USING hnsw (embedding vector_cosine_ops);

-- 2. Stored function for cosine similarity matching
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

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.match_document_chunks TO anon, authenticated, service_role;
