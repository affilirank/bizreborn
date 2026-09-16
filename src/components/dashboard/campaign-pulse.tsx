"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, Inbox, Users, AlertTriangle, Gauge, Eye, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Pulse = {
  total: number;
  reachable: number;
  byStage: Record<string, number>;
  noEmail: number;
  sentToday: number;
  sentLast24h: number;
  sentLifetime: number;
  openedDistinct: number;
  openedEvents: number;
  willRespondProb: { distinctPct: number } | null;
  errorsToday: number;
  recentOpens: { id: string; business_name: string; opens: number; opened_at: string }[];
  savedToday: number;
  budget: number;
  welcomeCap: number;
  provider: string;
};

const STATUS_LABEL: Record<string, string> = {
  welcome: "Welcome",
  pitch: "Pitch",
  drip_1: "Drip 1",
  drip_2: "Drip 2",
  drip_3: "Drip 3",
  done: "Done",
};

export function CampaignPulse() {
  const [data, setData] = useState<Pulse | null>(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetch("/api/prospects/campaign-stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [refresh]);

  if (error) return null;
  if (!data) {
    return (
      <Card className="mt-6 p-6">
        <p className="text-sm text-fog">Loading campaign pulse…</p>
      </Card>
    );
  }

  const { byStage } = data;
  const open = byStage.welcome ?? 0;
  const pipelining = (byStage.pitch ?? 0) + (byStage.drip_1 ?? 0) + (byStage.drip_2 ?? 0) + (byStage.drip_3 ?? 0);
  const delivered = byStage.done ?? 0;
  const openRate = data.sentLifetime > 0 ? Math.round((data.openedDistinct / data.sentLifetime) * 100) : 0;

  return (
    <Card className="mt-6 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 font-display text-base font-bold text-white">
            <Gauge className="h-4 w-4 text-glow-400" /> Campaign Pulse
          </h4>
          <p className="text-xs text-fog">
            Live outlook from your lead engine — auto-refreshes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefresh((r) => r + 1)}
            className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-fog transition hover:border-white/25 hover:text-white"
          >
            Refresh
          </button>
          <BadgePill emerald>{data.provider} · {data.sentToday}/{data.budget} sent</BadgePill>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Lead library" value={`${data.total.toLocaleString()}`}
          sub={`${data.reachable} reachable · ${data.savedToday} new today`} accent="brand" />
        <Stat icon={Send} label="In outreach" value={`${pipelining}`}
          sub={`${open} waiting welcome`} accent="brand" />
        <Stat icon={Gauge} label="Budget used" value={`${data.sentToday}/${data.budget}`}
          sub={`${data.sentLast24h} sent last 24h · lifetime ${data.sentLifetime}`} accent="emerald" />
        <Stat icon={Eye} label="Opened" value={`${data.openedDistinct} leads`}
          sub={`${data.openedEvents} opens · ${openRate}% open rate`} accent="amber" />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-ink-850/50 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-mute">
            <Activity className="h-3.5 w-3.5" /> Engagement — recent opens
          </p>
          {data.recentOpens.length === 0 ? (
            <p className="text-xs text-fog">No opens yet — leads start opening after their pitch email lands.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentOpens.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-mist">{o.business_name}</span>
                  <span className="shrink-0 text-mute">
                    {o.opens}× ·
                    {new Date(o.opened_at).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/8 bg-ink-850/50 p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-mute">Deliverability</p>
          {data.sentLifetime === 0 ? (
            <p className="text-xs text-fog">No campaign emails sent yet this period — life starts at the first send.</p>
          ) : (
            <>
              <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-ink-950">
                <div className="h-full rounded-full bg-glow-500/80"
                  style={{ width: `${Math.min(100, (data.sentLifetime - 0) / Math.max(data.sentLifetime, 1) * 100)}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Cell label="Sent" value={`${data.sentLifetime}`} tone="glow" />
                <Cell label="Opened" value={`${data.openedDistinct}`} tone="brand" />
                <Cell label="Errors" value={`${data.errorsToday} today`} tone={data.errorsToday > 0 ? "rose" : "mute"} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {Object.entries(byStage).map(([stage, n]) => (
          <div key={stage}
            className="rounded-xl border border-white/10 bg-ink-850/60 px-3 py-2 text-center"
            style={{ minWidth: 76 }}>
            <p className="font-mono text-sm font-bold text-white">{n}</p>
            <p className="text-[10px] uppercase tracking-wide text-mute">{STATUS_LABEL[stage] ?? stage}</p>
          </div>
        ))}
        <div className="rounded-xl border border-dashed border-white/15 px-3 py-2 text-center" style={{ minWidth: 76 }}>
          <p className="font-mono text-sm font-bold text-amber-300">{data.noEmail}</p>
          <p className="text-[10px] uppercase tracking-wide text-mute">no email</p>
        </div>
        <Link href="/admin/prospects"
          className="ml-auto text-xs font-semibold text-brand-300 hover:text-white">
          Open Lead Pitches →
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3 text-[11px] text-mute">
        <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {data.errorsToday} send errors today</span>
        <span>welcome cap {data.welcomeCap}</span>
      </div>
    </Card>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone: "glow" | "brand" | "rose" | "mute" }) {
  const tones = {
    glow: "text-glow-400",
    brand: "text-brand-300",
    rose: "text-rose-300",
    mute: "text-mute",
  };
  return (
    <div className="rounded-xl border border-white/5 bg-ink-950/60 p-2.5">
      <p className={cn("font-mono text-base font-bold", tones[tone])}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-mute">{label}</p>
    </div>
  );
}

function BadgePill({ emerald, children }: { emerald?: boolean; children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold",
      emerald
        ? "border-glow-500/30 bg-glow-500/10 text-glow-400"
        : "border-white/10 bg-ink-850/60 text-fog",
    )}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> {children}
    </span>
  );
}

function Stat({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: "brand" | "emerald" | "rose" | "amber";
}) {
  const accents = {
    brand: "bg-brand-500/15 text-brand-300 border-brand-500/30",
    emerald: "bg-glow-500/15 text-glow-400 border-glow-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  };
  return (
    <div className="rounded-2xl border border-white/8 bg-ink-850/50 p-4">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", accents[accent])}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-mute">{label}</p>
          <p className="font-display text-lg font-bold text-white">{value}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-fog">{sub}</p>
    </div>
  );
}