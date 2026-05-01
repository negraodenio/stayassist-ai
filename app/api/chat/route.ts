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
    const activeSession = sessionId || "admin-test-session";

    // Teste de Conectividade Rápido
    if (rawMessages[rawMessages.length-1]?.content?.toLowerCase() === "ping") {
      return new Response("pong - servidor ativo e comunicando!", { status: 200 });
    }

    if (!propertyId) {
      console.error("Chat Error: Missing propertyId");
      return new Response("Missing propertyId", { status: 400 });
    }

    // 1. Limpeza e Validação de Histórico (Foco em Turnos Múltiplos)
    const messages = (rawMessages || [])
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content || " ").trim() || " " 
      }));

    console.log(`[CHAT TURN] Session: ${activeSession} | Messages: ${messages.length}`);

    if (messages.length === 0) {
      return new Response("No messages provided", { status: 400 });
    }

    const userMessageContent = messages[messages.length - 1]?.content || "";
    const userType = isGuest ? "guest" : "admin";
    const finalPropertyName = propertyName || "Hotel";
    const finalUnitName = unitName || "Room";

    // 2. Fetch Property Metadata (Geolocation & Address)
    let propLat: number | null = null;
    let propLng: number | null = null;
    let propAddress = "";
    let knowledgeContext = "Nenhuma informação específica encontrada.";
    let sourcesUsed: string[] = [];

    try {
      const supabase = await createClient();
      const { data: propertyData } = await supabase
        .from("properties")
        .select("id, name, address, latitude, longitude")
        .eq("id", propertyId)
        .single();
      
      if (propertyData) {
        propLat = propertyData.latitude;
        propLng = propertyData.longitude;
        propAddress = propertyData.address || "";
      }
    } catch (e) {
      console.error("[SURVIVAL] Metadata Fetch Error:", e);
    }

    // 3. Knowledge Retrieval (RAG)
    if (userMessageContent) {
      try {
        const queryEmbedding = await generateQueryEmbedding(userMessageContent);
        const ragChunks = await getKnowledge(queryEmbedding, propertyId);
        
        if (ragChunks && ragChunks.length > 0) {
          const combinedChunks = ragChunks.map((c: any) => {
            if (c.source_file) sourcesUsed.push(c.source_file);
            return c.content;
          });
          const selectedChunks = await rerankChunks(userMessageContent, combinedChunks);
          knowledgeContext = selectedChunks.join("\n\n---\n\n").slice(0, 4000);
        }
      } catch (e) {
        console.error("[SURVIVAL] RAG Error:", e);
      }
    }

    const systemPrompt = `You are StayAssist AI, a premium 5-star hotel concierge. 
Your goal is to provide accurate information based ONLY on the provided context for property-specific questions.

HOTEL: ${finalPropertyName}
UNIT: ${finalUnitName}
LOCATION: ${propAddress || "Address not set"}

CONTEXT:
${knowledgeContext}

DIRETRIZES:
1. Seja cordial e profissional.
2. Utilize o CONTEXTO acima para responder sobre o hotel.
3. Se a informação não estiver no contexto, ofereça ajuda via WhatsApp ou diga que não sabe.
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

    // 6. LLM Streaming (Survival Mode)
    console.log("[SURVIVAL] Starting stream...");
    const result = await streamText({
      model: openrouter("openai/gpt-4o-mini"),
      system: systemPrompt,
      messages,
      onFinish: async ({ text }) => {
        try {
          // WhatsApp Alert (Async)
          if (isGuest && userMessageContent) {
            sendRequestWhatsAppAlert({
              id: "chat-escalation",
              propertyId,
              property: propertyName || unitName || "StayAssist Guest",
              unitId: "chat",
              room: unitName || "Guest",
              type: "help" as any,
              status: "Open",
              createdAt: new Date().toISOString(),
              guestMessage: userMessageContent,
            } as any).catch(e => console.error("[SURVIVAL] WhatsApp error:", e));
          }

          // Save Memory
          await saveMemory({ propertyId, sessionId: activeSession, userType, role: "user", content: userMessageContent })
            .catch(e => console.error("[SURVIVAL] Memory save error (user):", e));
          await saveMemory({ propertyId, sessionId: activeSession, userType, role: "assistant", content: text })
            .catch(e => console.error("[SURVIVAL] Memory save error (assistant):", e));
        } catch (e) {
          console.error("[SURVIVAL] onFinish internal error:", e);
        }
      }
    });

    return result.toTextStreamResponse({ 
      headers: { 
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Is-Rag": sourcesUsed.length > 0 ? "true" : "false"
      } 
    });

  } catch (error: any) {
    console.error("[SURVIVAL] CRITICAL ROUTE ERROR:", error);
    return new Response(`ERRO: ${error.message || "Erro desconhecido"}.`, { 
      status: 200, 
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

