-- ============================================================
-- StayAssist AI — RAG Knowledge Base v2 Migration
-- Production Module: Document Intelligence
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Add metadata columns to property_knowledge
ALTER TABLE public.property_knowledge
  ADD COLUMN IF NOT EXISTS doc_type     TEXT    NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS language     TEXT    NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS room_scope   TEXT    NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS is_staff_only BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add helpful index for staff-only and room filtering
CREATE INDEX IF NOT EXISTS idx_property_knowledge_room_scope
  ON public.property_knowledge (property_id, room_scope);

CREATE INDEX IF NOT EXISTS idx_property_knowledge_staff
  ON public.property_knowledge (property_id, is_staff_only);

-- 3. Upgrade the RPC function to support:
--    - Guest filtering (is_staff_only = FALSE when p_is_guest = TRUE)
--    - Room scope filtering (match 'all' or specific room)
--    - Returns doc_type and language for UI source citations
CREATE OR REPLACE FUNCTION match_property_knowledge(
    p_property_id   UUID,
    query_embedding vector(1536),
    match_threshold FLOAT   DEFAULT 0.3,
    match_count     INT     DEFAULT 5,
    p_is_guest      BOOLEAN DEFAULT TRUE,
    p_room_scope    TEXT    DEFAULT 'all'
)
RETURNS TABLE (
    id            UUID,
    topic         TEXT,
    content       TEXT,
    source_file   TEXT,
    doc_type      TEXT,
    language      TEXT,
    similarity    FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        pk.id,
        pk.topic,
        pk.content,
        pk.source_file,
        pk.doc_type,
        pk.language,
        1 - (pk.embedding <=> query_embedding) AS similarity
    FROM public.property_knowledge pk
    WHERE
        pk.property_id = p_property_id
        AND pk.embedding IS NOT NULL
        AND 1 - (pk.embedding <=> query_embedding) >= match_threshold
        -- Guest security: never expose staff-only documents
        AND (NOT p_is_guest OR pk.is_staff_only = FALSE)
        -- Room scope: match 'all' docs or docs scoped to this exact room
        AND (pk.room_scope = 'all' OR p_room_scope = 'all' OR pk.room_scope = p_room_scope)
    ORDER BY pk.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- 4. Update the comment on the table for future maintainers
COMMENT ON TABLE public.property_knowledge IS
  'RAG knowledge base for StayAssist AI. Each row is a semantic chunk from an uploaded document or manual entry. '
  'doc_type: category tag. language: ISO 639-1. room_scope: unit name or ''all''. is_staff_only: hides from guest AI.';

COMMENT ON COLUMN public.property_knowledge.doc_type IS
  'Category: manual | sop | faq | tourism | emergency | concierge | policy | appliance | multilingual | other';
COMMENT ON COLUMN public.property_knowledge.language IS
  'ISO 639-1 language code (en, pt, es, fr, de, it, nl...)';
COMMENT ON COLUMN public.property_knowledge.room_scope IS
  'Room/unit name this chunk applies to, or ''all'' for property-wide knowledge';
COMMENT ON COLUMN public.property_knowledge.is_staff_only IS
  'If TRUE, this chunk is never surfaced in guest-facing AI responses. Staff/admin only.';
