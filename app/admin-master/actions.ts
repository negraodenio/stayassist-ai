"use server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL || "negraodenio@gmail.com";

async function ensureAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user || user.email !== ADMIN_EMAIL) {
    return { error: "Unauthorized access. Master Admin only." };
  }
  return { success: true };
}

export async function getOrganizationsAction() {
  const authCheck = await ensureAdmin();
  if (authCheck.error) return { error: authCheck.error };

  const admin = createAdminClient();
  const { data, error } = await admin.from("organizations").select("*").order("name", { ascending: true });
  if (error) return { error: error.message };
  return { success: true, data };
}

export async function createOrganizationAction(name: string) {
  try {
    const authCheck = await ensureAdmin();
    if (authCheck.error) return { error: authCheck.error };

    const admin = createAdminClient();

    // Verificação de nome duplicado (case-insensitive)
    const { data: existingOrg } = await admin
      .from("organizations")
      .select("id")
      .ilike("name", name.trim())
      .limit(1)
      .maybeSingle();

    if (existingOrg) {
      return { error: "Uma organização com este nome já existe." };
    }

    const slug = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Math.random().toString(36).substring(2, 7);
    const { data, error } = await admin.from("organizations").insert({ name: name.trim(), slug }).select().single();
    
    if (error) return { error: error.message };
    
    revalidatePath("/admin-master");
    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred" };
  }
}

export async function getPropertiesAction(organizationId?: string) {
  const authCheck = await ensureAdmin();
  if (authCheck.error) return { error: authCheck.error };

  const admin = createAdminClient();
  let query = admin.from("properties").select("*, organizations(name)");
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query.order("name", { ascending: true });
  if (error) return { error: error.message };
  return { success: true, data };
}

export async function createPropertyAction(name: string, organizationId: string) {
  try {
    const authCheck = await ensureAdmin();
    if (authCheck.error) return { error: authCheck.error };

    const admin = createAdminClient();

    // Verificação de nome duplicado
    const { data: existingProp } = await admin
      .from("properties")
      .select("id")
      .ilike("name", name.trim())
      .limit(1)
      .maybeSingle();

    if (existingProp) {
      return { error: "Uma propriedade com este nome já existe." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const slug = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Math.random().toString(36).substring(2, 7);
    const { data, error } = await admin.from("properties").insert({ 
      name: name.trim(), 
      slug,
      organization_id: organizationId,
      user_id: user?.id 
    }).select().single();
    
    if (error) return { error: error.message };
    
    revalidatePath("/admin-master");
    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred" };
  }
}

export async function createUnitAction(name: string, propertyId: string) {
  try {
    const authCheck = await ensureAdmin();
    if (authCheck.error) return { error: authCheck.error };

    const admin = createAdminClient();

    // Verificação de nome duplicado na mesma propriedade
    const { data: existingUnit } = await admin
      .from("units")
      .select("id")
      .eq("property_id", propertyId)
      .ilike("name", name.trim())
      .limit(1)
      .maybeSingle();

    if (existingUnit) {
      return { error: "Uma unidade com este nome já existe nesta propriedade." };
    }

    const { data, error } = await admin.from("units").insert({ 
      name: name.trim(), 
      property_id: propertyId,
      qr_token: Math.random().toString(36).substring(2, 15),
      qr_created_at: new Date().toISOString()
    }).select().single();
    
    if (error) return { error: error.message };
    
    revalidatePath("/admin-master");
    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred" };
  }
}

export async function createUserAction(email: string, role: string, organizationId: string) {
  try {
    const authCheck = await ensureAdmin();
    if (authCheck.error) return { error: authCheck.error };

    const adminClient = createAdminClient();
    
    // 1. Create the Auth user with a temp password
    // Generate a random 10-character password with required complexity (letters, numbers, special char)
    const tempPassword = Math.random().toString(36).substring(2, 10) + "M@lia" + Math.floor(Math.random() * 100);
    
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role, organization_id: organizationId }
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return { error: authError.message };
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
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      return { error: profileError.message };
    }

    revalidatePath("/admin-master");
    revalidatePath("/dashboard");
    return { success: true, userId: authUser.user.id, tempPassword };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred" };
  }
}
