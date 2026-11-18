"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Send,
  Smartphone,
} from "lucide-react";
import type { OutreachChannel, OutreachLog, OutreachStatus } from "@/lib/supabase-types";
import { cn } from "@/lib/utils";

interface LogsResponse {
  logs: OutreachLog[];
  counts: Record<string, number>;
  store?: { backend: "supabase" | "memory"; tableMissing: boolean; lastError: string | null };
}

type FilterStatus = "all" | OutreachStatus;

const STATUS_FILTERS: { id: FilterStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "queued", label: "Queued" },
  { id: "sent", label: "Sent" },
  { id: "delivered", label: "Delivered" },
  { id: "read", label: "Read" },
  { id: "replied", label: "Replied" },
  { id: "failed", label: "Failed" },
];

const CHANNEL_FILTERS: { id: "" | OutreachChannel; label: string }[] = [
  { id: "", label: "All channels" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Messenger" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "tiktok", label: "TikTok" },
];

const STATUS_STYLES: Record<OutreachStatus, string> = {
  queued: "border-white/15 bg-white/5 text-fog",
  sending: "border-sky-400/40 bg-sky-500/10 text-sky-300",
  sent: "border-brand-400/40 bg-brand-500/10 text-brand-300",
  delivered: "border-glow-400/40 bg-glow-500/10 text-glow-300",
  read: "border-violet-400/40 bg-violet-500/10 text-violet-300",
  replied: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  failed: "border-red-400/40 bg-red-500/10 text-red-300",
  cancelled: "border-white/15 bg-white/5 text-mute",
};

const CHANNEL_LABEL: Record<OutreachChannel, string> = {
  instagram: "Instagram DM",
  facebook: "Messenger",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
};

function statusIcon(status: OutreachStatus) {
  switch (status) {
    case "failed":
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case "replied":
    case "delivered":
    case "read":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "queued":
    case "sending":
      return <Clock className="h-3.5 w-3.5" />;
    default:
      return <Send className="h-3.5 w-3.5" />;
  }
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function OutreachQueue() {
  const [logs, setLogs] = useState<OutreachLog[]>([]);
  const [store, setStore] = useState<LogsResponse["store"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<FilterStatus>("all");
  const [channel, setChannel] = useState<"" | OutreachChannel>("");
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/outreach/logs?limit=300", { cache: "no-store" });
      const json = (await res.json()) as LogsResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not load the outreach queue.");
      setLogs(json.logs ?? []);
      setStore(json.store ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the outreach queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial hydration fetch — load() owns its own loading/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const counts = useMemo(() => {
    return logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.status] = (acc[log.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [logs]);

  const visible = useMemo(
    () =>
      logs.filter(
        (log) => (status === "all" || log.status === status) && (!channel || log.channel === channel),
      ),
    [logs, status, channel],
  );

  const retry = async (id: string) => {
    setRetrying(id);
    setError(null);
    try {
      const res = await fetch("/api/outreach/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (!json.success) {
        setError(json.message || json.error || "Retry failed.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.");
    } finally {
      setRetrying(null);
    }
  };

  const kpis: { label: string; value: number; tone: string }[] = [
    { label: "Queued", value: (counts.queued ?? 0) + (counts.sending ?? 0), tone: "text-fog" },
    { label: "Sent", value: counts.sent ?? 0, tone: "text-brand-300" },
    { label: "Delivered / read", value: (counts.delivered ?? 0) + (counts.read ?? 0), tone: "text-glow-300" },
    { label: "Replied", value: counts.replied ?? 0, tone: "text-emerald-300" },
    { label: "Failed", value: counts.failed ?? 0, tone: "text-red-300" },
  ];

  return (
    <div className="min-h-screen bg-ink-950 pb-24 pt-20 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-fog transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Admin Command Center
            </Link>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Multi-Channel Outreach Queue
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-fog">
              Every video pitch sent through Instagram, Messenger, WhatsApp, or TikTok — with
              delivery receipts, replies, provider error codes, retries, and GHL sync status.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-ink-900 px-4 py-2 text-xs font-semibold text-fog transition hover:border-white/25 hover:text-white disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </button>
        </div>

        {store?.backend === "memory" && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              In-memory queue (Supabase not configured or `outreach_logs` migration missing). Run
              `supabase/migrations/003_outreach_logs.sql` to persist delivery history.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">{kpi.label}</p>
              <p className={cn("mt-1 font-display text-2xl font-bold", kpi.tone)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setStatus(item.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                status === item.id
                  ? "border-brand-400/50 bg-brand-500/15 text-white"
                  : "border-white/10 text-fog hover:border-white/25 hover:text-white",
              )}
            >
              {item.label}
            </button>
          ))}
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value as "" | OutreachChannel)}
            className="ml-auto rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 text-xs font-semibold text-fog outline-none focus:border-brand-400/60"
          >
            {CHANNEL_FILTERS.map((item) => (
              <option key={item.id || "all"} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-mute">
                <tr>
                  <th className="px-4 py-3 font-semibold">Lead / recipient</th>
                  <th className="px-4 py-3 font-semibold">Channel</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Attempts</th>
                  <th className="px-4 py-3 font-semibold">Last event</th>
                  <th className="px-4 py-3 font-semibold">GHL</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{log.recipient_name || "Unknown lead"}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-mute">{log.recipient}</p>
                    </td>
                    <td className="px-4 py-3 text-fog">
                      <span className="inline-flex items-center gap-1.5">
                        {log.channel === "whatsapp" ? (
                          <Smartphone className="h-3.5 w-3.5" />
                        ) : (
                          <MessageCircle className="h-3.5 w-3.5" />
                        )}
                        {CHANNEL_LABEL[log.channel]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                          STATUS_STYLES[log.status],
                        )}
                      >
                        {statusIcon(log.status)}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fog">
                      {log.attempt}/{log.max_attempts}
                    </td>
                    <td className="px-4 py-3 text-fog">{formatDate(log.updated_at)}</td>
                    <td className="px-4 py-3">
                      {log.ghl_synced_at ? (
                        <span className="text-glow-300">Synced</span>
                      ) : log.ghl_error ? (
                        <span className="text-amber-300" title={log.ghl_error}>
                          Pending
                        </span>
                      ) : (
                        <span className="text-mute">—</span>
                      )}
                    </td>
                    <td className="max-w-[280px] px-4 py-3">
                      {log.error_message ? (
                        <span className="text-red-300" title={log.error_message}>
                          {log.error_code ? `${log.error_code}: ` : ""}
                          {log.error_message.length > 90
                            ? `${log.error_message.slice(0, 90)}…`
                            : log.error_message}
                        </span>
                      ) : log.provider_message_id ? (
                        <span className="font-mono text-[11px] text-mute">
                          {log.provider_message_id}
                        </span>
                      ) : (
                        <span className="text-mute">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {log.status === "failed" && log.direction === "outbound" && (
                        <button
                          onClick={() => void retry(log.id)}
                          disabled={retrying === log.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-400/40 bg-brand-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-300 transition hover:border-brand-300 hover:text-white disabled:opacity-60"
                        >
                          <RotateCcw
                            className={cn("h-3 w-3", retrying === log.id && "animate-spin")}
                          />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-sm text-mute">
                      No outreach rows match this filter yet. Dispatch a video pitch from the CRM or
                      via <span className="font-mono text-fog">POST /api/outreach/dispatch</span>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {loading && (
            <div className="border-t border-white/5 px-4 py-6 text-center text-xs text-mute">
              Loading delivery queue…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
