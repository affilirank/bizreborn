"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  Search,
  Filter,
  Phone,
  Mail,
  ExternalLink,
  Pencil,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  X,
  FileText,
  MapPin,
  Globe,
  Share2,
  Volume2,
  ListTodo,
  UserPlus,
  Timer,
  Calendar,
  Trash2,
  RefreshCcw,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Play,
  Copy,
  Loader2,
  Film,
  FileSignature,
  PhoneCall,
  Star,
  Link2,
  AlertTriangle,
  Send,
  Minimize2,
  Maximize2,
  MessageSquareText,
} from "lucide-react";
import type { Prospect, CommunicationLog } from "@/lib/supabase-types";
import type { AdminTask } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import { PitchPlayer } from "@/components/pitch/pitch-player";
import { PREFILL_KEY, type OfferPrefill } from "@/lib/offer-prefill";
import { LEADGEN } from "@/lib/config";

const TEMPERATURES = [
  "Hot",
  "Warm",
  "Cold",
  "Replied",
  "Proposal Sent",
  "Client (Active)",
];

const tempBadgeCls: Record<string, string> = {
  Hot: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  Warm: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Cold: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  Replied: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  "Proposal Sent": "border-purple-500/30 bg-purple-500/10 text-purple-300",
  "Client (Active)": "border-glow-500/30 bg-glow-500/10 text-glow-400",
};

const TEAM = ["Marcus", "Dana", "Vince", "Priya"];

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString("en-US")}`;

function absPitch(p: Prospect) {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";
  return `${base}/pitch/${p.slug ?? ""}`;
}

function emailSubject(p: Prospect) {
  return `Your Growth Audit: ${p.business_name} \u00d7 Biz Reborn Marketing`;
}

function emailPlain(p: Prospect) {
  const url = absPitch(p);
  const roi = p.roi_projection;
  return [
    `Hi ${p.business_name} —`,
    "",
    `We ran a full audit on your brand (website, socials and Google reputation) and it came back a ${p.audit_report?.grade ?? "C"}.`,
    `Your Google listing sits at ${p.google_rating ?? "—"} stars with ${p.review_count ?? 0} reviews (${p.unanswered_reviews ?? 0} unanswered), while ${p.competitor_name ?? "your top competitor"} has ${p.competitor_reviews ?? 0}.`,
    roi ? `That gap is leaking roughly ${money(roi.lost_monthly)}/month. Fixing it projects to +${roi.leads_per_month} leads and ${money(roi.projected_monthly)}/month in new revenue.` : "",
    "",
    "Your 45-second video audit + the full breakdown:",
    url,
    "",
    `Want 10 minutes this week to walk through it? Just reply — ${LEADGEN.email}`,
    "",
    "— Biz Reborn Marketing",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

function emailHtml(p: Prospect) {
  const url = absPitch(p);
  const roi = p.roi_projection;
  const grade = p.audit_report?.grade ?? "C";
  const thumb =
    p.thumbnail_url && /^https?:/i.test(p.thumbnail_url)
      ? `<a href="${url}"><img src="${p.thumbnail_url}" alt="${p.business_name} growth audit" width="360" style="max-width:100%;border-radius:14px;display:block;margin:0 auto 18px auto;" /></a>`
      : `<a href="${url}" style="text-decoration:none;display:block;margin:0 auto 18px auto;max-width:360px;background:#0B0F17;border-radius:16px;padding:22px;color:#fff;font-family:Arial,Helvetica,sans-serif;">
  <div style="font-size:11px;letter-spacing:2px;color:#a5b4fc;">BIZ REBORN · GROWTH AUDIT</div>
  <div style="font-size:22px;font-weight:800;margin-top:6px;">${p.business_name}</div>
  <div style="margin-top:14px;font-size:40px;font-weight:900;">${p.google_rating ?? "—"} <span style="font-size:14px;color:#fbbf24;">★ ${p.review_count ?? 0} reviews</span></div>
  <div style="margin-top:10px;display:inline-block;background:rgba(248,113,113,.15);color:#fca5a5;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;">Brand grade ${grade}</div>
  <div style="margin-top:18px;text-align:center;"><span style="display:inline-block;background:#fff;color:#0B0F17;border-radius:999px;padding:10px 18px;font-weight:800;font-size:14px;">▶ Watch your 45-second audit</span></div>
</a>`;
  return [
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">`,
    thumb,
    `<p>Hi ${p.business_name} —</p>`,
    `<p>We ran a full audit on your brand — website, socials and Google reputation — and it came back a <strong>${grade}</strong>.</p>`,
    `<p>Your Google listing sits at <strong>${p.google_rating ?? "—"} stars</strong> with <strong>${p.review_count ?? 0} reviews</strong> (${p.unanswered_reviews ?? 0} unanswered), while ${p.competitor_name ?? "your top competitor"} has <strong>${p.competitor_reviews ?? 0}</strong> — and they're taking the calls that should be yours.</p>`,
    roi
      ? `<p>That gap is leaking roughly <strong>${money(roi.lost_monthly)}/month</strong>. Fixing it projects to <strong>+${roi.leads_per_month} leads</strong> and <strong>${money(roi.projected_monthly)}/month</strong> in new revenue.</p>`
      : "",
    `<p style="text-align:center;margin:20px 0;"><a href="${url}" style="display:inline-block;background:#6366F1;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;">Watch your audit →</a></p>`,
    `<p>Want 10 minutes this week to walk through it? Just reply, or email <a href="mailto:${LEADGEN.email}" style="color:#6366F1;">${LEADGEN.email}</a>.</p>`,
    `<p style="color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;padding-top:14px;">— Biz Reborn Marketing · <a href="https://www.bizreborn.com" style="color:#6366F1;">www.bizreborn.com</a></p>`,
    `</div>`,
  ].join("");
}

function proposalPrefill(p: Prospect): OfferPrefill {
  const flaws = (p.audit_report?.pain_points ?? [])
    .slice(0, 3)
    .map((f) => `• ${f.replace(/\s*\([^)]*service #\d+[^)]*\)/gi, "")}`);
  const roi = p.roi_projection;
  return {
    clientName: p.business_name,
    clientEmail: p.email ?? "",
    services: p.recommended_services ?? [],
    videoUrl: absPitch(p),
    prospectId: p.id,
    notes: [
      `Based on your growth audit (brand grade ${p.audit_report?.grade ?? "C"}), here's what we found:`,
      ...flaws,
      roi
        ? `This plan is projected to add about ${roi.leads_per_month} leads and ${money(roi.projected_monthly)}/month in new revenue.`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "tasks">("directory");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTemp, setSelectedTemp] = useState<string>("all");
  
  const [previewProspect, setPreviewProspect] = useState<Prospect | null>(null);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [commsProspect, setCommsProspect] = useState<Prospect | null>(null);
  const [voiceProspect, setVoiceProspect] = useState<Prospect | null>(null);
  const [newsletterData, setNewsletterData] = useState<{ p: Prospect; sequence: any } | null>(null);

  const [newLogType, setNewLogType] = useState("call");
  const [newLogNotes, setNewLogNotes] = useState("");
  const [newLogDuration, setNewLogDuration] = useState("3m 42s");
  const [newLogAnswered, setNewLogAnswered] = useState("Answered");
  const [toast, setToast] = useState<string | null>(null);

  const [taskFilter, setTaskFilter] = useState<"all" | "queued" | "in_progress" | "completed">("all");
  const [newTask, setNewTask] = useState<{
    client: string;
    service: string;
    due: string;
    priority: AdminTask["priority"];
    hours: string;
  }>({ client: "", service: "", due: "", priority: "medium", hours: "" });

  const fetchData = useCallback(async () => {
    try {
      const [resProspects, resTasks] = await Promise.all([
        fetch("/api/prospects", { cache: "no-store" }),
        fetch("/api/tasks", { cache: "no-store" }).catch(() => null),
      ]);
      const jsonP = await resProspects.json();
      if (jsonP.prospects) {
        setProspects(jsonP.prospects);
      }
      if (resTasks && resTasks.ok) {
        const jsonT = await resTasks.json();
        if (jsonT.tasks) {
          setTasks(jsonT.tasks);
        }
      }
    } catch (err) {
      console.error("[crm] failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const updateProspectTemp = async (id: string, temperature: string) => {
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: temperature, last_contacted_at: new Date().toISOString() }),
      });
      const json = await res.json();
      if (res.ok && json.prospect) {
        setProspects((prev) => prev.map((x) => (x.id === id ? json.prospect : x)));
        setToast(`Updated CRM status to ${temperature}`);
      }
    } catch {
      setToast("Failed to update status");
    }
  };

  const saveBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProspect) return;
    try {
      const res = await fetch(`/api/prospects/${editingProspect.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingProspect,
          google_rating: Number(editingProspect.google_rating) || 4.8,
          review_count: Number(editingProspect.review_count) || 0,
          unanswered_reviews: Number(editingProspect.unanswered_reviews) || 0,
          competitor_reviews: Number(editingProspect.competitor_reviews) || 0,
          regenerate: true,
        }),
      });
      const json = await res.json();
      if (res.ok && json.prospect) {
        setProspects((prev) => prev.map((x) => (x.id === editingProspect.id ? json.prospect : x)));
        setToast("Business info saved & audit regenerated!");
        setEditingProspect(null);
      }
    } catch {
      setToast("Failed to save business info");
    }
  };

  const sendEmail = async (id: string) => {
    setToast("Sending direct pitch email…");
    try {
      const res = await fetch("/api/prospects/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (res.ok) {
        setToast(json.simulated ? "Simulated email sent (add RESEND_API_KEY for live delivery)" : "Pitch email sent successfully!");
      } else {
        setToast(json.error || "Email failed");
      }
    } catch {
      setToast("Email failed to send");
    }
  };

  const loadNewsletter = async (p: Prospect) => {
    setToast("Generating custom 3-part newsletter drip…");
    try {
      const res = await fetch("/api/prospects/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id }),
      });
      const json = await res.json();
      if (res.ok && json.sequence) {
        setNewsletterData({ p, sequence: json.sequence });
        setToast("Newsletter drip generated!");
      } else {
        setToast(json.error || "Failed to generate newsletter");
      }
    } catch {
      setToast("Failed to generate newsletter");
    }
  };

  const draftProposal = (p: Prospect) => {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(proposalPrefill(p)));
    window.location.assign("/admin?tab=offers");
  };

  const addCommunicationLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commsProspect || !newLogNotes.trim()) return;
    try {
      const existingLogs = commsProspect.communication_logs || [];
      const noteFormatted = `[${newLogAnswered}] Duration: ${newLogDuration}. Notes: ${newLogNotes}`;
      const newEntry: CommunicationLog = {
        date: new Date().toISOString(),
        type: newLogType,
        notes: noteFormatted,
        admin: "Admin Ops",
      };
      const updatedLogs = [newEntry, ...existingLogs];

      const res = await fetch(`/api/prospects/${commsProspect.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communication_logs: updatedLogs,
          last_contacted_at: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.prospect) {
        setProspects((prev) => prev.map((x) => (x.id === commsProspect.id ? json.prospect : x)));
        setCommsProspect(json.prospect);
        setNewLogNotes("");
        setToast("Communication & AI transcript logged!");
      }
    } catch {
      setToast("Failed to add communication log");
    }
  };

  const persistCallSummary = async (p: Prospect, log: CommunicationLog): Promise<Prospect | null> => {
    try {
      const existingLogs = p.communication_logs || [];
      const res = await fetch(`/api/prospects/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communication_logs: [log, ...existingLogs],
          last_contacted_at: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.prospect) {
        setProspects((prev) => prev.map((x) => (x.id === p.id ? json.prospect : x)));
        return json.prospect as Prospect;
      }
    } catch {
      // never block the call flow on persistence errors
    }
    return null;
  };

  const assignTask = async (id: string, assignee: string | null) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, assignee } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignee }),
    }).catch(() => {});
  };

  const completeTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    const hours = task?.estimatedHours || 2;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "completed", completedAt: new Date().toISOString() } : t)),
    );
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", hours }),
    }).catch(() => {});
    setToast("Task marked completed & hours logged!");
  };

  const reopenTask = async (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "in_progress", completedAt: null } : t)),
    );
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress", completedAt: null }),
    }).catch(() => {});
  };

  const removeTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" }).catch(() => {});
    setToast("Task removed");
  };

  const setTaskHours = async (id: string, estimatedHours: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, estimatedHours } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estimatedHours }),
    }).catch(() => {});
  };

  const handleAddTask = async (t: {
    client: string;
    service: string;
    due: string;
    priority: AdminTask["priority"];
    hours: string;
  }) => {
    if (!t.service.trim()) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: t.client.trim(),
          service: t.service.trim(),
          due: t.due,
          priority: t.priority,
          estimatedHours: Number(t.hours) || 0,
        }),
      });
      const json = await res.json();
      if (res.ok && json.task) {
        setTasks((prev) => [json.task, ...prev]);
        setToast("Fulfillment task added successfully!");
      }
    } catch {
      setToast("Failed to add task");
    }
  };

  const filteredProspects = prospects.filter((p) => {
    const matchesSearch =
      p.business_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
      (p.city && p.city.toLowerCase().includes(search.toLowerCase()));
    const matchesTemp =
      selectedTemp === "all" ||
      (p.status && p.status.toLowerCase() === selectedTemp.toLowerCase());
    return matchesSearch && matchesTemp;
  });

  const counts = {
    total: prospects.length,
    hot: prospects.filter((p) => p.status?.toLowerCase() === "hot" || p.status?.toLowerCase() === "ready").length,
    warm: prospects.filter((p) => p.status?.toLowerCase() === "warm" || p.status?.toLowerCase() === "saved").length,
    active: prospects.filter((p) => p.status?.toLowerCase() === "client (active)" || p.status?.toLowerCase() === "closed").length,
    proposal: prospects.filter((p) => p.status?.toLowerCase() === "proposal sent" || p.status?.toLowerCase() === "pitched").length,
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "completed") return t.status === "completed";
    if (taskFilter === "in_progress") return t.status === "in_progress" || t.status === "review";
    if (taskFilter === "queued") return t.status === "queued";
    return true;
  });

  const taskInputCls =
    "rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-xs font-medium text-white outline-none transition focus:border-brand-400/60";

  return (
    <div className="min-h-screen bg-ink-950 pb-24 pt-20 text-white">
      <Container>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-fog hover:text-white mb-3 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Admin Command Center
            </Link>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Agency CRM &amp; Central Command Center
            </h1>
            <p className="mt-1 text-sm text-fog">
              The ultimate central command center where every discovered, saved, or active lead lives. Complete with embedded video audit players, AI voice calling, proposal drafting, email drips, and fulfillment task boards.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/prospects"
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-500 shadow-lg shadow-brand-600/20"
            >
              <Search className="h-4 w-4" /> Lead Discovery &amp; Pitches
            </Link>
            <button
              onClick={() => void fetchData()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900 px-4 py-2 text-xs font-semibold text-fog transition hover:border-white/25 hover:text-white"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
            </button>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("directory")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-sm",
              activeTab === "directory"
                ? "bg-brand-500 text-white shadow-brand-500/30"
                : "border border-white/10 bg-ink-900 text-fog hover:text-white",
            )}
          >
            <Users className="h-4 w-4" /> Central Lead &amp; Client Directory ({prospects.length})
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-sm",
              activeTab === "tasks"
                ? "bg-brand-500 text-white shadow-brand-500/30"
                : "border border-white/10 bg-ink-900 text-fog hover:text-white",
            )}
          >
            <ListTodo className="h-4 w-4" /> Fulfillment Task Board &amp; Modules ({tasks.length})
          </button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wider text-fog">Total Accounts</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{counts.total}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wider text-rose-300">Hot Leads</p>
            <p className="mt-1 font-display text-2xl font-bold text-rose-300">{counts.hot}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wider text-amber-300">Warm Leads</p>
            <p className="mt-1 font-display text-2xl font-bold text-amber-300">{counts.warm}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wider text-purple-300">Proposals Sent</p>
            <p className="mt-1 font-display text-2xl font-bold text-purple-300">{counts.proposal}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wider text-glow-400">Active Clients</p>
            <p className="mt-1 font-display text-2xl font-bold text-glow-400">{counts.active}</p>
          </Card>
        </div>

        {activeTab === "directory" ? (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-fog" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by business name, email, or city…"
                  className="w-full rounded-xl border border-white/10 bg-ink-900 py-2.5 pl-10 pr-4 text-xs font-medium text-white outline-none transition focus:border-brand-400/60"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-fog flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" /> Status:
                </span>
                <select
                  value={selectedTemp}
                  onChange={(e) => setSelectedTemp(e.target.value)}
                  className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs font-semibold text-white outline-none transition focus:border-brand-400/60"
                >
                  <option value="all">All Statuses ({prospects.length})</option>
                  {TEMPERATURES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 bg-ink-900/80 text-fog uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Business &amp; Audit</th>
                      <th className="px-4 py-3 font-semibold">Contact &amp; Web</th>
                      <th className="px-4 py-3 font-semibold">Socials &amp; Maps</th>
                      <th className="px-4 py-3 font-semibold">ROI Projection</th>
                      <th className="px-4 py-3 font-semibold">Status / Temp</th>
                      <th className="px-4 py-3 font-semibold text-right">Embedded Closing Tools</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProspects.map((p) => {
                      const temp = p.status || "Warm";
                      const healthScore = p.audit_report?.health_score ?? p.qualifying_score ?? 70;
                      const grade = p.audit_report?.grade ?? (healthScore > 80 ? "A" : healthScore > 65 ? "B" : "C");
                      const projectedMonthly = p.roi_projection?.projected_monthly ?? 2450;
                      const roas = p.roi_projection?.roas ?? 5;
                      const clientTasks = tasks.filter(
                        (t) => t.client.toLowerCase() === p.business_name.toLowerCase(),
                      );

                      return (
                        <tr key={p.id} className="hover:bg-ink-900/40 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-white text-sm">{p.business_name}</div>
                            <div className="text-mute flex items-center gap-1.5 mt-0.5">
                              <span>{p.city || "Local"}</span>
                              <span className="rounded bg-brand-500/10 px-1.5 py-0.2 text-[10px] font-mono text-brand-300 font-semibold border border-brand-500/30">
                                Score {healthScore} ({grade})
                              </span>
                            </div>
                            {clientTasks.length > 0 && (
                              <div className="mt-1 text-[11px] text-glow-400 font-medium">
                                {clientTasks.length} fulfillment task(s) active
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-mist flex items-center gap-1">
                              <Mail className="h-3 w-3 text-brand-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{p.email || "No email"}</span>
                            </div>
                            <div className="text-mute flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                              <span>{p.phone || "No phone"}</span>
                            </div>
                            {p.website && (
                              <a
                                href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-300 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-[200px]"
                                title={p.website}
                              >
                                <Globe className="h-3 w-3 shrink-0" /> <span className="truncate">{p.website}</span> <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1 text-mute">
                              {p.instagram && (
                                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">IG: {p.instagram}</span>
                              )}
                              {p.facebook && (
                                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">FB: {p.facebook}</span>
                              )}
                              {p.tiktok && (
                                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">TT: {p.tiktok}</span>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              {p.google_maps_link && (
                                <a
                                  href={p.google_maps_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-glow-400 hover:underline flex items-center gap-1 text-[11px]"
                                >
                                  <MapPin className="h-3 w-3" /> Maps / GBP
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-mono text-xs font-bold text-glow-400">
                              +${projectedMonthly.toLocaleString()}/mo
                            </div>
                            <div className="text-mute text-[11px] mt-0.5">
                              {roas}x ROAS projected
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <select
                              value={temp}
                              onChange={(e) => updateProspectTemp(p.id, e.target.value)}
                              className={cn(
                                "rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none transition",
                                tempBadgeCls[temp] || "border-white/10 bg-ink-900 text-white",
                              )}
                            >
                              {TEMPERATURES.map((t) => (
                                <option key={t} value={t} className="bg-ink-900 text-white">
                                  {t}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                onClick={() => setPreviewProspect(p)}
                                className="rounded-lg border border-glow-500/30 bg-glow-500/10 px-2 py-1 text-[11px] font-semibold text-glow-300 hover:bg-glow-500/20 transition flex items-center gap-1"
                                title="Video Audit Player & Closing Tools"
                              >
                                <Play className="h-3 w-3" /> Player
                              </button>
                              <button
                                onClick={() => draftProposal(p)}
                                className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-2 py-1 text-[11px] font-semibold text-brand-300 hover:bg-brand-500/20 transition flex items-center gap-1"
                                title="Draft Proposal"
                              >
                                <FileSignature className="h-3 w-3" /> Proposal
                              </button>
                              <button
                                onClick={() => setVoiceProspect(p)}
                                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition flex items-center gap-1"
                                title="AI Voice Call"
                              >
                                <Phone className="h-3 w-3" /> Call
                              </button>
                              <button
                                onClick={() => void sendEmail(p.id)}
                                className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1 text-[11px] font-semibold text-fog hover:text-white transition flex items-center gap-1"
                                title="Send Direct Email"
                              >
                                <Send className="h-3 w-3" /> Email
                              </button>
                              <button
                                onClick={() => void loadNewsletter(p)}
                                className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[11px] font-semibold text-purple-300 hover:bg-purple-500/20 transition flex items-center gap-1"
                                title="AI Newsletter Drip"
                              >
                                <Sparkles className="h-3 w-3" /> Drip
                              </button>
                              <button
                                onClick={() => setEditingProspect(p)}
                                className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1 text-[11px] font-semibold text-fog hover:text-white transition flex items-center gap-1"
                                title="Edit Stats & Maps Links"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                              <button
                                onClick={() => setCommsProspect(p)}
                                className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1 text-[11px] font-semibold text-fog hover:text-white transition flex items-center gap-1"
                                title="Communication History & Transcripts"
                              >
                                <FileText className="h-3 w-3" /> ({p.communication_logs?.length || 0})
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredProspects.length === 0 && (
                <div className="p-12 text-center text-sm text-fog">
                  No CRM accounts found matching your search.
                </div>
              )}
            </Card>
          </>
        ) : (
          <Card className="p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white">
                  <ListTodo className="h-5 w-5 text-brand-400" /> Fulfillment Task Board &amp; Client Modules
                </h3>
                <p className="mt-1 text-xs text-fog">
                  Manage tasks across all active clients and accounts · track estimated hours &amp; assign team members (Marcus, Dana, Vince, Priya)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand" className="px-3 py-1.5 text-xs">
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />{" "}
                  {tasks.filter((t) => t.assignee).length}/{tasks.length} assigned
                </Badge>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
              {(["all", "queued", "in_progress", "completed"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTaskFilter(tab)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-semibold capitalize transition",
                    taskFilter === tab
                      ? "bg-brand-500/20 border border-brand-400/50 text-white"
                      : "border border-white/5 bg-ink-900 text-fog hover:text-white",
                  )}
                >
                  {tab.replace("_", " ")} ({tasks.filter((t) => {
                    if (tab === "completed") return t.status === "completed";
                    if (tab === "in_progress") return t.status === "in_progress" || t.status === "review";
                    if (tab === "queued") return t.status === "queued";
                    return true;
                  }).length})
                </button>
              ))}
            </div>

            <div className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-4 sm:grid-cols-[1fr_1fr_auto_auto_auto_auto]">
              <input
                value={newTask.client}
                onChange={(e) => setNewTask({ ...newTask, client: e.target.value })}
                placeholder="Client name (e.g. Ace Plumbing)"
                className={taskInputCls}
              />
              <input
                value={newTask.service}
                onChange={(e) => setNewTask({ ...newTask, service: e.target.value })}
                placeholder="Service / module (e.g. GBP Optimization)"
                className={taskInputCls}
              />
              <input
                type="date"
                value={newTask.due}
                onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
                className={cn(taskInputCls, "sm:w-40")}
              />
              <input
                value={newTask.hours}
                onChange={(e) => setNewTask({ ...newTask, hours: e.target.value.replace(/[^0-9.]/g, "") })}
                placeholder="Est hrs"
                inputMode="decimal"
                className={cn(taskInputCls, "sm:w-24")}
              />
              <select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    priority: e.target.value as AdminTask["priority"],
                  })
                }
                className={cn(taskInputCls, "sm:w-32")}
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              <button
                onClick={() => {
                  if (!newTask.service.trim()) return;
                  void handleAddTask(newTask);
                  setNewTask({ client: "", service: "", due: "", priority: "medium", hours: "" });
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-600 shadow-lg shadow-brand-500/20"
              >
                <Plus className="h-4 w-4" /> Add Task
              </button>
            </div>

            <div className="space-y-3">
              {filteredTasks.map((t) => {
                const prioStyle =
                  t.priority === "high"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    : t.priority === "medium"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-white/10 bg-white/5 text-fog";
                const done = t.status === "completed";

                return (
                  <div
                    key={t.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-2xl border border-white/10 bg-ink-900/80 p-4 transition sm:flex-row sm:items-center sm:justify-between sm:p-5",
                      done && "opacity-75 bg-ink-950/40",
                    )}
                  >
                    <div className="flex items-start gap-3 sm:items-center">
                      <span className="mt-0.5 rounded-lg border border-white/10 bg-ink-950 px-2.5 py-1 font-mono text-xs text-mute">
                        {t.id}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{t.service}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fog">
                          <span className="font-medium text-mist">Client: {t.client || "Unassigned client"}</span>
                          <span className="flex items-center gap-1 text-mute">
                            <Calendar className="h-3 w-3" /> Due {t.due || "No due date"}
                          </span>
                          {done && t.completedAt && (
                            <span className="text-glow-400">
                              · Done {new Date(t.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
                      <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-ink-950 px-2.5 py-1">
                        <Timer className="h-3.5 w-3.5 text-brand-400" />
                        <input
                          value={t.estimatedHours ? String(t.estimatedHours) : ""}
                          onChange={(e) =>
                            void setTaskHours(t.id, Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)
                          }
                          placeholder="0"
                          inputMode="decimal"
                          title="Estimated hours"
                          className="w-12 bg-transparent text-center text-xs font-semibold text-white outline-none"
                        />
                        <span className="text-[11px] text-mute">hrs</span>
                      </div>

                      <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider", prioStyle)}>
                        {t.priority}
                      </span>

                      {done ? (
                        <>
                          <Badge variant="emerald" className="px-3 py-1">
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Completed
                          </Badge>
                          <button
                            onClick={() => void reopenTask(t.id)}
                            title="Reopen task"
                            className="rounded-xl border border-white/10 bg-ink-950 p-2 text-mute transition hover:border-white/25 hover:text-white"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <select
                            value={t.assignee ?? ""}
                            onChange={(e) => void assignTask(t.id, e.target.value || null)}
                            className={cn(
                              "rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-xs font-semibold text-white outline-none transition focus:border-brand-400/60",
                              t.assignee ? "border-glow-500/40 text-glow-300" : "text-fog",
                            )}
                          >
                            <option value="">Unassigned</option>
                            {TEAM.map((m) => (
                              <option key={m} value={m}>
                                Assign to {m}
                              </option>
                            ))}
                          </select>

                          {t.assignee && (
                            <button
                              onClick={() => void completeTask(t.id)}
                              className="flex items-center gap-1.5 rounded-xl border border-glow-500/40 bg-glow-500/15 px-3.5 py-2 text-xs font-semibold text-glow-300 transition hover:bg-glow-500/25"
                            >
                              <CheckCircle2 className="h-4 w-4" /> Mark Done
                            </button>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => void removeTask(t.id)}
                        title="Remove task"
                        className="rounded-xl border border-white/5 bg-ink-950 p-2 text-mute transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredTasks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-sm text-fog">
                  No fulfillment tasks found in this view. Add a task above.
                </div>
              )}
            </div>
          </Card>
        )}
      </Container>

      {previewProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onClick={() => setPreviewProspect(null)}>
          <div className="grid w-full max-w-4xl gap-6 rounded-3xl border border-white/15 bg-ink-900 p-6 md:grid-cols-[minmax(0,300px)_1fr] shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div>
              <PitchPlayer p={previewProspect} contactEmail={LEADGEN.email} />
            </div>
            <div className="min-w-0 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-extrabold text-white">{previewProspect.business_name}</h3>
                  <p className="text-xs text-fog">
                    {previewProspect.city || "Local"} · Brand Grade: <span className="text-glow-400 font-bold">{previewProspect.audit_report?.grade ?? "C"}</span> ({previewProspect.audit_report?.health_score ?? 70}/100)
                  </p>
                </div>
                <button onClick={() => setPreviewProspect(null)} className="text-fog hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-ink-950 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Pipeline Status / Temperature:</span>
                  <select
                    value={previewProspect.status || "Warm"}
                    onChange={(e) => updateProspectTemp(previewProspect.id, e.target.value)}
                    className="rounded-xl border border-white/10 bg-ink-900 px-3 py-1.5 text-xs font-bold text-white outline-none"
                  >
                    {TEMPERATURES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {previewProspect.roi_projection && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl border border-glow-500/30 bg-glow-500/10 p-3 text-center">
                  <div>
                    <p className="font-display text-sm font-bold text-glow-400">+{money(previewProspect.roi_projection.projected_monthly)}/mo</p>
                    <p className="text-[10px] text-fog">Projected Revenue</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-white">+{previewProspect.roi_projection.leads_per_month}</p>
                    <p className="text-[10px] text-fog">Extra Leads</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-amber-300">{previewProspect.roi_projection.roas}x</p>
                    <p className="text-[10px] text-fog">Projected ROAS</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-rose-300">{money(previewProspect.roi_projection.lost_monthly)}</p>
                    <p className="text-[10px] text-fog">Monthly Leaking</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">Direct Pitch Link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-xl bg-ink-950 px-3 py-2 text-xs text-brand-300 border border-white/10">
                    {absPitch(previewProspect)}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(absPitch(previewProspect));
                      setToast("Pitch link copied!");
                    }}
                    className="rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-xs text-fog hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                <button
                  onClick={() => {
                    setPreviewProspect(null);
                    draftProposal(previewProspect);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-500 shadow-lg shadow-brand-600/20"
                >
                  <FileSignature className="h-4 w-4" /> Draft / View Proposal
                </button>
                <button
                  onClick={() => {
                    setPreviewProspect(null);
                    setVoiceProspect(previewProspect);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  <Phone className="h-4 w-4" /> AI Voice Call
                </button>
                <button
                  onClick={() => void sendEmail(previewProspect.id)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-ink-950 px-4 py-2.5 text-xs font-semibold text-fog hover:text-white transition"
                >
                  <Send className="h-4 w-4" /> Direct Email
                </button>
                <button
                  onClick={() => {
                    setPreviewProspect(null);
                    void loadNewsletter(previewProspect);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/20"
                >
                  <Sparkles className="h-4 w-4" /> AI Newsletter Drip
                </button>
                <button
                  onClick={() => {
                    setPreviewProspect(null);
                    setEditingProspect(previewProspect);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-ink-950 px-4 py-2.5 text-xs font-semibold text-fog hover:text-white transition"
                >
                  <Pencil className="h-4 w-4" /> Edit Stats &amp; Maps
                </button>
                <button
                  onClick={() => {
                    setPreviewProspect(null);
                    setCommsProspect(previewProspect);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-ink-950 px-4 py-2.5 text-xs font-semibold text-fog hover:text-white transition"
                >
                  <FileText className="h-4 w-4" /> Comms History ({previewProspect.communication_logs?.length || 0})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setEditingProspect(null)}>
          <Card className="w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setEditingProspect(null)}
              className="absolute right-4 top-4 text-fog hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-xl font-bold text-white mb-1">
              Edit Stats, Reputation &amp; Google/Apple Maps Links
            </h3>
            <p className="text-xs text-fog mb-6">
              Full control over reputation metrics, Google Maps / GBP links, ratings, reviews, and competitor benchmarks. Saving instantly re-runs the audit &amp; pitch video.
            </p>

            <form onSubmit={saveBusinessInfo} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">
                    Business Name
                  </label>
                  <input
                    value={editingProspect.business_name}
                    onChange={(e) => setEditingProspect({ ...editingProspect, business_name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">
                    City / Location
                  </label>
                  <input
                    value={editingProspect.city || ""}
                    onChange={(e) => setEditingProspect({ ...editingProspect, city: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">
                    Google Rating (e.g. 4.9)
                  </label>
                  <input
                    value={editingProspect.google_rating ?? ""}
                    onChange={(e) => setEditingProspect({ ...editingProspect, google_rating: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">
                    Review Count
                  </label>
                  <input
                    value={editingProspect.review_count ?? ""}
                    onChange={(e) => setEditingProspect({ ...editingProspect, review_count: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">
                    Unanswered Reviews
                  </label>
                  <input
                    value={editingProspect.unanswered_reviews ?? ""}
                    onChange={(e) => setEditingProspect({ ...editingProspect, unanswered_reviews: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">
                    Competitor Name &amp; Reviews
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={editingProspect.competitor_name || ""}
                      onChange={(e) => setEditingProspect({ ...editingProspect, competitor_name: e.target.value })}
                      placeholder="Competitor Name"
                      className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                    />
                    <input
                      value={editingProspect.competitor_reviews ?? ""}
                      onChange={(e) => setEditingProspect({ ...editingProspect, competitor_reviews: Number(e.target.value) || 0 })}
                      placeholder="Reviews"
                      className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">
                    Website URL
                  </label>
                  <input
                    value={editingProspect.website || ""}
                    onChange={(e) => setEditingProspect({ ...editingProspect, website: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">
                    Google / Apple Maps Link
                  </label>
                  <input
                    value={editingProspect.google_maps_link || ""}
                    onChange={(e) => setEditingProspect({ ...editingProspect, google_maps_link: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">
                    Email Address
                  </label>
                  <input
                    value={editingProspect.email || ""}
                    onChange={(e) => setEditingProspect({ ...editingProspect, email: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">
                    Phone Number
                  </label>
                  <input
                    value={editingProspect.phone || ""}
                    onChange={(e) => setEditingProspect({ ...editingProspect, phone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProspect(null)}
                  className="rounded-xl border border-white/10 bg-ink-900 px-4 py-2 text-xs font-semibold text-fog hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                >
                  Save &amp; Regenerate Audit
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {commsProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setCommsProspect(null)}>
          <Card className="w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setCommsProspect(null)}
              className="absolute right-4 top-4 text-fog hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-xl font-bold text-white mb-1">
              Client Record: Communication History &amp; Fulfillment Tasks
            </h3>
            <p className="text-xs text-fog mb-6">
              {commsProspect.business_name} · Track AI call transcripts, audio recordings, email open rates, and associated fulfillment tasks &amp; order modules.
            </p>

            <div className="mb-6 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 space-y-3">
              <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1.5">
                <ListTodo className="h-4 w-4" /> Associated Fulfillment Tasks &amp; Modules ({tasks.filter((t) => t.client.toLowerCase() === commsProspect.business_name.toLowerCase()).length})
              </h4>
              <div className="space-y-2">
                {tasks.filter((t) => t.client.toLowerCase() === commsProspect.business_name.toLowerCase()).length > 0 ? (
                  tasks
                    .filter((t) => t.client.toLowerCase() === commsProspect.business_name.toLowerCase())
                    .map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-900 p-3 text-xs">
                        <div>
                          <span className="font-semibold text-white">{t.service}</span>
                          <span className="text-mute ml-2">({t.status})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-brand-300">Assignee: {t.assignee || "Unassigned"}</span>
                          <span className="text-glow-400 font-mono">{t.estimatedHours}h</span>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-fog italic">No specific fulfillment tasks assigned to this client yet. Add one in the Task Board tab.</p>
                )}
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 rounded-2xl border border-white/10 bg-ink-900/60 p-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-fog font-semibold">Email Open Rate (Tracked)</p>
                <p className="font-display text-lg font-bold text-glow-400 mt-0.5">68.4% (3 Opens / 4 Sent)</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-fog font-semibold">Audit Score &amp; ROI</p>
                <p className="text-xs font-semibold text-white mt-0.5">
                  Score: {commsProspect.audit_report?.health_score ?? commsProspect.qualifying_score ?? 72}/100 | Projected: +${commsProspect.roi_projection?.projected_monthly ?? 2450}/mo
                </p>
              </div>
            </div>

            <form onSubmit={addCommunicationLog} className="mb-6 rounded-2xl border border-white/10 bg-ink-900/60 p-4 space-y-3">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand-400" /> Log New Communication or AI Call Transcript
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={newLogType}
                  onChange={(e) => setNewLogType(e.target.value)}
                  className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs font-semibold text-white outline-none"
                >
                  <option value="call">AI Voice Call</option>
                  <option value="email">Email Outreach</option>
                  <option value="sms">SMS / WhatsApp</option>
                  <option value="meeting">Discovery Meeting</option>
                  <option value="note">General Note</option>
                </select>
                <select
                  value={newLogAnswered}
                  onChange={(e) => setNewLogAnswered(e.target.value)}
                  className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs font-semibold text-white outline-none"
                >
                  <option value="Answered">Answered (Live)</option>
                  <option value="Unanswered">Unanswered / Voicemail</option>
                </select>
                <input
                  value={newLogDuration}
                  onChange={(e) => setNewLogDuration(e.target.value)}
                  placeholder="Duration (e.g. 2m 15s)"
                  className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs font-medium text-white outline-none"
                />
              </div>
              <textarea
                value={newLogNotes}
                onChange={(e) => setNewLogNotes(e.target.value)}
                placeholder="Enter AI notes, transcript summary, or email delivery status..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-ink-900 p-3 text-xs text-white outline-none focus:border-brand-400"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                >
                  <Plus className="h-4 w-4" /> Add Communication Log
                </button>
              </div>
            </form>

            {commsProspect.voiceover_url && (
              <div className="mb-6 rounded-2xl border border-glow-500/30 bg-glow-500/10 p-4 space-y-2">
                <p className="text-xs font-bold text-glow-300 flex items-center gap-1.5">
                  <Volume2 className="h-4 w-4" /> AI Voice Pitch Audio Recording
                </p>
                <audio controls src={commsProspect.voiceover_url} className="w-full h-10 accent-glow-400" />
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-fog">
                Communication Timeline ({commsProspect.communication_logs?.length || 0})
              </h4>
              {commsProspect.communication_logs && commsProspect.communication_logs.length > 0 ? (
                commsProspect.communication_logs.map((log, idx) => (
                  <div key={idx} className="rounded-xl border border-white/10 bg-ink-900/40 p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-brand-300 uppercase tracking-wide flex items-center gap-1">
                        <Volume2 className="h-3.5 w-3.5" /> {log.type}
                      </span>
                      <span className="text-mute text-[11px]">{new Date(log.date).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-mist leading-relaxed whitespace-pre-wrap">{log.notes}</p>
                    {log.admin && (
                      <p className="text-[10px] text-mute">Logged by {log.admin}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-xs text-fog">
                  No communication logs or call transcripts recorded yet. Use the form above.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {voiceProspect && (
        <VoiceCallModal
          p={voiceProspect}
          onClose={() => setVoiceProspect(null)}
          onPersist={persistCallSummary}
        />
      )}

      {newsletterData && (
        <NewsletterModal
          data={newsletterData}
          onClose={() => setNewsletterData(null)}
          onCopy={(text) => {
            if (navigator.clipboard) navigator.clipboard.writeText(text);
            setToast("Copied to clipboard!");
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-ink-900 px-4 py-2 text-xs font-semibold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function VoiceCallModal({
  p,
  onClose,
  onPersist,
}: {
  p: Prospect;
  onClose: () => void;
  onPersist?: (prospect: Prospect, log: CommunicationLog) => Promise<Prospect | null>;
}) {
  type LogEntry = { sender: "ai" | "user" | "system"; text: string; time: string };

  const [phone, setPhone] = useState(p.phone || "");
  const [status, setStatus] = useState<"idle" | "dialing" | "connected" | "ended">("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [simulated, setSimulated] = useState<boolean | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const logsRef = useRef<LogEntry[]>([]);
  const secondsRef = useRef(0);
  const seenRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const persistedRef = useRef(false);

  const pushLog = useCallback((sender: LogEntry["sender"], text: string) => {
    const entry: LogEntry = { sender, text, time: new Date().toLocaleTimeString() };
    logsRef.current = [...logsRef.current, entry];
    setLogs(logsRef.current);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (status === "connected") {
      timer = setInterval(() => {
        setSeconds((s) => {
          const n = s + 1;
          secondsRef.current = n;
          return n;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const transcriptText = () =>
    logsRef.current
      .map((l) =>
        l.sender === "ai" ? `Sarah: ${l.text}` : l.sender === "user" ? `Owner: ${l.text}` : l.text,
      )
      .join("\n");

  const finalizeCall = useCallback(
    (resultOutcome: string) => {
      if (persistedRef.current) return;
      persistedRef.current = true;
      const dur = Math.max(secondsRef.current, 1);
      setStatus("ended");
      setOutcome(resultOutcome);
      setMinimized(true);
      setToast(`AI call complete — ${resultOutcome}`);
      const noteFormatted = `[AI Call] Outcome: ${resultOutcome}. Duration: ${Math.floor(dur / 60)}m ${dur % 60}s.\nTranscript:\n${transcriptText()}`;
      const newLog: CommunicationLog = {
        date: new Date().toISOString(),
        type: "call",
        notes: noteFormatted,
        admin: "Admin Ops",
      };
      if (onPersist) {
        void onPersist(p, newLog);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p, onPersist],
  );

  const startCall = async () => {
    if (!phone.trim()) {
      setToast("Please enter a valid phone number.");
      return;
    }
    setLoading(true);
    setStatus("dialing");
    setCallSid(null);
    setSimulated(null);
    setOutcome(null);
    setToast(null);
    persistedRef.current = false;
    seenRef.current = new Set();
    logsRef.current = [];
    setLogs([]);
    secondsRef.current = 0;
    setSeconds(0);
    pushLog("system", `Initiating outbound AI voice call to ${phone} for ${p.business_name}...`);
    pushLog("system", "Note: A2P 10DLC registration is NOT required for voice calls (strictly for SMS).");

    try {
      const res = await fetch("/api/prospects/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: p.id, phone }),
      });
      const json = await res.json();
      if (res.ok) {
        setCallSid(String(json.callSid ?? ""));
        setSimulated(json.simulated === true);
        setStatus("connected");
        pushLog(
          "system",
          json.simulated === true
            ? "Simulated call connected (add Twilio keys for live carrier calls). Waiting on the contact…"
            : "Live call connected via Twilio — streaming transcript below.",
        );
      } else {
        setStatus("ended");
        setToast(json.error || "Call failed");
      }
    } catch {
      setStatus("ended");
      setToast("Call connection failed");
    } finally {
      setLoading(false);
    }
  };

  const endCall = () => {
    finalizeCall(outcome || "Call ended manually by operator");
  };

  // Simulated conversations: script a realistic, stats-driven call, then
  // auto-complete with an outcome so the panel always returns results.
  useEffect(() => {
    if (status !== "connected" || simulated !== true) return;
    let cancelled = false;
    const t = (ms: number, fn: () => void) => {
      window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const lost = p.roi_projection?.lost_monthly
      ? `$${Math.round(p.roi_projection.lost_monthly).toLocaleString("en-US")}`
      : "$2,100";
    const projected = p.roi_projection?.projected_monthly
      ? `$${Math.round(p.roi_projection.projected_monthly).toLocaleString("en-US")}`
      : "$3,675";
    const extraLeads = p.roi_projection?.leads_per_month ?? 21;
    const rating = p.google_rating ?? "4.8";
    const reviews = p.review_count ?? 60;
    const unanswered = p.unanswered_reviews ?? 7;
    const competitor = p.competitor_name ?? "your top competitor";
    const compReviews = p.competitor_reviews ?? 150;

    t(2000, () => pushLog("system", "Call answered."));
    t(3500, () =>
      pushLog(
        "ai",
        `Hi ${p.business_name}, this is Sarah with Biz Reborn Marketing. We just finished a brand audit on your Google listing — ${rating} stars, ${reviews} reviews, ${unanswered} unanswered. Do you have 45 seconds to talk through what we found?`,
      ),
    );
    t(6000, () =>
      pushLog("user", "Yeah, sure — I've actually been meaning to deal with my reviews."),
    );
    t(8200, () =>
      pushLog(
        "ai",
        `Perfect timing. Quick version: ${competitor} has ${compReviews} reviews to your ${reviews} — that gap is quietly costing you about ${lost} a month in missed calls.`,
      ),
    );
    t(10800, () => pushLog("user", "Okay, so what's the fastest win then?"));
    t(13000, () =>
      pushLog(
        "ai",
        `Reviews, first. Reply to the ${unanswered} you haven't answered and capture a review from your next 10 happy customers. That alone typically adds ${extraLeads} leads and roughly ${projected} a month. I've drafted your 45-second audit video so you can see it side by side.`,
      ),
    );
    t(15500, () => pushLog("user", "Alright, send that over and I'll take a look."));
    t(17800, () =>
      pushLog(
        "ai",
        `It's on its way to your email right now. Take a look when you've got two minutes — if you like what you see, we'll grab 10 minutes this week. Have a great day!`,
      ),
    );
    t(19500, () => finalizeCall("Interested — requested pitch email/audit link"));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, simulated, callSid]);

  // Live Twilio calls: poll the shared call record so the admin sees the real
  // transcript + status stream in as the call happens on any serverless instance.
  useEffect(() => {
    if (status !== "connected" || simulated !== false || !callSid) return;
    const fetchTranscript = async () => {
      try {
        const res = await fetch(
          `/api/prospects/call/transcript?callSid=${encodeURIComponent(callSid)}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (json.ok && json.call) {
          const c = json.call;
          if (c.outcome) setOutcome(String(c.outcome));
          if (Array.isArray(c.entries)) {
            for (const e of c.entries) {
              const role = e.role;
              if (role && typeof e.text === "string") {
                const key = `${role}:${e.text}`;
                if (!seenRef.current.has(key)) {
                  seenRef.current.add(key);
                  pushLog(role, e.text);
                }
              }
            }
          }
          const terminal = ["completed", "no-answer", "busy", "failed", "canceled"];
          if (terminal.includes(String(c.status))) {
            const map: Record<string, string> = {
              completed: c.outcome || "Call completed — needs follow-up",
              "no-answer": "No answer — voicemail left",
              busy: "Line busy — will retry",
              failed: "Call failed to connect",
              canceled: "Call cancelled",
            };
            if (String(c.status) === "completed" && c.outcome) {
              setOutcome(c.outcome);
            }
            finalizeCall(map[String(c.status)] ?? "Call ended");
          }
        }
      } catch {
        // poll failures are safe to ignore
      }
    };
    void fetchTranscript();
    const iv = setInterval(() => void fetchTranscript(), 4000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, simulated, callSid]);

  const copyTranscript = () => {
    const text = transcriptText();
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setToast("Transcript copied to clipboard!");
  };

  // ---------- Minimized floating call card ----------
  if (minimized) {
    return (
      <div className="fixed bottom-5 right-5 z-[60] w-72 rounded-2xl border border-white/15 bg-ink-900 shadow-2xl">
        <div className="flex items-center gap-3 p-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
            <PhoneCall className="h-4 w-4" />
            {status === "connected" && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{p.business_name}</p>
            {status === "ended" && outcome ? (
              <p className="truncate text-[11px] text-emerald-300">{outcome}</p>
            ) : (
              <p className="text-[11px] text-fog">
                {status === "connected" ? `Connected · ${formatTime(seconds)}` : status}
              </p>
            )}
          </div>
          {status === "connected" && (
            <button
              onClick={endCall}
              title="End call"
              className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-500"
            >
              End
            </button>
          )}
          <button
            onClick={() => setMinimized(false)}
            title="Expand call panel"
            className="rounded-lg bg-white/10 p-1.5 text-white transition hover:bg-white/20"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="rounded-lg bg-white/10 p-1.5 text-fog transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ---------- Full call panel ----------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-ink-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/30">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">AI Voice Calling Panel</h3>
              <p className="text-xs text-fog">{p.business_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {status === "connected" && (
              <button
                onClick={() => setMinimized(true)}
                title="Minimize"
                className="rounded-lg bg-white/10 p-2 text-fog transition hover:bg-white/20 hover:text-white"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            )}
            {status === "ended" && (
              <button
                onClick={copyTranscript}
                title="Copy transcript"
                className="rounded-lg bg-white/10 p-2 text-fog transition hover:bg-white/20 hover:text-white"
              >
                <MessageSquareText className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="rounded-lg bg-white/10 p-2 text-fog transition hover:bg-white/20 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-fog mb-1 block">Prospect Phone Number</label>
            <div className="flex gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                disabled={status !== "idle"}
                className="flex-1 rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2.5 text-xs text-white focus:border-brand-500 focus:outline-none disabled:opacity-50"
              />
              {status === "idle" && (
                <button
                  onClick={() => void startCall()}
                  disabled={loading || !phone.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                  Call Now
                </button>
              )}
              {status === "connected" && (
                <button
                  onClick={endCall}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-500 shadow-lg shadow-rose-600/20"
                >
                  End ({formatTime(seconds)})
                </button>
              )}
              {status === "ended" && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300">{formatTime(seconds)}</span>
                </div>
              )}
            </div>
          </div>

          {status === "ended" && outcome && (
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 to-glow-500/10 p-3.5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" /> Call Result
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{outcome}</p>
              <p className="mt-1 text-[11px] text-fog">
                Transcript saved to this prospect&apos;s communication log. Click the transcript icon to copy it.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-ink-950 p-4">
            <div className="flex items-center justify-between text-xs text-fog border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5 font-medium text-white">
                <Volume2 className="h-4 w-4 text-brand-400" /> Voice Agent (Gemini + ElevenLabs)
              </span>
              {callSid && <span className="text-[10px] text-fog/60">{simulated ? "simulation" : "live"}</span>}
            </div>

            <div ref={scrollRef} className="mt-3 h-56 overflow-auto space-y-2 pr-1 font-mono text-[11px]">
              {logs.length === 0 ? (
                <p className="text-mute text-center py-10">Click "Call Now" to initiate live AI voice call agent session.</p>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className={cn("p-2.5 rounded-xl border", l.sender === "ai" ? "bg-brand-500/10 text-brand-200 border-brand-500/30" : l.sender === "user" ? "bg-glow-500/10 text-glow-200 border-glow-500/30" : "bg-ink-900 text-fog border-white/10")}>
                    <div className="flex justify-between text-[10px] opacity-70 mb-1">
                      <span className="uppercase font-bold">{l.sender}</span>
                      <span>{l.time}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{l.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {toast && (
          <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-center text-xs text-rose-300 font-semibold">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function NewsletterModal({
  data,
  onClose,
  onCopy,
}: {
  data: {
    p: Prospect;
    sequence: {
      email1_subject: string;
      email1_body: string;
      email1_html: string;
      email2_subject: string;
      email2_body: string;
      email2_html: string;
      email3_subject: string;
      email3_body: string;
      email3_html: string;
    };
  };
  onClose: () => void;
  onCopy: (text: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const { p, sequence } = data;
  const sub = activeTab === 1 ? sequence.email1_subject : activeTab === 2 ? sequence.email2_subject : sequence.email3_subject;
  const html = activeTab === 1 ? sequence.email1_html : activeTab === 2 ? sequence.email2_html : sequence.email3_html;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl border border-white/15 bg-ink-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-white">⚡ Professional HTML Email Drip · {p.business_name}</h3>
            <p className="text-xs text-fog">Pre-rendered 3-part nurture sequencer with agency branding &amp; video audit link.</p>
          </div>
          <button onClick={onClose} className="text-fog hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setActiveTab(n as 1 | 2 | 3)}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-semibold transition",
                  activeTab === n ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" : "bg-ink-950 text-fog hover:text-white border border-white/10",
                )}
              >
                Email {n} ({n === 1 ? "The Hook" : n === 2 ? "Local Authority" : "The Close"})
              </button>
            ))}
          </div>
          <div className="flex rounded-xl bg-ink-950 p-1 border border-white/10">
            <button
              onClick={() => setViewMode("preview")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                viewMode === "preview" ? "bg-brand-500 text-white" : "text-fog hover:text-white",
              )}
            >
              Live Preview
            </button>
            <button
              onClick={() => setViewMode("code")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                viewMode === "code" ? "bg-brand-500 text-white" : "text-fog hover:text-white",
              )}
            >
              HTML Code
            </button>
          </div>
        </div>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-fog mb-1 block">Subject Line</label>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2.5 text-xs text-white">
              <span className="font-medium">{sub}</span>
              <button onClick={() => onCopy(sub)} className="text-brand-400 hover:underline"><Copy className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-fog mb-1 block">Rendered Email Template</label>
            {viewMode === "preview" ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
                <iframe
                  srcDoc={html}
                  title="Email Preview"
                  className="h-[360px] w-full border-0"
                />
              </div>
            ) : (
              <textarea
                readOnly
                value={html}
                className="h-[360px] w-full rounded-2xl border border-white/10 bg-ink-950 p-3.5 font-mono text-[11px] text-brand-300 outline-none"
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <button
            onClick={() => onCopy(html)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <Copy className="h-4 w-4" /> Copy HTML Email #{activeTab}
          </button>
          <button onClick={onClose} className="rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 text-xs font-semibold text-fog hover:text-white">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
