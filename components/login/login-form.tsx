import { signIn } from "@/app/login/actions";

export function LoginForm() {
  return (
    <div className="glass-panel luxury-ring w-full max-w-md rounded-[32px] p-6 sm:p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
          StayAssist AI
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-navy">
          Welcome back
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          Sign in to manage guest requests, concierge workflows, and your property portfolio.
        </p>
      </div>

      <form action={signIn} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-navy" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@stayassist.ai"
            className="w-full rounded-2xl border border-border bg-white/90 px-4 py-3 text-navy outline-none transition placeholder:text-muted/70 focus:border-accent"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-navy" htmlFor="password">
              Password
            </label>
            <button
              type="button"
              className="text-sm font-medium text-accent-strong transition hover:text-navy"
            >
              Forgot password?
            </button>
          </div>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="w-full rounded-2xl border border-border bg-white/90 px-4 py-3 text-navy outline-none transition placeholder:text-muted/70 focus:border-accent"
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-white/70 px-4 py-3 text-sm text-muted">
          <span>Enterprise workspace</span>
          <span className="font-semibold text-success">Protected</span>
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-navy px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#1c4755]"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
