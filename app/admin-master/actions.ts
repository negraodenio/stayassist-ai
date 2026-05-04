"use server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { 
  listAllOrganizations, 
  createOrganization as dbCreateOrganization,
  listAllProperties,
  createProperty as dbCreateProperty,
  createUnit as dbCreateUnit,
  listAllProfiles
} from "@/lib/supabase-rest";
import { revalidatePath } from "next/cache";

const ADMIN_EMAIL = "negraodenio@gmail.com";

async function ensureAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user || user.email !== ADMIN_EMAIL) {
    throw new Error("Unauthorized access. Master Admin only.");
  }
}

export async function getOrganizationsAction() {
  await ensureAdmin();
  return await listAllOrganizations();
}

export async function createOrganizationAction(name: string) {
  await ensureAdmin();
  const result = await dbCreateOrganization(name);
  revalidatePath("/admin-master");
  return result;
}

export async function getPropertiesAction(organizationId?: string) {
  await ensureAdmin();
  return await listAllProperties(organizationId);
}

export async function createPropertyAction(name: string, organizationId: string) {
  await ensureAdmin();
  const result = await dbCreateProperty(name, organizationId);
  revalidatePath("/admin-master");
  return result;
}

export async function createUnitAction(name: string, propertyId: string) {
  await ensureAdmin();
  const result = await dbCreateUnit(name, propertyId);
  revalidatePath("/admin-master");
  return result;
}

export async function createUserAction(email: string, role: string, organizationId: string) {
  await ensureAdmin();
  const adminClient = createAdminClient();
  
  // 1. Create the Auth user with a temp password
  const tempPassword = "MaliaTempPassword123!";
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { role, organization_id: organizationId }
  });

  if (authError) {
    console.error("Auth creation error:", authError);
    throw new Error(authError.message);
  }

  // 2. Create the Profile in our public.profiles table
  const { error: profileError } = await adminClient
    .from("profiles")
    .insert({
      id: authUser.user.id,
      email,
      role,
      organization_id: organizationId
    });

  if (profileError) {
    console.error("Profile creation error:", profileError);
    // Cleanup auth user if profile creation fails to maintain consistency
    await adminClient.auth.admin.deleteUser(authUser.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/admin-master");
  return { success: true, userId: authUser.user.id, tempPassword };
}
