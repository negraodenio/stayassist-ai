import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { sendRequestWhatsAppAlert } from "@/lib/twilio-whatsapp";
import type { GuestRequestType } from "@/lib/guest-requests";

import { generateQueryEmbedding } from "@/lib/embeddings";
import { getKnowledge } from "@/lib/rag";
import { getMemory, saveMemory } from "@/lib/memory";
import { rerankChunks } from "@/lib/rerank";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": "https://stayassist-ai.com",
    "X-Title": "StayAssist AI Concierge",
  },
});

export async function POST(req: Request) {
  try {
    const { messages: rawMessages, propertyId: rawPropertyId, propertyName, unitName, sessionId, isGuest } = await req.json();
    const propertyId = rawPropertyId?.trim();

    if (!propertyId) {
      console.error("Chat Error: Missing propertyId");
      return new Response("Missing propertyId", { status: 400 });
    }

    // Clean messages for the LLM (only role and content)
    const messages = rawMessages.map((m: any) => ({
      role: m.role,
      content: m.content
    })).filter((m: any) => m.role === "user" || m.role === "assistant");


    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    const userMessageContent = lastUserMessage?.content || "";
    
    // Parâmetros da Sessão (Default fallback para testes admin)
    const activeSession = sessionId || "admin-test-session";
    const userType = isGuest ? "guest" : "admin";

    let knowledgeContext = "Nenhuma informação específica encontrada.";
    let debugInfo = null;
    let sourcesUsed: string[] = [];

    if (userMessageContent) {
      try {
        // 1. Single Embedding Generation (1536 dims)
        const queryEmbedding = await generateQueryEmbedding(userMessageContent);

        // 2. Parallel Retrieval (Memory + RAG)
        console.log(`[RAG DEBUG] Querying knowledge for property: ${propertyId}`);
        const [memoryChunks, ragChunks] = await Promise.all([
          getMemory(queryEmbedding, propertyId, activeSession),
          getKnowledge(queryEmbedding, propertyId)
        ]);

        console.log(`[RAG DEBUG] Memory: ${memoryChunks.length}, RAG: ${ragChunks.length}`);


        const combinedChunks = [
          ...memoryChunks.map((m: any) => m.content),
          ...ragChunks.map((c: any) => {
            if (c.source_file) sourcesUsed.push(c.source_file);
            return c.content;
          })
        ];

        // 3. Re-ranking (Conditional & Deduplicated)
        const selectedChunks = await rerankChunks(userMessageContent, combinedChunks);

        // 4. Token/Context Slicing (Max 4000 chars to avoid LLM limits/costs)
        knowledgeContext = selectedChunks.join("\n\n---\n\n").slice(0, 4000);
        console.log(`[RAG DEBUG] Context length: ${knowledgeContext.length}. First 100 chars: ${knowledgeContext.substring(0, 100)}`);
        console.log(`[RAG DEBUG] Messages count: ${messages.length}`);

        // Save Debug Info for Admin UI
        debugInfo = {
          memory_used: memoryChunks.length,
          knowledge_used: ragChunks.length,
          reranked: selectedChunks.length,
        };

        // Deduplicate sources string array
        sourcesUsed = [...new Set(sourcesUsed)];

      } catch (err) {
        console.error("Enterprise RAG Error:", err);
      }

      // Dispara o alerta do WhatsApp (fire-and-forget — não bloqueia o stream)
      if (userType === "guest" && userMessageContent) {
        sendRequestWhatsAppAlert({
          id: "chat-escalation",
          propertyId: propertyId,
          property: propertyName || unitName || "StayAssist Guest",
          unitId: "chat",
          room: unitName || "Guest",
          type: "help" as GuestRequestType,
          status: "Open",
          createdAt: new Date().toISOString(),
          guestMessage: userMessageContent,
        } as any).catch((err: Error) => console.error("WhatsApp error:", err));
      }
    }

    const systemPrompt = `You are a professional luxury hotel AI Concierge named StayAssist AI.
Polite, concise, and incredibly helpful. 
Respond in the user's language.

IMPORTANT RULES:
1. ONLY use the CONTEXT provided below to answer property-specific questions.
2. If the context does NOT have the answer, politely say you don't know and that human staff will assist shortly.
3. DO NOT invent rules, passwords, or checkout times.
4. If the context includes previous memory of this conversation, use it naturally to maintain conversational flow.

CONTEXT:
${knowledgeContext}
`;

    // 5. LLM Streaming
    const result = await streamText({
      model: openrouter("google/gemini-2.0-flash-001"),
      system: systemPrompt,
      messages,
      onFinish: ({ text }) => {
        // 6. Save Memory — fire-and-forget (never blocks the stream)
        if (userMessageContent) {
          saveMemory({ propertyId, sessionId: activeSession, userType, role: "user", content: userMessageContent })
            .catch(e => console.error("Memory save error (user):", e));
        }
        saveMemory({ propertyId, sessionId: activeSession, userType, role: "assistant", content: text })
          .catch(e => console.error("Memory save error (assistant):", e));
      }
    });

    // Use a dynamic check for the response method to handle version variations (Vercel SDK TS bug)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = result as any;
    
    const customHeaders = {
      "X-Debug-Info": JSON.stringify({
        debug: debugInfo,      // frontend acessa: debugInfo.debug.memory_used
        sources: sourcesUsed   // frontend acessa: debugInfo.sources
      }),
      "X-Is-Rag": sourcesUsed.length > 0 ? "true" : "false",
    };

    if (typeof res.toDataStreamResponse === 'function') {
      return res.toDataStreamResponse({ headers: customHeaders });
    }
    if (typeof res.toTextStreamResponse === 'function') {
      return res.toTextStreamResponse({ headers: customHeaders });
    }
    
    // Fallback absoluto
    return new Response("Stream format not supported", { status: 500 });

  } catch (error) {
    console.error("Chat route error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
