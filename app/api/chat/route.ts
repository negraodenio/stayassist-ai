import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createClient } from "@/utils/supabase/server";
import { saveMemory } from "@/lib/memory";
import { generateQueryEmbedding } from "@/lib/embeddings";
import { getKnowledge } from "@/lib/rag";
import { rerankChunks } from "@/lib/rerank";
import { sendRequestWhatsAppAlert } from "@/lib/twilio-whatsapp";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { GuestRequestType } from "@/lib/guest-requests";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ─── Redis client (shared for rate limiting + WA debounce) ───────────────────
const redis = process.env.UPSTASH_REDIS_REST_URL ? Redis.fromEnv() : null;

// Rate limit: 10 requests per minute per IP
const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      analytics: true,
      prefix: "@upstash/ratelimit",
    })
  : null;

// Increased from 30s to 60s — large documents + reranking can take time
export const maxDuration = 60;

type ChatMessage = {
  content: string;
  role: "assistant" | "user";
};

type ChatRequestBody = {
  isGuest?: boolean;
  messages?: unknown;
  propertyId?: string;
  propertyName?: string;
  sessionId?: string;
  unitName?: string;
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

// Doc type labels for natural-language source attribution
const DOC_TYPE_LABELS: Record<string, string> = {
  manual: "property manual",
  sop: "operational procedure",
  faq: "property FAQ",
  tourism: "local area guide",
  emergency: "emergency procedure",
  concierge: "concierge guide",
  policy: "property policy",
  appliance: "appliance instructions",
  multilingual: "multilingual guide",
  other: "property information",
};

// ─── WhatsApp Debounce ────────────────────────────────────────────────────────
// Prevents staff from being spammed with one WA alert per chat message.
// Only sends one alert per session per 15 minutes.
const WA_DEBOUNCE_TTL_SECONDS = 15 * 60; // 15 minutes

async function shouldSendWhatsAppAlert(sessionId: string): Promise<boolean> {
  if (!redis) return true; // No Redis → always send (fallback)

  const key = `wa:chat:${sessionId}`;
  const alreadySent = await redis.get(key);

  if (alreadySent) return false;

  // Set the debounce key — expires in 15 minutes
  await redis.set(key, "1", { ex: WA_DEBOUNCE_TTL_SECONDS });
  return true;
}

// ─── RAG Two-Pass Retrieval ───────────────────────────────────────────────────
// Pass 1: High confidence (threshold 0.5) — precise, avoids irrelevant context
// Pass 2: If pass 1 returns nothing, fall back to broader search (threshold 0.3)
async function getKnowledgeWithFallback(
  embedding: number[],
  propertyId: string,
  isGuest: boolean,
  roomScope: string
) {
  // Pass 1 — high confidence
  const highConfidence = await getKnowledge(embedding, propertyId, {
    isGuest,
    roomScope,
    matchThreshold: 0.5,
    matchCount: 8,
  });

  if (highConfidence.length > 0) return highConfidence;

  // Pass 2 — broader fallback (log so we can tune over time)
  console.log(`[RAG] No results at 0.5 — falling back to 0.3 for property ${propertyId}`);
  return getKnowledge(embedding, propertyId, {
    isGuest,
    roomScope,
    matchThreshold: 0.3,
    matchCount: 5,
  });
}

export async function POST(req: Request) {
  try {
    // 1. Rate limit check
    if (ratelimit) {
      const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
      const { success, limit, reset, remaining } = await ratelimit.limit(ip);

      if (!success) {
        return new Response("Too many requests. Please try again shortly.", {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        });
      }
    }

    const body = (await req.json()) as ChatRequestBody;
    const { messages: rawMessages, propertyId, propertyName, unitName, sessionId, isGuest } = body;

    const activeSession = sessionId || "admin-test-session";

    if (!propertyId) return new Response("Missing propertyId", { status: 400 });

    const messages = (Array.isArray(rawMessages) ? rawMessages : [])
      .filter(isChatMessage)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content.trim(),
      }));

    if (messages.length === 0) {
      return new Response("No valid messages", { status: 400 });
    }

    const userMessageContent = messages[messages.length - 1]?.content || "";
    const userType = isGuest ? "guest" : "admin";
    const finalPropertyName = propertyName || "Hotel";
    const finalUnitName = unitName || "Room";

    // 2. Fetch property address
    let propAddress = "";
    try {
      const supabase = await createClient();
      const { data: prop } = await supabase
        .from("properties")
        .select("address")
        .eq("id", propertyId)
        .single();
      if (prop) propAddress = prop.address || "";
    } catch (e) {
      console.error("[CHAT] Metadata fetch error:", e);
    }

    // 3. RAG retrieval — two-pass with guest/staff isolation and room scope
    let knowledgeContext = "";
    const sourcesUsed: string[] = [];
    let ragWasUsed = false;

    if (userMessageContent) {
      try {
        const queryEmbedding = await generateQueryEmbedding(userMessageContent);
        const ragChunks = await getKnowledgeWithFallback(
          queryEmbedding,
          propertyId,
          isGuest ?? true,
          finalUnitName
        );

        if (ragChunks?.length > 0) {
          ragWasUsed = true;
          const chunkTexts = ragChunks.map((c) => {
            const label = DOC_TYPE_LABELS[c.doc_type] || "property information";
            if (c.source_file && c.source_file !== "manual_entry") {
              sourcesUsed.push(c.source_file);
            }
            return `[Source: ${label}]\n${c.content}`;
          });

          const selected = await rerankChunks(userMessageContent, chunkTexts);
          knowledgeContext = selected.join("\n\n---\n\n").slice(0, 4500);
        }
      } catch (e) {
        console.error("[CHAT] RAG retrieval error:", e);
      }
    }

    // 4. Build production system prompt
    const systemPrompt = buildSystemPrompt({
      propertyName: finalPropertyName,
      unitName: finalUnitName,
      address: propAddress,
      knowledgeContext,
      ragWasUsed,
    });

    // 5. Stream the response
    const result = await streamText({
      model: openrouter("openai/gpt-4o-mini"),
      system: systemPrompt,
      messages,
      onFinish: async ({ text }) => {
        try {
          // WhatsApp alert — DEBOUNCED per session (max 1 alert per 15 min)
          // Prevents staff spam when guests send multiple messages
          if (isGuest && userMessageContent) {
            const canSend = await shouldSendWhatsAppAlert(activeSession);
            if (canSend) {
              await sendRequestWhatsAppAlert({
                id: "chat-escalation",
                propertyId,
                property: finalPropertyName,
                unitId: "chat",
                room: finalUnitName,
                type: "help" as GuestRequestType,
                status: "open",
                createdAt: new Date().toISOString(),
                guestMessage: userMessageContent,
              }).catch((e) => console.error("[CHAT] WA alert error:", e));
            }
          }

          // Save conversation to memory (plain text, no embedding — cost optimized)
          await saveMemory({
            propertyId,
            sessionId: activeSession,
            userType,
            role: "user",
            content: userMessageContent,
          }).catch(() => {});

          await saveMemory({
            propertyId,
            sessionId: activeSession,
            userType,
            role: "assistant",
            content: text,
          }).catch(() => {});
        } catch (e) {
          console.error("[CHAT] onFinish error:", e);
        }
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "X-Is-Rag": ragWasUsed ? "true" : "false",
        "X-Sources": sourcesUsed.slice(0, 3).join(","),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[CHAT FATAL]", message);
    return new Response(message, { status: 500 });
  }
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

interface SystemPromptArgs {
  propertyName: string;
  unitName: string;
  address: string;
  knowledgeContext: string;
  ragWasUsed: boolean;
}

function buildSystemPrompt({
  propertyName,
  unitName,
  address,
  knowledgeContext,
  ragWasUsed,
}: SystemPromptArgs): string {
  const contextSection = ragWasUsed
    ? `## Property Knowledge Base\n${knowledgeContext}`
    : `## Property Knowledge Base\nNo specific documentation was found for this query. Use hospitality best practices and offer to escalate.`;

  return `You are StayAssist AI — a premium, multilingual hotel concierge assistant for ${propertyName}.

## Property Context
- Property: ${propertyName}
- Guest Unit: ${unitName}
- Location: ${address || "Not specified"}

${contextSection}

## Response Rules

### Language
- Always respond in the same language the guest used. Auto-detect and match.
- If the guest writes in Portuguese, respond in Portuguese. Spanish → Spanish. French → French. Etc.

### Knowledge Base Behavior
- When answering questions, prioritize the Property Knowledge Base above.
- Use it as the source of truth — it contains property-specific instructions, manuals, and policies.
- Attribute knowledge naturally without exposing technical systems:
  ✅ "According to the property guide..." / "The house instructions indicate..." / "Based on the property's information..."
  ❌ NEVER say: "According to the vector database", "The RAG system says", "The embedding search returned", "Based on the context provided to me", "According to the document chunk"
- Do NOT dump raw document text. Always summarize clearly in a hospitality tone.

### Missing Information
- If the knowledge base does not have a clear answer, say so naturally and offer to escalate.
  Example: "I don't have confirmed details on that yet, but I can forward your request to the property team right away."
- NEVER invent specific details (room numbers, prices, procedures) that aren't in the knowledge base.

### Response Style
- Be warm, professional, and concise — like a 5-star hotel concierge.
- Use short paragraphs. Avoid walls of text.
- For step-by-step instructions, use a numbered list.
- End with an offer to help further when appropriate.

### Knowledge Priority Order
1. Property-specific documents (manuals, SOPs, guides)
2. Room-specific instructions (if available for this unit)
3. Hotel policies
4. General concierge hospitality reasoning

### Security
- Never reveal internal operational documents, SOP file names, staff-only procedures, or system configuration.
- If asked about internal systems, routing, or AI architecture, deflect gracefully.`;
}
