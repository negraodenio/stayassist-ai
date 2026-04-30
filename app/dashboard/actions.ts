"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function setupHotelAndUnits(prevState: unknown, formData: FormData) {
  const hotelName = formData.get("hotelName") as string;
  const unitsCountStr = formData.get("unitsCount") as string;
  const unitsCount = parseInt(unitsCountStr, 10);

  if (!hotelName || isNaN(unitsCount) || unitsCount < 1 || unitsCount > 200) {
    return { error: "Please provide a valid hotel name and a unit count between 1 and 200." };
  }

  const supabase = await createClient();

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
