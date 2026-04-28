import {
  fallbackGuestRequests,
  fallbackOrganizations,
  fallbackUnits,
  type GuestOrganization,
  type GuestRequest,
  type GuestRequestStatus,
  type GuestRequestType,
  type GuestUnit,
} from "@/lib/guest-requests";

type SupabasePropertyRow = {
  id: string;
  name: string | null;
  organization_id?: string | null;
};

type SupabaseOrganizationRow = {
  id: string;
  name: string | null;
};

type SupabaseUnitRow = {
  id: string;
  name: string | null;
  qr_token?: string | null;
  qr_created_at?: string | null;
  qr_regenerated_count?: number | null;
  property_id: string | null;
  properties?: SupabasePropertyRow | SupabasePropertyRow[] | null;
};

type SupabaseRequestRow = {
  id: string;
  organization_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  category: GuestRequestType;
  status: GuestRequestStatus;
  created_at: string;
  properties?: SupabasePropertyRow | SupabasePropertyRow[] | null;
  units?: {
    id?: string;
    name?: string | null;
  } | Array<{
    id?: string;
    name?: string | null;
  }> | null;
};

type SupabaseError = {
  message?: string;
  error?: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceRoleKey || anonKey;

  if (!url || !key) {
    return null;
  }

  return {
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`,
    key,
  };
}

function getRelationName<T extends { name?: string | null }>(
  relation: T | T[] | null | undefined,
  fallback: string,
) {
  if (Array.isArray(relation)) {
    return relation[0]?.name || fallback;
  }

  return relation?.name || fallback;
}

function getRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] : relation;
}

async function supabaseFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; usingFallback: false } | { data: T; usingFallback: true }> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const response = await fetch(`${config.restUrl}${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as SupabaseError;
    throw new Error(payload.message || payload.error || "Supabase request failed.");
  }

  const data = (await response.json()) as T;

  return { data, usingFallback: false };
}

function mapRequest(row: SupabaseRequestRow): GuestRequest {
  const property = getRelationName(row.properties, "Unknown property");
  const unit = getRelation(row.units);

  return {
    id: row.id,
    propertyId: row.property_id || "",
    property,
    unitId: row.unit_id || "",
    room: unit?.name || "Unassigned unit",
    type: row.category,
    status: row.status,
    createdAt: row.created_at,
  };
}

const requestMessageByType: Record<GuestRequestType, string> = {
  towels: "Please send fresh towels.",
  cleaning: "Please schedule room cleaning.",
  issue: "I need help with an issue in the unit.",
  help: "I would like concierge assistance.",
};

export async function listGuestOptions(): Promise<{
  organizations: GuestOrganization[];
  units: GuestUnit[];
  usingFallback: boolean;
}> {
  try {
    const [organizationsResult, unitsResult] = await Promise.all([
      supabaseFetch<SupabaseOrganizationRow[]>(
        "/organizations?select=id,name&order=name.asc",
      ),
      supabaseFetch<SupabaseUnitRow[]>(
        "/units?select=id,name,qr_token,property_id,properties(id,name,organization_id)&order=name.asc",
      ),
    ]);

    return {
      organizations: organizationsResult.data.map((organization) => ({
        id: organization.id,
        name: organization.name || "Unnamed organization",
      })),
      units: unitsResult.data.map((unit) => {
        const property = getRelation(unit.properties);

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
      }),
      usingFallback: false,
    };
  } catch (error) {
    console.warn(error);
    return {
      organizations: fallbackOrganizations,
      units: fallbackUnits,
      usingFallback: true,
    };
  }
}

export async function getGuestUnitByToken(token: string) {
  try {
    const { data } = await supabaseFetch<SupabaseUnitRow[]>(
      `/units?select=id,name,qr_token,qr_created_at,qr_regenerated_count,property_id,properties(id,name,organization_id)&qr_token=eq.${encodeURIComponent(
        token,
      )}&limit=1`,
    );
    const unit = data[0];

    if (!unit) {
      return { unit: null, usingFallback: false };
    }

    const property = getRelation(unit.properties);

    return {
      unit: {
        id: unit.id,
        name: unit.name || "Unnamed unit",
        propertyId: unit.property_id || "",
        propertyName: property?.name || "Unknown property",
        organizationId: property?.organization_id || "",
        qrToken: unit.qr_token || undefined,
        qrCreatedAt: unit.qr_created_at || null,
        qrRegeneratedCount: unit.qr_regenerated_count || 0,
      },
      usingFallback: false,
    };
  } catch (error) {
    console.warn(error);
    return { unit: null, usingFallback: true };
  }
}

function generateQrToken() {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(10));

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function mapUnit(unit: SupabaseUnitRow): GuestUnit {
  const property = getRelation(unit.properties);

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

export async function listQrUnits() {
  const { data } = await supabaseFetch<SupabaseUnitRow[]>(
    "/units?select=id,name,qr_token,qr_created_at,qr_regenerated_count,property_id,properties(id,name,organization_id)&order=name.asc",
  );

  return data.map(mapUnit);
}

export async function generateMissingQrCodes() {
  const units = await listQrUnits();
  const missingUnits = units.filter((unit) => !unit.qrToken);

  await Promise.all(
    missingUnits.map((unit) =>
      supabaseFetch<SupabaseUnitRow[]>(
        `/units?id=eq.${encodeURIComponent(unit.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            qr_token: generateQrToken(),
            qr_created_at: new Date().toISOString(),
            qr_regenerated_count: unit.qrRegeneratedCount || 0,
          }),
        },
      ),
    ),
  );

  return listQrUnits();
}

export async function regenerateUnitQrCode(unitId: string) {
  const units = await listQrUnits();
  const unit = units.find((item) => item.id === unitId);

  if (!unit) {
    throw new Error("Unit not found.");
  }

  const { data } = await supabaseFetch<SupabaseUnitRow[]>(
    `/units?id=eq.${encodeURIComponent(unitId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        qr_token: generateQrToken(),
        qr_created_at: new Date().toISOString(),
        qr_regenerated_count: (unit.qrRegeneratedCount || 0) + 1,
      }),
    },
  );

  return data[0] ? mapUnit(data[0]) : null;
}

export async function listGuestRequests() {
  try {
    const { data } = await supabaseFetch<SupabaseRequestRow[]>(
      "/requests?select=id,organization_id,property_id,unit_id,category,status,created_at,properties(id,name),units(id,name)&order=created_at.desc",
    );

    return {
      requests: data.map(mapRequest),
      usingFallback: false,
    };
  } catch (error) {
    console.warn(error);
    return { requests: fallbackGuestRequests, usingFallback: true };
  }
}

async function getGuestRequest(id: string) {
  const { data } = await supabaseFetch<SupabaseRequestRow[]>(
    `/requests?select=id,organization_id,property_id,unit_id,category,status,created_at,properties(id,name),units(id,name)&id=eq.${encodeURIComponent(
      id,
    )}&limit=1`,
  );

  return data[0] ? mapRequest(data[0]) : null;
}

export async function createGuestRequest(input: {
  organizationId: string;
  propertyId: string;
  unitId: string;
  type: GuestRequestType;
}) {
  const { data } = await supabaseFetch<SupabaseRequestRow[]>("/requests", {
    method: "POST",
    body: JSON.stringify({
      organization_id: input.organizationId,
      property_id: input.propertyId,
      unit_id: input.unitId,
      category: input.type,
      status: "Open",
      priority: "normal",
      guest_name: "Guest",
      guest_message: requestMessageByType[input.type],
    }),
  });

  const createdId = data[0]?.id;

  if (!createdId) {
    throw new Error("Supabase did not return the created request.");
  }

  return (await getGuestRequest(createdId)) || mapRequest(data[0]);
}

export async function updateGuestRequestStatus(
  id: string,
  status: GuestRequestStatus,
) {
  const { data } = await supabaseFetch<SupabaseRequestRow[]>(
    `/requests?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  return (await getGuestRequest(id)) || mapRequest(data[0]);
}
