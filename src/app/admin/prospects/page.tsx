"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  ArrowLeft,
  FileSignature,
  Compass,
  Pencil,
  Database,
  TrendingUp,
} from "lucide-react";
import type { Prospect } from "@/lib/supabase-types";
import type { ProspectStoreStatus } from "@/lib/prospects";
import { fmtNumber } from "@/lib/utils";
import { PitchPlayer } from "@/components/pitch/pitch-player";
import { PREFILL_KEY, type OfferPrefill } from "@/lib/offer-prefill";
import { LEADGEN } from "@/lib/config";

type Tab = "all" | "pending" | "scraping" | "rendering" | "ready" | "failed";

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending: { label: "Queued", cls: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
  scraping: { label: "Auditing", cls: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
  rendering: { label: "Rendering", cls: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
  ready: { label: "Ready", cls: "text-brand-400 border-brand-500/20 bg-brand-500/5" },
  failed: { label: "Failed", cls: "text-rose-400 border-rose-500/20 bg-rose-500/5" },
};

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
    `Your Google listing sits at ${p.google_rating ?? "—"} stars with ${fmtNumber(p.review_count)} reviews (${fmtNumber(p.unanswered_reviews)} unanswered), while ${p.competitor_name ?? "your top competitor"} has ${fmtNumber(p.competitor_reviews)}.`,
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
  <div style="margin-top:14px;font-size:40px;font-weight:900;">${p.google_rating ?? "—"} <span style="font-size:14px;color:#fbbf24;">★ ${fmtNumber(p.review_count)} reviews</span></div>
  <div style="margin-top:10px;display:inline-block;background:rgba(248,113,113,.15);color:#fca5a5;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;">Brand grade ${grade}</div>
  <div style="margin-top:18px;text-align:center;"><span style="display:inline-block;background:#fff;color:#0B0F17;border-radius:999px;padding:10px 18px;font-weight:800;font-size:14px;">▶ Watch your 45-second audit</span></div>
</a>`;
  return [
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">`,
    thumb,
    `<p>Hi ${p.business_name} —</p>`,
    `<p>We ran a full audit on your brand — website, socials and Google reputation — and it came back a <strong>${grade}</strong>.</p>`,
    `<p>Your Google listing sits at <strong>${p.google_rating ?? "—"} stars</strong> with <strong>${fmtNumber(p.review_count)} reviews</strong> (${fmtNumber(p.unanswered_reviews)} unanswered), while ${p.competitor_name ?? "your top competitor"} has <strong>${fmtNumber(p.competitor_reviews)}</strong> — and they're taking the calls that should be yours.</p>`,
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

const EMPTY_MANUAL = {
  business_name: "",
  city: "",
  website: "",
  email: "",
  phone: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  google_rating: "",
  review_count: "",
  unanswered_reviews: "",
  competitor_name: "",
  competitor_reviews: "",
};

export default function ProspectsAdmin() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [store, setStore] = useState<ProspectStoreStatus | null>(null);
  const [setupSql, setSetupSql] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<Prospect | null>(null);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSocials, setShowSocials] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [manual, setManual] = useState(EMPTY_MANUAL);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/prospects", { cache: "no-store" });
      const json = await res.json();
      if (json.prospects) setProspects(json.prospects);
      if (json.store) setStore(json.store);
      if (json.setupSql) setSetupSql(json.setupSql);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/prospects", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.prospects) setProspects(json.prospects);
        if (json.store) setStore(json.store);
        if (json.setupSql) setSetupSql(json.setupSql);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Live progress: poll while anything is in flight (works on serverless too).
  const inFlight = prospects.some((p) => p.status === "pending" || p.status === "scraping" || p.status === "rendering");
  useEffect(() => {
    if (!inFlight) return;
    const id = setInterval(() => void refresh(), 2500);
    return () => clearInterval(id);
  }, [inFlight, refresh]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

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
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id))));
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
      void refresh();
    }
  }

  async function retry(id: string) {
    await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry", id }),
    });
    void refresh();
  }

  async function remove(id: string) {
    await fetch("/api/prospects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    void refresh();
  }

  function parseCSV(text: string): Array<Record<string, string>> {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];
    const split = (line: string) =>
      (line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? [])
        .map((c) => c.replace(/,$/, "").trim().replace(/^"|"$/g, "").replace(/""/g, '"'))
        .slice(0, -1);
    const header = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).map((line) => {
      const cells = split(line);
      const obj: Record<string, string> = {};
      header.forEach((h, i) => (obj[h] = cells[i] || ""));
      return obj;
    });
  }

  async function submitRows(rows: Array<Record<string, string>>) {
    setBusy(true);
    try {
      const res = await fetch("/api/prospects/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospects: rows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      const ids = (json.prospects as Prospect[]).map((p) => p.id);
      setToast(`${ids.length} lead${ids.length === 1 ? "" : "s"} added — generating audits…`);
      // Kick off immediately so the admin sees progress without a second click.
      await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", ids }),
      });
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  async function onFile(file: File) {
    const text = await file.text();
    const rows = parseCSV(text)
      .map((r) => ({
        business_name: r.business_name || r.name || r.business || "",
        city: r.city || "",
        website: r.website || r.url || "",
        email: r.email || "",
        phone: r.phone || "",
        instagram: r.instagram || r.ig || "",
        facebook: r.facebook || r.fb || "",
        tiktok: r.tiktok || "",
      }))
      .filter((r) => r.business_name);
    if (!rows.length) {
      setToast("No valid rows. Expected columns: business_name, city, website, email, phone, instagram, facebook, tiktok");
      return;
    }
    await submitRows(rows.slice(0, 50));
  }

  async function addManual() {
    if (!manual.business_name.trim()) return;
    await submitRows([manual]);
    setManual(EMPTY_MANUAL);
  }

  async function copyText(text: string, label = "Copied") {
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
    setToast(label);
  }

  function draftProposal(p: Prospect) {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(proposalPrefill(p)));
    window.location.assign("/admin?tab=offers");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-400 hover:text-white">
        <ArrowLeft size={14} /> Admin Command Center
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-sora text-2xl font-bold text-white sm:text-3xl">Lead Audits &amp; Video Pitches</h1>
          <p className="mt-1 text-sm text-ink-400">
            Upload up to 50 businesses a day. We audit their website, socials and Google reputation, build a
            45-second video pitch with projected ROI, and hand you a proposal draft.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2 text-xs text-ink-300 transition hover:text-white"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {store?.setupRequired && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="flex items-center gap-2 font-semibold">
            <Database size={16} /> One-time setup: the <code>prospects</code> table isn&apos;t in your Supabase yet.
          </p>
          <p className="mt-1 text-amber-200/80">
            Leads you add now are kept in memory only and can disappear between deploys. Paste this SQL into
            Supabase → SQL Editor → Run, then refresh.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setupSql && void copyText(setupSql, "SQL copied — paste it in Supabase")}
              className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-amber-300"
            >
              Copy setup SQL
            </button>
            <button
              onClick={() => setShowSql((s) => !s)}
              className="rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/10"
            >
              {showSql ? "Hide SQL" : "Show SQL"}
            </button>
          </div>
          {showSql && setupSql && (
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-ink-950/80 p-3 text-[11px] text-ink-200">{setupSql}</pre>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Uploaded" value={counts.all} icon={<Users size={16} />} color="text-brand-400" />
        <Stat label="Ready Pitches" value={counts.ready} icon={<Film size={16} />} color="text-glow-400" />
        <Stat label="In Progress" value={counts.pending + counts.scraping + counts.rendering} icon={<Loader2 size={16} />} color="text-amber-400" />
        <Stat
          label="Projected pipeline / mo"
          value={prospects.reduce((s, p) => s + (p.roi_projection?.projected_monthly ?? 0), 0)}
          icon={<TrendingUp size={16} />}
          color="text-glow-400"
          money
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Upload column */}
        <div className="space-y-6">
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
              if (f) void onFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
              dragging ? "border-brand-400 bg-brand-500/10" : "border-ink-800 bg-ink-900/40 hover:border-ink-600"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
            <Upload size={24} className="mx-auto text-brand-400" />
            <p className="mt-3 text-sm font-medium text-white">Drop CSV or click to upload</p>
            <p className="mt-1 text-xs text-ink-500">
              business_name, city, website, email, phone, instagram, facebook, tiktok
            </p>
            <p className="mt-1 text-[11px] text-ink-600">Audits + videos start automatically on upload.</p>
          </div>

          <div className="rounded-xl border border-ink-800/60 bg-ink-900/40 p-5">
            <p className="text-sm font-semibold text-white">Add a business manually</p>
            <div className="mt-3 space-y-2">
              <Input value={manual.business_name} onChange={(v) => setManual({ ...manual, business_name: v })} placeholder="Business name *" />
              <Input value={manual.city} onChange={(v) => setManual({ ...manual, city: v })} placeholder="City" />
              <Input value={manual.website} onChange={(v) => setManual({ ...manual, website: v })} placeholder="Website" />
              <Input value={manual.email} onChange={(v) => setManual({ ...manual, email: v })} placeholder="Email (for proposal)" />
              <Input value={manual.phone} onChange={(v) => setManual({ ...manual, phone: v })} placeholder="Phone" />
              
              <div className="pt-2 border-t border-ink-800/60">
                <p className="text-xs font-semibold text-brand-400 mb-2">Exact Reputation Stats (Optional — bypasses AI)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={manual.google_rating} onChange={(v) => setManual({ ...manual, google_rating: v })} placeholder="Rating (e.g. 4.9)" />
                  <Input value={manual.review_count} onChange={(v) => setManual({ ...manual, review_count: v })} placeholder="Reviews (e.g. 142)" />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input value={manual.unanswered_reviews} onChange={(v) => setManual({ ...manual, unanswered_reviews: v })} placeholder="Unanswered (e.g. 2)" />
                  <Input value={manual.competitor_reviews} onChange={(v) => setManual({ ...manual, competitor_reviews: v })} placeholder="Comp. Reviews" />
                </div>
                <div className="mt-2">
                  <Input value={manual.competitor_name} onChange={(v) => setManual({ ...manual, competitor_name: v })} placeholder="Competitor Name (e.g. Apex LLC)" />
                </div>
              </div>

              <button onClick={() => setShowSocials((s) => !s)} className="text-[11px] font-semibold text-brand-400 hover:underline pt-1">
                {showSocials ? "Hide" : "Add"} social handles (Instagram / Facebook / TikTok)
              </button>
              {showSocials && (
                <>
                  <Input value={manual.instagram} onChange={(v) => setManual({ ...manual, instagram: v })} placeholder="Instagram @handle" />
                  <Input value={manual.facebook} onChange={(v) => setManual({ ...manual, facebook: v })} placeholder="Facebook page" />
                  <Input value={manual.tiktok} onChange={(v) => setManual({ ...manual, tiktok: v })} placeholder="TikTok @handle" />
                </>
              )}
            </div>
            <button
              onClick={() => void addManual()}
              disabled={busy || !manual.business_name.trim()}
              className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
            >
              {busy ? "Working…" : "Add lead & generate audit"}
            </button>
          </div>

          <div className="rounded-xl border border-ink-800/60 bg-ink-900/40 p-5">
            <p className="text-sm font-semibold text-white">Re-run selected</p>
            <p className="mt-1 text-xs text-ink-500">{selected.size} selected. Regenerates audit + video for each.</p>
            <button
              onClick={() => void generate(Array.from(selected))}
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
                  tab === t ? "bg-brand-600 text-white" : "bg-ink-900/60 text-ink-400 hover:text-white"
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
              {prospects.length === 0 ? "No leads yet — drop a CSV or add one manually to start." : "No prospects in this state."}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 px-3">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="accent-brand-600"
                />
                <span className="text-xs text-ink-500">Select all</span>
              </div>

              {filtered.map((p) => (
                <ProspectRow
                  key={p.id}
                  p={p}
                  checked={selected.has(p.id)}
                  onCheck={() => toggle(p.id)}
                  onPreview={() => setPreview(p)}
                  onRetry={() => void retry(p.id)}
                  onDelete={() => void remove(p.id)}
                  onEdit={() => setEditing(p)}
                  onCopyPitch={() => void copyText(absPitch(p), "Pitch link copied")}
                  onCopyEmail={() => void copyText(emailHtml(p), "Email (HTML) copied")}
                  onDraftProposal={() => draftProposal(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      
      {editing && (
        <EditModal
          p={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setProspects((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}

      
      {showDiscovery && (
        <DiscoveryModal
          onClose={() => setShowDiscovery(false)}
          onImported={() => {
            setShowDiscovery(false);
            void refresh();
          }}
        />
      )}

      {preview && (
        <PreviewModal
          p={preview}
          onClose={() => setPreview(null)}
          onDraftProposal={() => draftProposal(preview)}
          onCopyEmail={() => void copyText(emailHtml(preview), "Email (HTML) copied")}
          onEdit={() => { setEditing(preview); setPreview(null); }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-ink-700 bg-ink-900 px-4 py-2 text-xs font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  color,
  money: isMoney,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  money?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-800/60 bg-ink-900/50 p-5">
      <div className={color}>{icon}</div>
      <div>
        <div className="font-sora text-2xl font-bold text-white sm:text-3xl">{isMoney ? money(value) : value}</div>
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
  onDraftProposal,
  onEdit,
}: {
  p: Prospect;
  checked: boolean;
  onCheck: () => void;
  onPreview: () => void;
  onRetry: () => void;
  onDelete: () => void;
  onCopyPitch: () => void;
  onCopyEmail: () => void;
  onDraftProposal: () => void;
  onEdit: () => void;
}) {
  const badge = statusBadge[p.status || "pending"] || statusBadge.pending;
  const Icon =
    { pending: Clock, scraping: Loader2, rendering: Film, ready: CheckCircle, failed: AlertTriangle }[p.status || "pending"] || Clock;
  const spinning = p.status === "scraping" || p.status === "rendering" || p.status === "pending";
  const roi = p.roi_projection;
  const grade = p.audit_report?.grade;

  return (
    <div className="rounded-lg border border-ink-800/60 bg-ink-900/50 p-4">
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={checked} onChange={onCheck} className="mt-1 accent-brand-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{p.business_name}</p>
            {p.city && <p className="text-xs text-ink-500">{p.city}</p>}
            {grade && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  grade === "A" || grade === "B"
                    ? "border-glow-500/30 bg-glow-500/10 text-glow-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                Grade {grade} · {p.audit_report?.health_score}/100
              </span>
            )}
            {p.slug && p.status === "ready" && (
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
            {roi && (
              <span className="text-glow-400">
                +{roi.leads_per_month} leads · {money(roi.projected_monthly)}/mo projected
              </span>
            )}
          </div>

          {p.audit_report?.pain_points?.[0] && (
            <p className="mt-2 truncate text-[11px] text-rose-300/80">
              Top flaw: {p.audit_report.pain_points[0].replace(/\s*\([^)]*service #\d+[^)]*\)/gi, "")}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${badge.cls}`}>
              <Icon size={10} className={spinning ? "animate-spin" : ""} />
              {badge.label}
            </span>

            {p.status === "ready" && (
              <>
                <button onClick={onPreview} className="inline-flex items-center gap-1 rounded-full border border-glow-500/20 bg-glow-500/5 px-2.5 py-0.5 text-[10px] font-medium text-glow-400 hover:bg-glow-500/10">
                  <Play size={10} /> Preview video
                </button>
                <button onClick={onDraftProposal} className="inline-flex items-center gap-1 rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-medium text-brand-300 hover:bg-brand-500/20">
                  <FileSignature size={10} /> Draft proposal
                </button>
                <button onClick={onCopyPitch} className="inline-flex items-center gap-1 rounded-full border border-ink-700 bg-ink-800/60 px-2.5 py-0.5 text-[10px] font-medium text-ink-300 hover:text-white">
                  <Copy size={10} /> Pitch link
                </button>
                <button onClick={onCopyEmail} className="inline-flex items-center gap-1 rounded-full border border-ink-700 bg-ink-800/60 px-2.5 py-0.5 text-[10px] font-medium text-ink-300 hover:text-white">
                  <Mail size={10} /> Email
                </button>
              </>
            )}

            {p.status === "failed" && (
              <button onClick={onRetry} className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 text-[10px] font-medium text-amber-400 hover:bg-amber-500/10">
                <RefreshCw size={10} /> Retry
              </button>
            )}

                        <button onClick={onEdit} className="inline-flex items-center gap-1 rounded-full border border-ink-800 bg-ink-900/60 px-2.5 py-0.5 text-[10px] font-medium text-ink-300 hover:text-white">
              <Pencil size={10} /> Edit Stats
            </button>
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

function PreviewModal({
  p,
  onClose,
  onDraftProposal,
  onCopyEmail,
}: {
  p: Prospect;
  onClose: () => void;
  onDraftProposal: () => void;
  onEdit: () => void;
  onCopyEmail: () => void;
}) {
  const url = absPitch(p);
  const roi = p.roi_projection;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4" onClick={onClose}>
      <div className="grid w-full max-w-3xl gap-6 rounded-2xl border border-ink-800/60 bg-ink-900 p-6 md:grid-cols-[minmax(0,280px)_1fr]" onClick={(e) => e.stopPropagation()}>
        <div>
          <PitchPlayer p={p} contactEmail={LEADGEN.email} />
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-sora text-lg font-bold text-white">{p.business_name}</h3>
              <p className="text-xs text-ink-400">
                {p.city} · Brand grade {p.audit_report?.grade ?? "—"} ({p.audit_report?.health_score ?? "—"}/100)
              </p>
            </div>
            <button onClick={onClose} className="text-ink-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Rating" value={`${p.google_rating ?? "—"}`} />
            <MiniStat label="Reviews" value={fmtNumber(p.review_count)} />
            <MiniStat label="Deficit" value={`-${fmtNumber((p.competitor_reviews ?? 0) - (p.review_count ?? 0))}`} />
          </div>

          {p.audit_report && p.audit_report.pain_points.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-rose-300">Flaws in the video</p>
              <ul className="mt-1 space-y-1 text-[11px] text-ink-300">
                {p.audit_report.pain_points.slice(0, 3).map((f, i) => (
                  <li key={i}>• {f.replace(/\s*\([^)]*service #\d+[^)]*\)/gi, "")}</li>
                ))}
              </ul>
            </div>
          )}

          {roi && (
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-glow-500/20 bg-glow-500/5 p-3 text-center">
              <MiniStat label="Leaking / mo" value={money(roi.lost_monthly)} />
              <MiniStat label="Projected / mo" value={money(roi.projected_monthly)} />
              <MiniStat label="Extra leads" value={`+${roi.leads_per_month}`} />
              <MiniStat label="ROAS" value={`${roi.roas}x`} />
            </div>
          )}

          <div className="mt-4">
            <p className="text-xs font-medium text-ink-400">Pitch link</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-ink-950 px-2 py-1.5 text-xs text-brand-400">{url}</code>
              <button onClick={() => navigator.clipboard?.writeText(url)} className="rounded-lg border border-ink-700 bg-ink-800 px-2.5 py-1.5 text-xs text-ink-200 hover:text-white">
                <Copy size={13} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              onClick={onDraftProposal}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-500"
            >
              <FileSignature size={13} /> Draft proposal with this video
            </button>
            <a
              href={`mailto:${p.email ?? ""}?subject=${encodeURIComponent(emailSubject(p))}&body=${encodeURIComponent(emailPlain(p))}`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-ink-700 bg-ink-800/80 px-3 py-2 text-xs font-medium text-ink-200 transition hover:text-white"
            >
              <Mail size={13} /> Open in email client
            </a>
            <button
              onClick={onCopyEmail}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-ink-700 bg-ink-800/80 px-3 py-2 text-xs font-medium text-ink-200 transition hover:text-white sm:col-span-2"
            >
              <Copy size={13} /> Copy HTML email (with video card)
            </button>
          </div>
        </div>
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

function EditModal({
  p,
  onClose,
  onSaved,
}: {
  p: Prospect;
  onClose: () => void;
  onSaved: (updated: Prospect) => void;
}) {
  const [form, setForm] = useState({
    business_name: p.business_name || "",
    city: p.city || "",
    website: p.website || "",
    email: p.email || "",
    google_rating: p.google_rating != null ? String(p.google_rating) : "4.8",
    review_count: p.review_count != null ? String(p.review_count) : "130",
    unanswered_reviews: p.unanswered_reviews != null ? String(p.unanswered_reviews) : "0",
    competitor_name: p.competitor_name || "",
    competitor_reviews: p.competitor_reviews != null ? String(p.competitor_reviews) : "50",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/prospects/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          google_rating: Number(form.google_rating) || 5.0,
          review_count: Number(form.review_count) || 0,
          unanswered_reviews: Number(form.unanswered_reviews) || 0,
          competitor_reviews: Number(form.competitor_reviews) || 0,
          regenerate: true,
        }),
      });
      const json = await res.json();
      if (res.ok && json.prospect) {
        onSaved(json.prospect);
      } else {
        alert(json.error || "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-ink-800 bg-ink-900 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-sora text-lg font-bold text-white">Edit Business &amp; Reputation Stats</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-400">
          Override inaccurate scrape data (e.g., your real 130 5-star reviews and competitor). Saving will instantly re-run the brand audit, ROI projection, and pitch video.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] text-ink-400">Business Name</label>
            <Input value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} placeholder="Business Name" />
          </div>
          <div>
            <label className="text-[11px] text-ink-400">City</label>
            <Input value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="City" />
          </div>
          <div>
            <label className="text-[11px] text-ink-400">Google Rating (e.g. 5.0)</label>
            <Input value={form.google_rating} onChange={(v) => setForm({ ...form, google_rating: v })} placeholder="5.0" />
          </div>
          <div>
            <label className="text-[11px] text-ink-400">Review Count (e.g. 130)</label>
            <Input value={form.review_count} onChange={(v) => setForm({ ...form, review_count: v })} placeholder="130" />
          </div>
          <div>
            <label className="text-[11px] text-ink-400">Unanswered Reviews</label>
            <Input value={form.unanswered_reviews} onChange={(v) => setForm({ ...form, unanswered_reviews: v })} placeholder="0" />
          </div>
          <div>
            <label className="text-[11px] text-ink-400">Competitor Name</label>
            <Input value={form.competitor_name} onChange={(v) => setForm({ ...form, competitor_name: v })} placeholder="Top Competitor" />
          </div>
          <div>
            <label className="text-[11px] text-ink-400">Competitor Reviews</label>
            <Input value={form.competitor_reviews} onChange={(v) => setForm({ ...form, competitor_reviews: v })} placeholder="45" />
          </div>
          <div>
            <label className="text-[11px] text-ink-400">Website</label>
            <Input value={form.website} onChange={(v) => setForm({ ...form, website: v })} placeholder="https://..." />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-ink-800 px-4 py-2 text-xs font-medium text-ink-300 hover:text-white">
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save &amp; Regenerate Audit &amp; Video
          </button>
        </div>
      </div>
    </div>
  );
}

interface DiscoveredLead {
  business_name: string;
  city: string;
  website: string;
  email: string;
  phone: string;
  google_rating: number;
  review_count: number;
  competitor_name: string;
  competitor_reviews: number;
}

function DiscoveryModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [keyword, setKeyword] = useState("Roofing Contractor");
  const [city, setCity] = useState("Port St. Lucie, FL");
  const [count, setCount] = useState("30");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DiscoveredLead[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  const search = async () => {
    if (!keyword.trim() || !city.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/prospects/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), city: city.trim(), count: Number(count) || 30 }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.businesses)) {
        setResults(json.businesses);
        setSelected(new Set(json.businesses.map((_: DiscoveredLead, i: number) => i)));
      } else {
        alert(json.error || "Search failed");
      }
    } finally {
      setSearching(false);
    }
  };

  const toggleAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((_, i) => i)));
    }
  };

  const toggleOne = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const importSelected = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    try {
      const rows = Array.from(selected).map((i) => results[i]).filter(Boolean);
      const res = await fetch("/api/prospects/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospects: rows }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.prospects)) {
        const ids = (json.prospects as Prospect[]).map((p) => p.id);
        // Kick off audit & video generation for all imported leads
        await fetch("/api/prospects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate", ids }),
        });
        onImported();
      } else {
        alert(json.error || "Import failed");
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-ink-800 bg-ink-900 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-800 pb-4">
          <div>
            <h3 className="font-sora text-lg font-bold text-white">🔍 Keyword Lead Discovery</h3>
            <p className="text-xs text-ink-400">Search for local businesses by keyword and city, pick up to 50, and start audits &amp; pitches instantly.</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1.5fr_1.5fr_120px_auto]">
          <div>
            <label className="text-[11px] text-ink-400">Keyword / Industry</label>
            <Input value={keyword} onChange={setKeyword} placeholder="e.g. Plumber, Roofing, Dentist" />
          </div>
          <div>
            <label className="text-[11px] text-ink-400">City / Location</label>
            <Input value={city} onChange={setCity} placeholder="e.g. Miami, FL" />
          </div>
          <div>
            <label className="text-[11px] text-ink-400">Max Count</label>
            <Input value={count} onChange={setCount} placeholder="30" />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => void search()}
              disabled={searching || !keyword.trim() || !city.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-500 disabled:opacity-50 sm:w-auto"
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Compass size={14} />}
              Search Businesses
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-[260px] flex-1 overflow-y-auto rounded-xl border border-ink-800/60 bg-ink-950/40 p-3">
          {searching ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-brand-400" />
              <p className="mt-3 text-xs text-ink-400">Discovering real local businesses for {keyword} in {city}…</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-20 text-center text-xs text-ink-500">
              Enter a keyword and city above and click &ldquo;Search Businesses&rdquo; to discover leads.
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between border-b border-ink-800 pb-2 text-xs text-ink-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selected.size === results.length} onChange={toggleAll} className="accent-brand-600" />
                  <span>Select All ({selected.size} of {results.length} selected)</span>
                </label>
                <span>Ready to import</span>
              </div>
              <div className="space-y-2">
                {results.map((b, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleOne(idx)}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition ${
                      selected.has(idx) ? "border-brand-500/40 bg-brand-500/10" : "border-ink-800/60 bg-ink-900/40 hover:border-ink-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input type="checkbox" checked={selected.has(idx)} onChange={() => toggleOne(idx)} className="accent-brand-600" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{b.business_name}</p>
                        <p className="truncate text-xs text-ink-400">{b.city} · {b.website || "No website"} · {b.phone || "No phone"}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <span className="font-bold text-amber-400">★ {b.google_rating}</span>
                      <span className="text-ink-400"> ({b.review_count} rev)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-ink-800 pt-4">
          <p className="text-xs text-ink-400">
            {selected.size} businesses selected (up to 50 at a time).
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-ink-800 px-4 py-2 text-xs font-medium text-ink-300 hover:text-white">
              Cancel
            </button>
            <button
              onClick={() => void importSelected()}
              disabled={importing || selected.size === 0}
              className="flex items-center gap-2 rounded-lg bg-glow-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-glow-500 disabled:opacity-50"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
              Import &amp; Start Audits &amp; Pitches ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
