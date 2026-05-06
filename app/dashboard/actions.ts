"use server";

import { revalidatePath } from "next/cache";
import {
  assertPropertyAccess,
  getTenantContext,
  requireTenantOrganization,
} from "@/lib/tenant-auth";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = process.env.UPSTASH_REDIS_REST_URL 
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      analytics: true,
      prefix: "@upstash/ratelimit_admin",
    })
  : null;


export async function setupHotelAndUnits(prevState: unknown, formData: FormData) {
  const hotelName = formData.get("hotelName") as string;
  const unitsCountStr = formData.get("unitsCount") as string;
  const unitsCount = parseInt(unitsCountStr, 10);

  if (!hotelName || isNaN(unitsCount) || unitsCount < 1 || unitsCount > 200) {
    return { error: "Please provide a valid hotel name and a unit count between 1 and 200." };
  }

  const context = await getTenantContext();
  const supabase = context.admin;

  const slug = hotelName.toLowerCase().trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "") + "-" + Math.random().toString(36).substring(2, 7);

  let organizationId = context.organizationId;

  if (context.isSuperAdmin) {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: `${hotelName} Group`,
        slug,
      })
      .select("id")
      .single();

    if (orgError) {
      return { error: `Failed to create organization: ${orgError.message}` };
    }
    organizationId = org.id;
  } else {
    organizationId = requireTenantOrganization(context);
  }

  // 2. Create Property
  const { data: property, error: propError } = await supabase
    .from("properties")
    .insert({ 
      name: hotelName, 
      slug,
      organization_id: organizationId,
      user_id: context.user.id,
    })
    .select()
    .single();


  if (propError) {
    return { error: `Failed to create property: ${propError.message}` };
  }


  // 3. Create Units
  const unitsToInsert = Array.from({ length: unitsCount }).map((_, i) => ({
    property_id: property.id,
    name: `Room ${100 + i + 1}`,
  }));

  const { error: unitsError } = await supabase.from("units").insert(unitsToInsert);

  if (unitsError) {
    return { error: `Failed to create units: ${unitsError.message}` };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function createOrganization(prevState: unknown, formData: FormData) {
  const name = formData.get("name") as string;
  if (!name) return { error: "Organization name is required." };

  const context = await getTenantContext();
  if (!context.isSuperAdmin) return { error: "Only superadmins can create organizations." };

  const slug = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Math.random().toString(36).substring(2, 7);

  const { data, error } = await context.admin
    .from("organizations")
    .insert({ name, slug })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { success: true, data };
}

export async function createProperty(prevState: unknown, formData: FormData) {
  const name = formData.get("name") as string;
  const organizationId = formData.get("organizationId") as string;
  const unitsCount = parseInt(formData.get("unitsCount") as string || "0", 10);

  if (!name || !organizationId) return { error: "Name and Organization are required." };

  const context = await getTenantContext();
  
  // Security check: superadmin can create anywhere, others only in their org
  if (!context.isSuperAdmin && organizationId !== context.organizationId) {
    return { error: "Unauthorized." };
  }

  const slug = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Math.random().toString(36).substring(2, 7);

  const { data: property, error: propError } = await context.admin
    .from("properties")
    .insert({
      name,
      slug,
      organization_id: organizationId,
      user_id: context.user.id, // CRITICAL FIX: Always set user_id for RLS
    })
    .select()
    .single();

  if (propError) return { error: propError.message };

  // Optional: Create initial units
  if (unitsCount > 0) {
    const unitsToInsert = Array.from({ length: Math.min(unitsCount, 100) }).map((_, i) => ({
      property_id: property.id,
      name: `Room ${100 + i + 1}`,
    }));
    await context.admin.from("units").insert(unitsToInsert);
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}



// ─── Configuração RAG ──────────────────────────────────────────────────────────
const CHUNK_SIZE = 500;       // tokens/palavras aproximadas por chunk
const CHUNK_OVERLAP = 100;    // overlap para manter contexto
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".pdf", ".txt"];

/**
 * Divide o texto em chunks com overlap para manter coerência semântica.
 */
function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(" ");
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
    start += chunkSize - overlap;
    if (start >= words.length - overlap && start < words.length) break; // Evita chunks minúsculos no fim
  }
  return chunks;
}

/**
 * Gera embeddings via OpenRouter (openai/text-embedding-3-small).
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.data[0].embedding as number[];
}

export async function addKnowledgeSnippet(prevState: unknown, formData: FormData) {
  const propertyId = formData.get("propertyId") as string;
  const topic = formData.get("topic") as string;
  const content = formData.get("content") as string;

  if (!propertyId || !topic || !content) {
    return { error: "Please provide topic and content." };
  }

  const context = await getTenantContext();
  await assertPropertyAccess(context, propertyId);

  try {
    const embedding = await generateEmbedding(`${topic}: ${content}`);
    const { error } = await context.admin
      .from("property_knowledge")
      .insert({
        property_id: propertyId,
        topic,
        content,
        embedding,
        source_file: "manual_entry",
      });

    if (error) throw error;
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (err) {
    return { error: `Failed to add knowledge: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}

export async function deleteKnowledgeSnippet(id: string) {
  const context = await getTenantContext();
  const { data: knowledge, error: lookupError } = await context.admin
    .from("property_knowledge")
    .select("property_id")
    .eq("id", id)
    .maybeSingle<{ property_id: string }>();

  if (lookupError) throw new Error(lookupError.message);
  if (!knowledge) throw new Error("Knowledge item not found.");

  await assertPropertyAccess(context, knowledge.property_id);

  const { error } = await context.admin
    .from("property_knowledge")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete knowledge: ${error.message}`);
  }

  revalidatePath("/dashboard", "layout");
}

export async function uploadKnowledgeFile(prevState: unknown, formData: FormData) {
  const propertyId = formData.get("propertyId") as string;
  const file = formData.get("file") as File;

  if (!propertyId || !file || file.size === 0) {
    return { error: "Please select a valid file." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "File too large (max 10MB)." };
  }

  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { error: "Unsupported file extension." };
  }

  const context = await getTenantContext();
  await assertPropertyAccess(context, propertyId);

  // Rate Limit Check
  if (ratelimit) {
    const { success } = await ratelimit.limit(context.user.id);
    if (!success) return { error: "Limite de uploads atingido. Tente novamente em 1 minuto." };
  }

  try {
    let text = "";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (file.type === "application/pdf") {
      // Magic bytes check
      const magic = buffer.slice(0, 4).toString("ascii");
      if (!magic.startsWith("%PDF")) return { error: "Invalid PDF file." };

      type PdfParser = (input: Buffer) => Promise<{ text: string }>;
      const pdfModule = (await import("pdf-parse")) as unknown as {
        default?: PdfParser;
      };
      const pdf = pdfModule.default;
      if (!pdf) throw new Error("PDF parser unavailable.");
      const data = await pdf(buffer);
      text = data.text;
    } else {
      text = buffer.toString("utf-8");
    }

    if (!text.trim()) return { error: "No text found in file." };

    const cleanedText = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    const chunks = chunkText(cleanedText);
    
    // Clear old data for this file
    await context.admin
      .from("property_knowledge")
      .delete()
      .eq("property_id", propertyId)
      .eq("source_file", file.name);

    // Process in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const rows = await Promise.all(batch.map(async (chunk, idx) => {
        const embedding = await generateEmbedding(chunk);
        return {
          property_id: propertyId,
          source_file: file.name,
          topic: `${file.name} (Part ${i + idx + 1})`,
          content: chunk,
          embedding,
          chunk_index: i + idx,
        };
      }));

      const { error: insertError } = await context.admin
        .from("property_knowledge")
        .insert(rows);
      
      if (insertError) throw insertError;
    }

    revalidatePath("/dashboard", "layout");
    return { success: true, message: `Processed ${chunks.length} segments.` };
  } catch (err) {
    console.error("Upload error:", err);
    return { error: `Processing error: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}

export async function updatePropertyLocation(prevState: unknown, formData: FormData) {
  const propertyId = formData.get("propertyId") as string;
  const address = formData.get("address") as string;
  const zip_code = formData.get("zip_code") as string;
  let latitude = parseFloat(formData.get("latitude") as string);
  let longitude = parseFloat(formData.get("longitude") as string);

  if (!propertyId) return { error: "Property ID missing." };

  // Automagicamente buscar lat/long pelo CEP se estiverem vazios
  if (zip_code && (isNaN(latitude) || isNaN(longitude))) {
    try {
      console.log(`[GEOCODE] Buscando coordenadas para o CEP: ${zip_code}`);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip_code)}&key=${process.env.GOOGLE_PLACES_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === "OK" && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        latitude = lat;
        longitude = lng;
        console.log(`[GEOCODE] Sucesso: ${lat}, ${lng}`);
      } else {
        console.warn(`[GEOCODE] Google retornou status: ${data.status}`);
      }
    } catch (e) {
      console.error("[GEOCODE] Erro na consulta:", e);
    }
  }

  const context = await getTenantContext();
  await assertPropertyAccess(context, propertyId);

  try {
    const { error } = await context.admin
      .from("properties")
      .update({
        address,
        zip_code,
        latitude: isNaN(latitude) ? null : latitude,
        longitude: isNaN(longitude) ? null : longitude,
      })
      .eq("id", propertyId);

    if (error) {
      console.error("Supabase Error:", error);
      if (error.message?.includes("column \"zip_code\" does not exist")) {
        return { error: "Erro de Base de Dados: Precisas de adicionar a coluna 'zip_code' no Supabase SQL Editor." };
      }
      throw error;
    }

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (err) {
    console.error("Location update error:", err);
    return { error: "Failed to update location." };
  }
}

function normalizeE164Phone(value: string) {
  const compact = value.replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) {
    return null;
  }

  return compact;
}

export async function updateWhatsAppAlertPhone(
  prevState: unknown,
  formData: FormData,
) {
  const rawPhone = (formData.get("whatsappAlertPhone") as string | null) || "";
  const context = await getTenantContext();
  const organizationId = requireTenantOrganization(context);

  if (!rawPhone.trim()) {
    const { error } = await context.admin
      .from("organizations")
      .update({ whatsapp_alert_phone: null })
      .eq("id", organizationId);

    if (error) return { error: error.message };
    revalidatePath("/dashboard", "layout");
    return { success: true, message: "WhatsApp alerts disabled for this tenant." };
  }

  const normalizedPhone = normalizeE164Phone(rawPhone);
  if (!normalizedPhone) {
    return {
      error:
        "Use international format with country code, for example +351912345678 or +556191786223.",
    };
  }

  const { error } = await context.admin
    .from("organizations")
    .update({ whatsapp_alert_phone: normalizedPhone })
    .eq("id", organizationId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { success: true, message: "WhatsApp alert phone saved." };
}

export async function sendTestWhatsAppAlert(
  organizationId: string,
  phoneNumber: string,
) {
  const { sendRequestWhatsAppAlert } = await import("@/lib/twilio-whatsapp");

  // Mock guest request for testing
  const mockRequest = {
    id: "test-id",
    propertyId: "test-property-id",
    property: "Test Property",
    unitId: "test-unit-id",
    room: "Test Room 101",
    type: "towels" as const,
    status: "open" as any,
    createdAt: new Date().toISOString(),
    guestMessage: "This is a test alert from StayAssist AI. If you received this, your configuration is working!",
  };

  try {
    const result = await sendRequestWhatsAppAlert(mockRequest, { to: phoneNumber });

    if (result.enabled && result.sent) {
      return { success: true, message: "Test alert sent! Check your WhatsApp." };
    } else {
      return {
        error: result.enabled
          ? `Fail: ${result.error}${result.errorCode ? ` (Code: ${result.errorCode})` : ""}`
          : result.reason,
      };
    }
  } catch (err) {
    return { error: `Crash: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}

export async function assignGuestRequest(id: string) {
  const context = await getTenantContext();
  const organizationId = requireTenantOrganization(context) as string;

  const { error } = await context.admin
    .from("requests")
    .update({
      assigned_to: context.user.id,
      status: "in_progress",
    })
    .eq("id", id)
    .eq("organization_id", organizationId) // CRITICAL: Strict multi-tenant check
    .not("status", "eq", "resolved"); // Cannot assign if already resolved

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function resolveGuestRequest(id: string) {
  const context = await getTenantContext();
  const organizationId = requireTenantOrganization(context) as string;

  // 1. Fetch current request to get data for WhatsApp
  const { data: request, error: fetchError } = await context.admin
    .from("requests")
    .select("id, category, status, organization_id, property_id, unit_id, properties(name), units(name)")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (fetchError || !request) {
    throw new Error("Request not found or access denied.");
  }

  // 2. Prevent moving back from resolved (Status Lock)
  if (request.status === "resolved") {
    return { success: true, message: "Already resolved." };
  }

  // 3. Update status in DB (UTC Time)
  const { error: updateError } = await context.admin
    .from("requests")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (updateError) throw new Error(updateError.message);

  // 4. Send WhatsApp Notification (Robust Flow)
  try {
    const { getOrganizationWhatsAppAlertPhone } = await import("@/lib/supabase-rest");
    const { sendRequestWhatsAppAlert } = await import("@/lib/twilio-whatsapp");

    const to = await getOrganizationWhatsAppAlertPhone(organizationId);
    
    // Transform to GuestRequest format
    const guestReq = {
      id: request.id,
      propertyId: request.property_id || "",
      property: (Array.isArray(request.properties) ? request.properties[0]?.name : (request.properties as any)?.name) || "Unknown",
      unitId: request.unit_id || "",
      room: (Array.isArray(request.units) ? request.units[0]?.name : (request.units as any)?.name) || "Unknown",
      type: request.category as any,
      status: "resolved" as any,
      createdAt: new Date().toISOString(),
      guestMessage: "✅ Request marked as RESOLVED by staff.",
    };

    await sendRequestWhatsAppAlert(guestReq, { to });
  } catch (err) {
    // DO NOT block the UI if WhatsApp fails
    console.error("[WA FAIL ON RESOLVE]", err);
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
