"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function setupHotelAndUnits(prevState: unknown, formData: FormData) {
  const hotelName = formData.get("hotelName") as string;
  const unitsCountStr = formData.get("unitsCount") as string;
  const unitsCount = parseInt(unitsCountStr, 10);

  if (!hotelName || isNaN(unitsCount) || unitsCount < 1 || unitsCount > 200) {
    return { error: "Please provide a valid hotel name and a unit count between 1 and 200." };
  }

  // Use the admin client to bypass RLS for this initial setup script
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 0. Get the current user to associate with the property
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: "User not authenticated." };

  const slug = hotelName.toLowerCase().trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "") + "-" + Math.random().toString(36).substring(2, 7);

  // 1. Create Organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ 
      name: `${hotelName} Group`,
      slug: slug
    })
    .select()
    .single();

  if (orgError) {
    return { error: `Failed to create organization: ${orgError.message}` };
  }

  // 2. Create Property
  const { data: property, error: propError } = await supabase
    .from("properties")
    .insert({ 
      name: hotelName, 
      slug: slug, // Added slug to properties too
      organization_id: org.id,
      user_id: user.id 
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

import { createClient } from "@/utils/supabase/server";

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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const embedding = await generateEmbedding(`${topic}: ${content}`);
    const { error } = await supabase
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
  const supabase = await createClient();
  const { error } = await supabase
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Verify property ownership
  const { data: propCheck } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .single();

  if (!propCheck) return { error: "Property not found or access denied." };

  try {
    let text = "";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (file.type === "application/pdf") {
      // Magic bytes check
      const magic = buffer.slice(0, 4).toString("ascii");
      if (!magic.startsWith("%PDF")) return { error: "Invalid PDF file." };

      // @ts-ignore
      const pdfModule = await import("pdf-parse");
      const pdf = (pdfModule as any).default || pdfModule;
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
    await supabase
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

      const { error: insertError } = await supabase
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


