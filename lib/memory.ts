import { createClient as createSupabaseClient } from "@supabase/supabase-js";

interface MemoryParams {
  propertyId: string;
  sessionId: string;
  userType: "admin" | "guest";
  role: "user" | "assistant";
  content: string;
}

// Admin client (service_role) — bypasses RLS for server-side memory operations.
// The new tenant-scoped RLS policy protects against direct client access.
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Saves a conversation turn to persistent memory.
 *
 * COST OPTIMIZATION: Embeddings are NOT generated here.
 * The conversation context is already maintained by the client through
 * the messages array. Memory is stored as plain text for logging,
 * audit trails, and future analytics — not for real-time vector retrieval.
 *
 * If semantic memory retrieval is needed in the future, run a background
 * job to batch-embed stored messages.
 */
export async function saveMemory({
  propertyId,
  sessionId,
  userType,
  role,
  content,
}: MemoryParams) {
  try {
    const supabase = getAdminClient();

    await supabase.from("conversation_memory").insert({
      property_id: propertyId,
      session_id: sessionId,
      user_type: userType,
      role,
      content,
      // embedding intentionally omitted — see cost optimization note above
    });

    // TTL Cleanup: Delete memory older than 7 days for this session
    await supabase.rpc("cleanup_old_memory", {
      p_session_id: sessionId,
      p_days: 7,
    });
  } catch (err) {
    // Non-blocking — memory failure must never affect the chat response
    console.error("[Memory] Failed to save:", err);
  }
}

/**
 * NOTE: getMemory() via vector search is currently unused in the chat pipeline.
 * The client maintains conversation context through the messages array.
 * This function is kept for future implementation of persistent cross-session
 * memory retrieval.
 */
export async function getMemory(
  _embedding: number[],
  propertyId: string,
  sessionId: string
): Promise<{ id: string; content: string }[]> {
  try {
    const supabase = getAdminClient();

    // Fallback to recency-based retrieval (no vector search since we don't store embeddings)
    const { data } = await supabase
      .from("conversation_memory")
      .select("id, content")
      .eq("property_id", propertyId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(5);

    return data || [];
  } catch (err) {
    console.error("[Memory] Failed to retrieve:", err);
    return [];
  }
}
