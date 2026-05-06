import { createAdminClient, createClient } from "@/utils/supabase/server";
import type {
  GuestOrganization,
  GuestRequestStatus,
  GuestRequestType,
  GuestUnit,
} from "@/lib/guest-requests";
import {
  getTenantContext,
  requireTenantOrganization,
} from "@/lib/tenant-auth";

const requestMessageByType: Record<GuestRequestType, string> = {
  towels: "Please send fresh towels.",
  cleaning: "Please schedule room cleaning.",
  issue: "I need help with an issue in the unit.",
  help: "I would like concierge assistance.",
  emergency: "EMERGENCY: I need immediate assistance!",
};

type Related<T> = T | T[] | null | undefined;

type PropertyRelation = {
  id?: string | null;
  name?: string | null;
  organization_id?: string | null;
};

type UnitRelation = {
  id?: string | null;
  name?: string | null;
};

type UnitRow = {
  id: string;
  name: string | null;
  property_id: string | null;
  qr_created_at?: string | null;
  qr_regenerated_count?: number | null;
  qr_token?: string | null;
  properties?: Related<PropertyRelation>;
};

type RequestRow = {
  id: string;
  category: GuestRequestType;
  created_at: string;
  organization_id?: string | null;
  property_id: string | null;
  properties?: Related<PropertyRelation>;
  status: GuestRequestStatus;
  unit_id: string | null;
  units?: Related<UnitRelation>;
};

function firstRelated<T>(value: Related<T>) {
  return Array.isArray(value) ? value[0] : value;
}

function mapUnit(unit: UnitRow): GuestUnit {
  const property = firstRelated(unit.properties);

  return {
    id: unit.id,
    name: unit.name || "Unnamed unit",
    propertyId: unit.property_id || "",
    propertyName: property?.name || "Unknown property",
    organizationId: property?.organization_id || "",
    qrToken: unit.qr_token || undefined,
    qrCreatedAt: unit.qr_created_at || null,
    qrRegeneratedCount: unit.qr_regenerated_count || 0,
  };
}

function mapRequest(row: RequestRow) {
  const property = firstRelated(row.properties);
  const unit = firstRelated(row.units);

  return {
    id: row.id,
    propertyId: row.property_id || "",
    property: property?.name || "Unknown property",
    unitId: row.unit_id || "",
    room: unit?.name || "Unassigned unit",
    type: row.category as GuestRequestType,
    status: row.status as GuestRequestStatus,
    createdAt: row.created_at,
  };
}

export async function listGuestOptions(): Promise<{
  organizations: GuestOrganization[];
  units: GuestUnit[];
}> {
  const supabase = createAdminClient();

  const [orgsResult, unitsResult] = await Promise.all([
    supabase.from("organizations").select("id, name").order("name", { ascending: true }),
    supabase.from("units").select("id, name, qr_token, property_id, properties(id, name, organization_id)").order("name", { ascending: true }),
  ]);

  if (orgsResult.error) throw new Error(orgsResult.error.message);
  if (unitsResult.error) throw new Error(unitsResult.error.message);

  return {
    organizations: (orgsResult.data || []).map((org) => ({
      id: org.id,
      name: org.name || "Unnamed organization",
    })),
    units: ((unitsResult.data || []) as UnitRow[]).map(mapUnit),
  };
}

export async function getGuestUnitByToken(token: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("units")
    .select("id, name, qr_token, qr_created_at, qr_regenerated_count, property_id, properties(id, name, organization_id)")
    .eq("qr_token", token)
    .single();

  if (error || !data) {
    return { unit: null };
  }

  return { unit: mapUnit(data as UnitRow) };
}

function generateQrToken() {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function listQrUnits(): Promise<GuestUnit[]> {
  const context = await getTenantContext();
  requireTenantOrganization(context);

  let query = context.admin
    .from("units")
    .select("id, name, qr_token, qr_created_at, qr_regenerated_count, property_id, properties(id, name, organization_id)")
    .order("name", { ascending: true });

  if (!context.isSuperAdmin) {
    query = query.eq("properties.organization_id", context.organizationId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return ((data || []) as UnitRow[]).map(mapUnit);
}

export async function generateMissingQrCodes() {
  const units = await listQrUnits();
  const missingUnits = units.filter((unit) => !unit.qrToken);
  const { admin } = await getTenantContext();

  await Promise.all(
    missingUnits.map((unit) =>
      admin
        .from("units")
        .update({
          qr_token: generateQrToken(),
          qr_created_at: new Date().toISOString(),
          qr_regenerated_count: unit.qrRegeneratedCount || 0,
        })
        .eq("id", unit.id)
    )
  );

  return listQrUnits();
}

export async function regenerateUnitQrCode(unitId: string) {
  const context = await getTenantContext();
  requireTenantOrganization(context);

  const { data: existingUnit, error: unitError } = await context.admin
    .from("units")
    .select("id, name, qr_token, qr_created_at, qr_regenerated_count, property_id, properties(id, name, organization_id)")
    .eq("id", unitId)
    .maybeSingle();

  if (unitError) throw new Error(unitError.message);
  if (!existingUnit) {
    throw new Error("Unit not found.");
  }

  const unit = mapUnit(existingUnit as UnitRow);
  if (!context.isSuperAdmin && unit.organizationId !== context.organizationId) {
    throw new Error("Access denied for this unit.");
  }

  const { data, error } = await context.admin
    .from("units")
    .update({
      qr_token: generateQrToken(),
      qr_created_at: new Date().toISOString(),
      qr_regenerated_count: (unit.qrRegeneratedCount || 0) + 1,
    })
    .eq("id", unitId)
    .select("id, name, qr_token, qr_created_at, qr_regenerated_count, property_id, properties(id, name, organization_id)")
    .single();

  if (error) throw new Error(error.message);

  return mapUnit(data as UnitRow);
}

export async function listGuestRequests(unitId?: string) {
  const supabase = unitId ? createAdminClient() : (await getTenantContext()).admin;
  let query = supabase
    .from("requests")
    .select("id, organization_id, property_id, unit_id, category, status, created_at, properties(id, name), units(id, name)")
    .order("created_at", { ascending: false });

  if (unitId) {
    query = query.eq("unit_id", unitId);
  } else {
    const context = await getTenantContext();
    requireTenantOrganization(context);
    if (!context.isSuperAdmin) {
      query = query.eq("organization_id", context.organizationId);
    }
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return {
    requests: ((data || []) as RequestRow[]).map(mapRequest),
  };
}

export async function createGuestRequest(input: {
  organizationId: string;
  propertyId: string;
  unitId: string;
  type: GuestRequestType;
}) {
  const priority = input.type === "emergency" ? "high" : "normal";

  const supabase = createAdminClient();
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, property_id, properties(id, organization_id)")
    .eq("id", input.unitId)
    .maybeSingle<UnitRow>();

  if (unitError) throw new Error(unitError.message);
  if (!unit) throw new Error("Guest unit not found.");

  const property = firstRelated(unit.properties);
  if (
    unit.property_id !== input.propertyId ||
    property?.organization_id !== input.organizationId
  ) {
    throw new Error("Guest unit does not match the selected property.");
  }

  const { data, error } = await supabase
    .from("requests")
    .insert({
      organization_id: input.organizationId,
      property_id: input.propertyId,
      unit_id: input.unitId,
      category: input.type,
      status: "open",
      priority: priority,
      guest_name: "Guest",
      guest_message: requestMessageByType[input.type],
    })
    .select("id, organization_id, property_id, unit_id, category, status, guest_message, created_at, properties(id, name), units(id, name)")
    .single();

  if (error) throw new Error(error.message);

  return mapRequest(data as RequestRow);
}

export async function getOrganizationWhatsAppAlertPhone(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("whatsapp_alert_phone")
    .eq("id", organizationId)
    .maybeSingle<{ whatsapp_alert_phone: string | null }>();

  if (error) throw new Error(error.message);

  return data?.whatsapp_alert_phone || null;
}

export async function updateGuestRequestStatus(
  id: string,
  status: GuestRequestStatus,
) {
  const context = await getTenantContext();
  requireTenantOrganization(context);

  const { data: existingRequest, error: requestError } = await context.admin
    .from("requests")
    .select("id, organization_id")
    .eq("id", id)
    .maybeSingle<{ id: string; organization_id: string | null }>();

  if (requestError) throw new Error(requestError.message);
  if (!existingRequest) throw new Error("Request not found.");
  if (
    !context.isSuperAdmin &&
    existingRequest.organization_id !== context.organizationId
  ) {
    throw new Error("Access denied for this request.");
  }

  const { data, error } = await context.admin
    .from("requests")
    .update({ status })
    .eq("id", id)
    .select("id, organization_id, property_id, unit_id, category, status, created_at, properties(id, name), units(id, name)")
    .single();

  if (error) throw new Error(error.message);

  return mapRequest(data as RequestRow);
}

export async function listAllOrganizations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createOrganization(name: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({ name })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listAllProperties(organizationId?: string) {
  const supabase = await createClient();
  let query = supabase.from("properties").select("*, organizations(name)");
  
  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((prop) => ({
    ...prop,
    organizationName: firstRelated(prop.organizations as Related<PropertyRelation>)?.name,
  }));
}

export async function createProperty(name: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({ name, organization_id: organizationId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createUnit(name: string, propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .insert({ 
      name, 
      property_id: propertyId,
      qr_token: generateQrToken(),
      qr_created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getUserProfile(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, organization_id, email")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error.message);
    return null;
  }

  return data;
}

export async function listAllProfiles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, organizations(name)")
    .order("email", { ascending: true });

  if (error) throw new Error(error.message);
  
  return (data || []).map((p) => ({
    ...p,
    organizationName:
      firstRelated(p.organizations as Related<PropertyRelation>)?.name ||
      "No Organization",
  }));
}

export async function updateProfile(profileId: string, updates: { role?: string; organization_id?: string | null }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createProfile(profile: { id: string; email: string; role?: string; organization_id?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert(profile)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
