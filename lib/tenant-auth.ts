import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient, createClient } from "@/utils/supabase/server";

export type TenantProfile = {
  email: string | null;
  role: string | null;
  organization_id: string | null;
};

export type TenantContext = {
  admin: SupabaseClient;
  isSuperAdmin: boolean;
  organizationId: string | null;
  profile: TenantProfile;
  user: User;
};

type UserMetadata = {
  email?: string;
  organization_id?: string;
  role?: string;
};

export async function getTenantContext(): Promise<TenantContext> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("email, role, organization_id")
    .eq("id", user.id)
    .maybeSingle<TenantProfile>();

  if (error) {
    throw new Error(error.message);
  }

  const metadata = user.user_metadata as UserMetadata;
  const resolvedProfile: TenantProfile = {
    email: profile?.email || user.email || metadata.email || null,
    role: profile?.role || metadata.role || "staff",
    organization_id: profile?.organization_id || metadata.organization_id || null,
  };

  return {
    admin,
    isSuperAdmin: resolvedProfile.role === "superadmin",
    organizationId: resolvedProfile.organization_id,
    profile: resolvedProfile,
    user,
  };
}

export function requireTenantOrganization(context: TenantContext) {
  if (!context.isSuperAdmin && !context.organizationId) {
    throw new Error("User profile is missing an organization.");
  }

  return context.organizationId;
}

export async function assertPropertyAccess(
  context: TenantContext,
  propertyId: string,
) {
  const { data: property, error } = await context.admin
    .from("properties")
    .select("id, organization_id")
    .eq("id", propertyId)
    .maybeSingle<{ id: string; organization_id: string | null }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!property) {
    throw new Error("Property not found.");
  }

  if (
    !context.isSuperAdmin &&
    property.organization_id !== context.organizationId
  ) {
    throw new Error("Access denied for this property.");
  }

  return property;
}
