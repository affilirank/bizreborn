"use client";

import * as React from "react";
import Link from "next/link";
import {
  Radar,
  Users,
  CreditCard,
  ListTodo,
  ArrowRight,
  CheckCircle2,
  RefreshCcw,
  DollarSign,
  UserPlus,
  Mail,
  Phone,
  FileText,
  X,
  Plus,
  Trash2,
  HandCoins,
  Send,
  Film,
  Timer,
  History,
} from "lucide-react";
import { BlogBuilder } from "@/components/dashboard/blog-builder";
import { OfferBuilder } from "@/components/dashboard/offer-builder";
import { ReportBuilder } from "@/components/dashboard/report-builder";
import { TasksTab } from "@/components/dashboard/tasks-tab";
import { AuditReportView } from "@/components/audit/audit-widget";
import { Container } from "@/components/ui/section";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getAudits,
  getLeads,
  getOrders,
  saveLead,
  writeDemo,
  AUDITS_KEY,
  LEADS_KEY,
  ORDERS_KEY,
  demoEnabled,
} from "@/lib/db";
import { runAudit } from "@/lib/audit";
import { buildOrder } from "@/lib/db";
import {
  isAdmin,
  listAudits,
  listLeads,
  listOrders,
  listSubscriptions,
  listTasks,
  updateTask,
  createTask,
  deleteTask,
  markTaskDone,
  listWorkLogs,
  deleteWorkLog,
  addWorkLog,
  type AdminSubscription,
  type AdminTask,
} from "@/lib/data";
import type { AuditReport, ClientOrder, Lead, WorkLog } from "@/lib/types";
import { cn } from "@/lib/utils";

const TEAM = ["Marcus", "Dana", "Vince", "Priya"];

const SUBMITTED_LABELS: Record<string, string> = {
  reviews: "Google reviews",
  postingFreq: "Posting cadence",
  leadSource: "Finds you via",
  crmCapture: "Contact capture",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  gbp: "Google Business Profile",
};

const REVIEW_LABEL: Record<string, string> = {
  none: "None / under 10",
  few: "10–50",
  some: "50–200",
  many: "200+",
};
const FREQ_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "A few times / week",
  monthly: "A few times / month",
  never: "Almost never",
};
const SOURCE_LABEL: Record<string, string> = {
  google: "Google / Map Pack",
  social: "Social media",
  referrals: "Referrals",
  walkin: "Walk-ins",
  ads: "Paid ads",
};
const CAPTURE_LABEL: Record<string, string> = {
  yes: "Yes — email/SMS list",
  no: "No",
};

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-ink-800/60 px-3 py-1.5 text-xs">
      <span className="font-semibold uppercase tracking-wide text-mute">
        {label}
      </span>
      <span className="text-white">{value}</span>
    </span>
  );
}

export function AdminDashboard() {
  const [access, setAccess] = React.useState<
    "loading" | "granted" | "denied"
  >("loading");
  const [audits, setAudits] = React.useState<AuditReport[]>(() =>
    demoEnabled() ? getAudits() : [],
  );
  const [orders, setOrders] = React.useState<ClientOrder[]>(() =>
    demoEnabled() ? getOrders() : [],
  );
  const [leads, setLeads] = React.useState<Lead[]>(() =>
    demoEnabled() ? getLeads() : [],
  );
  const [tasks, setTasks] = React.useState<AdminTask[]>(() =>
    demoEnabled()
      ? [
          { id: "T-104", service: "GBP Optimization & Audit", client: "Ace Plumbing", assignee: null, due: "Aug 6", priority: "high", status: "queued", estimatedHours: 6, completedAt: null },
          { id: "T-105", service: "Short-Form Video Batch (15)", client: "Twin Peaks Barbershop", assignee: null, due: "Aug 7", priority: "high", status: "queued", estimatedHours: 10, completedAt: null },
          { id: "T-106", service: "Missed-Call Text-Back Setup", client: "Rapid Air HVAC", assignee: null, due: "Aug 8", priority: "medium", status: "queued", estimatedHours: 4, completedAt: null },
          { id: "T-107", service: "Review Request Campaigns", client: "Harbor Realty", assignee: null, due: "Aug 10", priority: "low", status: "queued", estimatedHours: 3, completedAt: null },
        ]
      : [],
  );
  const [tab, setTab] = React.useState<"overview" | "offers" | "reports" | "blog">("overview");

  // Deep link: /admin?tab=offers (used by "Draft proposal" on Lead Pitches).
  React.useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "offers" || t === "reports" || t === "blog" || t === "overview") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(t);
    }
  }, []);
  const [selectedAudit, setSelectedAudit] =
    React.useState<AuditReport | null>(null);
  const [subs, setSubs] = React.useState<AdminSubscription[]>([]);
  const [workLogs, setWorkLogs] = React.useState<WorkLog[]>([]);
  const [newTask, setNewTask] = React.useState<{
    client: string;
    service: string;
    due: string;
    priority: AdminTask["priority"];
    hours: string;
  }>({ client: "", service: "", due: "", priority: "medium", hours: "" });

  React.useEffect(() => {
    void isAdmin()
      .then((ok) => setAccess(ok ? "granted" : "denied"))
      .catch(() => setAccess("denied"));
  }, []);

  // Demo mode: seed a realistic dataset on first visit so the admin portal
  // demonstrates its full capabilities out of the box.
  React.useEffect(() => {
    if (!demoEnabled()) return;
    const timer = window.setTimeout(() => {
      if (getAudits().length === 0) {
        const seeds = [
          { url: "twinapex.com", businessName: "Twin Peaks Barbershop", gbp: "Twin Peaks Barbershop" },
          { url: "rapidairhvac.com", businessName: "Rapid Air Heating & Cooling", gbp: "Rapid Air HVAC" },
          { url: "harborrealty.co", businessName: "Harbor Realty Group", instagram: "@harborrealty" },
          { url: "perkcoffee.shop", businessName: "Perk Coffee Co.", tiktok: "@perkcoffee" },
        ];
        const seeded = seeds.map((s) => runAudit(s));
        writeDemo(AUDITS_KEY, [...seeded, ...getAudits()]);
      }
      if (getOrders().length === 0) {
        const order = buildOrder({
          businessName: "Twin Peaks Barbershop",
          email: "client@bizreborn.io",
          vertical: "barbershop",
          services: [1, 31, 41, 11],
          monthly: true,
          acv: 45,
          leadIncrease: 60,
        });
        writeDemo(ORDERS_KEY, [order, ...getOrders()]);
      }
      if (getLeads().length === 0) {
        const leadSeeds = [
          { name: "Marcus Webb", businessName: "Webb Auto Detailing", phone: "(512) 555-0142", email: "marcus@webbdetail.com" },
          { name: "Dana Ortiz", businessName: "Ortiz Dental Studio", phone: "(512) 555-0187", email: "dana@ortizdental.com" },
          { name: "Priya Raman", businessName: "Raman Realty Partners", phone: "(512) 555-0103", email: "priya@ramanrealty.com" },
        ];
        const rows = leadSeeds.map((l) =>
          saveLead({ ...l, source: "audit" }),
        );
        writeDemo(LEADS_KEY, [...rows, ...getLeads()]);
      }
      setAudits(getAudits());
      setOrders(getOrders());
      setLeads(getLeads());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Live mode only — hydrate from Supabase.
  React.useEffect(() => {
    if (demoEnabled()) return;
    void listAudits().then(setAudits).catch(() => {});
    void listOrders().then(setOrders).catch(() => {});
    void listLeads().then(setLeads).catch(() => {});
    void listTasks().then(setTasks).catch(() => {});
    void listSubscriptions().then(setSubs).catch(() => {});
    void listWorkLogs().then(setWorkLogs).catch(() => {});
  }, []);

  if (access === "loading") {
    return (
      <div className="pt-40 text-center text-sm text-fog">Checking access…</div>
    );
  }

  if (access === "denied") {
    return (
      <div className="pt-40">
        <Container>
          <div className="card-obsidian mx-auto max-w-md rounded-3xl p-10 text-center">
            <h1 className="font-display text-2xl font-bold text-white">
              Admin access required
            </h1>
            <p className="mt-2 text-sm text-fog">
              Your account is not an admin. Sign in with the admin account to
              open the command center.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-300 transition hover:bg-brand-500/20"
            >
              Switch account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const mrr = orders.reduce((s, o) => s + (o.counts?.monthly ?? 0), 0);

  const assign = (id: string, assignee: string | null) => {
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, assignee } : x)));
    void updateTask(id, { assignee }).catch(() => {});
  };

  const complete = async (id: string) => {
    const task = tasks.find((x) => x.id === id);
    const hours = task?.estimatedHours ?? 0;
    setTasks((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              status: "completed",
              completedAt: new Date().toISOString(),
            }
          : x,
      ),
    );
    if (demoEnabled()) {
      const log = await addWorkLog({
        taskId: id,
        clientName: task?.client ?? "",
        service: task?.service ?? "",
        workDate: new Date().toISOString().slice(0, 10),
        hours,
      });
      if (log) setWorkLogs((prev) => [log, ...prev]);
      return;
    }
    void markTaskDone(id, hours).then(() => {
      void listWorkLogs().then(setWorkLogs).catch(() => {});
    }).catch(() => {});
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((x) => x.id !== id));
    if (!demoEnabled()) void deleteTask(id).catch(() => {});
  };

  const setHours = (id: string, hours: number) => {
    setTasks((prev) =>
      prev.map((x) => (x.id === id ? { ...x, estimatedHours: hours } : x)),
    );
    if (!demoEnabled()) void updateTask(id, { estimatedHours: hours }).catch(() => {});
  };

  const reopenTask = (id: string) => {
    setTasks((prev) =>
      prev.map((x) =>
        x.id === id
          ? { ...x, status: "in_progress", completedAt: null }
          : x,
      ),
    );
    void updateTask(id, { status: "in_progress", completedAt: null }).catch(
      () => {},
    );
  };

  const handleAddTask = async (t: {
    client: string;
    service: string;
    due: string;
    priority: AdminTask["priority"];
    hours: string;
  }) => {
    if (!t.service.trim()) return;
    const created = await createTask({
      client: t.client.trim(),
      service: t.service.trim(),
      due: t.due || undefined,
      priority: t.priority,
      estimatedHours: Number(t.hours) || 0,
    }).catch(() => null);
    if (created) {
      setTasks((prev) => [created, ...prev]);
    } else if (demoEnabled()) {
      setTasks((prev) => [
        {
          id: `T-${Date.now()}`,
          service: t.service.trim(),
          client: t.client.trim() || "Unassigned client",
          assignee: null,
          due: t.due
            ? new Date(t.due).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "No due date",
          priority: t.priority,
          status: "queued",
          estimatedHours: Number(t.hours) || 0,
          completedAt: null,
        },
        ...prev,
      ]);
    }
  };

  const taskInputCls =
    "rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-xs font-medium text-white outline-none transition focus:border-brand-400/60";

  const DEMO_SUBS = [
    { name: "Twin Peaks Barbershop", plan: "Growth Engine", amount: "$2,497", renews: "Aug 14", status: "active" },
    { name: "Rapid Air HVAC", plan: "Local Dominance", amount: "$4,997", renews: "Aug 21", status: "active" },
    { name: "Harbor Realty", plan: "Solo Launch", amount: "$997", renews: "Aug 28", status: "active" },
  ];
  const subRows = demoEnabled()
    ? DEMO_SUBS
    : subs.map((s) => ({
        name: s.businessName || s.email || "Subscription",
        plan: s.tier ? `${s.tier} Plan` : "Retainer",
        amount: `$${s.amount.toLocaleString()}`,
        renews: s.currentPeriodEnd
          ? new Date(s.currentPeriodEnd).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "—",
        status: s.status,
      }));

  return (
    <div className="pt-24">
      <Container>
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-glow-400">
              Biz Reborn Ops
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-white sm:text-4xl">
              Admin Command Center
            </h1>
            <p className="mt-1 text-sm text-fog">
              Manage audits, client menus, fulfillment tasks &amp; subscriptions.
            </p>
          </div>
          <Badge variant="emerald" className="px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-glow-400" /> Systems operational
          </Badge>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setTab("overview")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition",
              tab === "overview"
                ? "border-brand-400/50 bg-brand-500/15 text-white"
                : "border-white/10 text-fog hover:border-white/25 hover:text-white",
            )}
          >
            <Radar className="h-4 w-4" /> Overview
          </button>
          <button
            onClick={() => setTab("offers")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition",
              tab === "offers"
                ? "border-brand-400/50 bg-brand-500/15 text-white"
                : "border-white/10 text-fog hover:border-white/25 hover:text-white",
            )}
          >
            <HandCoins className="h-4 w-4" /> Offers
          </button>
          <button
            onClick={() => setTab("reports")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition",
              tab === "reports"
                ? "border-brand-400/50 bg-brand-500/15 text-white"
                : "border-white/10 text-fog hover:border-white/25 hover:text-white",
            )}
          >
            <Send className="h-4 w-4" /> Reports
          </button>
          <button
            onClick={() => setTab("blog")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition",
              tab === "blog"
                ? "border-brand-400/50 bg-brand-500/15 text-white"
                : "border-white/10 text-fog hover:border-white/25 hover:text-white",
            )}
          >
            <FileText className="h-4 w-4" /> Blog Builder
          </button>
          <Link
            href="/admin/prospects"
            className="flex items-center gap-2 rounded-xl border border-glow-500/40 bg-glow-500/10 px-4 py-2 text-sm font-semibold text-glow-300 transition hover:border-glow-400/60 hover:text-white"
          >
            <Film className="h-4 w-4" /> Lead Pitches
          </Link>
          <Link
            href="/admin/crm"
            className="flex items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-300 transition hover:border-brand-400/60 hover:text-white"
          >
            <Users className="h-4 w-4" /> Full CRM
          </Link>
        </div>

        {tab === "blog" ? (
          <Card className="p-6">
            <BlogBuilder />
          </Card>
        ) : tab === "offers" ? (
          <Card className="p-6">
            <OfferBuilder />
          </Card>
        ) : tab === "reports" ? (
          <Card className="p-6">
            <ReportBuilder />
          </Card>
        ) : (
        <>
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Audit requests" value={String(audits.length)} delta="awaiting review" icon={Radar} accent="brand" />
          <KpiCard label="Active clients" value={String(orders.length)} delta="service menus" icon={Users} accent="emerald" />
          <KpiCard label="Monthly recurring" value={`$${mrr.toLocaleString()}`} delta="client retainers" icon={CreditCard} accent="amber" />
          <KpiCard label="Open tasks" value={String(tasks.filter((t) => t.status !== "completed").length)} delta={`${tasks.filter((t) => !t.assignee).length} unassigned`} icon={ListTodo} accent="rose" />
        </div>

        {/* Audit requests + client orders */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-display text-base font-bold text-white">Incoming Audit Requests</h4>
              <Link href="/audit" className="flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-white">
                Open audit engine <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="space-y-2">
              {audits.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => setSelectedAudit(a)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-ink-850/50 px-4 py-3 text-left transition hover:border-brand-400/40 hover:bg-ink-850"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-mist">{a.businessName || a.url}</p>
                      <p className="text-[11px] text-mute">
                        {a.id} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "font-mono text-sm font-bold",
                          a.healthScore < 45 ? "text-rose-300" : a.healthScore < 70 ? "text-amber-300" : "text-glow-400",
                        )}
                      >
                        {a.healthScore}/100
                      </span>
                      <Badge variant="brand">
                        <FileText className="h-3 w-3" /> Review
                      </Badge>
                    </div>
                  </button>
                </li>
              ))}
              {audits.length === 0 && (
                <li className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-fog">
                  No audits yet &mdash; they&rsquo;ll stream in live from the widget.
                </li>
              )}
            </ul>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-display text-base font-bold text-white">Client Service Menus</h4>
              <Badge variant="brand">{orders.length} orders</Badge>
            </div>
            <ul className="space-y-2">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id} className="rounded-xl border border-white/5 bg-ink-850/50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-mist">{o.businessName}</p>
                    <Badge variant="emerald">
                      <DollarSign className="h-3 w-3" />{" "}
                      {o.counts?.monthly > 0
                        ? `$${o.counts.monthly.toLocaleString()}/mo`
                        : `$${o.counts?.oneTime?.toLocaleString() ?? 0}`}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-mute">
                    {o.id} · {o.counts?.services ?? 0} modules ·{" "}
                    {(o.projection?.roas ?? 0)}x projected ROAS
                  </p>
                </li>
              ))}
              {orders.length === 0 && (
                <li className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-fog">
                  Client orders will appear here after checkout.
                </li>
              )}
            </ul>
          </Card>
        </div>

        {/* Lead capture */}
        <Card className="mt-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="font-display text-base font-bold text-white">Captured Leads</h4>
              <p className="text-xs text-fog">
                From the audit gate &amp; contact form — synced to MailerLite
                autoresponder when configured
              </p>
            </div>
            <Badge variant="brand">{leads.length} leads</Badge>
          </div>
          <ul className="space-y-2">
            {leads.slice(0, 6).map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-ink-850/50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-mist">
                    {l.name} <span className="text-mute">· {l.businessName}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-mute">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {l.email}
                    </span>
                    {l.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {l.phone}
                      </span>
                    )}
                    <span className="uppercase tracking-wide text-brand-300/70">
                      {l.source}
                    </span>
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-mute">
                  {new Date(l.createdAt).toLocaleString()}
                </span>
                <Badge variant="emerald">
                  <CheckCircle2 className="h-3 w-3" /> In sequence
                </Badge>
              </li>
            ))}
            {leads.length === 0 && (
              <li className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-fog">
                New leads from the audit gate &amp; contact form appear here.
              </li>
            )}
          </ul>
        </Card>

                <div className="mt-6">
          <TasksTab
            tasks={tasks}
            onAssign={assign}
            onComplete={complete}
            onReopen={reopenTask}
            onRemove={removeTask}
            onSetHours={setHours}
            onAddTask={handleAddTask}
          />
        </div>

        {/* Work log */}
        <Card className="mt-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="flex items-center gap-2 font-display text-base font-bold text-white">
                <History className="h-4 w-4 text-brand-300" /> Work log
              </h4>
              <p className="text-xs text-fog">
                Day + hours auto-captured when a task is checked off
              </p>
            </div>
            <Badge variant="brand">
              <Timer className="h-3 w-3" />{" "}
              {workLogs.reduce((s, w) => s + w.hours, 0).toFixed(1)} hrs logged
            </Badge>
          </div>
          {workLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-fog">
              No work logged yet — assign a task and hit “Mark done” and the day
              + hours land here automatically.
            </div>
          ) : (
            <ul className="space-y-2">
              {workLogs.slice(0, 12).map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-ink-850/50 px-4 py-2.5"
                >
                  <span className="rounded-full border border-glow-500/30 bg-glow-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-glow-400">
                    {w.hours}h
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-mist">{w.service}</span>
                    <span className="text-[11px] text-mute">
                      {w.clientName || "Unassigned client"} ·{" "}
                      {new Date(w.workDate + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      setWorkLogs((prev) => prev.filter((x) => x.id !== w.id));
                      if (!demoEnabled()) void deleteWorkLog(w.id).catch(() => {});
                    }}
                    title="Remove entry"
                    className="rounded-lg p-1.5 text-mute transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Subscription management */}
        <Card className="mt-6 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h4 className="font-display text-base font-bold text-white">Stripe Subscriptions</h4>
              <p className="text-xs text-fog">
                Recurring retainers sync via webhook → billing panel
              </p>
            </div>
            <Badge variant="brand">
              <RefreshCcw className="h-3 w-3" /> Auto-renew on
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subRows.map((s) => (
              <div key={s.name} className="rounded-2xl border border-white/8 bg-ink-850/60 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    <p className="mt-0.5 text-xs text-fog">{s.plan}</p>
                  </div>
                  <Badge
                    variant={s.status === "active" ? "emerald" : "brand"}
                  >
                    <CheckCircle2 className="h-3 w-3" /> {s.status}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="font-display text-lg font-bold text-glow-400">{s.amount}</span>
                  <span className="text-[11px] text-mute">Renews {s.renews}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 rounded-lg border border-white/10 py-2 text-xs font-semibold text-fog transition hover:border-white/25 hover:text-white">
                    View invoice
                  </button>
                  <button className="flex-1 rounded-lg border border-rose-500/30 bg-rose-500/5 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15">
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
          {subRows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-fog">
              No subscriptions yet — they sync here via Stripe webhook once a
              client checks out.
            </div>
          )}
        </Card>
        </>
        )}
      </Container>

      {selectedAudit && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm">
          <div className="min-h-full px-4 py-8 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-4xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-glow-400">
                    Audit Review
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-white">
                    {selectedAudit.businessName || selectedAudit.url}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedAudit(null)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-fog transition hover:border-white/25 hover:text-white"
                >
                  <X className="h-4 w-4" /> Close
                </button>
              </div>

              <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-white/5 bg-ink-850/40 p-4">
                {selectedAudit.contact?.name && (
                  <InfoChip label="Contact" value={selectedAudit.contact.name} />
                )}
                {selectedAudit.contact?.email && (
                  <InfoChip label="Email" value={selectedAudit.contact.email} />
                )}
                {selectedAudit.contact?.phone && (
                  <InfoChip label="Phone" value={selectedAudit.contact.phone} />
                )}
                {selectedAudit.url && (
                  <InfoChip label="Website" value={selectedAudit.url} />
                )}
                {selectedAudit.formData &&
                  Object.entries(SUBMITTED_LABELS).map(([key, label]) => {
                    const raw = selectedAudit.formData?.[key];
                    if (!raw) return null;
                    const v =
                      key === "reviews"
                        ? REVIEW_LABEL[raw as string] ?? raw
                        : key === "postingFreq"
                          ? FREQ_LABEL[raw as string] ?? raw
                          : key === "leadSource"
                            ? SOURCE_LABEL[raw as string] ?? raw
                            : key === "crmCapture"
                              ? CAPTURE_LABEL[raw as string] ?? raw
                              : String(raw);
                    return <InfoChip key={key} label={label} value={v} />;
                  })}
              </div>
              <AuditReportView report={selectedAudit} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
