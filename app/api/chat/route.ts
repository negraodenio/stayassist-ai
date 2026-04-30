import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { sendRequestWhatsAppAlert } from "@/lib/twilio-whatsapp";
import type { GuestRequestType } from "@/lib/guest-requests";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": "https://stayassist-ai.com",
    "X-Title": "StayAssist AI Concierge",
  },
});

/**
 * Gera embedding para a pergunta do usuário.
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: query,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.data[0].embedding as number[];
}

export async function POST(req: Request) {
  try {
    const { messages, propertyId, unitName } = await req.json();

    if (!propertyId) {
      return new Response("Missing propertyId", { status: 400 });
    }

    const supabase = await createClient();

    // 1. Pega a última mensagem do usuário para buscar no RAG
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    let knowledgeContext = "Nenhuma informação específica encontrada no manual do hotel.";
    let sourcesUsed: string[] = [];

    if (lastUserMessage) {
      try {
        // 2. Gera embedding da pergunta
        const queryEmbedding = await generateQueryEmbedding(lastUserMessage.content);

        // 3. Busca os 5 trechos mais relevantes (Top-K) via RPC pgvector
        const { data: chunks, error: rpcError } = await supabase.rpc("match_property_knowledge", {
          p_property_id: propertyId,
          query_embedding: queryEmbedding,
          match_threshold: 0.5, // Limite de similaridade (ajustável)
          match_count: 5,
        });

        if (rpcError) throw rpcError;

        if (chunks && chunks.length > 0) {
          knowledgeContext = chunks
            .map((c: any, i: number) => `[Fonte: ${c.source_file} - Relevância: ${Math.round(c.similarity * 100)}%]\n${c.content}`)
            .join("\n\n---\n\n");
          sourcesUsed = Array.from(new Set(chunks.map((c: any) => c.source_file as string)));
        }
      } catch (err) {
        console.error("RAG Retrieval error:", err);
      }

      // 4. Notifica o gestor via WhatsApp que há uma nova conversa
      // Criamos um objeto "mock" de request para reusar o helper de Twilio
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

    const systemPrompt = `You are a professional luxury hotel AI Concierge named StayAssist AI.
    
Current context:
- You are assisting the guest staying in ${unitName || "a room"}.
- Be extremely concise, elegant, and helpful. Always adopt a 5-star hospitality tone.

=== CONHECIMENTO RELEVANTE (RAG) ===
Abaixo estão trechos do manual do hotel que podem ajudar a responder a pergunta atual:
${knowledgeContext}
===================================

CRITICAL INSTRUCTIONS:
1. Para perguntas sobre o hotel (regras, horários, serviços, instalações):
   - Use PRIORITARIAMENTE o "CONHECIMENTO RELEVANTE" acima.
   - Se a informação não estiver lá, diga educadamente que não tem essa informação específica e sugira falar com a recepção.

2. Para recomendações locais (restaurantes, lazer):
   - PRIMEIRO, veja se há algo no Conhecimento Relevante acima (recomendações do dono).
   - SEGUNDO, se não houver ou se o hóspede quiser mais, use a ferramenta 'search_nearby_places' (Google).

3. Para perguntas gerais (clima, tradução, dicas de viagem gerais):
   - Use seu próprio conhecimento de IA.`;

    // 3. Define Tools
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: any = {
      search_nearby_places: {
        description: "Search for nearby places (restaurants, attractions, etc) using Google Places API.",
        parameters: z.object({
          query: z.string().describe("The search query (e.g. 'seafood restaurants', 'pharmacy')"),
        }),
        execute: async ({ query }: { query: string }) => {
          const apiKey = process.env.GOOGLE_PLACES_API_KEY;
          if (!apiKey) {
            return "Sorry, I am currently unable to search for external places. Please ask the front desk.";
          }

          try {
            // Using Google Places Text Search (New)
            const response = await fetch(
              "https://places.googleapis.com/v1/places:searchText",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Goog-Api-Key": apiKey,
                  "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
                },
                body: JSON.stringify({
                  textQuery: `${query} near the hotel`,
                  languageCode: "en",
                  maxResultCount: 3,
                }),
              }
            );

            const data = await response.json();
            
            if (!data.places || data.places.length === 0) {
              return "No places found matching the query.";
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return data.places.map((p: any) => 
              `${p.displayName?.text} (Rating: ${p.rating}/5 from ${p.userRatingCount} reviews) - Address: ${p.formattedAddress}`
            ).join("\n");
          } catch (error) {
            console.error("Places API Error:", error);
            return "Error while searching for places.";
          }
        },
      },
    };

    // 4. Stream Response
    const result = streamText({
      model: openrouter("google/gemini-2.0-flash-001"),
      system: systemPrompt,
      messages,
      tools,
      temperature: 0.3,
    });

    // Use a dynamic check for the response method to handle version variations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = result as any;
    if (typeof res.toDataStreamResponse === 'function') {
      return res.toDataStreamResponse();
    }
    if (typeof res.toTextStreamResponse === 'function') {
      return res.toTextStreamResponse();
    }
    return new Response("Streaming result format not recognized", { status: 500 });
  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
