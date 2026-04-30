import { createClient } from "@/utils/supabase/server";

export async function getKnowledge(embedding: number[], propertyId: string) {
  try {
    const supabase = await createClient();
    
    const { data } = await supabase.rpc("match_property_knowledge", {
      query_embedding: embedding,
      match_threshold: 0.1, // Reduzido drasticamente para provar que a busca está acontecendo
      match_count: 5,
      p_property_id: propertyId,
    });

    return data || [];
  } catch (err) {
    console.error("Failed to get knowledge:", err);
    return [];
  }
}
