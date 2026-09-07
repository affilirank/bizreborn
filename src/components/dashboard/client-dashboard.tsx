"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Package,
  Send,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/ui/section";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  currentUser,
  listAudits,
  listOrders,
  listReports,
} from "@/lib/data";
import type { AuditReport, ClientOrder, MonthlyReport } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  queued: "border-white/10 bg-white/5 text-fog",
  in_progress: "border-brand-500/30 bg-brand-500/10 text-brand-300",
  review: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  completed: "border-glow-500/30 bg-glow-500/10 text-glow-400",
};

export function ClientDashboard() {
  const [user, setUser] = React.useState<{ email: string | null } | null>(null);
  const [orders, setOrders] = React.useState<ClientOrder[]>([]);
  const [audits, setAudits] = React.useState<AuditReport[]>([]);
  const [reports, setReports] = React.useState<MonthlyReport[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void currentUser()
      .then(setUser)
      .catch(() => null);
    void listOrders()
      .then(setOrders)
      .catch(() => []);
    void listAudits()
      .then(setAudits)
      .catch(() => []);
    void listReports()
      .then(setReports)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

  const name = orders[0]?.businessName ?? "Your Business";
  const activeOrders = orders.filter((o) => o.status === "active");
  const activeModules = activeOrders.reduce(
    (s, o) => s + (o.services?.length ?? 0),
    0,
  );
  const monthlyRetainer = activeOrders.reduce(
    (s, o) => s + (o.counts?.monthly ?? 0),
    0,
  );
  const latestScore = audits[0]?.healthScore;

  return (
    <div className="pt-24">
      <Container>
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
              Client Portal
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-white sm:text-4xl">
              {name}
            </h1>
            <p className="mt-1 text-sm text-fog">
              {user?.email ?? "Signed in"} · your reports, services &amp; billing
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/audit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-fog transition hover:border-white/25 hover:text-white"
            >
              Run an audit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-300 transition hover:bg-brand-500/20"
            >
              Add services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="pt-20 text-center text-sm text-fog">
            Loading your portal…
          </div>
        ) : orders.length === 0 && audits.length === 0 && reports.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-500/30 bg-brand-500/10">
              <Sparkles className="h-6 w-6 text-brand-300" />
            </div>
            <h2 className="mt-5 font-display text-xl font-bold text-white">
              Your journey starts here
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-fog">
              No reports, services, or audits on this account yet. Run a free
              audit to see your marketing gaps, then build a service menu that
              fixes them — your manager will publish monthly reports right here.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Link
                href="/audit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
              >
                Run free audit <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-6 py-2.5 text-sm font-semibold text-mist transition hover:border-white/30 hover:text-white"
              >
                Explore services
              </Link>
            </div>
          </Card>
        ) : (
          <>
            {/* Real KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Active modules" value={String(activeModules)} delta={`${activeOrders.length} active menu${activeOrders.length === 1 ? "" : "s"}`} icon={Package} accent="emerald" />
              <KpiCard label="Monthly retainer" value={monthlyRetainer > 0 ? `$${monthlyRetainer.toLocaleString()}` : "—"} delta="per month" icon={Clock} accent="amber" />
              <KpiCard label="Monthly reports" value={String(reports.length)} delta="published by your manager" icon={FileText} accent="brand" />
              <KpiCard label="Latest health score" value={latestScore !== undefined ? String(latestScore) : "—"} delta={latestScore !== undefined ? "out of 100" : "run an audit"} icon={Eye} accent="rose" />
            </div>

            {/* Monthly reports */}
            <Card className="mt-6 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="flex items-center gap-2 font-display text-base font-bold text-white">
                    <Send className="h-4 w-4 text-glow-400" /> Monthly reports
                  </h4>
                  <p className="text-xs text-fog">
                    Prepared by your manager — updated every month
                  </p>
                </div>
                <Badge variant="brand">{reports.length} reports</Badge>
              </div>
              {reports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-fog">
                  No monthly reports yet. Once your manager publishes the first
                  one, it&apos;ll show up here automatically.
                </div>
              ) : (
                <ul className="space-y-2">
                  {reports.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-ink-850/50 px-4 py-3"
                    >
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase",
                          r.status === "published"
                            ? "border-glow-500/30 bg-glow-500/10 text-glow-400"
                            : "border-brand-500/30 bg-brand-500/10 text-brand-300",
                        )}
                      >
                        {r.status}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-mist">
                          {r.month ? `${r.month} report` : "Monthly report"}
                        </p>
                        <p className="truncate text-[11px] text-mute">
                          {r.metrics.length} metrics · {r.highlights.length} highlights ·{" "}
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        href={`/report/${r.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-glow-500/40 bg-glow-500/10 px-3 py-1.5 text-xs font-semibold text-glow-400 transition hover:bg-glow-500/20"
                      >
                        Open report <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Fulfillment */}
            <Card className="mt-6 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h4 className="font-display text-base font-bold text-white">
                    Active service fulfillment
                  </h4>
                  <p className="text-xs text-fog">
                    Live status of the modules on your menu
                  </p>
                </div>
                <Badge variant="brand">
                  <Package className="h-3.5 w-3.5" /> {activeModules} active
                </Badge>
              </div>
              {activeOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
                  <p className="text-sm text-fog">
                    No active services yet.{" "}
                    <Link href="/services" className="font-semibold text-brand-300 hover:text-white">
                      Build your menu →
                    </Link>
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {activeOrders.map((o) =>
                    o.fulfillment.length === 0 ? (
                      <li key={o.id} className="rounded-xl border border-white/5 bg-ink-850/50 p-4 text-sm text-fog">
                        {o.businessName} · modules queued — kickoff underway
                      </li>
                    ) : (
                      o.fulfillment.map((f, i) => (
                        <li key={`${o.id}-${i}`} className="rounded-xl border border-white/5 bg-ink-850/50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 text-sm font-medium text-mist">
                              {f.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-glow-400" />
                              ) : (
                                <Clock className="h-4 w-4 shrink-0 text-brand-300" />
                              )}
                              <span className="truncate">{f.title}</span>
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                statusStyle[f.status],
                              )}
                            >
                              {f.status.replace("_", " ")}
                            </span>
                          </div>
                          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700",
                                f.status === "completed"
                                  ? "bg-glow-500"
                                  : "bg-gradient-to-r from-brand-500 to-brand-400",
                              )}
                              style={{ width: `${f.progress}%` }}
                            />
                          </div>
                        </li>
                      ))
                    ),
                  )}
                </ul>
              )}
            </Card>

            {/* Recent audits + billing */}
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <h4 className="mb-4 font-display text-base font-bold text-white">Recent audits</h4>
                {audits.length === 0 ? (
                  <p className="text-sm text-fog">
                    No audits yet.{" "}
                    <Link href="/audit" className="font-semibold text-brand-300 hover:text-white">
                      Run your free audit →
                    </Link>
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {audits.slice(0, 5).map((a) => (
                      <li key={a.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-850/50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-mist">{a.businessName || a.url}</p>
                          <p className="text-[11px] text-mute">{a.id} · {new Date(a.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold text-brand-300">{a.healthScore}</span>
                          <span className="text-[10px] text-mute">/100</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-6">
                <h4 className="mb-4 font-display text-base font-bold text-white">Orders & billing</h4>
                {orders.length === 0 ? (
                  <p className="text-sm text-fog">
                    No orders yet. Your invoices will appear here after checkout.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {orders.slice(0, 5).map((o) => (
                      <li key={o.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-850/50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-mist">
                            <span className="font-mono text-[11px] text-brand-300">{o.id}</span> · {o.counts.services} modules
                          </p>
                          <p className="text-[11px] text-mute">
                            {o.counts.monthly > 0
                              ? `${"$" + o.counts.monthly.toLocaleString()}/mo retainer`
                              : `${"$" + o.counts.oneTime.toLocaleString()} one-time`}
                          </p>
                        </div>
                        <Badge variant={o.status === "active" ? "emerald" : "brand"}>
                          <CheckCircle2 className="h-3 w-3" /> {o.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </Container>
    </div>
  );
}
