"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  Users,
  ListChecks,
  Star,
  Mail,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { Lead, Task } from "@/lib/supabase-types";

const statusIcons: Record<string, any> = {
  active: CheckCircle,
  pending: Clock,
  cancelled: AlertCircle,
  completed: CheckCircle,
  new: Clock,
  contacted: Mail,
  qualified: Star,
  lost: AlertCircle,
};

const statusStyles: Record<string, string> = {
  active: "text-glow-400 border-glow-500/20 bg-glow-500/5",
  pending: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  cancelled: "text-rose-400 border-rose-500/20 bg-rose-500/5",
  completed: "text-brand-400 border-brand-500/20 bg-brand-500/5",
  new: "text-blue-400 border-blue-500/20 bg-blue-500/5",
  contacted: "text-purple-400 border-purple-500/20 bg-purple-500/5",
  qualified: "text-glow-400 border-glow-500/20 bg-glow-500/5",
  lost: "text-rose-400 border-rose-500/20 bg-rose-500/5",
};

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"leads" | "tasks" | "audits">(
    "leads"
  );

  useEffect(() => {
    async function fetchData() {
      const sb = getSupabase();
      if (!sb) {
        setLoading(false);
        return;
      }
      const [leadsRes, tasksRes] = await Promise.all([
        sb.from("leads").select("*").order("created_at", { ascending: false }),
        sb.from("tasks").select("*").order("created_at", { ascending: false }),
      ]);
      if (leadsRes.data) setLeads(leadsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <Loader2 size={32} className="animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950/20 via-ink-950 to-ink-950" />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <h1 className="font-sora text-2xl font-bold text-white sm:text-3xl">
          Admin Portal
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          Manage leads, tasks, and operations.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-ink-800/60 bg-ink-900/50 p-5">
            <div className="flex items-center gap-2 text-brand-400">
              <Users size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">
                Total Leads
              </span>
            </div>
            <div className="mt-3 font-sora text-3xl font-bold text-white">
              {leads.length}
            </div>
          </div>
          <div className="rounded-xl border border-ink-800/60 bg-ink-900/50 p-5">
            <div className="flex items-center gap-2 text-glow-400">
              <ListChecks size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">
                Open Tasks
              </span>
            </div>
            <div className="mt-3 font-sora text-3xl font-bold text-white">
              {tasks.filter((t) => t.status !== "completed").length}
            </div>
          </div>
          <div className="rounded-xl border border-ink-800/60 bg-ink-900/50 p-5">
            <div className="flex items-center gap-2 text-amber-400">
              <CheckCircle size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">
                Completed Tasks
              </span>
            </div>
            <div className="mt-3 font-sora text-3xl font-bold text-white">
              {tasks.filter((t) => t.status === "completed").length}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-2 border-b border-ink-800/60">
          {(["leads", "tasks", "audits"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-medium capitalize transition-all ${
                activeTab === tab
                  ? "border-b-2 border-brand-400 text-brand-400"
                  : "text-ink-500 hover:text-ink-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "leads" && (
          <div className="mt-6 space-y-3">
            {leads.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink-500">
                No leads yet.
              </p>
            ) : (
              leads.map((lead) => {
                const Icon = statusIcons[lead.status || "new"] || Clock;
                return (
                  <div
                    key={lead.id}
                    className="rounded-lg border border-ink-800/60 bg-ink-900/50 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {lead.name}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {lead.business_name && `${lead.business_name} — `}
                          {lead.email}
                          {lead.phone && ` — ${lead.phone}`}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${statusStyles[lead.status || "new"] || ""}`}
                      >
                        <Icon size={10} />
                        {lead.status || "new"}
                      </span>
                    </div>
                    {lead.notes && (
                      <p className="mt-2 text-xs text-ink-500">{lead.notes}</p>
                    )}
                    <p className="mt-1 text-[11px] text-ink-600">
                      {new Date(lead.created_at).toLocaleDateString()} — Source:{" "}
                      {lead.source || "direct"}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="mt-6 space-y-3">
            {tasks.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink-500">
                No tasks yet.
              </p>
            ) : (
              tasks.map((task) => {
                const Icon = statusIcons[task.status || "pending"] || Clock;
                return (
                  <div
                    key={task.id}
                    className="rounded-lg border border-ink-800/60 bg-ink-900/50 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="mt-0.5 text-xs text-ink-400">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${statusStyles[task.status || "pending"] || ""}`}
                      >
                        <Icon size={10} />
                        {task.status || "pending"}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-4 text-[11px] text-ink-500">
                      {task.assignee && <span>Assignee: {task.assignee}</span>}
                      {task.due_date && (
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "audits" && (
          <div className="mt-6">
            <AuditList />
          </div>
        )}
      </div>
    </div>
  );
}

function AuditList() {
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    sb
      .from("audits")
      .select("*")
      .order("created_at", { ascending: false })
      .then((res) => {
        if (res.data) setAudits(res.data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="animate-spin text-brand-400" />
      </div>
    );
  }

  if (audits.length === 0) {
    return <p className="py-12 text-center text-sm text-ink-500">No audits yet.</p>;
  }

  return (
    <div className="space-y-3">
      {audits.map((audit) => (
        <div
          key={audit.id}
          className="rounded-lg border border-ink-800/60 bg-ink-900/50 p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                {audit.business_name || audit.url}
              </p>
              <p className="mt-0.5 text-xs text-ink-400">{audit.url}</p>
            </div>
            <div className="flex items-center gap-2">
              {audit.health_score && (
                <span className="font-sora text-lg font-bold text-white">
                  {audit.health_score}
                </span>
              )}
              {audit.grade && (
                <span className="font-sora text-sm font-bold text-brand-400">
                  {audit.grade}
                </span>
              )}
            </div>
          </div>
          {audit.contact && (
            <p className="mt-2 text-xs text-ink-500">Contact: {audit.contact}</p>
          )}
          <p className="mt-1 text-[11px] text-ink-600">
            {new Date(audit.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
