"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { GuestUnit } from "@/lib/guest-requests";

type LoadState = "idle" | "loading" | "saving" | "error";

function getGuestUrl(token: string) {
  if (typeof window === "undefined") {
    return `/g/${token}`;
  }

  return `${window.location.origin}/g/${token}`;
}

function getQrImageUrl(value: string, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=18&data=${encodeURIComponent(
    value,
  )}`;
}

export function QrManagement() {
  const [units, setUnits] = useState<GuestUnit[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [previewUnit, setPreviewUnit] = useState<GuestUnit | null>(null);

  const missingCount = useMemo(
    () => units.filter((unit) => !unit.qrToken).length,
    [units],
  );

  async function loadUnits() {
    setState("loading");

    try {
      const response = await fetch("/api/qr/units");
      const payload = (await response.json().catch(() => ({}))) as {
        units?: GuestUnit[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Unable to load QR units.");
      }

      setUnits(payload.units || []);
      setNotice(null);
      setState("idle");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load QR units.");
      setState("error");
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadUnits();
    });
  }, []);

  async function generateMissing() {
    setState("saving");
    setNotice(null);

    try {
      const response = await fetch("/api/qr/units", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        units?: GuestUnit[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Unable to generate QR codes.");
      }

      setUnits(payload.units || []);
      setState("idle");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to generate QR codes.",
      );
      setState("error");
    }
  }

  async function regenerate(unit: GuestUnit) {
    const confirmed = window.confirm(
      `Regenerate QR for ${unit.propertyName} - ${unit.name}?\n\nThe currently printed QR code will stop working.`,
    );

    if (!confirmed) {
      return;
    }

    setState("saving");
    setNotice(null);

    try {
      const response = await fetch(`/api/qr/units/${unit.id}`, { method: "PATCH" });
      const payload = (await response.json().catch(() => ({}))) as {
        unit?: GuestUnit;
        message?: string;
      };

      if (!response.ok || !payload.unit) {
        throw new Error(payload.message || "Unable to regenerate QR code.");
      }

      setUnits((current) =>
        current.map((item) => (item.id === payload.unit?.id ? payload.unit : item)),
      );
      setPreviewUnit(payload.unit);
      setState("idle");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to regenerate QR code.",
      );
      setState("error");
    }
  }

  async function copyUrl(token: string) {
    await navigator.clipboard.writeText(getGuestUrl(token));
    setNotice("Guest QR URL copied.");
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <section className="glass-panel rounded-[30px] p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
                QR Management
              </p>
              <h1 className="mt-3 font-display text-4xl tracking-tight text-navy sm:text-5xl">
                Room QR codes
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                Generate assigned guest links for every unit so each QR opens the right room experience.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generateMissing}
                disabled={state === "saving" || missingCount === 0}
                className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1c4755] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {state === "saving" ? "Generating..." : "Generate missing QR codes"}
              </button>
              <a
                href="/dashboard"
                className="rounded-full border border-border bg-white/75 px-4 py-2 text-sm font-semibold text-navy transition hover:border-accent"
              >
                Dashboard
              </a>
            </div>
          </div>

          {notice ? (
            <div className="mt-5 rounded-[22px] border border-border bg-white/80 p-4 text-sm text-muted">
              {notice}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-[24px] border border-border bg-white/80 p-5">
              <p className="text-sm text-muted">Units</p>
              <p className="mt-3 font-display text-5xl text-navy">{units.length}</p>
            </article>
            <article className="rounded-[24px] border border-border bg-white/80 p-5">
              <p className="text-sm text-muted">Active QR</p>
              <p className="mt-3 font-display text-5xl text-success">
                {units.length - missingCount}
              </p>
            </article>
            <article className="rounded-[24px] border border-border bg-white/80 p-5">
              <p className="text-sm text-muted">Missing</p>
              <p className="mt-3 font-display text-5xl text-accent-strong">
                {missingCount}
              </p>
            </article>
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-border bg-white/82">
            <div className="hidden grid-cols-[1.1fr_0.9fr_0.7fr_1fr_1.2fr] gap-4 border-b border-border px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:grid">
              <span>Property</span>
              <span>Unit</span>
              <span>Status</span>
              <span>QR</span>
              <span>Actions</span>
            </div>

            {units.length > 0 ? (
              units.map((unit) => {
                const isActive = Boolean(unit.qrToken);
                const guestUrl = unit.qrToken ? getGuestUrl(unit.qrToken) : "";

                return (
                  <article
                    key={unit.id}
                    className="grid gap-4 border-b border-border/70 px-5 py-5 last:border-b-0 lg:grid-cols-[1.1fr_0.9fr_0.7fr_1fr_1.2fr] lg:items-center"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:hidden">
                        Property
                      </p>
                      <p className="font-semibold text-navy">{unit.propertyName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:hidden">
                        Unit
                      </p>
                      <p className="text-sm text-navy">{unit.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:hidden">
                        Status
                      </p>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                          isActive
                            ? "bg-success/10 text-success"
                            : "bg-accent/15 text-accent-strong"
                        }`}
                      >
                        {isActive ? "Active" : "Missing"}
                      </span>
                    </div>
                    <div>
                      {unit.qrToken ? (
                        <Image
                          alt={`QR code for ${unit.name}`}
                          className="h-20 w-20 rounded-xl border border-border bg-white p-1"
                          src={getQrImageUrl(guestUrl, 160)}
                          width={80}
                          height={80}
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border bg-white/60 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                          None
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewUnit(unit)}
                        disabled={!unit.qrToken}
                        className="rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-navy transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => unit.qrToken && copyUrl(unit.qrToken)}
                        disabled={!unit.qrToken}
                        className="rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-navy transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Copy URL
                      </button>
                      {unit.qrToken ? (
                        <a
                          href={`/api/qr/png?value=${encodeURIComponent(guestUrl)}`}
                          className="rounded-full bg-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1c4755]"
                        >
                          Download PNG
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => regenerate(unit)}
                        className="rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-accent-strong transition hover:border-accent"
                      >
                        Regenerate
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="font-semibold text-navy">
                  {state === "loading" ? "Loading units..." : "No units found."}
                </p>
                <p className="mt-2 text-sm text-muted">
                  Units are loaded from your Supabase units table.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {previewUnit?.qrToken ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/35 px-4 py-6 backdrop-blur-sm">
          <section className="glass-panel w-full max-w-md rounded-[28px] p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-strong">
              QR Preview
            </p>
            <h2 className="mt-3 font-display text-3xl text-navy">
              {previewUnit.propertyName}
            </h2>
            <p className="mt-1 font-semibold text-muted">{previewUnit.name}</p>
            <Image
              alt={`QR code for ${previewUnit.name}`}
              className="mx-auto mt-6 h-72 w-72 rounded-[24px] border border-border bg-white p-4"
              src={getQrImageUrl(getGuestUrl(previewUnit.qrToken), 520)}
              width={288}
              height={288}
              unoptimized
            />
            <p className="mt-5 break-all rounded-2xl bg-white/75 px-4 py-3 text-sm text-muted">
              {getGuestUrl(previewUnit.qrToken)}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => copyUrl(previewUnit.qrToken || "")}
                className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:border-accent"
              >
                Copy URL
              </button>
              <a
                href={`/api/qr/png?value=${encodeURIComponent(
                  getGuestUrl(previewUnit.qrToken),
                )}`}
                className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1c4755]"
              >
                Download PNG
              </a>
              <button
                type="button"
                onClick={() => setPreviewUnit(null)}
                className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-muted transition hover:border-accent hover:text-navy"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
