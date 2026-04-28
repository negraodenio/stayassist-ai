"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fallbackGuestRequests,
  formatRequestTime,
  requestTypeLabels,
  type GuestRequest,
  type GuestRequestStatus,
} from "@/lib/guest-requests";

const statuses: GuestRequestStatus[] = ["Open", "In progress", "Resolved"];

function statusClass(status: GuestRequestStatus) {
  if (status === "Resolved") {
    return "bg-success/10 text-success";
  }

  if (status === "In progress") {
    return "bg-accent/15 text-accent-strong";
  }

  return "bg-navy/10 text-navy";
}

export function RequestsBoard() {
  const [requests, setRequests] = useState<GuestRequest[]>(fallbackGuestRequests);
  const [statusFilter, setStatusFilter] = useState<GuestRequestStatus | "All">("All");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadRequests({ quiet = false }: { quiet?: boolean } = {}) {
    if (!quiet) {
      setIsLoading(true);
    }

    try {
      const response = await fetch("/api/requests");

      if (!response.ok) {
        throw new Error("Unable to load requests.");
      }

      const payload = (await response.json()) as {
        requests: GuestRequest[];
        usingFallback: boolean;
      };

      setRequests(payload.requests);
      setNotice(
        payload.usingFallback
          ? "Supabase is not configured yet, so demo data is showing."
          : null,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load requests.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadRequests();
    });
    const intervalId = window.setInterval(() => {
      loadRequests({ quiet: true });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "All") {
      return requests;
    }

    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  const metrics = useMemo(
    () => ({
      open: requests.filter((request) => request.status === "Open").length,
      progress: requests.filter((request) => request.status === "In progress").length,
      resolved: requests.filter((request) => request.status === "Resolved").length,
    }),
    [requests],
  );

  async function updateRequestStatus(id: string, status: GuestRequestStatus) {
    setUpdatingId(id);
    setNotice(null);

    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message || "Unable to update request.");
      }

      await loadRequests({ quiet: true });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update request.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <section className="glass-panel rounded-[30px] p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent-strong">
                Requests Engine
              </p>
              <h1 className="mt-3 font-display text-4xl tracking-tight text-navy sm:text-5xl">
                Live guest requests
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                Monitor guest-created service requests from Supabase and move each item through the operations queue.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadRequests()}
                className="rounded-full border border-border bg-white/75 px-4 py-2 text-sm font-semibold text-navy transition hover:border-accent"
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </button>
              <a
                href="/guest"
                className="rounded-full border border-border bg-white/75 px-4 py-2 text-sm font-semibold text-navy transition hover:border-accent"
              >
                Open guest PWA
              </a>
              <a
                href="/dashboard"
                className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1c4755]"
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
              <p className="text-sm text-muted">Open</p>
              <p className="mt-3 font-display text-5xl text-navy">{metrics.open}</p>
            </article>
            <article className="rounded-[24px] border border-border bg-white/80 p-5">
              <p className="text-sm text-muted">In progress</p>
              <p className="mt-3 font-display text-5xl text-accent-strong">
                {metrics.progress}
              </p>
            </article>
            <article className="rounded-[24px] border border-border bg-white/80 p-5">
              <p className="text-sm text-muted">Resolved</p>
              <p className="mt-3 font-display text-5xl text-success">{metrics.resolved}</p>
            </article>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(["All", ...statuses] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  statusFilter === status
                    ? "border-navy bg-navy text-white"
                    : "border-border bg-white/75 text-muted hover:border-accent hover:text-navy"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-border bg-white/82">
            <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.9fr_1.1fr] gap-4 border-b border-border px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:grid">
              <span>Property</span>
              <span>Room/unit</span>
              <span>Type</span>
              <span>Status</span>
              <span>Created</span>
              <span>Actions</span>
            </div>

            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <article
                  key={request.id}
                  className="grid gap-4 border-b border-border/70 px-5 py-5 last:border-b-0 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.9fr_1.1fr] lg:items-center"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:hidden">
                      Property
                    </p>
                    <p className="font-semibold text-navy">{request.property}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:hidden">
                      Room/unit
                    </p>
                    <p className="text-sm text-navy">{request.room}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:hidden">
                      Type
                    </p>
                    <p className="text-sm text-navy">{requestTypeLabels[request.type]}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:hidden">
                      Status
                    </p>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusClass(
                        request.status,
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:hidden">
                      Created
                    </p>
                    <p className="text-sm text-muted">
                      {formatRequestTime(request.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(request.id, "In progress")}
                      disabled={
                        request.status === "In progress" || updatingId === request.id
                      }
                      className="rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-navy transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      In progress
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(request.id, "Resolved")}
                      disabled={request.status === "Resolved" || updatingId === request.id}
                      className="rounded-full bg-success px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#326b53] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Mark resolved
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="font-semibold text-navy">No requests match this view.</p>
                <p className="mt-2 text-sm text-muted">
                  Create a request from the guest PWA or change the status filter.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
