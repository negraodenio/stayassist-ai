"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fallbackGuestRequests,
  fallbackUnits,
  formatRequestTime,
  requestTypeDescriptions,
  requestTypeIntents,
  requestTypeLabels,
  type GuestRequest,
  type GuestRequestType,
  type GuestUnit,
} from "@/lib/guest-requests";

const requestTypes = ["towels", "cleaning", "issue", "help"] as const;

type RequestState = "idle" | "loading" | "saving" | "error";

type GuestRequestAppProps = {
  token?: string;
};

export function GuestRequestApp({ token }: GuestRequestAppProps) {
  const [requests, setRequests] = useState<GuestRequest[]>(fallbackGuestRequests);
  const [unit, setUnit] = useState<GuestUnit | null>(
    token ? null : fallbackUnits[0] || null,
  );
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [state, setState] = useState<RequestState>("loading");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadGuestData() {
      try {
        const [unitResponse, requestsResponse] = await Promise.all([
          token ? fetch(`/api/guest-unit/${token}`) : fetch("/api/guest-options"),
          fetch("/api/requests"),
        ]);

        if (!requestsResponse.ok) {
          throw new Error("Unable to load guest requests.");
        }

        const requestsPayload = (await requestsResponse.json()) as {
          requests: GuestRequest[];
          usingFallback: boolean;
        };

        if (!active) {
          return;
        }

        if (token) {
          if (!unitResponse.ok) {
            const payload = (await unitResponse.json().catch(() => ({}))) as {
              message?: string;
            };
            throw new Error(payload.message || "Guest stay not found.");
          }

          const unitPayload = (await unitResponse.json()) as {
            unit: GuestUnit;
            usingFallback: boolean;
          };

          setUnit(unitPayload.unit);
          setNotice(
            unitPayload.usingFallback || requestsPayload.usingFallback
              ? "Supabase is not configured yet, so demo data is showing."
              : null,
          );
        } else {
          const optionsPayload = (await unitResponse.json()) as {
            units: GuestUnit[];
            usingFallback: boolean;
          };

          setUnit(optionsPayload.units[0] || fallbackUnits[0] || null);
          setNotice(
            optionsPayload.usingFallback || requestsPayload.usingFallback
              ? "Demo guest link. Scan a room QR code for an assigned stay."
              : "Demo guest link. Scan a room QR code for an assigned stay.",
          );
        }

        setRequests(requestsPayload.requests);
        setState("idle");
      } catch (error) {
        if (!active) {
          return;
        }

        setNotice(error instanceof Error ? error.message : "Unable to load data.");
        setState("error");
      }
    }

    loadGuestData();

    return () => {
      active = false;
    };
  }, [token]);

  const guestRequests = useMemo(
    () =>
      requests
        .filter((request) => request.unitId === unit?.id)
        .slice(0, 4),
    [requests, unit?.id],
  );

  async function refreshRequests() {
    const response = await fetch("/api/requests");

    if (!response.ok) {
      throw new Error("Unable to refresh requests.");
    }

    const payload = (await response.json()) as {
      requests: GuestRequest[];
      usingFallback: boolean;
    };

    setRequests(payload.requests);
  }

  async function handleCreateRequest(type: GuestRequestType) {
    if (!unit) {
      return;
    }

    setState("saving");
    setNotice(null);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: unit.organizationId,
          propertyId: unit.propertyId,
          unitId: unit.id,
          type,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message || "Unable to create request.");
      }

      const payload = (await response.json()) as { request: GuestRequest };

      setLastCreatedId(payload.request.id);
      await refreshRequests();
      setState("idle");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create request.");
      setState("error");
    }
  }

  const lastCreated = requests.find((request) => request.id === lastCreatedId);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <section className="glass-panel flex flex-col justify-between rounded-[30px] p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
              StayAssist Guest
            </p>
            <h1 className="mt-4 font-display text-5xl leading-tight tracking-tight text-navy sm:text-6xl">
              Welcome back.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted">
              Request hotel services instantly from your private guest workspace.
            </p>
          </div>

          <div className="mt-8 rounded-[26px] border border-border bg-white/78 p-5 luxury-ring">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-strong">
              Your stay
            </p>
            <h2 className="mt-4 font-display text-4xl tracking-tight text-navy">
              {unit?.propertyName || "Loading stay"}
            </h2>
            <p className="mt-3 text-xl font-semibold text-navy">
              {unit?.name || "Resolving room"}
            </p>
            <p className="mt-4 text-sm leading-7 text-muted">
              This QR link is assigned to your room, so requests go to the right property team automatically.
            </p>
          </div>
        </section>

        <section className="glass-panel rounded-[30px] p-5 sm:p-7">
          <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-strong">
                Request cards
              </p>
              <h2 className="mt-2 font-display text-4xl text-navy">How can we help?</h2>
            </div>
            <div className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
              QR assigned
            </div>
          </div>

          {notice ? (
            <div className="mt-5 rounded-[22px] border border-border bg-white/80 p-4 text-sm text-muted">
              {notice}
            </div>
          ) : null}

          {lastCreated ? (
            <div className="mt-5 rounded-[22px] border border-success/25 bg-white/80 p-4 text-sm text-navy">
              <span className="font-semibold text-success">Request created:</span>{" "}
              {requestTypeLabels[lastCreated.type]} for {lastCreated.room}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {requestTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleCreateRequest(type)}
                disabled={state === "saving" || state === "loading" || !unit}
                className="group min-h-48 rounded-[26px] border border-border bg-white/82 p-5 text-left transition hover:-translate-y-0.5 hover:border-accent hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">
                  {requestTypeIntents[type]}
                </span>
                <h3 className="mt-5 font-display text-3xl text-navy">
                  {requestTypeLabels[type]}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {requestTypeDescriptions[type]}
                </p>
                <span className="mt-6 inline-flex rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-[#1c4755]">
                  {state === "saving" ? "Creating..." : "Create request"}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-[26px] border border-border bg-white/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-strong">
              Recent for this stay
            </p>
            <div className="mt-4 grid gap-3">
              {guestRequests.length > 0 ? (
                guestRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col gap-2 rounded-[18px] border border-border bg-surface-strong/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-navy">
                        {requestTypeLabels[request.type]}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {formatRequestTime(request.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-accent-strong">
                      {request.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-muted">
                  No requests yet for this stay.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
