"use client";

import { useActionState } from "react";
import { setupHotelAndUnits, addKnowledgeSnippet, uploadKnowledgeFile } from "@/app/dashboard/actions";
import { signOut } from "@/app/login/actions";
import { formatDistanceToNow } from "date-fns";
import { KnowledgeTestChat } from "./knowledge-test-chat";

const navigationItems = [
  { id: "overview", label: "Overview", short: "OV", href: "/dashboard#overview" },
  { id: "requests", label: "Requests", short: "RQ", href: "/dashboard/requests" },
  { id: "qr", label: "QR Codes", short: "QR", href: "/dashboard/qr" },
  { id: "properties", label: "Properties", short: "PR", href: "/dashboard#properties" },
  { id: "knowledge", label: "Knowledge Base", short: "KB", href: "/dashboard#knowledge" },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-strong">
        {eyebrow}
      </p>
      <h2 className="font-display text-3xl tracking-tight text-navy">{title}</h2>
      <p className="max-w-2xl text-sm leading-7 text-muted">{description}</p>
    </div>
  );
}

interface DashboardProperty {
  id: string;
  name: string;
  organization_id: string;
}

interface DashboardRequest {
  id: string;
  guest: string;
  property: string;
  type: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface DashboardKnowledge {
  id: string;
  property_id: string;
  topic: string;
  content: string;
  source_file?: string;
  created_at: string;
}

export function DashboardShell({
  properties,
  unitsCount,
  recentRequests,
  knowledge,
}: {
  properties: DashboardProperty[];
  unitsCount: number;
  recentRequests: DashboardRequest[];
  knowledge: DashboardKnowledge[];
}) {
  const [selectedPropertyId, setSelectedPropertyId] = (typeof window !== 'undefined') 
    ? require('react').useState(properties[0]?.id || "")
    : ["", () => {}];

  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || properties[0];

  const filteredKnowledge = knowledge.filter(k => k.property_id === selectedPropertyId);

  const [setupState, setupAction, isSetupPending] = useActionState(
    setupHotelAndUnits,
    null
  );

  const [_addKnowledgeState, addKnowledgeAction, isAddKnowledgePending] = useActionState(
    addKnowledgeSnippet,
    null
  );

  const [uploadState, uploadAction, isUploadPending] = useActionState(
    uploadKnowledgeFile,
    null
  );

  const activeRequestsCount = recentRequests.filter(
    (r) => r.status !== "Completed" && r.status !== "Cancelled"
  ).length;

  const metrics = [
    {
      label: "Properties",
      value: properties.length.toString(),
      detail: "Active in portfolio",
    },
    {
      label: "Total Units",
      value: unitsCount.toString(),
      detail: "Managed rooms/suites",
    },
    {
      label: "Recent Requests",
      value: recentRequests.length.toString(),
      detail: `${activeRequestsCount} currently active`,
    },
  ];

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl gap-4 lg:gap-6">
        <aside className="glass-panel hidden w-80 shrink-0 rounded-[28px] p-6 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
                StayAssist AI
              </p>
              <h1 className="mt-2 font-display text-3xl text-navy">Operations</h1>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-sm font-semibold text-white">
              SA
            </div>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = typeof window !== "undefined" && window.location.hash === item.href.split("#")[1] || (item.id === "overview" && (typeof window !== "undefined" && !window.location.hash));
              
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition hover:bg-white/70 ${
                    isActive ? "bg-white text-navy luxury-ring" : "text-muted"
                  }`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-xs font-semibold tracking-[0.2em] text-accent-strong">
                    {item.short}
                  </span>
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-xs uppercase tracking-[0.24em] opacity-70">Module</p>
                  </div>
                </a>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-muted transition hover:bg-red-50 hover:text-red-600"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-xs font-semibold tracking-[0.2em]">
                LO
              </span>
              <div>
                <p className="font-semibold text-left">Logout</p>
                <p className="text-xs uppercase tracking-[0.24em] opacity-70">Exit Session</p>
              </div>
            </button>
          </div>
        </aside>

        <main className="glass-panel flex-1 rounded-[30px] p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
                Concierge Command Center
              </p>
              <h1 className="mt-2 font-display text-4xl tracking-tight text-navy sm:text-5xl">
                Dashboard
              </h1>
            </div>
          </div>

          {properties.length === 0 ? (
            <section className="pt-12 pb-8 max-w-xl mx-auto">
              <div className="rounded-[24px] border border-border bg-white p-8 shadow-sm">
                <SectionHeading
                  eyebrow="Initial Setup"
                  title="Create your first property"
                  description="Your database is ready. Let's create your hotel and automatically generate the units so you can start testing."
                />
                
                <form action={setupAction} className="mt-8 flex flex-col gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-navy">
                      Property Name
                    </label>
                    <input
                      name="hotelName"
                      type="text"
                      required
                      placeholder="e.g. Monarch Bay Hotel"
                      className="w-full rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-navy">
                      Number of Units/Rooms
                    </label>
                    <input
                      name="unitsCount"
                      type="number"
                      required
                      min="1"
                      max="200"
                      defaultValue="10"
                      className="w-full rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-accent"
                    />
                    <p className="mt-2 text-xs text-muted">
                      We will automatically generate rooms named &quot;Room 101&quot;, &quot;Room 102&quot;, etc.
                    </p>
                  </div>

                  {setupState?.error && (
                    <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                      {setupState.error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSetupPending}
                    className="mt-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1c4755] disabled:opacity-50"
                  >
                    {isSetupPending ? "Initializing..." : "Create Property & Units"}
                  </button>
                </form>
              </div>
            </section>
          ) : (
            <>
              <section id="overview" className="pt-8">
                <SectionHeading
                  eyebrow="Overview"
                  title="Live Operations"
                  description="A premium control layer for reservations, concierge, and guest service operations with AI-guided actions."
                />
                <div className="section-grid mt-6 grid gap-4">
                  {metrics.map((metric) => (
                    <article
                      key={metric.label}
                      className="rounded-[24px] border border-border bg-white/80 p-5"
                    >
                      <p className="text-sm text-muted">{metric.label}</p>
                      <p className="mt-4 font-display text-5xl text-navy">{metric.value}</p>
                      <p className="mt-3 text-sm font-medium text-navy/70">{metric.detail}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section id="requests" className="pt-10">
                <SectionHeading
                  eyebrow="Requests"
                  title="Recent guest requests"
                  description="Track inbound requests, expected fulfillment time, and service priority from one elegant workflow."
                />
                
                {recentRequests.length === 0 ? (
                  <div className="mt-6 rounded-[24px] border border-border bg-white/50 p-8 text-center text-muted">
                    No requests found. Scan a QR code to create one!
                  </div>
                ) : (
                  <div className="mt-6 overflow-hidden rounded-[26px] border border-border bg-white/82">
                    <div className="grid grid-cols-4 gap-4 border-b border-border px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      <span>Guest Unit</span>
                      <span>Request</span>
                      <span>Status</span>
                      <span>Time</span>
                    </div>
                    {recentRequests.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-2 gap-4 border-b border-border/70 px-5 py-4 text-sm text-navy last:border-b-0 sm:grid-cols-4 items-center"
                      >
                        <span className="font-semibold">{row.guest}</span>
                        <span className="capitalize">{row.type}</span>
                        <span className={`px-2 py-1 rounded-full text-xs max-w-fit font-medium ${
                          row.status === "Completed" ? "bg-green-100 text-green-700" :
                          row.status === "In Progress" ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {row.status}
                        </span>
                        <span className="text-muted text-xs">
                          {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="/dashboard/requests"
                    className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1c4755]"
                  >
                    Open request board
                  </a>
                </div>
              </section>

              <section id="properties" className="pt-10">
                <SectionHeading
                  eyebrow="Properties"
                  title="Portfolio visibility"
                  description="Active properties currently managed by StayAssist."
                />
                <div className="section-grid mt-6 grid gap-4">
                  {properties.map((property) => (
                    <article
                      key={property.id}
                      className="rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,238,229,0.9))] p-5"
                    >
                      <h3 className="font-display text-2xl text-navy">{property.name}</h3>
                      <div className="mt-5 flex items-center justify-between text-sm text-muted">
                        <span>Managed via StayAssist AI</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section id="knowledge" className="pt-10">
                <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <SectionHeading
                    eyebrow="AI Concierge"
                    title="Knowledge Base"
                    description="Add rules, hours, and information that the AI Concierge will use to answer guest questions."
                  />
                  
                  <div className="flex flex-col gap-2 min-w-[240px]">
                    <label className="text-xs font-bold uppercase tracking-wider text-accent-strong">Active Property</label>
                    <select 
                      value={selectedPropertyId}
                      onChange={(e) => setSelectedPropertyId(e.target.value)}
                      className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-navy luxury-ring outline-none"
                    >
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <div className="flex flex-col gap-6">
                    <div className="rounded-[24px] border border-border bg-white p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-navy mb-4">Add Information to {selectedProperty?.name}</h3>
                      <form action={addKnowledgeAction} className="flex flex-col gap-4">
                        <input type="hidden" name="propertyId" value={selectedPropertyId} />

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-navy">Topic</label>
                          <input
                            name="topic"
                            type="text"
                            required
                            placeholder="e.g. Breakfast Hours"
                            className="w-full rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-accent"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-navy">Content</label>
                          <textarea
                            name="content"
                            required
                            rows={4}
                            placeholder="e.g. Breakfast is served from 07:00 to 10:30 at the main restaurant."
                            className="w-full rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-accent resize-none"
                          ></textarea>
                        </div>
                        <button
                          type="submit"
                          disabled={isAddKnowledgePending}
                          className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1c4755] disabled:opacity-50"
                        >
                          {isAddKnowledgePending ? "Saving..." : "Save Information"}
                        </button>
                      </form>
                    </div>

                    <div className="rounded-[24px] border border-border bg-stone-50/50 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-navy mb-4">Upload Document</h3>
                      <p className="text-xs text-muted mb-4">Upload a PDF or TXT file to train the AI for {selectedProperty?.name}.</p>
                      <form action={uploadAction} className="flex flex-col gap-4">
                        <input type="hidden" name="propertyId" value={selectedPropertyId} />

                        <input
                          name="file"
                          type="file"
                          required
                          accept=".pdf,.txt"
                          className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-[#1c4755]"
                        />
                        {uploadState?.error && (
                          <p className="text-xs text-red-600">{uploadState.error}</p>
                        )}
                        <button
                          type="submit"
                          disabled={isUploadPending}
                          className="rounded-xl border border-navy px-4 py-3 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white disabled:opacity-50"
                        >
                          {isUploadPending ? "Processing..." : "Upload & Parse Document"}
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {selectedPropertyId && (
                      <KnowledgeTestChat propertyId={selectedPropertyId} />
                    )}
                    
                    <div className="mt-2">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-accent-strong mb-4">Existing Knowledge ({filteredKnowledge.length})</h3>
                      <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredKnowledge.length === 0 ? (
                          <div className="rounded-[24px] border border-dashed border-border bg-white/50 p-8 text-center text-muted">
                            No knowledge added for this property.
                          </div>
                        ) : (
                          filteredKnowledge.map((item) => (
                            <div key={item.id} className="group relative rounded-2xl border border-border bg-white/60 p-4 text-xs transition hover:bg-white hover:shadow-md">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-navy">{item.topic}</h4>
                                <button
                                  onClick={async () => {
                                    if (confirm("Delete this information?")) {
                                      const m = await import("@/app/dashboard/actions");
                                      await m.deleteKnowledgeSnippet(item.id);
                                      window.location.reload();
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-600 transition"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                              <p className="text-muted leading-relaxed line-clamp-3">{item.content}</p>
                              {item.source_file && (
                                <span className="mt-2 block text-[10px] text-accent-strong font-medium">Source: {item.source_file}</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
