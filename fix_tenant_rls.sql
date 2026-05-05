-- Tenant-aware RLS policy refresh for StayAssist AI.
-- Run this in the Supabase SQL Editor after reviewing it.

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_profile_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_org_id() TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_superadmin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_superadmin_all" ON public.profiles;
DROP POLICY IF EXISTS "tenant_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "tenant_profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "tenant_profiles_superadmin_all" ON public.profiles;

CREATE POLICY "tenant_profiles_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.current_profile_role() = 'superadmin'
);

CREATE POLICY "tenant_profiles_update_self"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "tenant_profiles_superadmin_all"
ON public.profiles
FOR ALL
TO authenticated
USING (public.current_profile_role() = 'superadmin')
WITH CHECK (public.current_profile_role() = 'superadmin');

DROP POLICY IF EXISTS "Superadmins can manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "tenant_organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "tenant_organizations_superadmin_all" ON public.organizations;

CREATE POLICY "tenant_organizations_select"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  public.current_profile_role() = 'superadmin'
  OR id = public.current_profile_org_id()
);

CREATE POLICY "tenant_organizations_superadmin_all"
ON public.organizations
FOR ALL
TO authenticated
USING (public.current_profile_role() = 'superadmin')
WITH CHECK (public.current_profile_role() = 'superadmin');

DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Superadmins can manage properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "tenant_properties_select" ON public.properties;
DROP POLICY IF EXISTS "tenant_properties_superadmin_all" ON public.properties;

CREATE POLICY "tenant_properties_select"
ON public.properties
FOR SELECT
TO authenticated
USING (
  public.current_profile_role() = 'superadmin'
  OR organization_id = public.current_profile_org_id()
);

CREATE POLICY "tenant_properties_superadmin_all"
ON public.properties
FOR ALL
TO authenticated
USING (public.current_profile_role() = 'superadmin')
WITH CHECK (public.current_profile_role() = 'superadmin');

DROP POLICY IF EXISTS "Users can view own units" ON public.units;
DROP POLICY IF EXISTS "Users can manage own units" ON public.units;
DROP POLICY IF EXISTS "Superadmins can manage units" ON public.units;
DROP POLICY IF EXISTS "Users can view their own units" ON public.units;
DROP POLICY IF EXISTS "tenant_units_select" ON public.units;
DROP POLICY IF EXISTS "tenant_units_superadmin_all" ON public.units;

CREATE POLICY "tenant_units_select"
ON public.units
FOR SELECT
TO authenticated
USING (
  public.current_profile_role() = 'superadmin'
  OR property_id IN (
    SELECT id FROM public.properties
    WHERE organization_id = public.current_profile_org_id()
  )
);

CREATE POLICY "tenant_units_superadmin_all"
ON public.units
FOR ALL
TO authenticated
USING (public.current_profile_role() = 'superadmin')
WITH CHECK (public.current_profile_role() = 'superadmin');

DROP POLICY IF EXISTS "Users can view own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can manage own requests" ON public.requests;
DROP POLICY IF EXISTS "tenant_requests_select" ON public.requests;
DROP POLICY IF EXISTS "tenant_requests_update" ON public.requests;
DROP POLICY IF EXISTS "tenant_requests_superadmin_all" ON public.requests;

CREATE POLICY "tenant_requests_select"
ON public.requests
FOR SELECT
TO authenticated
USING (
  public.current_profile_role() = 'superadmin'
  OR organization_id = public.current_profile_org_id()
);

CREATE POLICY "tenant_requests_update"
ON public.requests
FOR UPDATE
TO authenticated
USING (
  public.current_profile_role() = 'superadmin'
  OR organization_id = public.current_profile_org_id()
)
WITH CHECK (
  public.current_profile_role() = 'superadmin'
  OR organization_id = public.current_profile_org_id()
);

CREATE POLICY "tenant_requests_superadmin_all"
ON public.requests
FOR ALL
TO authenticated
USING (public.current_profile_role() = 'superadmin')
WITH CHECK (public.current_profile_role() = 'superadmin');

DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON public.property_knowledge;
DROP POLICY IF EXISTS "tenant_property_knowledge_select" ON public.property_knowledge;
DROP POLICY IF EXISTS "tenant_property_knowledge_superadmin_all" ON public.property_knowledge;

CREATE POLICY "tenant_property_knowledge_select"
ON public.property_knowledge
FOR SELECT
TO authenticated
USING (
  public.current_profile_role() = 'superadmin'
  OR property_id IN (
    SELECT id FROM public.properties
    WHERE organization_id = public.current_profile_org_id()
  )
);

CREATE POLICY "tenant_property_knowledge_superadmin_all"
ON public.property_knowledge
FOR ALL
TO authenticated
USING (public.current_profile_role() = 'superadmin')
WITH CHECK (public.current_profile_role() = 'superadmin');
