"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  addKnowledgeSnippet,
  setupHotelAndUnits,
  updateWhatsAppAlertPhone,
  uploadKnowledgeFile,
  sendTestWhatsAppAlert,
  createProperty,
  createOrganization,
} from "@/app/dashboard/actions";
import { KanbanBoard } from "./kanban-board";
import { signOut } from "@/app/login/actions";
import { formatDistanceToNow } from "date-fns";
import { KnowledgeTestChat } from "./knowledge-test-chat";
import { QrManagement } from "./qr-management";
import { AdminForms } from "../admin/admin-forms";

const navigationItems = [
  { id: "overview", label: "Overview", short: "OV" },
  { id: "requests", label: "Requests", short: "RQ" },
  { id: "qr", label: "QR Codes", short: "QR" },
  { id: "properties", label: "Properties", short: "PR" },
  { id: "knowledge", label: "Knowledge Base", short: "KB" },
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
  address?: string;
  latitude?: number;
  longitude?: number;
  zip_code?: string;
}

interface DashboardRequest {
  id: string;
  unit: string;
  property: string;
  type: any;
  status: any;
  createdAt: string;
  assignedTo?: string | null;
  issue?: string | null;
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
  whatsappAlertPhone,
  hasTwilioContentSid,
  userEmail,
  metrics,
  allOrganizations,
  allProfiles,
}: {
  properties: DashboardProperty[];
  unitsCount: number;
  recentRequests: DashboardRequest[];
  knowledge: DashboardKnowledge[];
  whatsappAlertPhone?: string;
  hasTwilioContentSid?: boolean;
  userEmail?: string;
  metrics: {
    today: number;
    week: number;
    typeCounts: Record<string, number>;
    topIssues: { topic: string; count: number }[];
  };
  allOrganizations?: any[];
  allProfiles?: any[];
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || "");

  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || properties[0];
  const filteredKnowledge = knowledge.filter(k => k.property_id === selectedPropertyId);

  const [setupState, setupAction, isSetupPending] = useActionState(setupHotelAndUnits, null);
  const [, addKnowledgeAction, isAddKnowledgePending] = useActionState(addKnowledgeSnippet, null);
  const [uploadState, uploadAction, isUploadPending] = useActionState(uploadKnowledgeFile, null);
  const [whatsAppState, whatsAppAction, isWhatsAppPending] = useActionState(updateWhatsAppAlertPhone, null);

  const [isTestPending, setIsTestPending] = useState(false);
  const [testResult, setTestResult] = useState<{ error?: string; success?: boolean; message?: string } | null>(null);

  const [createPropState, createPropAction, isCreatePropPending] = useActionState(createProperty, null);
  const [createOrgState, createOrgAction, isCreateOrgPending] = useActionState(createOrganization, null);

  const organizationId = properties[0]?.organization_id || "";

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl gap-4 lg:gap-6">
        
        {/* Sidebar */}
        <aside className="glass-panel hidden w-80 shrink-0 rounded-[28px] p-6 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">Malia Concierge</p>
              <h1 className="mt-2 font-display text-3xl text-navy">Operations</h1>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-sm font-semibold text-white">MC</div>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 rounded-2xl px-4 py-3 transition hover:bg-white/70 ${
                  activeTab === item.id ? "bg-white text-navy luxury-ring shadow-sm" : "text-muted"
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-xs font-semibold tracking-[0.2em] text-accent-strong">
                  {item.short}
                </span>
                <div className="text-left">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-xs uppercase tracking-[0.24em] opacity-70">Module</p>
                </div>
              </button>
            ))}
            
            {userEmail === "negraodenio@gmail.com" && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`w-full flex items-center gap-4 rounded-2xl px-4 py-3 transition hover:bg-amber-500/10 ${
                  activeTab === "admin" ? "bg-amber-500/10 text-amber-600 luxury-ring" : "text-muted"
                }`}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-semibold tracking-[0.2em] ${
                  activeTab === "admin" ? "bg-amber-500 text-white" : "bg-amber-500/20 text-amber-600"
                }`}>MA</span>
                <div className="text-left">
                  <p className="font-semibold italic">Master Admin</p>
                  <p className="text-xs uppercase tracking-[0.24em] opacity-70 italic">Control Panel</p>
                </div>
              </button>
            )}
          </nav>

          <div className="mt-auto pt-8">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-muted transition hover:bg-red-50 hover:text-red-600"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-xs font-semibold tracking-[0.2em]">LO</span>
              <div className="text-left">
                <p className="font-semibold">Logout</p>
                <p className="text-xs uppercase tracking-[0.24em] opacity-70">Exit Session</p>
              </div>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="glass-panel flex-1 rounded-[30px] p-5 sm:p-7 lg:p-8 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">Concierge Command Center</p>
              <h1 className="mt-2 font-display text-4xl tracking-tight text-navy sm:text-5xl">Dashboard</h1>
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
                    <label className="mb-2 block text-sm font-semibold text-navy">Property Name</label>
                    <input name="hotelName" type="text" required placeholder="e.g. Monarch Bay Hotel" className="w-full rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-accent" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-navy">Number of Units/Rooms</label>
                    <input name="unitsCount" type="number" required min="1" max="200" defaultValue="10" className="w-full rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-accent" />
                  </div>
                  {setupState?.error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{setupState.error}</div>}
                  <button type="submit" disabled={isSetupPending} className="mt-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1c4755] disabled:opacity-50">
                    {isSetupPending ? "Initializing..." : "Create Property & Units"}
                  </button>
                </form>
              </div>
            </section>
          ) : (
            <div className="mt-8 space-y-12">
              
              {/* --- OVERVIEW TAB --- */}
              {activeTab === "overview" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <SectionHeading eyebrow="Overview" title="Live Operations" description="Real-time control layer for guest service operations." />
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard title="Requests Today" value={metrics.today} color="bg-amber-400" />
                    <MetricCard title="Last 7 Days" value={metrics.week} color="bg-blue-400" />
                    <MetricCard title="Properties" value={properties.length} color="bg-purple-400" />
                    <MetricCard title="Total Units" value={unitsCount} color="bg-emerald-400" />
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {/* Service distribution */}
                    <div className="glass-panel rounded-[32px] bg-white/40 p-8 luxury-ring">
                      <h3 className="font-display text-2xl font-bold text-navy mb-6">Service Distribution</h3>
                      <div className="space-y-4">
                        {Object.entries(metrics.typeCounts).length > 0 ? (
                          Object.entries(metrics.typeCounts).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between group">
                              <span className="text-sm font-medium text-navy capitalize">{type.replace('_', ' ')}</span>
                              <span className="font-mono text-sm font-bold text-navy">{count}</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-10 text-center">
                            <p className="text-xs italic text-muted">No service requests yet. This will show the distribution of guest needs.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Top Maintenance Issues */}
                    <div className="glass-panel rounded-[32px] bg-white/40 p-8 luxury-ring">
                      <div className="mb-6 flex items-center justify-between">
                        <h3 className="font-display text-2xl font-bold text-navy">Top Issues</h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Action Required</span>
                      </div>
                      <div className="space-y-4">
                        {metrics.topIssues.length > 0 ? (
                          metrics.topIssues.map((issue, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                              <span className="text-sm font-medium text-navy">{issue.topic}</span>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold shadow-sm">{issue.count} cases</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-10 text-center">
                            <p className="text-xs italic text-muted">No maintenance issues reported yet. This section tracks frequent guest complaints.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Alerts Configuration */}
                  <div className="mt-6 rounded-[24px] border border-border bg-white/80 p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-strong">WhatsApp Alerts</p>
                        <h3 className="mt-2 font-display text-2xl text-navy">Tenant notification phone</h3>
                        <p className="mt-2 max-w-2xl text-sm text-muted">Guest requests from this organization will be sent to this WhatsApp number.</p>
                      </div>
                      <form action={whatsAppAction} className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[360px]">
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <input name="whatsappAlertPhone" type="tel" defaultValue={whatsappAlertPhone || ""} placeholder="+351..." className="w-full rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-accent" />
                          <div className="flex gap-2">
                            <button type="submit" disabled={isWhatsAppPending} className="flex-1 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1c4755] disabled:opacity-50">
                              {isWhatsAppPending ? "Saving..." : "Save"}
                            </button>
                            {whatsappAlertPhone && (
                              <button
                                type="button"
                                disabled={isTestPending}
                                onClick={async () => {
                                  setIsTestPending(true);
                                  setTestResult(null);
                                  try {
                                    const res = await sendTestWhatsAppAlert(organizationId, whatsappAlertPhone);
                                    setTestResult(res);
                                  } catch (e) {
                                    setTestResult({ error: "Failed to trigger test." });
                                  } finally {
                                    setIsTestPending(false);
                                  }
                                }}
                                className="flex-1 rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-navy hover:bg-stone-50 transition"
                              >
                                {isTestPending ? "..." : "Test"}
                              </button>
                            )}
                          </div>
                        </div>
                        {testResult?.success && <p className="text-[10px] text-green-600 font-medium">{testResult.message}</p>}
                        {!hasTwilioContentSid && <p className="text-[10px] text-amber-600 italic">Note: Missing WhatsApp Template SID.</p>}
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* --- REQUESTS TAB (KANBAN) --- */}
              {activeTab === "requests" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <SectionHeading eyebrow="Operations" title="Operational Board" description="Manage guest requests in real-time." />
                  <KanbanBoard initialRequests={recentRequests as any} />
                </div>
              )}

              {/* --- PROPERTIES TAB --- */}
              {activeTab === "properties" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <SectionHeading eyebrow="Properties" title="Portfolio visibility" description="Manage your property locations and settings." />
                  <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {properties.map((property) => (
                          <article
                            key={property.id}
                            className={`rounded-[24px] border p-6 transition cursor-pointer ${
                              selectedPropertyId === property.id ? "border-accent bg-white shadow-md luxury-ring" : "border-border bg-white/60 hover:bg-white"
                            }`}
                            onClick={() => setSelectedPropertyId(property.id)}
                          >
                            <h3 className="font-display text-2xl text-navy">{property.name}</h3>
                            <p className="mt-2 text-[10px] text-muted">ID: {property.id}</p>
                            <div className="mt-6 flex items-center justify-between text-xs text-muted">
                              <span className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${property.latitude ? "bg-emerald-500" : "bg-stone-300"}`}></span>
                                {property.latitude ? "Location Set" : "Pending"}
                              </span>
                            </div>
                          </article>
                        ))}
                      </div>

                      {/* Register New Property Form */}
                      <div className="rounded-[28px] border border-border bg-stone-50/50 p-8">
                        <h3 className="text-xl font-display text-navy mb-6">Register New Property</h3>
                        <form action={createPropAction} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <input type="hidden" name="organizationId" value={organizationId} />
                          <div>
                            <label className="mb-2 block text-xs font-bold uppercase text-navy">Property Name</label>
                            <input name="name" type="text" required placeholder="e.g. Malia Beach Resort" className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none" />
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-bold uppercase text-navy">Initial Units</label>
                            <input name="unitsCount" type="number" defaultValue="10" className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none" />
                          </div>
                          <div className="md:col-span-2">
                            {createPropState?.error && <p className="text-xs text-red-500 mb-2">{createPropState.error}</p>}
                            {createPropState?.success && <p className="text-xs text-green-500 mb-2">Property created!</p>}
                            <button type="submit" disabled={isCreatePropPending} className="w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1c4755]">
                              {isCreatePropPending ? "Registering..." : "Add to Portfolio"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-border bg-white p-8 shadow-sm h-fit">
                      <h3 className="text-xl font-display text-navy mb-6">Location Settings</h3>
                      <form action={async (fd) => {
                        const m = await import("@/app/dashboard/actions");
                        const res = await m.updatePropertyLocation(null, fd);
                        if (res?.success) alert("Location updated!");
                        else if (res?.error) alert(res.error);
                      }} className="flex flex-col gap-5">
                        <input type="hidden" name="propertyId" value={selectedPropertyId} />
                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase text-navy">Full Address</label>
                          <input name="address" type="text" defaultValue={selectedProperty?.address || ""} className="w-full rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <input name="latitude" type="number" step="any" defaultValue={selectedProperty?.latitude || ""} placeholder="Lat" className="rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none" />
                          <input name="longitude" type="number" step="any" defaultValue={selectedProperty?.longitude || ""} placeholder="Lng" className="rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none" />
                        </div>
                        <button type="submit" className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1c4755]">Save Location</button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* --- KNOWLEDGE TAB --- */}
              {activeTab === "knowledge" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-end justify-between border-b border-border pb-6">
                    <SectionHeading eyebrow="AI Concierge" title="Knowledge Base" description="Train your AI assistant with hotel information." />
                    <select value={selectedPropertyId} onChange={(e) => setSelectedPropertyId(e.target.value)} className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-navy outline-none">
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="grid gap-8 xl:grid-cols-2">
                    <div className="space-y-6">
                      <div className="rounded-[24px] border border-border bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-navy mb-4">Add Snippet</h3>
                        <form action={addKnowledgeAction} className="space-y-4">
                          <input type="hidden" name="propertyId" value={selectedPropertyId} />
                          <input name="topic" type="text" required placeholder="Topic" className="w-full rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none" />
                          <textarea name="content" required rows={4} placeholder="Content..." className="w-full rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm outline-none resize-none" />
                          <button type="submit" disabled={isAddKnowledgePending} className="w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1c4755]">Save</button>
                        </form>
                      </div>

                      <div className="rounded-[24px] border border-border bg-stone-50/50 p-6">
                        <h3 className="text-lg font-bold text-navy mb-2">Upload Document</h3>
                        <form action={uploadAction} className="space-y-4">
                          <input type="hidden" name="propertyId" value={selectedPropertyId} />
                          <input name="file" type="file" required accept=".pdf,.txt" className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-navy file:text-white" />
                          <button type="submit" disabled={isUploadPending} className="w-full rounded-xl border border-navy px-4 py-3 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white">Upload</button>
                        </form>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <KnowledgeTestChat propertyId={selectedPropertyId} />
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted">Database ({filteredKnowledge.length})</h4>
                        {filteredKnowledge.map(item => (
                          <div key={item.id} className="rounded-2xl border border-border bg-white/60 p-4 text-xs group hover:bg-white transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-navy">{item.topic}</span>
                              <button onClick={async () => { if(confirm("Delete?")) { const m = await import("@/app/dashboard/actions"); await m.deleteKnowledgeSnippet(item.id); window.location.reload(); } }} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                            </div>
                            <p className="text-muted line-clamp-3">{item.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

               {/* --- QR TAB --- */}
              {activeTab === "qr" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <QrManagement />
                </div>
              )}

              {/* --- MASTER ADMIN TAB --- */}
              {activeTab === "admin" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <SectionHeading 
                    eyebrow="System Control" 
                    title="Master Admin" 
                    description="Centralized multi-tenant management for organizations and administrative users." 
                  />
                  <div className="mt-8">
                    <AdminForms 
                      organizations={allOrganizations || []} 
                      profiles={allProfiles || []} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string; value: number | string; color: string }) {
  return (
    <div className="glass-panel group relative overflow-hidden rounded-[28px] bg-white/40 p-6 transition-all hover:bg-white/60 luxury-ring">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-widest text-muted/60">{title}</span>
        <span className="font-display text-4xl font-bold text-navy">{value}</span>
      </div>
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full ${color}/10 blur-2xl transition-all group-hover:${color}/20`}></div>
    </div>
  );
}
