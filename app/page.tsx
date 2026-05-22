import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

export default function HomePage() {
  return (
    <>
      {/* ─── NAVIGATION ─── */}
      <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-xs font-bold text-white shadow-sm">
            MC
          </div>
          <span className="font-display text-sm font-medium uppercase tracking-widest text-navy">
            Malia Concierge
          </span>
        </div>
        <Link
          href="/login"
          className="rounded-full border border-border/60 bg-white/50 px-5 py-2 text-xs font-semibold text-navy backdrop-blur-sm transition hover:border-accent hover:bg-white/80"
        >
          Sign In
        </Link>
      </nav>

      {/* ─── HERO ─── */}
      <main className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.78),transparent_34%),linear-gradient(135deg,rgba(18,49,59,0.04),rgba(159,122,79,0.08))]" />
        <div className="absolute left-1/2 top-12 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.92),transparent_62%)] blur-2xl" />

        <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-14 px-6 pb-24 pt-32 sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-40">
          
          {/* Left — Copy */}
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
              AI Hospitality Platform
            </p>
            <h1 className="mt-5 font-display text-[2.75rem] leading-[1.12] tracking-tight text-navy sm:text-6xl">
              The AI Concierge for Luxury Hotels&nbsp;&amp;&nbsp;Airbnbs.
            </h1>
            <p className="mt-7 max-w-lg text-base leading-[1.85] text-muted sm:text-[1.0625rem]">
              Automate guest communication, local recommendations, room requests, multilingual support and premium concierge experiences — all powered by AI.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-full bg-navy px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1c4755] hover:shadow-md"
              >
                Book Private Demo
              </a>
              <a
                href="#platform"
                className="inline-flex items-center justify-center rounded-full border border-border/70 bg-white/50 px-7 py-3.5 text-sm font-semibold text-navy backdrop-blur-sm transition-all hover:border-accent hover:bg-white/80"
              >
                See Platform
              </a>
            </div>
          </div>

          {/* Right — Contact Form */}
          <div className="rounded-[32px] border border-border/50 bg-white/70 p-8 shadow-sm backdrop-blur-xl sm:p-10" id="contact">
            <h2 className="mb-2 font-display text-3xl text-navy">Get in touch</h2>
            <p className="mb-8 text-sm leading-relaxed text-muted">
              Interested in bringing Malia Concierge to your property? We will reach out within 24 hours.
            </p>
            <ContactForm />
          </div>

        </section>

        {/* ─── FEATURES ─── */}
        <section id="platform" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-28 sm:px-10">
          <div className="mb-14 max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
              What we do
            </p>
            <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight text-navy">
              Everything your property needs. Nothing it doesn't.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1 */}
            <article className="group rounded-[24px] border border-border/40 bg-white/60 p-7 backdrop-blur-sm transition-all duration-300 hover:border-accent/30 hover:bg-white/85 hover:shadow-lg">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-navy/[0.07]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-navy"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h3 className="font-display text-lg text-navy">AI Guest Concierge</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                Instant, intelligent answers to every guest question — from check-in details to neighbourhood tips. Always on, always accurate.
              </p>
            </article>

            {/* Card 2 */}
            <article className="group rounded-[24px] border border-border/40 bg-white/60 p-7 backdrop-blur-sm transition-all duration-300 hover:border-accent/30 hover:bg-white/85 hover:shadow-lg">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-navy/[0.07]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-navy"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <h3 className="font-display text-lg text-navy">WhatsApp &amp; Voice AI</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                Meet guests on their preferred channel. WhatsApp, SMS, and voice — multilingual, 24/7, with human handoff when needed.
              </p>
            </article>

            {/* Card 3 */}
            <article className="group rounded-[24px] border border-border/40 bg-white/60 p-7 backdrop-blur-sm transition-all duration-300 hover:border-accent/30 hover:bg-white/85 hover:shadow-lg">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-navy/[0.07]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-navy"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              </div>
              <h3 className="font-display text-lg text-navy">Property Intelligence</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                Real-time operations dashboard with guest satisfaction metrics, request tracking, and actionable insights per property.
              </p>
            </article>

            {/* Card 4 */}
            <article className="group rounded-[24px] border border-border/40 bg-white/60 p-7 backdrop-blur-sm transition-all duration-300 hover:border-accent/30 hover:bg-white/85 hover:shadow-lg">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-navy/[0.07]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-navy"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
              </div>
              <h3 className="font-display text-lg text-navy">Automated Upselling</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                Suggest late check-outs, spa bookings, and experiences at the perfect moment. Increase revenue without lifting a finger.
              </p>
            </article>
          </div>
        </section>

        {/* ─── VOICE AI / PRESS TO TALK ─── */}
        <section className="relative z-10 overflow-hidden">
          <div className="mx-auto w-full max-w-6xl px-6 py-28 sm:px-10">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              
              {/* Left — Visual */}
              <div className="flex flex-col items-center justify-center lg:items-start">
                {/* Voice orb */}
                <div className="relative flex h-48 w-48 items-center justify-center">
                  {/* Outer pulse rings */}
                  <div className="absolute inset-0 rounded-full border border-accent/10" style={{ animation: "pulse 3s ease-in-out infinite" }} />
                  <div className="absolute inset-3 rounded-full border border-accent/15" style={{ animation: "pulse 3s ease-in-out infinite 0.4s" }} />
                  <div className="absolute inset-6 rounded-full border border-accent/20" style={{ animation: "pulse 3s ease-in-out infinite 0.8s" }} />
                  {/* Core orb */}
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-navy to-[#1c4755] shadow-lg">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" x2="12" y1="19" y2="22"/>
                    </svg>
                  </div>
                </div>

                {/* Waveform bars */}
                <div className="mt-8 flex items-end gap-1">
                  {[12, 20, 28, 16, 32, 24, 18, 30, 14, 22, 26, 20, 16, 28, 12].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-accent/40"
                      style={{
                        height: `${h}px`,
                        animation: `waveform 1.5s ease-in-out infinite ${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Right — Copy */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
                  Coming Soon
                </p>
                <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight text-navy sm:text-5xl">
                  The future of hospitality is conversational.
                </h2>
                <p className="mt-6 max-w-lg text-base leading-[1.85] text-muted">
                  Guests will speak naturally with your property through voice, messaging, and AI-powered experiences — as effortless as talking to a human concierge.
                </p>

                <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-border/60 bg-white/40 py-2.5 pl-4 pr-6 text-sm text-navy shadow-sm backdrop-blur-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                  </span>
                  <span>
                    <strong className="font-semibold">Press to Talk</strong>
                    <span className="mx-1.5 text-muted">·</span>
                    <span className="text-muted">Our exclusive, discreet hardware</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-32 sm:px-10">
          <div className="rounded-[36px] border border-border/40 bg-white/55 px-8 py-20 text-center backdrop-blur-xl sm:px-16">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
              Ready to begin
            </p>
            <h2 className="mx-auto mt-5 max-w-2xl font-display text-4xl leading-tight tracking-tight text-navy sm:text-5xl">
              Elevate your guest experience.
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-base leading-[1.85] text-muted">
              Bring world-class AI concierge experiences to your property. We work with select hotels and premium residences.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-full bg-navy px-9 py-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1c4755] hover:shadow-md"
              >
                Schedule Private Demo
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-border/70 bg-white/50 px-8 py-4 text-sm font-semibold text-navy backdrop-blur-sm transition-all hover:border-accent hover:bg-white/80"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="relative z-10 border-t border-border/40 px-6 py-8 sm:px-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-navy text-[10px] font-bold text-white">
                MC
              </div>
              <span className="text-xs font-medium uppercase tracking-widest text-muted">
                Malia Concierge
              </span>
            </div>
            <p className="text-xs text-muted/70">
              © {new Date().getFullYear()} Malia Concierge. All rights reserved.
            </p>
          </div>
        </footer>
      </main>

      {/* ─── ANIMATIONS ─── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.6; }
        }
        @keyframes waveform {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.4); }
        }
      `}</style>
    </>
  );
}
