"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Bot, User, Smartphone, CheckCircle2 } from "lucide-react";
import {
  type GuestRequest,
  type GuestRequestType,
  type GuestUnit,
} from "@/lib/guest-requests";
import { translations, type SupportedLanguage } from "@/lib/translations";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isRAG?: boolean;
}

type RequestState = "idle" | "loading" | "saving" | "error";

type GuestRequestAppProps = {
  token?: string;
};

export function GuestRequestApp({ token }: GuestRequestAppProps) {
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [unit, setUnit] = useState<GuestUnit | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [state, setState] = useState<RequestState>("loading");
  const [pendingType, setPendingType] = useState<GuestRequestType | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lang, setLang] = useState<SupportedLanguage>("en");

  // Chat state (manual fetch — avoids useChat SDK version bugs)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId] = useState(() => token || "guest-session-" + Math.random().toString(36).substring(7));

  const t = translations[lang];

  useEffect(() => {
    // Detect language
    const browserLang = navigator.language.split("-")[0] as SupportedLanguage;
    if (translations[browserLang]) {
      setLang(browserLang);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadGuestData() {
      try {
        let unitIdToFetch: string | undefined;

        if (token) {
          const unitResponse = await fetch(`/api/guest-unit/${token}`);
          if (!unitResponse.ok) {
            const payload = (await unitResponse.json().catch(() => ({}))) as {
              message?: string;
            };
            throw new Error(payload.message || "Guest stay not found.");
          }

          const unitPayload = (await unitResponse.json()) as {
            unit: GuestUnit;
          };

          setUnit(unitPayload.unit);
          unitIdToFetch = unitPayload.unit?.id;
          setNotice(null);
        } else {
          const unitResponse = await fetch("/api/guest-options");
          const optionsPayload = (await unitResponse.json()) as {
            units: GuestUnit[];
          };

          setUnit(optionsPayload.units[0] || null);
          unitIdToFetch = optionsPayload.units[0]?.id;
          setNotice("Demo guest link. Scan a room QR code for an assigned stay.");
        }

        if (unitIdToFetch) {
          const requestsResponse = await fetch(`/api/requests?unitId=${unitIdToFetch}`);
          if (!requestsResponse.ok) {
            throw new Error("Unable to load guest requests.");
          }
          const requestsPayload = (await requestsResponse.json()) as {
            requests: GuestRequest[];
          };
          setRequests(requestsPayload.requests);
        }
        setState("idle");
      } catch (error) {
        if (!active) return;
        setNotice(error instanceof Error ? error.message : "Unable to load data.");
        setState("error");
      }
    }

    loadGuestData();
    return () => { active = false; };
  }, [token]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !unit) return;
    
    const userMessageContent = chatInput;
    const userMessage: ChatMessage = { id: Date.now().toString(), role: "user", content: userMessageContent };
    const assistantId = (Date.now() + 1).toString();
    
    // Maintain local copy for immediate API call to avoid state lag/duplication
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages([...updatedMessages, { id: assistantId, role: "assistant", content: "", isRAG: false }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const sanitizedMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "text/event-stream, text/plain"
        },
        body: JSON.stringify({
          messages: sanitizedMessages,
          propertyId: unit.propertyId,
          propertyName: unit.propertyName,
          unitName: unit.name,
          sessionId: sessionId, // Use the stable sessionId state
          isGuest: true,
        }),
      });

      if (!response.ok) throw new Error("Network error");

      const isRAG = response.headers.get("X-Is-Rag") === "true";
      if (isRAG) {
        setChatMessages(prev => prev.map(m => m.id === assistantId ? { ...m, isRAG: true } : m));
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const { parseAIStream } = await import("@/lib/stream-parser");
      let hasReceivedContent = false;

      await parseAIStream(reader, (content) => {
        hasReceivedContent = true;
        setChatMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content } : m)
        );
      });

      if (!hasReceivedContent) {
        setChatMessages(prev =>
          prev.map(m => m.id === assistantId ? { 
            ...m, 
            content: "O concierge está muito solicitado agora. Gostaria de falar diretamente com a nossa equipa via WhatsApp?" 
          } : m)
        );
      }

    } catch (err) {
      console.error("Chat error:", err);
      const errorId = (Date.now() + 2).toString();
      setChatMessages(prev => [...prev, { 
        id: errorId, 
        role: "assistant", 
        content: "ERROR_FALLBACK", 
        isRAG: false 
      }]);
    } finally {
      setChatLoading(false);
    }

  }

  async function refreshRequests() {
    if (!unit) return;
    const response = await fetch(`/api/requests?unitId=${unit.id}`);
    if (!response.ok) return;
    const payload = (await response.json()) as { requests: GuestRequest[]; };
    setRequests(payload.requests);
  }

  async function handleCreateRequest(type: GuestRequestType) {
    if (!unit) return;

    setState("saving");
    setPendingType(type);
    setNotice(null);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: unit.organizationId,
          propertyId: unit.propertyId,
          unitId: unit.id,
          type,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string; };
        throw new Error(payload.message || "Unable to create request.");
      }

      const payload = (await response.json()) as { request: GuestRequest };
      setLastCreatedId(payload.request.id);
      await refreshRequests();
      setState("idle");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create request.");
      setState("error");
    } finally {
      setPendingType(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-stretch">
        
        {/* Left Column: UI and Requests */}
        <div className="flex flex-col gap-6">
          <section className="glass-panel rounded-[32px] p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
                  STAYASSIST GUEST
                </p>
                <h1 className="mt-4 font-display text-5xl tracking-tight text-navy sm:text-6xl">
                  {t.welcome}
                </h1>
                <p className="mt-5 max-w-md text-sm leading-8 text-muted">
                  {t.subtitle}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-1.5 rounded-2xl bg-stone-100/50 p-1.5">
                {(Object.keys(translations) as SupportedLanguage[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold uppercase transition ${
                      lang === l ? "bg-navy text-white shadow-md shadow-navy/20" : "text-muted hover:bg-stone-200"
                    }`}
                  >
                    {l === "en" ? "EN" : l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <article className="mt-10 rounded-[28px] border border-border bg-white/75 p-6 sm:p-8 luxury-ring">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-strong">
                {t.yourStay}
              </p>
              <h2 className="mt-4 font-display text-4xl text-navy sm:text-5xl">
                {unit?.propertyName || "Loading stay..."}
              </h2>
              <p className="mt-2 text-xl font-semibold text-muted">
                {unit?.name || "..."}
              </p>
              <p className="mt-5 text-sm leading-7 text-muted">
                {t.assignedRoom}
              </p>
            </article>

            {notice && (
              <div className="mt-6 rounded-2xl border border-border bg-white/80 p-4 text-sm text-muted">
                {notice}
              </div>
            )}
          </section>

          <section className="glass-panel rounded-[32px] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-strong">
              {t.requestCards}
            </p>
            <h2 className="mt-3 font-display text-4xl text-navy">
              {t.howCanWeHelp}
            </h2>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { id: "emergency", label: t.emergency, desc: t.emergencyDesc, isUrgent: true },
                { id: "towels", label: t.towels, desc: t.towelsDesc },
                { id: "cleaning", label: t.cleaning, desc: t.cleaningDesc },
                { id: "issue", label: t.issue, desc: t.issueDesc },
                { id: "help", label: t.help, desc: t.helpDesc },
              ].map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCreateRequest(card.id as GuestRequestType)}
                  disabled={state === "saving" || state === "loading" || !unit}
                  className={`group rounded-[26px] border p-5 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 ${
                    card.isUrgent 
                      ? "border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-400 luxury-ring-red" 
                      : "border-border bg-white/82 hover:border-accent hover:bg-white luxury-ring"
                  }`}
                >
                  <h3 className={`font-display text-2xl ${card.isUrgent ? "text-red-700" : "text-navy"}`}>
                    {card.label}
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-muted">
                    {card.desc}
                  </p>
                  <span className={`mt-5 inline-flex rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition ${
                    card.isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-navy hover:bg-[#1c4755]"
                  }`}>
                    {pendingType === card.id ? t.creating : t.createRequest}
                  </span>
                </button>
              ))}

            </div>
          </section>

          {requests.length > 0 && (
            <section className="glass-panel rounded-[32px] p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-strong">
                {t.recentRequests}
              </p>
              <div className="mt-6 grid gap-3">
                {requests.map((req) => (
                  <article
                    key={req.id}
                    className={`flex items-center justify-between rounded-[22px] border border-border bg-white/82 p-4 transition ${
                      req.id === lastCreatedId ? "luxury-ring border-accent" : ""
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-navy">
                        {translations[lang][req.type as keyof typeof translations[SupportedLanguage]] || req.type}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted mt-1">
                        {new Date(req.createdAt).toLocaleString(lang, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        req.status === "Open"
                          ? "bg-accent/10 text-accent-strong"
                          : "bg-success/10 text-success"
                      }`}
                    >
                      {req.status}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: AI Chat */}
        <section className="glass-panel flex flex-col overflow-hidden rounded-[32px]">
          <div className="border-b border-border bg-stone-50/50 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-strong">
              {t.chatTitle}
            </p>
            <h2 className="mt-3 font-display text-3xl text-navy">
              StayAssist AI
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {t.chatSubtitle}
            </p>
          </div>

          <div className="flex flex-1 flex-col bg-white/40 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <div className="space-y-6">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-muted text-sm mt-20">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="max-w-[200px] mx-auto text-muted/60">{t.chatSubtitle}</p>
                  </div>
                ) : (
                  chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex gap-3 ${
                        m.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
                        m.role === "user" ? "bg-navy text-white" : "bg-accent-strong text-white"
                      }`}>
                        {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className="flex flex-col gap-1 max-w-[85%]">
                        <div
                          className={`rounded-[22px] px-5 py-3 text-sm leading-7 shadow-sm ${
                            m.role === "user"
                              ? "bg-navy text-white rounded-tr-none"
                              : m.content === "ERROR_FALLBACK" || m.content.includes("concierge está ocupado")
                              ? "bg-red-50 border border-red-100 text-red-900 rounded-tl-none"
                              : "bg-white border border-border text-navy rounded-tl-none"
                          }`}
                        >
                          {m.content === "ERROR_FALLBACK" || m.content.includes("concierge está ocupado") ? (
                            <div className="flex flex-col gap-4">
                              <p className="font-semibold text-red-800">
                                {lang === "pt" 
                                  ? "O concierge está muito solicitado agora." 
                                  : "The concierge is very busy right now."}
                              </p>
                              <p className="text-xs opacity-80 leading-5">
                                {lang === "pt"
                                  ? "Gostaria de falar diretamente com a nossa equipa via WhatsApp?"
                                  : "Would you like to speak directly with our team via WhatsApp?"}
                              </p>
                              <a 
                                href={`https://wa.me/5511999999999?text=${encodeURIComponent(`Olá, estou no ${unit?.propertyName || "Hotel"} (Unidade: ${unit?.name || "Guest"}) e preciso de suporte.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-xs font-bold text-white transition hover:scale-[1.02] active:scale-95 shadow-sm"
                                onClick={(e) => {
                                  // No PWA, às vezes o target _blank falha, vamos reforçar
                                  if ((window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches) {
                                    window.open(e.currentTarget.href, '_blank');
                                  }
                                }}
                              >
                                <Smartphone size={14} /> WhatsApp Support
                              </a>
                            </div>
                          ) : m.content ? (
                            m.content
                          ) : chatLoading ? (
                            <div className="flex items-center gap-3 py-2">
                              <div className="flex gap-1">
                                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/30 [animation-delay:-0.3s]"></div>
                                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/30 [animation-delay:-0.15s]"></div>
                                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/30"></div>
                              </div>
                              <span className="text-[10px] font-medium uppercase tracking-wider text-muted/60 animate-pulse">
                                {lang === "pt" ? "Concierge está a pesquisar..." : "Concierge is searching..."}
                              </span>
                            </div>
                          ) : (
                            "..."
                          )}
                        </div>
                        {/* Trust Badge para RAG */}
                        {m.role === "assistant" && m.isRAG && m.content !== "ERROR_FALLBACK" && !m.content.includes("concierge está ocupado") && (
                          <div className="flex items-center gap-1 text-[10px] text-muted/70 pl-3">
                            <CheckCircle2 size={10} /> Based on property information
                          </div>
                        )}

                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white shadow-sm">
                      <Bot size={14} />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-[22px] border border-border bg-white px-5 py-4 shadow-sm rounded-tl-none">
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-strong [animation-delay:-0.3s]"></div>
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-strong [animation-delay:-0.15s]"></div>
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-strong"></div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <form
              onSubmit={handleChatSubmit}
              className="border-t border-border bg-white p-4 sm:p-6"
            >
              <div className="relative flex items-center">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t.chatPlaceholder}
                  disabled={chatLoading || !unit?.propertyId}
                  className="w-full rounded-full border border-border bg-stone-50 py-4 pl-6 pr-14 text-sm outline-none transition focus:border-accent luxury-ring disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim() || !unit?.propertyId}
                  className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-navy text-white transition hover:bg-[#1c4755] disabled:opacity-45"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="mt-3 text-center text-[10px] text-muted/60 flex items-center justify-center gap-1">
                <Smartphone size={10} /> StayAssist AI Concierge • Multilingual 5-Star Support
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
