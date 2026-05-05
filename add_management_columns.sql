-- 1. Padronizar a coluna status e adicionar novas colunas
-- Nota: Usamos snake_case para o banco (open, in_progress, resolved)

-- Renomear/Garantir a coluna status (se já existir com valores antigos, podemos migrar depois)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'status') THEN
        ALTER TABLE public.requests ADD COLUMN status TEXT DEFAULT 'open';
    END IF;
END $$;

-- Adicionar colunas de gestão
ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS issue TEXT,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 2. Constraint de segurança para status
ALTER TABLE public.requests
DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE public.requests
ADD CONSTRAINT requests_status_check
CHECK (status IN ('open', 'in_progress', 'resolved'));

-- 3. Índices de performance para multi-tenancy e dashboard
CREATE INDEX IF NOT EXISTS idx_requests_org_status 
ON public.requests (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_requests_org_created 
ON public.requests (organization_id, created_at);

-- 4. Migrar dados antigos se necessário (exemplo: 'Open' -> 'open')
UPDATE public.requests SET status = 'open' WHERE status = 'Open';
UPDATE public.requests SET status = 'in_progress' WHERE status = 'In progress';
UPDATE public.requests SET status = 'resolved' WHERE status = 'Resolved';
UPDATE public.requests SET status = 'open' WHERE status IS NULL;
