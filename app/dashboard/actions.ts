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

  // 1. Create Organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: `${hotelName} Group` })
    .select()
    .single();

  if (orgError) {
    return { error: `Failed to create organization: ${orgError.message}` };
  }

  // 2. Create Property
  const { data: property, error: propError } = await supabase
    .from("properties")
    .insert({ name: hotelName, organization_id: org.id })
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

export async function addKnowledgeSnippet(prevState: unknown, formData: FormData) {
  const propertyId = formData.get("propertyId") as string;
  const topic = formData.get("topic") as string;
  const content = formData.get("content") as string;

  if (!propertyId || !topic || !content) {
    return { error: "Please provide topic and content." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("property_knowledge")
    .insert({
      property_id: propertyId,
      topic,
      content,
    });

  if (error) {
    return { error: `Failed to add knowledge: ${error.message}` };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
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

  try {
    let text = "";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (file.type === "application/pdf") {
      // Dynamic import to avoid build issues with pdf-parse ESM
      // @ts-expect-error - pdf-parse has weird ESM types
      const pdf = (await import("pdf-parse")).default;
      const data = await pdf(buffer);
      text = data.text;
    } else if (file.type === "text/plain") {
      text = buffer.toString("utf-8");
    } else {
      return { error: "Unsupported file type. Please upload PDF or TXT." };
    }

    if (!text || (text || "").trim().length === 0) {
      return { error: "No text could be extracted from the file." };
    }

    // Clean up text a bit (remove excessive whitespace)
    const cleanedText = text.replace(/\s+/g, " ").trim();

    const supabase = await createClient();
    const { error } = await supabase
      .from("property_knowledge")
      .insert({
        property_id: propertyId,
        topic: `Document: ${file.name}`,
        content: cleanedText.slice(0, 30000), // Cap content to prevent huge DB rows for now
      });

    if (error) {
      return { error: `Failed to save document: ${error.message}` };
    }

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (err) {
    console.error("Upload error:", err);
    return { error: `Error processing file: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}

