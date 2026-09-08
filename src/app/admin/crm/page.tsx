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
} from "lucide-react";
import type { Prospect, CommunicationLog } from "@/lib/supabase-types";
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

export default function CrmPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
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

  const fetchProspects = useCallback(async () => {
    try {
      const res = await fetch("/api/prospects", { cache: "no-store" });
      const json = await res.json();
      if (json.prospects) {
        setProspects(json.prospects);
      }
    } catch (err) {
      console.error("[crm] failed to fetch prospects", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProspects();
  }, [fetchProspects]);

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

  const filtered = prospects.filter((p) => {
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
              Full CRM &amp; Communication Pipeline
            </h1>
            <p className="mt-1 text-sm text-fog">
              Track leads, view &amp; edit business info, manage statuses (`Hot`, `Warm`, `Cold`, `Replied`, `Proposal Sent`, `Client`), and review live AI call transcripts &amp; email tracking logs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchProspects()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900 px-4 py-2 text-xs font-semibold text-fog transition hover:border-white/25 hover:text-white"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
            </button>
          </div>
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

        {/* Prospects / CRM Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-ink-900/80 text-fog uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">Business</th>
                  <th className="px-4 py-3 font-semibold">Contact &amp; Web</th>
                  <th className="px-4 py-3 font-semibold">Socials &amp; Maps</th>
                  <th className="px-4 py-3 font-semibold">Status / Temp</th>
                  <th className="px-4 py-3 font-semibold">Last Contact</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((p) => {
                  const temp = p.status || "Warm";
                  return (
                    <tr key={p.id} className="hover:bg-ink-900/40 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white text-sm">{p.business_name}</div>
                        <div className="text-mute">{p.city || "Local location"}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-mist flex items-center gap-1">
                          <Mail className="h-3 w-3 text-brand-400" /> {p.email || "No email"}
                        </div>
                        <div className="text-mute flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-emerald-400" /> {p.phone || "No phone"}
                        </div>
                        {p.website && (
                          <a
                            href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-300 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-xs"
                          >
                            <Globe className="h-3 w-3" /> {p.website} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5 text-mute">
                          {p.instagram && (
                            <span className="rounded bg-white/5 px-2 py-0.5 text-[10px]">IG: {p.instagram}</span>
                          )}
                          {p.facebook && (
                            <span className="rounded bg-white/5 px-2 py-0.5 text-[10px]">FB: {p.facebook}</span>
                          )}
                          {p.tiktok && (
                            <span className="rounded bg-white/5 px-2 py-0.5 text-[10px]">TT: {p.tiktok}</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
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
                      <td className="px-4 py-3.5 text-mute">
                        {p.last_contacted_at ? new Date(p.last_contacted_at).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
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
          {filtered.length === 0 && (
            <div className="p-12 text-center text-sm text-fog">
              No CRM accounts found matching your search.
            </div>
          )}
        </Card>
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

      {/* Communication History & AI Transcripts Modal */}
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
              Communication History &amp; AI Call Transcripts
            </h3>
            <p className="text-xs text-fog mb-6">
              {commsProspect.business_name} · Track every email sent, call made, live AI call transcript, answered status, duration, and AI notes.
            </p>

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
                    <p className="text-xs text-mist leading-relaxed">{log.notes}</p>
                    {log.admin && (
                      <p className="text-[10px] text-mute">Logged by {log.admin}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-xs text-fog">
                  No communication logs or call transcripts recorded yet. Use the form above or initiate an AI call.
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
