"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import type { Prospect, CommunicationLog } from "@/lib/supabase-types";
import type { AdminTask } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/section";
import { cn } from "@/lib/utils";

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

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "tasks">("directory");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTemp, setSelectedTemp] = useState<string>("all");
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [commsProspect, setCommsProspect] = useState<Prospect | null>(null);
  const [newLogType, setNewLogType] = useState("call");
  const [newLogNotes, setNewLogNotes] = useState("");
  const [newLogDuration, setNewLogDuration] = useState("3m 42s");
  const [newLogAnswered, setNewLogAnswered] = useState("Answered");
  const [toast, setToast] = useState<string | null>(null);

  // Task filter & creation state
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
        body: JSON.stringify({ status: temperature }),
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
        body: JSON.stringify(editingProspect),
      });
      const json = await res.json();
      if (res.ok && json.prospect) {
        setProspects((prev) => prev.map((x) => (x.id === editingProspect.id ? json.prospect : x)));
        setToast("Business information updated successfully!");
        setEditingProspect(null);
      }
    } catch {
      setToast("Failed to save business info");
    }
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

  // Task handlers
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
    hot: prospects.filter((p) => p.status?.toLowerCase() === "hot").length,
    warm: prospects.filter((p) => p.status?.toLowerCase() === "warm").length,
    active: prospects.filter((p) => p.status?.toLowerCase() === "client (active)").length,
    proposal: prospects.filter((p) => p.status?.toLowerCase() === "proposal sent").length,
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
        {/* Navigation & Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-fog hover:text-white mb-3 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Admin Command Center
            </Link>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Full CRM &amp; Fulfillment Command Center
            </h1>
            <p className="mt-1 text-sm text-fog">
              Unified client records, prospect audit scores, ROI projections, live AI call transcripts, email open tracking, and associated fulfillment tasks &amp; order modules.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchData()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900 px-4 py-2 text-xs font-semibold text-fog transition hover:border-white/25 hover:text-white"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
            </button>
          </div>
        </div>

        {/* CRM Navigation Tabs */}
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
            <Users className="h-4 w-4" /> Prospects &amp; Client Directory ({prospects.length})
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

        {/* CRM KPI Metrics */}
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
            {/* Search & Filter Bar */}
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

            {/* Prospects / CRM Table with full info rendering */}
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
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
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
                                  <MapPin className="h-3 w-3" /> Google Maps
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
                          <td className="px-4 py-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => setEditingProspect(p)}
                              className="rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-xs font-semibold text-fog hover:text-white transition"
                              title="View & Edit Business Info"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setCommsProspect(p)}
                              className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-2.5 py-1.5 text-xs font-semibold text-brand-300 hover:bg-brand-500/20 transition"
                              title="Communication History & AI Transcripts"
                            >
                              <FileText className="h-3.5 w-3.5" /> ({p.communication_logs?.length || 0})
                            </button>
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
          /* Fulfillment Task Board & Modules Integrated into CRM */
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

            {/* Filter Tabs */}
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

            {/* New Task Creation Bar */}
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

            {/* Task Cards / List */}
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

      {/* Edit Business Info Modal */}
      {editingProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingProspect(null)}
              className="absolute right-4 top-4 text-fog hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-xl font-bold text-white mb-1">
              Edit Business Info &amp; CRM Profile
            </h3>
            <p className="text-xs text-fog mb-6">
              Update full business details, website, contact info, social handles, and maps links.
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
                    Instagram Handle
                  </label>
                  <input
                    value={editingProspect.instagram || ""}
                    onChange={(e) => setEditingProspect({ ...editingProspect, instagram: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-fog mb-1">
                    Facebook Handle
                  </label>
                  <input
                    value={editingProspect.facebook || ""}
                    onChange={(e) => setEditingProspect({ ...editingProspect, facebook: e.target.value })}
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
                  Save Changes
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Communication History, AI Transcripts & Client Fulfillment Tasks Modal */}
      {commsProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
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

            {/* Associated Fulfillment Tasks for this Client */}
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

            {/* Email Open Tracking & Stats */}
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

            {/* Add Log Form */}
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

            {/* Audio Recording / Voiceover Playback if available */}
            {commsProspect.voiceover_url && (
              <div className="mb-6 rounded-2xl border border-glow-500/30 bg-glow-500/10 p-4 space-y-2">
                <p className="text-xs font-bold text-glow-300 flex items-center gap-1.5">
                  <Volume2 className="h-4 w-4" /> AI Voice Pitch Audio Recording
                </p>
                <audio controls src={commsProspect.voiceover_url} className="w-full h-10 accent-glow-400" />
              </div>
            )}

            {/* Logs List */}
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-ink-900 px-4 py-2 text-xs font-semibold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
