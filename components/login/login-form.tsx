"use client";

import { useActionState } from "react";
import { signIn } from "@/app/login/actions";

const initialState = {
  message: "",
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

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

      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-navy" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@stayassist.ai"
            className="w-full rounded-2xl border border-border bg-white/90 px-4 py-3 text-navy outline-none transition placeholder:text-muted/70 focus:border-accent"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-navy" htmlFor="password">
              Password
            </label>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Enter your password"
            className="w-full rounded-2xl border border-border bg-white/90 px-4 py-3 text-navy outline-none transition placeholder:text-muted/70 focus:border-accent"
          />
        </div>

        {state?.message && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {state.message}
          </div>
        )}

        <div className="flex items-center justify-between rounded-2xl border border-border bg-white/70 px-4 py-3 text-sm text-muted">
          <span>Enterprise workspace</span>
          <span className="font-semibold text-success">Protected</span>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-navy px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#1c4755] disabled:opacity-70"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
