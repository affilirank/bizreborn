import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProspectBySlug } from "@/lib/prospects";
import { SITE, LEADGEN } from "@/lib/config";
import { fmtNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
    description: `See how ${p.business_name}'s Google visibility compares to the local market leader — and how to claim your Top 3 spot.`,
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
  const mailto = `mailto:${LEADGEN.email}?subject=${encodeURIComponent(
    `Growth Strategy for ${p.business_name}`,
  )}`;

  return (
    <div className="min-h-screen bg-ink-950 text-mist">
      {/* Hero header */}
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
            We pulled your Google reputation side-by-side with the local leader.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Video player */}
        <section>
          {p.video_url ? (
            <video
              src={p.video_url}
              poster={p.thumbnail_url || undefined}
              controls
              autoPlay
              muted
              loop
              className="aspect-[9/16] max-h-[70vh] w-full rounded-2xl border border-ink-800 bg-black object-contain"
            />
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl border border-ink-800 bg-ink-900/50 text-ink-500">
              {p.status === "ready" ? "Video unavailable" : "Pitch video is being generated…"}
            </div>
          )}
        </section>

        {/* Quick audit breakdown */}
        <section className="mt-8">
          <h2 className="font-sora text-xl font-bold text-white">
            Quick Audit Breakdown
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <AuditCard
              label="Rating"
              value={`${p.google_rating ?? "—"} / 5.0`}
              note="on Google Business Profile"
            />
            <AuditCard
              label="Review Deficit"
              value={`-${fmtNumber(difference)}`}
              note={
                p.competitor_name
                  ? `vs market leader (${p.competitor_name})`
                  : "vs market leader"
              }
              alert={difference > 0}
            />
            <AuditCard
              label="Status"
              value="Action Needed"
              note={`${fmtNumber(p.review_count)} reviews total`}
              alert
            />
          </div>
        </section>

        {/* Competitor comparison */}
        <section className="mt-8 rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
          <h2 className="font-sora text-lg font-bold text-white">
            Your Local Standing
          </h2>
          <div className="mt-4 space-y-4">
            <ComparisonRow
              label={p.business_name}
              reviews={p.review_count ?? 0}
              pct={percent(p.review_count ?? 0, p.competitor_reviews ?? 0)}
              color="#6366F1"
              highlight
            />
            {p.competitor_name && (
              <ComparisonRow
                label={p.competitor_name}
                reviews={p.competitor_reviews ?? 0}
                pct={100}
                color="#F87171"
              />
            )}
          </div>
          <p className="mt-4 text-xs text-ink-500">
            Weak review velocity + unanswered reviews quietly drop you below the
            local map pack — where competitors win the calls.
          </p>
        </section>

        {/* CTA */}
        <section className="mt-8">
          <a
            href={mailto}
            className="block w-full rounded-2xl bg-gradient-to-r from-brand-600 to-glow-600 p-6 text-center transition hover:opacity-95"
          >
            <p className="font-sora text-xl font-bold text-white sm:text-2xl">
              Schedule Your 10-Min Strategy Call
            </p>
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
    <div
      className={`rounded-xl border p-5 ${
        isAlert
          ? "border-rose-500/20 bg-rose-500/5"
          : "border-ink-800/60 bg-ink-900/50"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-ink-400">{label}</p>
      <p
        className={`mt-2 font-sora text-2xl font-bold ${
          isAlert ? "text-rose-400" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-ink-500">{note}</p>
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
        <span
          className={`font-medium ${highlight ? "text-white" : "text-ink-300"}`}
        >
          {label}
        </span>
        <span className="text-ink-400">{fmtNumber(reviews)}</span>
      </div>
      <div className="mt-1.5 h-6 overflow-hidden rounded-lg bg-ink-950/60">
        <div
          className="h-full rounded-lg transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}