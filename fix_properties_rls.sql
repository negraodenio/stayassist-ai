-- Habilita RLS na tabela de propriedades
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas suas próprias propriedades
DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
CREATE POLICY "Users can view own properties" 
ON public.properties FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Política para permitir que usuários gerenciem suas próprias propriedades
DROP POLICY IF EXISTS "Users can manage own properties" ON public.properties;
CREATE POLICY "Users can manage own properties" 
ON public.properties FOR ALL 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Se a tabela organizations também precisar de RLS, podemos adicionar depois.
-- Por enquanto, vamos focar nas propriedades que travam o dashboard.
