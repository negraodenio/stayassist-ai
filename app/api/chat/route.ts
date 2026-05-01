import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createClient } from "@/utils/supabase/server";
import { saveMemory } from "@/lib/memory";
import { generateQueryEmbedding } from "@/lib/embeddings";
import { getKnowledge } from "@/lib/rag";
import { rerankChunks } from "@/lib/rerank";
import { sendRequestWhatsAppAlert } from "@/lib/twilio-whatsapp";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages: rawMessages, propertyId, propertyName, unitName, sessionId, isGuest } = body;

    const activeSession = sessionId || "admin-test-session";

    if (!propertyId) return new Response("Missing propertyId", { status: 400 });

    const messages = (rawMessages || [])
      .filter((m: any) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
      )
      .map((m: any) => ({
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

    let propAddress = "";
    let knowledgeContext = "Nenhuma informação específica encontrada.";
    let sourcesUsed: string[] = [];

    try {
      const supabase = await createClient();
      const { data: prop } = await supabase
        .from("properties")
        .select("address")
        .eq("id", propertyId)
        .single();
      if (prop) propAddress = prop.address || "";
    } catch (e) {
      console.error("[SURVIVAL] Metadata Error", e);
    }

    if (userMessageContent) {
      try {
        const queryEmbedding = await generateQueryEmbedding(userMessageContent);
        const ragChunks = await getKnowledge(queryEmbedding, propertyId);
        if (ragChunks?.length > 0) {
          const combined = ragChunks.map((c: any) => {
            if (c.source_file) sourcesUsed.push(c.source_file);
            return c.content;
          });
          const selected = await rerankChunks(userMessageContent, combined);
          knowledgeContext = selected.join("\n\n---\n\n").slice(0, 4000);
        }
      } catch (e) {
        console.error("[SURVIVAL] RAG Error", e);
      }
    }

    const systemPrompt = `You are StayAssist AI, a premium hotel concierge.
HOTEL: ${finalPropertyName} | UNIT: ${finalUnitName} | LOCATION: ${propAddress}
CONTEXT: ${knowledgeContext}
DIRETRIZES: 1. Seja cordial. 2. Use o CONTEXTO. 3. Se não souber, sugira o WhatsApp.`;

    const result = await streamText({
      model: openrouter("openai/gpt-4o-mini"),
      system: systemPrompt,
      messages,
      onFinish: async ({ text }) => {
        try {
          if (isGuest && userMessageContent) {
            sendRequestWhatsAppAlert({
              id: "chat-escalation",
              propertyId,
              property: finalPropertyName,
              unitId: "chat",
              room: finalUnitName,
              type: "help" as any,
              status: "Open",
              createdAt: new Date().toISOString(),
              guestMessage: userMessageContent,
            } as any).catch((e) => console.error("WA Error", e));
          }
          await saveMemory({ propertyId, sessionId: activeSession, userType, role: "user", content: userMessageContent }).catch(() => {});
          await saveMemory({ propertyId, sessionId: activeSession, userType, role: "assistant", content: text }).catch(() => {});
        } catch (e) {
          console.error("[onFinish Error]", e);
        }
      },
    });

    // CORRECÇÃO PRINCIPAL: ReadableStream manual garante controller.close() explícito
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (e) {
          console.error("[Stream Error]", e);
          controller.error(e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Is-Rag": sourcesUsed.length > 0 ? "true" : "false",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[CHAT FATAL]", message);
    return new Response(message, { status: 500 });
  }
}
