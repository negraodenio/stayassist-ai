import { createClient } from "@/utils/supabase/server";
import type {
  GuestOrganization,
  GuestRequestStatus,
  GuestRequestType,
  GuestUnit,
} from "@/lib/guest-requests";

const requestMessageByType: Record<GuestRequestType, string> = {
  towels: "Please send fresh towels.",
  cleaning: "Please schedule room cleaning.",
  issue: "I need help with an issue in the unit.",
  help: "I would like concierge assistance.",
};

export async function listGuestOptions(): Promise<{
  organizations: GuestOrganization[];
  units: GuestUnit[];
}> {
  const supabase = await createClient();

  const [orgsResult, unitsResult] = await Promise.all([
    supabase.from("organizations").select("id, name").order("name", { ascending: true }),
    supabase.from("units").select("id, name, qr_token, property_id, properties(id, name, organization_id)").order("name", { ascending: true }),
  ]);

  if (orgsResult.error) throw new Error(orgsResult.error.message);
  if (unitsResult.error) throw new Error(unitsResult.error.message);

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    organizations: orgsResult.data.map((org: any) => ({
      id: org.id,
      name: org.name || "Unnamed organization",
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    units: unitsResult.data.map((unit: any) => {
      const property = Array.isArray(unit.properties) ? unit.properties[0] : unit.properties;

      return {
        id: unit.id,
        name: unit.name || "Unnamed unit",
        propertyId: unit.property_id || "",
        propertyName: property?.name || "Unknown property",
        organizationId: property?.organization_id || "",
        qrToken: unit.qr_token || undefined,
        qrCreatedAt: null,
        qrRegeneratedCount: 0,
      };
    }),
  };
}

export async function getGuestUnitByToken(token: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("units")
    .select("id, name, qr_token, qr_created_at, qr_regenerated_count, property_id, properties(id, name, organization_id)")
    .eq("qr_token", token)
    .single();

  if (error || !data) {
    return { unit: null };
  }

  const property = Array.isArray(data.properties) ? data.properties[0] : data.properties;

  return {
    unit: {
      id: data.id,
      name: data.name || "Unnamed unit",
      propertyId: data.property_id || "",
      propertyName: property?.name || "Unknown property",
      organizationId: property?.organization_id || "",
      qrToken: data.qr_token || undefined,
      qrCreatedAt: data.qr_created_at || null,
      qrRegeneratedCount: data.qr_regenerated_count || 0,
    },
  };
}

function generateQrToken() {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function listQrUnits(): Promise<GuestUnit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, name, qr_token, qr_created_at, qr_regenerated_count, property_id, properties(id, name, organization_id)")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((unit: any) => {
    const property = Array.isArray(unit.properties) ? unit.properties[0] : unit.properties;
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
  });
}

export async function generateMissingQrCodes() {
  const units = await listQrUnits();
  const missingUnits = units.filter((unit) => !unit.qrToken);
  const supabase = await createClient();

  await Promise.all(
    missingUnits.map((unit) =>
      supabase
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
  const units = await listQrUnits();
  const unit = units.find((item) => item.id === unitId);

  if (!unit) {
    throw new Error("Unit not found.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
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

  const property = Array.isArray(data.properties) ? data.properties[0] : data.properties;

  return {
    id: data.id,
    name: data.name || "Unnamed unit",
    propertyId: data.property_id || "",
    propertyName: property?.name || "Unknown property",
    organizationId: property?.organization_id || "",
    qrToken: data.qr_token || undefined,
    qrCreatedAt: data.qr_created_at || null,
    qrRegeneratedCount: data.qr_regenerated_count || 0,
  };
}

export async function listGuestRequests(unitId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("requests")
    .select("id, organization_id, property_id, unit_id, category, status, created_at, properties(id, name), units(id, name)")
    .order("created_at", { ascending: false });

  if (unitId) {
    query = query.eq("unit_id", unitId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requests: data.map((row: any) => {
      const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
      const unit = Array.isArray(row.units) ? row.units[0] : row.units;

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
    }),
  };
}

export async function createGuestRequest(input: {
  organizationId: string;
  propertyId: string;
  unitId: string;
  type: GuestRequestType;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .insert({
      organization_id: input.organizationId,
      property_id: input.propertyId,
      unit_id: input.unitId,
      category: input.type,
      status: "Open",
      priority: "normal",
      guest_name: "Guest",
      guest_message: requestMessageByType[input.type],
    })
    .select("id, organization_id, property_id, unit_id, category, status, created_at, properties(id, name), units(id, name)")
    .single();

  if (error) throw new Error(error.message);

  const property = Array.isArray(data.properties) ? data.properties[0] : data.properties;
  const unit = Array.isArray(data.units) ? data.units[0] : data.units;

  return {
    id: data.id,
    propertyId: data.property_id || "",
    property: property?.name || "Unknown property",
    unitId: data.unit_id || "",
    room: unit?.name || "Unassigned unit",
    type: data.category as GuestRequestType,
    status: data.status as GuestRequestStatus,
    createdAt: data.created_at,
  };
}

export async function updateGuestRequestStatus(
  id: string,
  status: GuestRequestStatus,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", id)
    .select("id, organization_id, property_id, unit_id, category, status, created_at, properties(id, name), units(id, name)")
    .single();

  if (error) throw new Error(error.message);

  const property = Array.isArray(data.properties) ? data.properties[0] : data.properties;
  const unit = Array.isArray(data.units) ? data.units[0] : data.units;

  return {
    id: data.id,
    propertyId: data.property_id || "",
    property: property?.name || "Unknown property",
    unitId: data.unit_id || "",
    room: unit?.name || "Unassigned unit",
    type: data.category as GuestRequestType,
    status: data.status as GuestRequestStatus,
    createdAt: data.created_at,
  };
}
