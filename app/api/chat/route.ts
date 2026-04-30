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
    const body = await req.json();
    console.log("[RAG DEBUG] Request received:", JSON.stringify(body));
    const { messages: rawMessages, propertyId: rawPropertyId, propertyName, unitName, sessionId, isGuest } = body;
    const propertyId = rawPropertyId?.trim();

    // Teste de Conectividade Rápido
    if (rawMessages[rawMessages.length-1]?.content?.toLowerCase() === "ping") {
      return new Response("pong - servidor ativo e comunicando!", { status: 200 });
    }

    if (!propertyId) {
      console.error("Chat Error: Missing propertyId");
      return new Response("Missing propertyId", { status: 400 });
    }

    // Clean messages for the LLM (only role and content)
    // 1. Limpeza Cirúrgica do Histórico (CORREÇÃO DO BUG DO 2º TURNO)
    console.log("[RAG DEBUG] Messages Received:", rawMessages.length);
    const messages = rawMessages
      .filter((m: any) => (m.role === "user" || m.role === "assistant") && m.content)
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: typeof m.content === "string" ? m.content : String(m.content)
      }));

    const userMessageContent = messages[messages.length - 1]?.content || "";
    
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

        // 2. Parallel Retrieval (RAG only - history is handled by 'messages' array)
        console.log(`[RAG DEBUG] Querying knowledge for property: ${propertyId}`);
        const ragChunks = await getKnowledge(queryEmbedding, propertyId);

        console.log(`[RAG DEBUG] RAG chunks found: ${ragChunks.length}`);

        const combinedChunks = [
          ...ragChunks.map((c: any) => {
            if (c.source_file) sourcesUsed.push(c.source_file);
            return c.content;
          })
        ];


        // 3. Re-ranking (Restaurado para qualidade máxima)
        const selectedChunks = await rerankChunks(userMessageContent, combinedChunks);

        // 4. Token/Context Slicing (Max 4000 chars to avoid LLM limits/costs)
        knowledgeContext = selectedChunks.join("\n\n---\n\n").slice(0, 4000);
        console.log(`[RAG DEBUG] Context length: ${knowledgeContext.length}. First 100 chars: ${knowledgeContext.substring(0, 100)}`);
        console.log(`[RAG DEBUG] Messages count: ${messages.length}`);
        console.log(`[RAG DEBUG] RAG completion successful.`);

        // Save Debug Info for Admin UI
        debugInfo = {
          memory_used: 0, // History is now handled natively by LLM messages
          knowledge_used: ragChunks.length,
          reranked: selectedChunks.length,
        };

        // Deduplicate sources string array
        sourcesUsed = [...new Set(sourcesUsed)];

      } catch (err) {
        console.error("Enterprise RAG Error:", err);
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

    const customHeaders = {
      "X-Is-Rag": sourcesUsed.length > 0 ? "true" : "false",
    };


    // 5. LLM Streaming com Gemini 2.0 Flash (Restaurado)
    console.log(`[RAG DEBUG] Starting stream with stable model: google/gemini-2.0-flash-001`);
    const result = await streamText({
      model: openrouter("google/gemini-2.0-flash-001"),
      system: systemPrompt,
      messages,
      onFinish: ({ text }) => {
        // WhatsApp Alert (Async)
        if (isGuest && userMessageContent) {
          sendRequestWhatsAppAlert({
            id: "chat-escalation",
            propertyId: propertyId,
            property: propertyName || unitName || "StayAssist Guest",
            unitId: "chat",
            room: unitName || "Guest",
            type: "help" as any,
            status: "Open",
            createdAt: new Date().toISOString(),
            guestMessage: userMessageContent,
          } as any).catch(e => console.error("WhatsApp error:", e));
        }

        // 7. Save Memory (Restaurado)
        if (userMessageContent) {
          saveMemory({ propertyId, sessionId: activeSession, userType, role: "user", content: userMessageContent })
            .catch(e => console.error("Memory save error (user):", e));
        }
        saveMemory({ propertyId, sessionId: activeSession, userType, role: "assistant", content: text })
          .catch(e => console.error("Memory save error (assistant):", e));
      }
    });



    // 6. Return standard DataStream
    const res = result as any;
    if (typeof res.toDataStreamResponse === 'function') {
      return res.toDataStreamResponse({ headers: customHeaders });
    }
    return res.toTextStreamResponse({ headers: customHeaders });


  } catch (error: any) {
    console.error("CRITICAL Chat route error:", error);
    // Retorna o erro como texto para diagnóstico no PWA
    return new Response(`Erro do Servidor: ${error.message || "Erro desconhecido"}. Por favor, avise o suporte.`, { 
      status: 200, // Status 200 para garantir que o PWA mostre a bolha com o erro
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

