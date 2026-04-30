import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { generateQueryEmbedding } from "./embeddings";

interface MemoryParams {
  propertyId: string;
  sessionId: string;
  userType: "admin" | "guest";
  role: "user" | "assistant";
  content: string;
}

// Usa o cliente admin (service_role) para bypassar o RLS no contexto de API server-side
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function saveMemory({ propertyId, sessionId, userType, role, content }: MemoryParams) {
  try {
    const supabase = getAdminClient();
    
    // 1. Gera Embedding do conteúdo
    const embedding = await generateQueryEmbedding(content);

    // 2. Salva no banco
    await supabase.from("conversation_memory").insert({
      property_id: propertyId,
      session_id: sessionId,
      user_type: userType,
      role,
      content,
      embedding,
    });

    // 3. TTL Cleanup Silencioso (Enterprise-Grade)
    // Deleta memórias dessa sessão mais antigas que 7 dias para economizar custo e manter relevância
    await supabase.rpc("cleanup_old_memory", {
      p_session_id: sessionId,
      p_days: 7
    });
    
  } catch (err) {
    console.error("Failed to save memory:", err);
  }
}

export async function getMemory(embedding: number[], propertyId: string, sessionId: string) {
  try {
    const supabase = getAdminClient();
    
    const { data } = await supabase.rpc("match_memory", {
      query_embedding: embedding,
      match_count: 3,
      p_id: propertyId,
      s_id: sessionId,
    });

    return data || [];
  } catch (err) {
    console.error("Failed to get memory:", err);
    return [];
  }
}
