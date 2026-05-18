-- ============================================================
-- StayAssist AI — GDPR Compliance Fix
-- conversation_memory RLS — Multi-tenant Isolation
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Drop the dangerously permissive policy
DROP POLICY IF EXISTS "Enable ALL for authenticated users on memory" ON public.conversation_memory;

-- Create a proper tenant-scoped policy
-- Guests use service_role (bypasses RLS) — this protects against direct client access
CREATE POLICY "Tenant memory isolation"
ON public.conversation_memory
FOR ALL
TO authenticated
USING (
  property_id IN (
    SELECT p.id
    FROM public.properties p
    INNER JOIN public.profiles prof ON prof.organization_id = p.organization_id
    WHERE prof.id = auth.uid()
  )
)
WITH CHECK (
  property_id IN (
    SELECT p.id
    FROM public.properties p
    INNER JOIN public.profiles prof ON prof.organization_id = p.organization_id
    WHERE prof.id = auth.uid()
  )
);

-- Verify the new policy
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'conversation_memory';
