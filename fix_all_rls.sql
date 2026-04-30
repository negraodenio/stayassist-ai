-- 1. Habilita RLS nas tabelas dependentes
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para UNIDADES (permitir ver unidades dos seus próprios hotéis)
DROP POLICY IF EXISTS "Users can view own units" ON public.units;
CREATE POLICY "Users can view own units" ON public.units FOR SELECT TO authenticated 
USING (property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own units" ON public.units;
CREATE POLICY "Users can manage own units" ON public.units FOR ALL TO authenticated 
USING (property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid()))
WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid()));

-- 3. Políticas para PEDIDOS (permitir ver pedidos dos seus próprios hotéis)
DROP POLICY IF EXISTS "Users can view own requests" ON public.requests;
CREATE POLICY "Users can view own requests" ON public.requests FOR SELECT TO authenticated 
USING (property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own requests" ON public.requests;
CREATE POLICY "Users can manage own requests" ON public.requests FOR ALL TO authenticated 
USING (property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid()))
WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid()));
