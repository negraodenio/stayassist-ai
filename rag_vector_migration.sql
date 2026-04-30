-- Habilita a extensão pgvector para busca semântica
CREATE EXTENSION IF NOT EXISTS vector;

-- Garante que a tabela de propriedades tenha o dono (user_id)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Recria a tabela com suporte a embeddings para RAG Real
-- Nota: Isso removerá os dados antigos da property_knowledge. 
DROP TABLE IF EXISTS public.property_knowledge;

CREATE TABLE public.property_knowledge (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id   UUID        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    source_file   TEXT        NOT NULL,                   -- nome do arquivo original ou 'manual'
    topic         TEXT        NOT NULL,                   -- label legível
    content       TEXT        NOT NULL,                   -- texto do chunk
    embedding     vector(1536),                           -- vetor compatível com text-embedding-3-small
    chunk_index   INTEGER     NOT NULL DEFAULT 0,         -- posição no documento
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice vetorial (HNSW para busca de alta performance)
CREATE INDEX ON public.property_knowledge 
USING hnsw (embedding vector_cosine_ops);

-- Índice auxiliar para filtrar por propriedade antes da busca vetorial
CREATE INDEX ON public.property_knowledge (property_id);

-- Ativar RLS
ALTER TABLE public.property_knowledge ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados só veem e editam conhecimento das suas próprias propriedades
CREATE POLICY "owner_access" ON public.property_knowledge
FOR ALL
TO authenticated
USING (
    property_id IN (
        SELECT id FROM public.properties WHERE user_id = auth.uid()
    )
);

-- Função RPC para busca vetorial por similaridade de cosseno
CREATE OR REPLACE FUNCTION match_property_knowledge(
    p_property_id   UUID,
    query_embedding vector(1536),
    match_threshold FLOAT   DEFAULT 0.70,
    match_count     INT     DEFAULT 5
)
RETURNS TABLE (
    id            UUID,
    topic         TEXT,
    content       TEXT,
    source_file   TEXT,
    similarity    FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        pk.id,
        pk.topic,
        pk.content,
        pk.source_file,
        1 - (pk.embedding <=> query_embedding) AS similarity
    FROM public.property_knowledge pk
    WHERE
        pk.property_id = p_property_id
        AND pk.embedding IS NOT NULL
        AND 1 - (pk.embedding <=> query_embedding) >= match_threshold
    ORDER BY pk.embedding <=> query_embedding
    LIMIT match_count;
$$;
