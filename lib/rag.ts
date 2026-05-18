import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Admin client (service_role) — bypasses RLS for server-side retrieval.
// Property isolation is enforced by the p_property_id parameter in the RPC.
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface KnowledgeChunk {
  id: string;
  topic: string;
  content: string;
  source_file: string | null;
  doc_type: string;
  language: string;
  similarity: number;
}

interface GetKnowledgeOptions {
  /** Is the caller a guest? Filters out is_staff_only chunks when true. */
  isGuest?: boolean;
  /** Unit/room name for scope matching. Defaults to 'all'. */
  roomScope?: string;
  /** Minimum similarity threshold (cosine). Defaults to 0.3. */
  matchThreshold?: number;
  /** Max chunks to retrieve. Defaults to 5. */
  matchCount?: number;
}

/**
 * Retrieves semantically relevant knowledge chunks from the property's
 * knowledge base using pgvector cosine similarity.
 *
 * Security guarantees:
 * - Property isolation enforced via p_property_id in the RPC
 * - Guest requests never receive is_staff_only = TRUE chunks
 * - Room scope filters ensure room-specific docs are prioritised
 */
export async function getKnowledge(
  embedding: number[],
  propertyId: string,
  options: GetKnowledgeOptions = {}
): Promise<KnowledgeChunk[]> {
  const {
    isGuest = true,
    roomScope = "all",
    matchThreshold = 0.3,
    matchCount = 5,
  } = options;

  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase.rpc("match_property_knowledge", {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      p_property_id: propertyId,
      p_is_guest: isGuest,
      p_room_scope: roomScope,
    });

    if (error) {
      console.error("[RAG] RPC error:", error.message);
      return [];
    }

    return (data as KnowledgeChunk[]) || [];
  } catch (err) {
    console.error("[RAG] Failed to retrieve knowledge:", err);
    return [];
  }
}
