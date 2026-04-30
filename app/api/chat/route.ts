import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
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
    const { messages, propertyId, unitName } = await req.json();

    if (!propertyId) {
      return new Response("Missing propertyId", { status: 400 });
    }

    // 1. Fetch Knowledge Base for this property
    const supabase = await createClient();
    const { data: knowledge } = await supabase
      .from("property_knowledge")
      .select("topic, content")
      .eq("property_id", propertyId);

    // 2. Build the System Prompt (RAG)
    let knowledgeContext = "No specific rules provided.";
    if (knowledge && knowledge.length > 0) {
      knowledgeContext = knowledge
        .map((k) => `[Topic: ${k.topic}]\n${k.content}`)
        .join("\n\n");
    }

    const systemPrompt = `You are a professional luxury hotel AI Concierge named StayAssist AI.
    
Current context:
- You are assisting the guest staying in ${unitName || "a room"}.
- Be extremely concise, elegant, and helpful. Always adopt a 5-star hospitality tone.

=== HOTEL KNOWLEDGE ===
${knowledgeContext}
=======================

CRITICAL INSTRUCTIONS FOR RECOMMENDATIONS:
1. When a guest asks for local recommendations (restaurants, sights, services):
   - FIRST, check the "HOTEL KNOWLEDGE" section above. If the hotel owner has provided specific recommendations or partners, prioritize these in your answer.
   - SECOND, if the requested information is not in the Hotel Knowledge, or if the guest asks for more variety, use the 'search_nearby_places' tool to fetch live data from Google.
   - ALWAYS prefer the hotel's own suggestions if available.
   - NEVER ignore the hotel knowledge. It represents the owner's curated recommendations and partnerships.

2. If the guest asks about hotel internal policies (wifi, breakfast, checkout):
   - ONLY use the Hotel Knowledge. Do not use external tools.
   - If not found, suggest contacting the front desk.`;

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
