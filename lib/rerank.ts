import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function rerankChunks(question: string, chunks: string[]) {
  // Enterprise Fallback: se houver poucos chunks, não gasta token/tempo com rerank
  if (chunks.length <= 5) {
    return chunks;
  }

  // Deduplication as requested
  const uniqueChunks = [...new Set(chunks)];

  try {
    const result = await generateObject({
      // Usando gemini-2.0-flash via OpenRouter para velocidade/custo garantido
      model: openrouter("google/gemini-2.0-flash-001"),
      schema: z.object({
        selected: z.array(z.string()).describe("Array das strings de conteúdo mais úteis"),
      }),
      prompt: `
        Select the 3 most relevant context chunks to answer the user's question.
        Return ONLY the exact text of the 3 most useful chunks from the provided list.
        
        Question:
        ${question}
        
        Available Chunks:
        ${uniqueChunks.map((c, i) => `[CHUNK ${i}]\n${c}`).join("\n\n")}
      `,
    });

    return result.object.selected;
  } catch (err) {
    console.error("Reranking failed, falling back to unique chunks:", err);
    return uniqueChunks.slice(0, 5); // Fallback seguro
  }
}
