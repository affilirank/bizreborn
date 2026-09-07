import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { getProspectBySlug } from "@/lib/prospects";
import { SITE, LEADGEN } from "@/lib/config";
import { fmtNumber } from "@/lib/utils";
import { PitchPlayer } from "@/components/pitch/pitch-player";

export const dynamic = "force-dynamic";

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString("en-US")}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProspectBySlug(slug);
  if (!p) return { title: "Not Found" };
  return {
    title: `Custom Growth Audit for ${p.business_name} by ${SITE.name}`,
    description: `See how ${p.business_name}'s brand and Google visibility compare to the local market leader — and the projected return of fixing it.`,
  };
}

export default async function PitchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProspectBySlug(slug);
  if (!p) notFound();

  const difference = (p.competitor_reviews ?? 0) - (p.review_count ?? 0);
  const audit = p.audit_report;
  const roi = p.roi_projection;
  const mailto = `mailto:${LEADGEN.email}?subject=${encodeURIComponent(
    `Growth Strategy for ${p.business_name}`,
  )}`;

  return (
    <div className="min-h-screen bg-ink-950 text-mist">
      <header className="border-b border-ink-800/60 bg-gradient-to-b from-brand-950/40 to-ink-950">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/5 px-3 py-1 text-xs font-medium text-brand-400">
            Biz Reborn Marketing · Custom Growth Audit
          </div>
          <h1 className="mt-4 font-sora text-3xl font-bold text-white sm:text-4xl">
            {p.business_name}
            {p.city ? `, ${p.city}` : ""}
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            We audited your website, socials and Google reputation side-by-side with the local leader.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Video */}
        <section className="mx-auto max-w-sm">
          {p.status === "ready" ? (
            <PitchPlayer p={p} contactEmail={LEADGEN.email} />
          ) : (
            <div className="flex aspect-[9/16] w-full items-center justify-center rounded-2xl border border-ink-800 bg-ink-900/50 text-ink-500">
              Pitch video is being generated…
            </div>
          )}
        </section>

        {/* Score + quick breakdown */}
        <section className="mt-8">
          <h2 className="font-sora text-xl font-bold text-white">Quick Audit Breakdown</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {audit && (
              <AuditCard
                label="Brand Grade"
                value={audit.grade}
                note={`${audit.health_score}/100 health score`}
                alert={audit.grade === "C" || audit.grade === "D"}
              />
            )}
            <AuditCard label="Rating" value={`${p.google_rating ?? "—"} / 5.0`} note="on Google Business Profile" />
            <AuditCard
              label="Review Deficit"
              value={`-${fmtNumber(difference)}`}
              note={p.competitor_name ? `vs ${p.competitor_name}` : "vs market leader"}
              alert={difference > 0}
            />
            <AuditCard
              label="Unanswered"
              value={fmtNumber(p.unanswered_reviews)}
              note={`${fmtNumber(p.review_count)} reviews total`}
              alert={(p.unanswered_reviews ?? 0) > 0}
            />
          </div>
        </section>

        {/* Flaws */}
        {audit && audit.pain_points.length > 0 && (
          <section className="mt-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
            <h2 className="flex items-center gap-2 font-sora text-lg font-bold text-white">
              <AlertTriangle size={18} className="text-rose-400" /> What&apos;s holding you back
            </h2>
            <ul className="mt-4 space-y-3">
              {audit.pain_points.map((f, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-300">
                    {i + 1}
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            {audit.breakdowns.length > 0 && (
              <div className="mt-5 grid gap-2 sm:grid-cols-4">
                {audit.breakdowns.map((b) => (
                  <div key={b.key} className="rounded-xl border border-ink-800/60 bg-ink-950/40 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-ink-400">{b.label}</p>
                    <p className={`mt-1 font-sora text-xl font-bold ${b.score < 50 ? "text-rose-400" : "text-white"}`}>
                      {b.score}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Competitor comparison */}
        <section className="mt-8 rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
          <h2 className="font-sora text-lg font-bold text-white">Your Local Standing</h2>
          <div className="mt-4 space-y-4">
            <ComparisonRow
              label={p.business_name}
              reviews={p.review_count ?? 0}
              pct={percent(p.review_count ?? 0, p.competitor_reviews ?? 0)}
              color="#6366F1"
              highlight
            />
            {p.competitor_name && (
              <ComparisonRow label={p.competitor_name} reviews={p.competitor_reviews ?? 0} pct={100} color="#F87171" />
            )}
          </div>
          {roi && (
            <p className="mt-4 text-sm text-ink-300">
              That gap is leaking roughly{" "}
              <span className="font-bold text-rose-300">{money(roi.lost_monthly)} / month</span> to the
              market leader.
            </p>
          )}
        </section>

        {/* ROI */}
        {roi && (
          <section className="mt-8 rounded-2xl border border-glow-500/25 bg-glow-500/5 p-6">
            <h2 className="flex items-center gap-2 font-sora text-lg font-bold text-white">
              <TrendingUp size={18} className="text-glow-400" /> Projected return if we fix it
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Extra leads / mo" value={`+${fmtNumber(roi.leads_per_month)}`} />
              <Kpi label="New revenue / mo" value={money(roi.projected_monthly)} accent />
              <Kpi label="Return on spend" value={`${roi.roas}x`} />
              <Kpi label="Payback" value={roi.payback_months ? `${roi.payback_months} mo` : "Immediate"} />
            </div>
            {audit && audit.fixes.length > 0 && (
              <ul className="mt-5 space-y-2">
                {audit.fixes.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-200">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-glow-400" />
                    {f.replace(/\s*\([^)]*service #\d+[^)]*\)/gi, "")}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[11px] text-ink-500">
              Estimate: projected leads × avg. customer value ({money(roi.acv)}) × 35% close rate. Your numbers
              will vary — we&apos;ll calibrate them on the call.
            </p>
          </section>
        )}

        {/* CTA */}
        <section className="mt-8">
          <a
            href={mailto}
            className="block w-full rounded-2xl bg-gradient-to-r from-brand-600 to-glow-600 p-6 text-center transition hover:opacity-95"
          >
            <p className="font-sora text-xl font-bold text-white sm:text-2xl">Schedule Your 10-Min Strategy Call</p>
            <p className="mt-1 text-sm text-white/80">
              {LEADGEN.email} · www.bizreborn.com
            </p>
          </a>
          <p className="mt-3 text-center text-xs text-ink-500">
            Free, no pressure. We&apos;ll map how to claim your Google Top 3 spot.
          </p>
        </section>
      </main>
    </div>
  );
}

function percent(a: number, b: number): number {
  if (b <= 0) return a > 0 ? 100 : 0;
  return Math.max(1, Math.min(100, Math.round((a / b) * 100)));
}

function AuditCard({
  label,
  value,
  note,
  alert: isAlert,
}: {
  label: string;
  value: string;
  note: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 ${isAlert ? "border-rose-500/20 bg-rose-500/5" : "border-ink-800/60 bg-ink-900/50"}`}>
      <p className="text-xs uppercase tracking-wider text-ink-400">{label}</p>
      <p className={`mt-2 font-sora text-2xl font-bold ${isAlert ? "text-rose-400" : "text-white"}`}>{value}</p>
      <p className="mt-1 text-[11px] text-ink-500">{note}</p>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-glow-400/40 bg-glow-500/10" : "border-ink-800/60 bg-ink-950/40"}`}>
      <p className={`font-sora text-2xl font-bold ${accent ? "text-glow-300" : "text-white"}`}>{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-ink-400">{label}</p>
    </div>
  );
}

function ComparisonRow({
  label,
  reviews,
  pct,
  color,
  highlight,
}: {
  label: string;
  reviews: number;
  pct: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${highlight ? "text-white" : "text-ink-300"}`}>{label}</span>
        <span className="text-ink-400">{fmtNumber(reviews)}</span>
      </div>
      <div className="mt-1.5 h-6 overflow-hidden rounded-lg bg-ink-950/60">
        <div className="h-full rounded-lg transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
