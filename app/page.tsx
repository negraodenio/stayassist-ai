import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.78),transparent_34%),linear-gradient(135deg,rgba(18,49,59,0.04),rgba(159,122,79,0.08))]" />
      <div className="absolute left-1/2 top-12 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.92),transparent_62%)] blur-2xl" />

      <section className="relative z-10 grid w-full max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:pt-10">
        
        {/* Left Column: Hero Copy & CTA */}
        <div className="max-w-2xl lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
            Luxury guest operations
          </p>
          <h1 className="mt-4 font-display text-5xl leading-tight tracking-tight text-navy sm:text-6xl">
            Hospitality AI designed for modern premium stays.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg">
            Centralize concierge operations, guest requests, and property intelligence in one polished workspace built for boutique hotels and luxury residences.
          </p>
          
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-navy px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1c4755] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              Access Dashboard
              <span className="ml-2 text-white/70" aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="mt-16 flex items-center gap-4 border-t border-border/50 pt-8">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-8 w-8 rounded-full border-2 border-white bg-accent/20`} />
              ))}
            </div>
            <p className="text-sm text-muted">
              Trusted by premium boutique properties.
            </p>
          </div>
        </div>

        {/* Right Column: Contact Form */}
        <div className="rounded-[32px] border border-border/50 bg-white/70 p-8 shadow-sm backdrop-blur-xl sm:p-10">
          <h2 className="mb-2 font-display text-3xl text-navy">Get in touch</h2>
          <p className="mb-8 text-sm text-muted">
            Interested in bringing StayAssist AI to your property? Fill out the form below and we will contact you.
          </p>
          <ContactForm />
        </div>

      </section>
    </main>
  );
}
