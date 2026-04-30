-- Criação da tabela para a Base de Conhecimento (RAG Simplificado)
CREATE TABLE IF NOT EXISTS public.property_knowledge (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE public.property_knowledge ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ler, inserir, atualizar e deletar conhecimentos da propriedade
CREATE POLICY "Enable ALL for authenticated users" 
ON public.property_knowledge FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Política: Hóspedes não autenticados não devem acessar essa tabela diretamente via API pública
-- O acesso do hóspede é feito através da rota segura /api/chat no backend (onde usamos a Service Role Key se necessário, ou injetamos pelo frontend após fetch autenticado)
