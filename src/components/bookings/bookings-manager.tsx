"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Mail,
  Trash2,
  UserX,
  Video,
  CalendarX2,
  Users,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BOOKING } from "@/lib/config";
import { buildStrategyCallScript, strategyCallScriptText } from "@/lib/call-script";
import type { ProspectAudit, RoiProjection } from "@/lib/supabase-types";
import { cn } from "@/lib/utils";

type Status = "confirmed" | "rescheduled" | "completed" | "no-show" | "cancelled";

interface ProspectLite {
  business_name: string;
  city: string | null;
  phone: string | null;
  website: string | null;
  google_rating: number | null;
  review_count: number | null;
  unanswered_reviews: number | null;
  competitor_name: string | null;
  competitor_reviews: number | null;
  missing_gbp_apple: boolean | null;
  audit_report: ProspectAudit | null;
  roi_projection: RoiProjection | null;
  recommended_services: number[] | null;
  slug?: string | null;
  id?: string;
}

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string;
  call_type: string;
  scheduled_at: string;
  duration_min: number;
  timezone: string | null;
  status: Status;
  notes: string | null;
  created_at: string;
  prospect: ProspectLite | null;
}

const STATUS_STYLES: Record<Status, string> = {
  confirmed: "border-glow-500/30 bg-glow-500/10 text-glow-400",
  rescheduled: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  completed: "border-brand-500/30 bg-brand-500/10 text-brand-300",
  "no-show": "border-rose-500/30 bg-rose-500/10 text-rose-300",
  cancelled: "border-white/10 bg-white/5 text-mute",
};

const STATUS_LABEL: Record<Status, string> = {
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  completed: "Completed",
  "no-show": "No-show",
  cancelled: "Cancelled",
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-xs font-medium text-white outline-none transition placeholder:text-mute/40 focus:border-brand-400/60";

function formatWhen(iso: string, tz?: string | null): string {
  const t = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: tz || BOOKING.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  try {
    return new Intl.DateTimeFormat("en-US", opts).format(t);
  } catch {
    return t.toLocaleString("en-US");
  }
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingsManager() {
  const [access, setAccess] = React.useState<"loading" | "granted" | "denied">("loading");
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<Status | "all">("all");
  const [prospectFilter, setProspectFilter] = React.useState("");
  const [openScript, setOpenScript] = React.useState<Record<string, boolean>>({});
  const [copied, setCopied] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [reschedule, setReschedule] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to load bookings");
      const data = await res.json();
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    void isAdminLogin().then((ok) => setAccess(ok ? "granted" : "denied"));
  }, []);

  const refreshOnce = React.useRef(false);
  React.useEffect(() => {
    if (access !== "granted" || refreshOnce.current) return;
    refreshOnce.current = true;
    void load();
  }, [access, load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Update failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  };

  const script = (b: Booking) =>
    buildStrategyCallScript({
      booking: b,
      prospect: b.prospect,
    });

  const filtered = bookings.filter((b) => {
    if (!prospectFilter.trim()) return true;
    const q = prospectFilter.trim().toLowerCase();
    return (
      b.business_name.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q)
    );
  });

  if (access === "loading") {
    return <div className="pt-40 text-center text-sm text-fog">Checking access…</div>;
  }
  if (access === "denied") {
    return (
      <div className="pt-24">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-ink-900 p-10 text-center">
          <h1 className="font-display text-2xl font-bold text-white">Admin access required</h1>
          <p className="mt-2 text-sm text-fog">Sign in with the admin account to manage bookings.</p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-300 transition hover:bg-brand-500/20">
            Switch account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-glow-400">Call Calendar</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-white sm:text-4xl">Strategy-Call Bookings</h1>
            <p className="mt-1 text-sm text-fog">
              Manage scheduled calls — each one loads the prospect&apos;s audit intel and a read-along call script.
            </p>
          </div>
          <Badge variant="emerald">
            <CalendarClock className="h-3.5 w-3.5" />
            {bookings.filter((b) => b.status === "confirmed" || b.status === "rescheduled").length} upcoming
          </Badge>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-semibold transition",
              statusFilter === "all"
                ? "border-brand-400/50 bg-brand-500/15 text-white"
                : "border-white/10 text-fog hover:border-white/25 hover:text-white",
            )}
          >
            All
          </button>
          {(["confirmed", "rescheduled", "completed", "no-show", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                statusFilter === s
                  ? "border-brand-400/50 bg-brand-500/15 text-white"
                  : "border-white/10 text-fog hover:border-white/25 hover:text-white",
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
          <input
            value={prospectFilter}
            onChange={(e) => setProspectFilter(e.target.value)}
            placeholder="Search business / client…"
            className={cn(inputCls, "ml-auto w-56")}
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-14 text-sm text-fog">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading bookings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-14 text-center text-sm text-fog">
            No bookings{statusFilter !== "all" ? " with this status" : ""}. They&apos;ll land here as calls get booked
            on the public calendar.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => (
              <Card key={b.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-white">{b.business_name}</h3>
                      <Badge variant="brand">
                        <Video className="h-3 w-3" /> {b.call_type}
                      </Badge>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", STATUS_STYLES[b.status])}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-fog">
                      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-glow-300">
                          <CalendarClock className="h-3.5 w-3.5" /> {formatWhen(b.scheduled_at, b.timezone)} · {b.duration_min} min
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> {b.name}{b.phone ? ` · ${b.phone}` : ""}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" /> {b.email}
                        </span>
                      </p>
                      {b.notes && (
                        <p className="inline-flex items-start gap-1.5 text-mist">
                          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Notes: {b.notes}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-mute">
                      <span>
                        Prospect:{" "}
                        {b.prospect ? (
                          <>
                            <span className="font-semibold text-mist">{`${b.prospect?.business_name}`}</span>
                            {" · "}
                            {prospectGrade(b.prospect)}
                            {b.prospect?.slug ? (
                              <>
                                {" · "}
                                <Link href={`/pitch/${b.prospect.slug}`} className="text-brand-300 underline-offset-2 hover:underline">
                                  pitch page
                                </Link>
                              </>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-fog">no audit on file</span>
                        )}
                      </span>
                      <span>Booked {formatWhen(b.created_at, b.timezone)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {(b.status === "confirmed" || b.status === "rescheduled") && (
                      <>
                        <Button size="sm" variant="emerald" loading={busy === b.id} onClick={() => patch(b.id, { status: "completed" })}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                        </Button>
                        <Button size="sm" variant="subtle" loading={busy === b.id} onClick={() => patch(b.id, { status: "no-show" })}>
                          <UserX className="h-3.5 w-3.5" /> No-show
                        </Button>
                        <Button size="sm" variant="danger" loading={busy === b.id} onClick={() => patch(b.id, { status: "cancelled" })}>
                          <CalendarX2 className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      </>
                    )}
                    {b.status === "cancelled" && (
                      <Button size="sm" variant="outline" loading={busy === b.id} onClick={() => patch(b.id, { status: "confirmed" })}>
                        Reinstate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenScript((p) => ({ ...p, [b.id]: !p[b.id] }))}
                    >
                      <FileText className="h-3.5 w-3.5" /> Call script
                    </Button>
                    <Button size="sm" variant="ghost" loading={busy === b.id} onClick={() => remove(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Reschedule row */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
                  <input
                    type="datetime-local"
                    value={reschedule[b.id] ?? toLocalInputValue(b.scheduled_at)}
                    onChange={(e) => setReschedule((p) => ({ ...p, [b.id]: e.target.value }))}
                    className={cn(inputCls, "w-auto")}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busy === b.id}
                    disabled={!reschedule[b.id] || reschedule[b.id] === toLocalInputValue(b.scheduled_at)}
                    onClick={() => {
                      if (!reschedule[b.id]) return;
                      const local = new Date(reschedule[b.id]);
                      void patch(b.id, {
                        scheduled_at: local.toISOString(),
                        status: b.status === "completed" || b.status === "no-show" ? b.status : "rescheduled",
                      });
                    }}
                  >
                    <CalendarClock className="h-3.5 w-3.5" /> Reschedule
                  </Button>
                  {b.prospect?.slug && (
                    <Link
                      href={`/pitch/${b.prospect.slug}`}
                      className="ml-auto text-xs font-semibold text-brand-300 underline-offset-2 hover:underline"
                    >
                      Open {b.prospect.business_name} pitch →
                    </Link>
                  )}
                </div>

                {/* Call script */}
                {openScript[b.id] && (
                  <div className="mt-4 rounded-2xl border border-brand-500/20 bg-ink-900/70 p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-white">
                        <FileText className="h-4 w-4 text-brand-300" /> Call script — {b.business_name}
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void navigator.clipboard.writeText(strategyCallScriptText({ booking: b, prospect: b.prospect }));
                          setCopied(b.id);
                          window.setTimeout(() => setCopied(null), 1500);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" /> {copied === b.id ? "Copied!" : "Copy full script"}
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {script(b).map((s) => (
                        <div key={s.heading} className="rounded-xl border border-white/5 bg-ink-950/60 p-4">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-brand-300">{s.heading}</p>
                          <div className="space-y-1.5 text-xs leading-relaxed text-mist">
                            {s.lines.map((l, i) => (
                              <p key={i}>{l}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function isAdminLogin(): Promise<boolean> {
  return import("@/lib/data").then((m) => m.isAdmin());
}

function prospectGrade(p: ProspectLite | null): string {
  if (!p) return "no audit";
  const g = p.audit_report?.grade;
  const r = p.google_rating ?? null;
  const parts = [g ? `grade ${g}` : "no grade"];
  if (p.recommended_services?.length) parts.push(`${p.recommended_services.length} services recommended`);
  if (r) parts.unshift(`${r}★`);
  const roi = p.roi_projection;
  if (roi?.projected_monthly) parts.push(`$${Math.round(roi.projected_monthly).toLocaleString("en-US")}/mo projected`);
  return parts.join(" · ");
}