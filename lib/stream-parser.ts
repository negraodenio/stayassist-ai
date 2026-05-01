export async function parseAIStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onContent: (content: string) => void
): Promise<void> {
  const decoder = new TextDecoder();
  let lineBuffer = "";
  let accumulatedContent = "";
  let detectedProtocol = false;

  function processLine(line: string) {
    // Vercel AI SDK Protocol: 0:"token", 1:[data], 2:[tool], etc.
    if (line.startsWith('0:"')) {
      detectedProtocol = true;
      try {
        const textToken = JSON.parse(line.substring(2));
        if (typeof textToken === "string") {
          accumulatedContent += textToken;
          onContent(accumulatedContent);
        }
      } catch (e) { /* skip */ }
    } else if (line.match(/^[0-9a-f]:/)) {
      detectedProtocol = true; // Other technical lines
    } else if (!detectedProtocol && line.trim().length > 0) {
      // Fallback for non-protocol or raw text streams
      accumulatedContent += line + "\n";
      onContent(accumulatedContent.trim());
    }
  }

  let done = false;
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;

    if (value) {
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";
      for (const line of lines) {
        processLine(line);
      }
    }
  }

  if (lineBuffer) {
    processLine(lineBuffer);
  }
}
