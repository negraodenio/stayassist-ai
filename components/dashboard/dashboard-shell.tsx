const navigationItems = [
  { id: "overview", label: "Overview", short: "OV", href: "/dashboard#overview" },
  { id: "requests", label: "Requests", short: "RQ", href: "/dashboard/requests" },
  { id: "qr", label: "QR Codes", short: "QR", href: "/dashboard/qr" },
  { id: "properties", label: "Properties", short: "PR", href: "/dashboard#properties" },
  { id: "knowledge", label: "Knowledge", short: "KN", href: "/dashboard#knowledge" },
  { id: "billing", label: "Billing", short: "BL", href: "/dashboard#billing" },
  { id: "settings", label: "Settings", short: "ST", href: "/dashboard#settings" },
];

const metrics = [
  { label: "Active concierge flows", value: "24", detail: "+12% this week" },
  { label: "Resolved guest requests", value: "1,284", detail: "94% automated" },
  { label: "Portfolio occupancy", value: "88%", detail: "Across 18 properties" },
];

const requestRows = [
  { guest: "Suite 804", type: "Airport pickup", priority: "High", eta: "11 min" },
  { guest: "Villa Aurora", type: "Late checkout", priority: "Medium", eta: "22 min" },
  { guest: "Penthouse 3A", type: "Champagne amenity", priority: "VIP", eta: "6 min" },
];

const properties = [
  { name: "Monarch Bay Hotel", city: "Lisbon", rooms: "128 rooms", score: "4.9 guest score" },
  { name: "Atelier House", city: "Porto", rooms: "42 suites", score: "91% direct booking" },
  { name: "The Harbor Residences", city: "Cascais", rooms: "31 villas", score: "96% concierge adoption" },
];

const knowledgeCards = [
  { title: "SOP coverage", value: "92%", text: "Arrival, housekeeping, and escalation playbooks stay synced across teams." },
  { title: "Agent readiness", value: "14 sources", text: "Policies, menus, and vendor knowledge stay indexed for instant answers." },
];

const billingCards = [
  { title: "Current plan", value: "Enterprise", text: "Unlimited staff seats, premium support, and AI concierge automations." },
  { title: "Monthly usage", value: "EUR 8,420", text: "Includes orchestration, messaging, and knowledge retrieval spend." },
];

const actionItems = [
  { time: "09:15", label: "VIP arrival brief", detail: "Penthouse 3A preferences pushed to concierge and housekeeping." },
  { time: "10:40", label: "Vendor confirmation", detail: "Airport pickup supplier confirmed with guest-facing ETA update." },
  { time: "12:05", label: "Policy refresh", detail: "Late-checkout rules synced across Lisbon and Cascais properties." },
];

const aiSuggestions = [
  "Offer airport pickup upgrade to Suite 804 based on arrival delay.",
  "Route Villa Aurora late-checkout request to housekeeping before noon.",
  "Send champagne amenity confirmation in the guest's preferred language.",
];

const settingItems = [
  {
    token: "01",
    text: "Role-based access for front desk, concierge, and operations",
  },
  {
    token: "02",
    text: "Property-specific AI tone and escalation thresholds",
  },
  {
    token: "03",
    text: "Billing alerts and finance export preferences",
  },
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

export function DashboardShell() {
  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl gap-4 lg:gap-6">
        <aside className="glass-panel hidden w-80 shrink-0 rounded-[28px] p-6 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
                StayAssist AI
              </p>
              <h1 className="mt-2 font-display text-3xl text-navy">Operations Suite</h1>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-sm font-semibold text-white">
              SA
            </div>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item, index) => (
              <a
                key={item.id}
                href={item.href}
                className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition hover:bg-white/70 ${
                  index === 0 ? "bg-white text-navy luxury-ring" : "text-muted"
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
            ))}
          </nav>

          <div className="glass-panel mt-auto rounded-[24px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-strong">
              Portfolio health
            </p>
            <p className="mt-3 font-display text-4xl text-navy">98.2%</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Guest-response coverage remains above SLA across all active properties.
            </p>
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
            <div className="flex flex-wrap gap-3">
              {navigationItems.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className="rounded-full border border-border bg-white/75 px-4 py-2 text-sm font-medium text-muted transition hover:border-accent hover:text-navy lg:hidden"
                >
                  {item.label}
                </a>
              ))}
              <div className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
                Live operations
              </div>
            </div>
          </div>

          <section id="overview" className="pt-8">
            <SectionHeading
              eyebrow="Overview"
              title="Luxury hospitality performance at a glance"
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
                  <p className="mt-3 text-sm font-medium text-success">{metric.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="requests" className="pt-10">
            <SectionHeading
              eyebrow="Requests"
              title="Priority guest assistance queue"
              description="Track inbound requests, expected fulfillment time, and service priority from one elegant workflow."
            />
            <div className="mt-6 overflow-hidden rounded-[26px] border border-border bg-white/82">
              <div className="grid grid-cols-4 gap-4 border-b border-border px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                <span>Guest</span>
                <span>Request</span>
                <span>Priority</span>
                <span>ETA</span>
              </div>
              {requestRows.map((row) => (
                <div
                  key={`${row.guest}-${row.type}`}
                  className="grid grid-cols-2 gap-4 border-b border-border/70 px-5 py-4 text-sm text-navy last:border-b-0 sm:grid-cols-4"
                >
                  <span className="font-semibold">{row.guest}</span>
                  <span>{row.type}</span>
                  <span className="text-accent-strong">{row.priority}</span>
                  <span>{row.eta}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/dashboard/requests"
                className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1c4755]"
              >
                Open request engine
              </a>
              <a
                href="/guest"
                className="rounded-full border border-border bg-white/75 px-4 py-2 text-sm font-semibold text-navy transition hover:border-accent"
              >
                View guest PWA
              </a>
            </div>
          </section>

          <section className="grid gap-4 pt-10 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[26px] border border-border bg-white/82 p-5">
              <SectionHeading
                eyebrow="Timeline"
                title="Live service movement"
                description="The latest operational events that need awareness across front desk, concierge, and managers."
              />
              <div className="mt-6 grid gap-4">
                {actionItems.map((item) => (
                  <article
                    key={`${item.time}-${item.label}`}
                    className="grid gap-3 rounded-[22px] border border-border bg-surface-strong/80 p-4 sm:grid-cols-[72px_1fr]"
                  >
                    <span className="font-display text-2xl text-accent-strong">
                      {item.time}
                    </span>
                    <div>
                      <h3 className="font-semibold text-navy">{item.label}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-border bg-navy p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">
                AI Copilot
              </p>
              <h2 className="mt-3 font-display text-3xl tracking-tight">
                Suggested next actions
              </h2>
              <div className="mt-6 grid gap-3">
                {aiSuggestions.map((suggestion, index) => (
                  <article
                    key={suggestion}
                    className="flex gap-3 rounded-[20px] border border-white/10 bg-white/10 p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-navy">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-white/82">{suggestion}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="properties" className="pt-10">
            <SectionHeading
              eyebrow="Properties"
              title="Portfolio visibility"
              description="Monitor service quality, occupancy signals, and AI adoption across the full property collection."
            />
            <div className="section-grid mt-6 grid gap-4">
              {properties.map((property) => (
                <article
                  key={property.name}
                  className="rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,238,229,0.9))] p-5"
                >
                  <p className="text-sm uppercase tracking-[0.2em] text-accent-strong">
                    {property.city}
                  </p>
                  <h3 className="mt-3 font-display text-2xl text-navy">{property.name}</h3>
                  <div className="mt-5 flex items-center justify-between text-sm text-muted">
                    <span>{property.rooms}</span>
                    <span>{property.score}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="knowledge" className="pt-10">
            <SectionHeading
              eyebrow="Knowledge"
              title="AI knowledge base readiness"
              description="Keep operational memory centralized so staff and guests receive instant, policy-accurate answers."
            />
            <div className="section-grid mt-6 grid gap-4">
              {knowledgeCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[24px] border border-border bg-white/80 p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-semibold text-navy">{card.title}</h3>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-accent-strong">
                      {card.value}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-muted">{card.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="billing" className="pt-10">
            <SectionHeading
              eyebrow="Billing"
              title="Financial clarity for AI operations"
              description="Give finance and operations a precise view into plan status, usage, and projected spend."
            />
            <div className="section-grid mt-6 grid gap-4">
              {billingCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[24px] border border-border bg-navy p-5 text-white"
                >
                  <p className="text-sm text-white/70">{card.title}</p>
                  <p className="mt-4 font-display text-4xl">{card.value}</p>
                  <p className="mt-3 text-sm leading-7 text-white/80">{card.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="settings" className="pt-10">
            <SectionHeading
              eyebrow="Settings"
              title="Operational controls"
              description="Adjust permissions, assistant behavior, and reporting preferences without leaving the dashboard."
            />
            <div className="mt-6 grid gap-4">
              {settingItems.map((item) => (
                <article
                  key={item.token}
                  className="flex items-start gap-4 rounded-[24px] border border-border bg-white/80 p-5"
                >
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-sm font-semibold text-accent-strong">
                    {item.token}
                  </span>
                  <p className="text-sm leading-7 text-navy">{item.text}</p>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
