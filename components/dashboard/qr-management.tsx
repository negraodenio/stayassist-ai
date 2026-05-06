"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { GuestUnit } from "@/lib/guest-requests";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredUnits = useMemo(() => {
    return units.filter(unit => 
      unit.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [units, searchQuery]);

  async function generateSelected() {
    if (selectedIds.size === 0) return;

    setState("saving");
    setNotice(null);

    try {
      const results = await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const response = await fetch(`/api/qr/units/${id}`, { method: "PATCH" });
          if (!response.ok) return null;
          const payload = await response.json();
          return payload.unit as GuestUnit;
        })
      );

      const successful = results.filter((u): u is GuestUnit => u !== null);
      
      setUnits((current) =>
        current.map((unit) => {
          const updated = successful.find((s) => s.id === unit.id);
          return updated || unit;
        })
      );
      
      setSelectedIds(new Set());
      setState("idle");
      setNotice(`Successfully generated ${successful.length} QR codes.`);
    } catch {
      setNotice("Error generating some QR codes.");
      setState("error");
    }
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
