"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Play,
  Copy,
  Loader2,
  Trash2,
  RefreshCw,
  Users,
  Star,
  Link2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Film,
  Mail,
  X,
} from "lucide-react";
import type { Prospect } from "@/lib/supabase-types";
import { pitchUrl, fmtNumber } from "@/lib/utils";

type Tab = "all" | "pending" | "scraping" | "rendering" | "ready" | "failed";

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending: { label: "Queued", cls: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
  scraping: { label: "Scraping", cls: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
  rendering: { label: "Rendering", cls: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
  ready: { label: "Ready", cls: "text-brand-400 border-brand-500/20 bg-brand-500/5" },
  failed: { label: "Failed", cls: "text-rose-400 border-rose-500/20 bg-rose-500/5" },
};

function emailSubject(p: Prospect) {
  return `Your Google Review Audit: ${p.business_name} \u00d7 Biz Reborn Marketing`;
}

export default function ProspectsAdmin() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<Prospect | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [manual, setManual] = useState({
    business_name: "",
    city: "",
    website: "",
    email: "",
    phone: "",
  });

  const refresh = useCallback(async () => {
    const res = await fetch("/api/prospects");
    const json = await res.json();
    if (json.prospects) setProspects(json.prospects);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/prospects")
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.prospects) setProspects(json.prospects);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Live progress via SSE
  useEffect(() => {
    const es = new EventSource("/api/prospects/events");
    es.addEventListener("update", () => refresh());
    es.addEventListener("snapshot", () => refresh());
    es.onerror = () => {
      // transient; EventSource auto-reconnects
    };
    return () => es.close();
  }, [refresh]);

  const filtered = tab === "all" ? prospects : prospects.filter((p) => p.status === tab);

  const counts = {
    all: prospects.length,
    pending: prospects.filter((p) => p.status === "pending").length,
    scraping: prospects.filter((p) => p.status === "scraping").length,
    rendering: prospects.filter((p) => p.status === "rendering").length,
    ready: prospects.filter((p) => p.status === "ready").length,
    failed: prospects.filter((p) => p.status === "failed").length,
  };

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((p) => p.id)),
    );
  }

  async function generate(ids: string[]) {
    if (!ids.length) return;
    setBusy(true);
    try {
      await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", ids }),
      });
      setSelected(new Set());
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function retry(id: string) {
    await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry", id }),
    });
  }

  async function remove(id: string) {
    await fetch("/api/prospects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    refresh();
  }

  function parseCSV(text: string): Array<Record<string, string>> {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const cells = line.split(",").map((c) => c.trim());
      const obj: Record<string, string> = {};
      header.forEach((h, i) => (obj[h] = cells[i] || ""));
      return obj;
    });
  }

  async function onFile(file: File) {
    const text = await file.text();
    const rows = parseCSV(text);
    const mapped = rows
      .map((r) => ({
        business_name: r.business_name || r.name || r.business,
        city: r.city || "",
        website: r.website || r.url || "",
        email: r.email || "",
        phone: r.phone || "",
      }))
      .filter((r) => r.business_name);
    if (!mapped.length) {
      alert("No valid rows found. Expected columns: business_name, city, website, email, phone");
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/prospects/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospects: mapped }),
      });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function addManual() {
    if (!manual.business_name.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/prospects/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospects: [manual] }),
      });
      setManual({ business_name: "", city: "", website: "", email: "", phone: "" });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function copyText(text: string) {
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
  }

  function absPitch(p: Prospect) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";
    return `${base}/pitch/${p.slug ?? ""}`;
  }

  function emailHtml(p: Prospect) {
    const url = absPitch(p);
    const r = p.google_rating ?? "—";
    const thumb = p.thumbnail_url
      ? `<img src="${p.thumbnail_url}" alt="${p.business_name} growth audit" width="480" style="max-width:100%;border-radius:14px;display:block;margin:0 auto 18px auto;" />`
      : "";
    return [
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">`,
      `<p style="font-size:16px;color:#1e2a3a;">You're one of <strong>${fmtNumber(p.competitor_reviews)}</strong>-review competitors away from losing the local pack.</p>`,
      thumb,
      `<p>Hi ${p.business_name} —</p>`,
      `<p>Your Google listing currently sits at <strong>${r} stars</strong> with <strong>${fmtNumber(p.review_count)} reviews</strong>, while ${p.competitor_name ?? "your top competitor"} has <strong>${fmtNumber(p.competitor_reviews)}</strong> — and they're pulling the local calls that should be coming to you.</p>`,
      `<p>I built a quick growth audit (plus a 45-second video breaking it all down):</p>`,
      `<p style="text-align:center;margin:20px 0;"><a href="${url}" style="display:inline-block;background:#6366F1;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;">Watch your audit →</a></p>`,
      `<p>Want to grab 10 minutes this week to talk through a fix? Reply, or book here: <a href="mailto:bizrebornmarketing@gmail.com" style="color:#6366F1;">bizrebornmarketing@gmail.com</a></p>`,
      `<p style="color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;padding-top:14px;">— Biz Reborn Marketing · <a href="https://www.bizreborn.com" style="color:#6366F1;">www.bizreborn.com</a></p>`,
      `</div>`,
    ].join("");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-sora text-2xl font-bold text-white sm:text-3xl">
            Lead Audits &amp; Video Pitches
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Upload up to 50 businesses a day, generate audits + pitch videos, and send links.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2 text-xs text-ink-300 transition hover:text-white"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Total Uploaded" value={counts.all} icon={<Users size={16} />} color="text-brand-400" />
        <Stat label="Ready Pitches" value={counts.ready} icon={<Film size={16} />} color="text-glow-400" />
        <Stat label="In Progress" value={counts.scraping + counts.rendering} icon={<Loader2 size={16} />} color="text-amber-400" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Upload column */}
        <div className="space-y-6">
          {/* CSV dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
              dragging
                ? "border-brand-400 bg-brand-500/10"
                : "border-ink-800 bg-ink-900/40 hover:border-ink-600"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
            <Upload size={24} className="mx-auto text-brand-400" />
            <p className="mt-3 text-sm font-medium text-white">
              Drop CSV or click to upload
            </p>
            <p className="mt-1 text-xs text-ink-500">
              Columns: business_name, city, website, email, phone
            </p>
          </div>

          {/* Manual form */}
          <div className="rounded-xl border border-ink-800/60 bg-ink-900/40 p-5">
            <p className="text-sm font-semibold text-white">Add business manually</p>
            <div className="mt-3 space-y-2">
              <Input value={manual.business_name} onChange={(v) => setManual({ ...manual, business_name: v })} placeholder="Business name *" />
              <Input value={manual.city} onChange={(v) => setManual({ ...manual, city: v })} placeholder="City" />
              <Input value={manual.website} onChange={(v) => setManual({ ...manual, website: v })} placeholder="Website (optional)" />
              <Input value={manual.email} onChange={(v) => setManual({ ...manual, email: v })} placeholder="Email (optional)" />
              <Input value={manual.phone} onChange={(v) => setManual({ ...manual, phone: v })} placeholder="Phone (optional)" />
            </div>
            <button
              onClick={addManual}
              disabled={busy || !manual.business_name.trim()}
              className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Add Lead"}
            </button>
          </div>

          {/* Batch action */}
          <div className="rounded-xl border border-ink-800/60 bg-ink-900/40 p-5">
            <p className="text-sm font-semibold text-white">Batch Generate</p>
            <p className="mt-1 text-xs text-ink-500">
              {selected.size} selected. Generates audit + video for each.
            </p>
            <button
              onClick={() => generate(Array.from(selected))}
              disabled={busy || selected.size === 0}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-glow-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-glow-500 disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
              Generate Audits &amp; Videos ({selected.size})
            </button>
          </div>
        </div>

        {/* Table column */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap gap-1.5 border-b border-ink-800/60 pb-3">
            {(["all", "pending", "scraping", "rendering", "ready", "failed"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                  tab === t
                    ? "bg-brand-600 text-white"
                    : "bg-ink-900/60 text-ink-400 hover:text-white"
                }`}
              >
                {t} <span className="opacity-70">({counts[t]})</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={24} className="animate-spin text-brand-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-20 text-center text-sm text-ink-500">
              No prospects in this state yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 px-3">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-brand-600" />
                <button
                  onClick={() => generate(Array.from(selected))}
                  disabled={busy || selected.size === 0}
                  className="text-xs font-medium text-glow-400 hover:underline disabled:opacity-40"
                >
                  Generate selected ({selected.size})
                </button>
              </div>

              {filtered.map((p) => (
                <ProspectRow
                  key={p.id}
                  p={p}
                  checked={selected.has(p.id)}
                  onCheck={() => toggle(p.id)}
                  onPreview={() => setPreview(p)}
                  onRetry={() => retry(p.id)}
                  onDelete={() => remove(p.id)}
                  onCopyPitch={() => copyText(pitchUrl(p.slug))}
                  onCopyEmail={() => copyText(emailHtml(p))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {preview && <PreviewModal p={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-800/60 bg-ink-900/50 p-5">
      <div className={`${color}`}>{icon}</div>
      <div>
        <div className="font-sora text-3xl font-bold text-white">{value}</div>
        <div className="text-xs text-ink-400">{label}</div>
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-ink-800 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-ink-600 focus:border-brand-500 focus:outline-none"
    />
  );
}

function ProspectRow({
  p,
  checked,
  onCheck,
  onPreview,
  onRetry,
  onDelete,
  onCopyPitch,
  onCopyEmail,
}: {
  p: Prospect;
  checked: boolean;
  onCheck: () => void;
  onPreview: () => void;
  onRetry: () => void;
  onDelete: () => void;
  onCopyPitch: () => void;
  onCopyEmail: () => void;
}) {
  const badge = statusBadge[p.status || "pending"] || statusBadge.pending;
  const Icon = {
    pending: Clock,
    scraping: Loader2,
    rendering: Film,
    ready: CheckCircle,
    failed: AlertTriangle,
  }[p.status || "pending"] || Clock;

  return (
    <div className="rounded-lg border border-ink-800/60 bg-ink-900/50 p-4">
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={checked} onChange={onCheck} className="mt-1 accent-brand-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{p.business_name}</p>
            {p.city && <p className="text-xs text-ink-500">{p.city}</p>}
            {p.slug && (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-500/20 bg-brand-500/5 px-2 py-0.5 text-[10px] font-medium text-brand-400">
                <Link2 size={10} /> /pitch/{p.slug}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
            <span className="flex items-center gap-1">
              <Star size={12} className="text-amber-400" /> {p.google_rating ?? "—"}
            </span>
            <span>{fmtNumber(p.review_count)} reviews</span>
            {p.competitor_name && (
              <span>
                vs {p.competitor_name} ({fmtNumber(p.competitor_reviews)})
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${badge.cls}`}>
              <Icon size={10} className={p.status === "scraping" ? "animate-spin" : ""} />
              {badge.label}
            </span>

            {p.status === "ready" && (
              <button onClick={onPreview} className="inline-flex items-center gap-1 rounded-full border border-glow-500/20 bg-glow-500/5 px-2.5 py-0.5 text-[10px] font-medium text-glow-400 hover:bg-glow-500/10">
                <Play size={10} /> Preview
              </button>
            )}

            {p.status === "failed" && (
              <button onClick={onRetry} className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 text-[10px] font-medium text-amber-400 hover:bg-amber-500/10">
                <RefreshCw size={10} /> Retry
              </button>
            )}

            {p.status === "ready" && p.slug && (
              <>
                <button onClick={onCopyPitch} className="inline-flex items-center gap-1 rounded-full border border-ink-700 bg-ink-800/60 px-2.5 py-0.5 text-[10px] font-medium text-ink-300 hover:text-white">
                  <Copy size={10} /> Pitch Link
                </button>
                <button onClick={onCopyEmail} className="inline-flex items-center gap-1 rounded-full border border-ink-700 bg-ink-800/60 px-2.5 py-0.5 text-[10px] font-medium text-ink-300 hover:text-white">
                  <Mail size={10} /> Email
                </button>
              </>
            )}

            <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-full border border-ink-800 bg-ink-900/60 px-2.5 py-0.5 text-[10px] font-medium text-ink-500 hover:text-rose-400">
              <Trash2 size={10} /> Delete
            </button>
          </div>

          {p.error && <p className="mt-2 text-[11px] text-rose-400">{p.error}</p>}
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ p, onClose }: { p: Prospect; onClose: () => void }) {
  const url = pitchUrl(p.slug);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-ink-800/60 bg-ink-900 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-sora text-lg font-bold text-white">{p.business_name} — Pitch</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 aspect-[9/16] w-full overflow-hidden rounded-xl border border-ink-800 bg-ink-950">
          {p.video_url ? (
            <video src={p.video_url} poster={p.thumbnail_url || undefined} controls autoPlay muted loop className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-600">No video yet</div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Rating" value={`${p.google_rating ?? "—"}`} />
          <MiniStat label="Reviews" value={fmtNumber(p.review_count)} />
          <MiniStat label="Deficit" value={`-${fmtNumber((p.competitor_reviews ?? 0) - (p.review_count ?? 0))}`} />
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-ink-400">Pitch link</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-ink-950 px-2 py-1.5 text-xs text-brand-400">{url}</code>
            <button
              onClick={() => navigator.clipboard?.writeText(url)}
              className="rounded-lg border border-ink-700 bg-ink-800 px-2.5 py-1.5 text-xs text-ink-200 hover:text-white"
            >
              <Copy size={13} />
            </button>
          </div>
        </div>

        <a
          href={`mailto:${p.email ?? ""}?subject=${encodeURIComponent(emailSubject(p))}&body=${encodeURIComponent(
            [
              `Hi ${p.business_name} —`,
              "",
              `I built a quick growth audit (plus a 45-second video) for you: ${url}`,
              "Want a 10-minute call this week? Just reply — bizrebornmarketing@gmail.com",
              "",
              "— Biz Reborn Marketing",
            ].join("\n"),
          )}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-ink-700 bg-ink-800/80 px-3 py-2 text-xs font-medium text-ink-200 transition hover:text-white"
        >
          <Mail size={13} /> Open in email client
        </a>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-800/60 bg-ink-950/60 p-2">
      <div className="font-sora text-base font-bold text-white">{value}</div>
      <div className="text-[10px] text-ink-500">{label}</div>
    </div>
  );
}