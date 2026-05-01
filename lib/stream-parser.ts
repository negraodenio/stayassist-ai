/**
 * Robust Vercel AI SDK stream parser.
 *
 * The Vercel AI SDK sends responses in a line-based protocol:
 *   0:"token"   → text token (JSON encoded string)
 *   2:[...]     → data annotations
 *   d:{...}     → stream end metadata
 *
 * The key bug this fixes: a single `0:"long text..."` line can be split
 * across multiple network chunks. Naive chunk.split("\n") would discard
 * the partial line's content when JSON.parse fails.
 *
 * Fix: accumulate an incomplete lineBuffer across chunks and only
 * process complete lines (i.e., lines that end with \n).
 */
export async function parseAIStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onContent: (content: string) => void
): Promise<void> {
  const decoder = new TextDecoder();
  let lineBuffer = "";
  let accumulatedContent = "";
  let hasDataStreamLines = false;
  function processLine(line: string) {
    // Technical prefixes from Vercel AI SDK (1: data, 2: tool call, 9: error, etc.)
    const technicalPrefixes = ["1:", "2:", "3:", "4:", "5:", "6:", "7:", "8:", "9:", "a:", "b:", "c:", "d:", "e:", "f:"];
    const isTechnical = technicalPrefixes.some(p => line.startsWith(p));

    if (line.startsWith("0:")) {
      hasDataStreamLines = true;
      try {
        const textToken = JSON.parse(line.substring(2));
        if (typeof textToken === "string" && textToken.trim()) {
          accumulatedContent += textToken;
          onContent(accumulatedContent);
        }
      } catch (e) {
        // Ignore malformed JSON tokens
      }
    } else if (isTechnical) {
      hasDataStreamLines = true;
      // Skip metadata/tool markers — no text to extract for the user
    } else if (!hasDataStreamLines && line.trim().length > 1) {
      // Robust Fallback: only treat as raw text if we haven't detected a DataStream protocol yet
      accumulatedContent += line + "\n";
      onContent(accumulatedContent);
    }
  }

  let done = false;
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;

    if (value) {
      lineBuffer += decoder.decode(value, { stream: true });

      const lines = lineBuffer.split("\n");
      // Keep the last (potentially incomplete) line in the buffer
      lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        processLine(line);
      }
    }
  }

  // Flush any remaining content in the buffer
  if (lineBuffer) {
    processLine(lineBuffer);
  }
}
