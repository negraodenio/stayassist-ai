-- Libera leitura de hotéis e quartos para hóspedes (sem login)
DROP POLICY IF EXISTS "Allow public read access to properties" ON public.properties;
CREATE POLICY "Allow public read access to properties" ON public.properties FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow public read access to units" ON public.units;
CREATE POLICY "Allow public read access to units" ON public.units FOR SELECT TO anon USING (true);

-- Libera criação e visualização de pedidos para hóspedes
DROP POLICY IF EXISTS "Allow public insert access to requests" ON public.requests;
CREATE POLICY "Allow public insert access to requests" ON public.requests FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to requests" ON public.requests;
CREATE POLICY "Allow public read access to requests" ON public.requests FOR SELECT TO anon USING (true);

-- Libera leitura de conhecimento para a IA responder hóspedes
DROP POLICY IF EXISTS "Allow public read access to knowledge" ON public.property_knowledge;
CREATE POLICY "Allow public read access to knowledge" ON public.property_knowledge FOR SELECT TO anon USING (true);
