import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { sendRequestWhatsAppAlert } from "@/lib/twilio-whatsapp";
import type { GuestRequestType } from "@/lib/guest-requests";

import { generateQueryEmbedding } from "@/lib/embeddings";
import { getKnowledge } from "@/lib/rag";
import { getMemory, saveMemory } from "@/lib/memory";
import { rerankChunks } from "@/lib/rerank";
import { searchNearbyPlaces } from "@/lib/places";
import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

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

    // 2. Fetch Property Metadata (Geolocation & Address)
    const supabase = await createClient();
    const { data: propertyData } = await supabase
      .from("properties")
      .select("id, name, address, latitude, longitude")
      .eq("id", propertyId)
      .single();

    const propLat = propertyData?.latitude;
    const propLng = propertyData?.longitude;
    const propAddress = propertyData?.address;

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


    const systemPrompt = `You are StayAssist AI, a premium 5-star hotel concierge. 
Your goal is to provide accurate information based ONLY on the provided context for property-specific questions.

CORE DIRECTIVES:
1. PROPERTY INFO: Use the CONTEXT below for rules, Wi-Fi, schedules, and specific hotel amenities.
2. HOTEL LOCATION: The hotel is located at: ${propAddress || "Address not set in dashboard"}.
3. LOCAL RECOMMENDATIONS: If a guest asks for restaurants, cafes, or attractions, use the 'searchNearby' tool to get real-time data from Google Places.
4. HONESTY: If the CONTEXT does not contain a specific hotel-related answer and it's not something you can search on Google Places, say exactly: "O concierge está ocupado no momento. Por favor, tente novamente em instantes."
5. TONE: Professional, welcoming, and concise.

CONTEXT:
${knowledgeContext || "No specific property context provided."}
`;

    const customHeaders = {
      "X-Is-Rag": sourcesUsed.length > 0 ? "true" : "false",
    };


    // 5. Tool Definition (Direct Object bypass for SDK v6 types)
    const searchNearbyTool: any = {
      description: "Search for nearby places like restaurants, pharmacies, or attractions using Google Places.",
      parameters: z.object({
        type: z.string(),
        radius: z.number().optional(),
      }),
      execute: async ({ type, radius }: { type: string; radius?: number }) => {
        const searchRadius = radius ?? 1500;
        console.log(`[TOOL] Searching for ${type} within ${searchRadius}m`);
        
        const lat = propLat ?? 38.7167; 
        const lng = propLng ?? -9.1333;
        
        const places = await searchNearbyPlaces(lat, lng, type, searchRadius);
        
        return {
          location: propertyName || "the hotel",
          results: places.map(p => ({
            name: p.displayName?.text || "Unknown",
            address: p.formattedAddress || "No address",
            rating: p.rating ?? 0,
            category: p.primaryTypeDisplayName?.text || "Place",
            mapsLink: p.googleMapsUri
          }))
        };
      }
    };

    // 6. LLM Streaming with Tools (Blindado para Multi-step)
    console.log(`[RAG DEBUG] Starting stream with stable model and tools: openai/gpt-4o-mini`);
    
    const streamConfig: any = {
      model: openrouter("openai/gpt-4o-mini"),
      system: systemPrompt,
      messages,
      tools: {
        searchNearby: searchNearbyTool
      },
      maxSteps: 5,
      onFinish: ({ text }: any) => {
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
    };

    const result = await streamText(streamConfig);

    // 6. Return standard DataStream
    const res = result as any;
    const responseHeaders = { 
      ...customHeaders,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    };

    if (typeof res.toDataStreamResponse === 'function') {
      return res.toDataStreamResponse({ headers: responseHeaders });
    }
    return res.toTextStreamResponse({ headers: responseHeaders });


  } catch (error: any) {
    console.error("CRITICAL Chat route error:", error);
    // Retorna o erro como texto para diagnóstico no PWA
    return new Response(`Erro do Servidor: ${error.message || "Erro desconhecido"}. Por favor, avise o suporte.`, { 
      status: 200, // Status 200 para garantir que o PWA mostre a bolha com o erro
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

