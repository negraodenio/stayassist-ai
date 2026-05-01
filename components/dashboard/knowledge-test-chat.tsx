"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Bot, User, MessageSquare } from "lucide-react";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function KnowledgeTestChat({ propertyId }: { propertyId: string }) {
  const [localInput, setLocalInput] = useState("");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, debugInfo]);

const handleManualSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!localInput.trim() || isLoading) return;

  const timestamp = Date.now();
  const userMsg = { id: `user-${timestamp}`, role: "user", content: localInput.trim() };
  const assistantMsgId = `assistant-${timestamp + 1}`;
  const historySnapshot = messages;

  setMessages([
    ...historySnapshot,
    userMsg,
    { id: assistantMsgId, role: "assistant", content: "" },
  ]);
  setLocalInput("");
  setIsLoading(true);

  // CORRECÇÃO: updater funcional em vez de valor direto — evita race condition
  const updateAssistant = (updater: (prev: string) => string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMsgId ? { ...m, content: updater(m.content) } : m
      )
    );
  };

  const controller = new AbortController();
  // CORRECÇÃO: timeout único cobre ligação + stream completo (30s para admin)
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...historySnapshot, userMsg].map(({ role, content }) => ({
          role,
          content,
        })),
        propertyId,
        sessionId: "admin-debug",
        isGuest: false,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader");

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // CORRECÇÃO: watchdog removido — controller.abort() já cobre o timeout
        if (chunk) updateAssistant((prev) => prev + chunk);
      }
      // CORRECÇÃO: flush final do decoder
      const final = decoder.decode();
      if (final) updateAssistant((prev) => prev + final);
    } finally {
      reader.releaseLock();
    }

  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    updateAssistant(() =>
      isAbort
        ? "Timeout — sem resposta em 30s."
        : `Erro: ${err instanceof Error ? err.message : "desconhecido"}`
    );
  } finally {
    clearTimeout(timeoutId);
    setIsLoading(false);
  }
};

  return (
    <div className="flex flex-col h-[650px] rounded-[24px] border border-border bg-white overflow-hidden shadow-sm">
      <div className="p-5 border-b border-border bg-stone-50/50 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-navy flex items-center justify-center text-white">
          <MessageSquare size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-navy">Test your Knowledge Base</h3>
          <p className="text-xs text-muted">Ask anything to see how the AI uses your RAG data.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
            <Bot size={48} className="mb-4" />
            <p className="text-sm max-w-[200px]">Type a question to test if your uploaded manual is working.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-navy text-white" : "bg-accent-strong text-white"}`}>
                {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed max-w-[85%] ${m.role === "user" ? "bg-navy text-white rounded-tr-none" : "bg-stone-100 text-navy rounded-tl-none"}`}>
                {m.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-accent-strong text-white flex items-center justify-center animate-pulse">
              <Bot size={14} />
            </div>
            <div className="p-3 rounded-2xl bg-stone-100 text-muted text-xs animate-pulse rounded-tl-none">
              AI is searching your manual...
            </div>
          </div>
        )}
        
        {/* Debug Panel - Enterprise Venda */}
        {debugInfo && !isLoading && (
          <div className="mt-4 p-3 bg-stone-100 rounded-xl border border-border text-xs text-navy/80 font-mono">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <Bot size={12} /> AI Logic Trace
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-white p-2 rounded border border-border/50">
                <div className="text-[10px] text-muted uppercase">Memory Chunks</div>
                <div className="font-bold">{debugInfo.debug.memory_used}</div>
              </div>
              <div className="bg-white p-2 rounded border border-border/50">
                <div className="text-[10px] text-muted uppercase">Knowledge Chunks</div>
                <div className="font-bold">{debugInfo.debug.knowledge_used}</div>
              </div>
              <div className="bg-white p-2 rounded border border-border/50">
                <div className="text-[10px] text-muted uppercase">After Rerank</div>
                <div className="font-bold text-accent-strong">{debugInfo.debug.reranked}</div>
              </div>
            </div>
            {debugInfo.sources && debugInfo.sources.length > 0 && (
              <div className="bg-white p-2 rounded border border-border/50 mt-2">
                <div className="text-[10px] text-muted uppercase mb-1">Sources Referenced</div>
                <ul className="list-disc pl-4 space-y-1">
                  {debugInfo.sources.map((src: string, i: number) => (
                    <li key={i}>{src}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleManualSubmit} className="p-4 border-t border-border bg-white">
        <div className="relative">
          <input
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            placeholder="e.g. What is the checkout time?"
            className="w-full rounded-full border border-border bg-stone-50 py-3 pl-5 pr-12 text-sm outline-none focus:border-accent transition"
          />
          <button
            type="submit"
            disabled={isLoading || localInput.trim() === ""}
            className="absolute right-1.5 top-1.5 h-8 w-8 rounded-full bg-navy text-white flex items-center justify-center transition hover:bg-[#1c4755] disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
