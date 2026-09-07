"use client";

import * as React from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  createReport,
  deleteReport,
  listReports,
  updateReport,
} from "@/lib/data";
import type { MonthlyReport, ReportMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

const inputCls =
  "rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60";

function mailtoForReport(report: MonthlyReport): string {
  const url = `${window.location.origin}/report/${report.token}`;
  const subject = `${report.month ? report.month + " " : ""}Monthly Report — ${report.clientName}`;
  const body = [
    `Hi ${report.clientName},`,
    "",
    `Here's your ${report.month || "monthly"} performance report:`,
    "",
    url,
    "",
    "Great momentum this period — full details inside.",
    "",
    "The Biz Reborn Team",
  ].join("\n");
  return `mailto:${report.clientEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function splitLines(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

interface FormState {
  reportId?: string;
  clientName: string;
  clientEmail: string;
  month: string;
  headline: string;
  highlightsText: string;
  deliverablesText: string;
  nextStepsText: string;
  metrics: ReportMetric[];
}

const EMPTY_FORM: FormState = {
  clientName: "",
  clientEmail: "",
  month: "",
  headline: "",
  highlightsText: "",
  deliverablesText: "",
  nextStepsText: "",
  metrics: [],
};

export function ReportBuilder() {
  const [reports, setReports] = React.useState<MonthlyReport[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState<MonthlyReport | null>(null);
  const [error, setError] = React.useState("");
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    void listReports()
      .then((rows) => {
        setReports(rows);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const startEdit = (r: MonthlyReport) => {
    setForm({
      reportId: r.id,
      clientName: r.clientName,
      clientEmail: r.clientEmail,
      month: r.month,
      headline: r.headline,
      highlightsText: r.highlights.join("\n"),
      deliverablesText: r.deliverables.join("\n"),
      nextStepsText: r.nextSteps.join("\n"),
      metrics: r.metrics,
    });
    setEditingId(r.id);
    setSaved(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSaved(null);
  };

  const setMetric = (i: number, patch: Partial<ReportMetric>) =>
    setForm((f) => ({
      ...f,
      metrics: f.metrics.map((m, idx) => (idx === i ? { ...m, ...patch } : m)),
    }));

  const addMetric = () =>
    setForm((f) => ({ ...f, metrics: [...f.metrics, { label: "", value: "" }] }));

  const removeMetric = (i: number) =>
    setForm((f) => ({ ...f, metrics: f.metrics.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setError("");
    if (!form.clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    const payload = {
      clientName: form.clientName.trim(),
      clientEmail: form.clientEmail.trim(),
      month: form.month.trim(),
      headline: form.headline.trim(),
      highlights: splitLines(form.highlightsText),
      metrics: form.metrics.filter((m) => m.label.trim() && m.value.trim()),
      deliverables: splitLines(form.deliverablesText),
      nextSteps: splitLines(form.nextStepsText),
    };
    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateReport(editingId, payload);
        if (updated) {
          setReports((prev) =>
            prev.map((r) => (r.id === editingId ? updated : r)),
          );
          setSaved(updated);
        }
      } else {
        const created = await createReport(payload);
        setReports((prev) => [created, ...prev]);
        setSaved(created);
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the report.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (r: MonthlyReport) => {
    const next: MonthlyReport["status"] =
      r.status === "published" ? "draft" : "published";
    const updated = await updateReport(r.id, { status: next }).catch(() => null);
    if (updated) {
      setReports((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      if (saved?.id === r.id) setSaved(updated);
    }
  };

  const copyLink = async (r: MonthlyReport) => {
    const ok = await copyText(`${window.location.origin}/report/${r.token}`);
    if (ok) {
      setCopiedToken(r.id);
      window.setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  const removeReport = (r: MonthlyReport) => {
    setReports((prev) => prev.filter((x) => x.id !== r.id));
    void deleteReport(r.id).catch(() => {});
  };

  return (
    <div className="space-y-6">
      {/* Builder */}
      <div className="rounded-2xl border border-white/8 bg-ink-850/50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-white">
              {editingId ? "Edit monthly report" : "Write a monthly report"}
            </h3>
            <p className="text-xs text-fog">
              Manager-written recap → published to a private link you email the client.
            </p>
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-fog transition hover:border-white/25 hover:text-white"
            >
              <X className="h-3.5 w-3.5" /> Cancel edit
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            placeholder="Client name"
            className={inputCls}
          />
          <input
            value={form.clientEmail}
            onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
            placeholder="client@business.com"
            type="email"
            className={inputCls}
          />
          <input
            value={form.month}
            onChange={(e) => setForm({ ...form, month: e.target.value })}
            placeholder="e.g. July 2026"
            className={inputCls}
          />
        </div>

        <textarea
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          placeholder="Headline summary — one or two sentences on overall performance this period…"
          rows={2}
          className={cn(inputCls, "mt-3 w-full resize-none")}
        />

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">
              Metrics — one per line as Label|Value (e.g. Calls|214)
            </span>
            <div className="space-y-2">
              {form.metrics.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={m.label}
                    onChange={(e) => setMetric(i, { label: e.target.value })}
                    placeholder="Label"
                    className={cn(inputCls, "flex-1")}
                  />
                  <input
                    value={m.value}
                    onChange={(e) => setMetric(i, { value: e.target.value })}
                    placeholder="Value"
                    className={cn(inputCls, "w-28")}
                  />
                  <button
                    onClick={() => removeMetric(i)}
                    className="rounded-lg p-2 text-mute transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={addMetric}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs font-semibold text-fog transition hover:border-white/40 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add metric
              </button>
            </div>
          </label>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">
                Highlights — one per line
              </span>
              <textarea
                value={form.highlightsText}
                onChange={(e) => setForm({ ...form, highlightsText: e.target.value })}
                placeholder={"Google calls up 34%\nRanked #3 for \"near me\" keywords\n…"}
                rows={4}
                className={cn(inputCls, "w-full resize-none")}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">
                Deliverables — one per line
              </span>
              <textarea
                value={form.deliverablesText}
                onChange={(e) => setForm({ ...form, deliverablesText: e.target.value })}
                placeholder={"15 short-form videos published\nGBP cleanup completed\n…"}
                rows={3}
                className={cn(inputCls, "w-full resize-none")}
              />
            </label>
          </div>
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">
            Next steps — one per line
          </span>
          <textarea
            value={form.nextStepsText}
            onChange={(e) => setForm({ ...form, nextStepsText: e.target.value })}
            placeholder={"Launch review-request SMS campaign\nBook video shoot for August\n…"}
            rows={2}
            className={cn(inputCls, "w-full resize-none")}
          />
        </label>

        {error && (
          <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> {editingId ? "Save changes" : "Create report"}
            </>
          )}
        </button>

        {saved && (
          <div className="mt-4 rounded-2xl border border-glow-500/30 bg-glow-500/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-glow-400">
              <CheckCircle2 className="h-4 w-4" /> {editingId ? "Report updated" : "Report created"}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => copyLink(saved)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-semibold text-mist transition hover:border-white/25 hover:text-white"
              >
                {copiedToken === saved.id ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-glow-400" /> Copied link
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy report link
                  </>
                )}
              </button>
              <a
                href={mailtoForReport(saved)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-500/10 py-2 text-xs font-semibold text-brand-300 transition hover:bg-brand-500/20"
              >
                <Mail className="h-3.5 w-3.5" /> Email to client
              </a>
              <a
                href={`/report/${saved.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-semibold text-mist transition hover:border-white/25 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Preview report
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Report list */}
      <div className="rounded-2xl border border-white/8 bg-ink-850/50 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-white">All monthly reports</h3>
          <Badge variant="brand">{reports.length} reports</Badge>
        </div>
        {!loaded ? (
          <p className="mt-4 text-sm text-fog">Loading reports…</p>
        ) : reports.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-fog">
            No reports yet — write the first one above. Each report gets a
            private link you can email or text to the client.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-ink-800/40 px-4 py-3"
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
                    {r.month ? `${r.month} · ` : ""}
                    {r.clientName}
                  </p>
                  <p className="truncate text-[11px] text-mute">
                    {r.metrics.length} metrics · {r.highlights.length} highlights ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyLink(r)}
                    title="Copy report link"
                    className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-white/25 hover:text-white"
                  >
                    {copiedToken === r.id ? (
                      <Check className="h-3.5 w-3.5 text-glow-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <a
                    href={mailtoForReport(r)}
                    title="Email to client"
                    className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-white/25 hover:text-white"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={`/report/${r.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Preview"
                    className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-white/25 hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => startEdit(r)}
                    title="Edit"
                    className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-brand-500/40 hover:text-brand-300"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => togglePublish(r)}
                    title={r.status === "published" ? "Unpublish" : "Publish"}
                    className={cn(
                      "rounded-lg border p-2 transition",
                      r.status === "published"
                        ? "border-white/10 text-mist hover:border-white/25 hover:text-white"
                        : "border-glow-500/40 text-glow-400 hover:bg-glow-500/15",
                    )}
                  >
                    {r.status === "published" ? (
                      <FileText className="h-3.5 w-3.5" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => removeReport(r)}
                    title="Delete"
                    className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-rose-500/40 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
