/**
 * Single source of truth para geração de embeddings no projeto.
 * Mantendo estrito com o openai/text-embedding-3-small (1536 dimensões)
 * para não corromper o espaço vetorial entre RAG e Memória.
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://stayassist-ai.com",
      "X-Title": "StayAssist AI Concierge",
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
