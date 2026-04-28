import { LoginForm } from "@/components/login/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.78),transparent_34%),linear-gradient(135deg,rgba(18,49,59,0.04),rgba(159,122,79,0.08))]" />
      <div className="absolute left-1/2 top-12 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.92),transparent_62%)] blur-2xl" />

      <section className="relative z-10 grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
            Luxury guest operations
          </p>
          <h2 className="mt-4 font-display text-5xl leading-tight tracking-tight text-navy sm:text-6xl">
            Hospitality AI designed for modern premium stays.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg">
            Centralize concierge operations, guest requests, and property intelligence in one polished workspace built for boutique hotels and luxury residences.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
