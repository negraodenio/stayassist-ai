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
    const { messages, propertyId, unitName, sessionId, isGuest } = await req.json();

    if (!propertyId) {
      return new Response("Missing propertyId", { status: 400 });
    }

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
        const [memoryChunks, ragChunks] = await Promise.all([
          getMemory(queryEmbedding, propertyId, activeSession),
          getKnowledge(queryEmbedding, propertyId)
        ]);

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

      // Dispara o alerta do WhatsApp APENAS se for Guest real
      if (userType === "guest") {
        try {
          await sendRequestWhatsAppAlert({
            id: "chat-escalation",
            propertyId: propertyId,
            property: "Hotel Concierge Chat",
            unitId: "chat",
            room: unitName || "Guest",
            type: "help" as GuestRequestType,
            status: "Open",
            createdAt: new Date().toISOString()
          });
        } catch (whatsappErr) {
          console.error("WhatsApp notification error:", whatsappErr);
        }
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
      model: openrouter.chat("google/gemini-1.5-pro-latest"),
      system: systemPrompt,
      messages,
      onFinish: async ({ text }) => {
        // 6. Save Memory Asynchronously (Both User Query and AI Response)
        if (userMessageContent) {
          await saveMemory({
            propertyId,
            sessionId: activeSession,
            userType,
            role: "user",
            content: userMessageContent
          });
        }
        await saveMemory({
          propertyId,
          sessionId: activeSession,
          userType,
          role: "assistant",
          content: text
        });
      }
    });

    // Send Debug Info in DataStream (Vercel SDK format)
    return result.toDataStreamResponse({
      data: userType === "admin" 
        ? { debug: debugInfo, sources: sourcesUsed } 
        : { isRAG: sourcesUsed.length > 0 } // Safe flag for guests
    });

  } catch (error) {
    console.error("Chat route error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
