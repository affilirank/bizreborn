"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, Inbox, Users, AlertTriangle, Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Pulse = {
  total: number;
  byStage: Record<string, number>;
  noEmail: number;
  sentToday: number;
  bouncesToday: number;
  complaintsToday: number;
  savedToday: number;
  budget: number;
  welcomeCap: number;
  provider: string;
};

export function CampaignPulse() {
  const [data, setData] = useState<Pulse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/prospects/campaign-stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, []);

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
  const hardFail = data.bouncesToday + data.complaintsToday;

  return (
    <Card className="mt-6 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 font-display text-base font-bold text-white">
            <Gauge className="h-4 w-4 text-glow-400" /> Campaign Pulse
          </h4>
          <p className="text-xs text-fog">
            Live outlook from your lead engine — no email, always current.
          </p>
        </div>
        <BadgePill emerald>{data.provider} · {data.sentToday}/{data.budget} sent</BadgePill>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Lead library" value={`${data.total.toLocaleString()}`}
          sub={`${data.savedToday} new today`} accent="brand" />
        <Stat icon={Send} label="In outreach" value={`${pipelining}`}
          sub={`${open} waiting for welcome`} accent="brand" />
        <Stat icon={Gauge} label="Budget used" value={`${data.sentToday}/${data.budget}`}
          sub={`welcome cap ${data.welcomeCap}`} accent="emerald" />
        <Stat icon={hardFail > 0 ? AlertTriangle : Inbox} label="Bounces / complaints" value={`${data.bouncesToday}/${data.complaintsToday}`}
          sub={`hard-fail cleanup today`} accent={hardFail > 0 ? "rose" : "azure"} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {Object.entries(byStage).map(([stage, n]) => (
          <div key={stage}
            className="rounded-xl border border-white/10 bg-ink-850/60 px-3 py-2 text-center"
            style={{ minWidth: 76 }}>
            <p className="font-mono text-sm font-bold text-white">{n}</p>
            <p className="text-[10px] uppercase tracking-wide text-mute">{stage}</p>
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
    </Card>
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
  accent: "brand" | "emerald" | "rose" | "azure";
}) {
  const accents = {
    brand: "bg-brand-500/15 text-brand-300 border-brand-500/30",
    emerald: "bg-glow-500/15 text-glow-400 border-glow-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    azure: "bg-sky-500/15 text-sky-300 border-sky-500/30",
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