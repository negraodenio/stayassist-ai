import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Usa o cliente admin (service_role) para bypassar o RLS no contexto de API server-side
// O propertyId é sempre validado no route, então isso é seguro
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getKnowledge(embedding: number[], propertyId: string) {
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase.rpc("match_property_knowledge", {
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
