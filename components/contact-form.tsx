"use client";

import { useForm, ValidationError } from "@formspree/react";

export function ContactForm() {
  const [state, handleSubmit] = useForm("xdalnprd");

  if (state.succeeded) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center text-success">
        <h3 className="font-display text-xl">Thank you!</h3>
        <p className="mt-2 text-sm">Your message has been sent successfully. We will be in touch shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Carbon Copy Emails */}
      <input type="hidden" name="_cc" value="crisanic@gmail.com" />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-semibold tracking-wide text-navy">
          Name
        </label>
        <input
          id="name"
          type="text"
          name="name"
          required
          className="rounded-xl border border-border bg-white/50 px-4 py-3 text-sm text-navy placeholder-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Your name"
        />
        <ValidationError prefix="Name" field="name" errors={state.errors} className="text-sm text-red-500" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold tracking-wide text-navy">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          name="email"
          required
          className="rounded-xl border border-border bg-white/50 px-4 py-3 text-sm text-navy placeholder-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="you@example.com"
        />
        <ValidationError prefix="Email" field="email" errors={state.errors} className="text-sm text-red-500" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-semibold tracking-wide text-navy">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          className="resize-none rounded-xl border border-border bg-white/50 px-4 py-3 text-sm text-navy placeholder-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="How can we help you?"
        />
        <ValidationError prefix="Message" field="message" errors={state.errors} className="text-sm text-red-500" />
      </div>

      <button
        type="submit"
        disabled={state.submitting}
        className="mt-2 rounded-xl bg-navy px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1c4755] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
