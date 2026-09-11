import { SERVICE_MAP } from "@/data/services";
import type { BookingRow } from "@/lib/booking-store";
import type { Prospect } from "@/lib/supabase-types";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export interface CallScriptInput {
  booking: Pick<
    BookingRow,
    "name" | "business_name" | "call_type" | "phone" | "scheduled_at" | "timezone" | "notes"
  >;
  prospect?: Pick<
    Prospect,
    | "business_name"
    | "city"
    | "google_rating"
    | "review_count"
    | "unanswered_reviews"
    | "competitor_name"
    | "competitor_reviews"
    | "missing_gbp_apple"
    | "audit_report"
    | "roi_projection"
    | "recommended_services"
    | "website"
    | "phone"
  > | null;
}

export interface CallScriptSection {
  heading: string;
  lines: string[];
}

function formatCallTime(iso: string, tz?: string | null): string {
  try {
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: tz || "America/New_York",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    return new Intl.DateTimeFormat("en-US", opts).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

function priceFor(serviceId: number): string {
  const svc = SERVICE_MAP[serviceId];
  if (!svc) return "";
  const parts: string[] = [];
  if (svc.oneTime) parts.push(`${money(svc.oneTime)} one-time`);
  if (svc.monthly) parts.push(`${money(svc.monthly)}/mo`);
  return parts.length ? parts.join(" + ") : "";
}

function recommendationLines(ids: number[] | null | undefined): string[] {
  const list = (ids ?? [])
    .map((id) => SERVICE_MAP[id])
    .filter((s) => Boolean(s));
  if (list.length === 0) {
    // Default high-ticket stack when the audit didn't pin specific services.
    return [
      "#41 — Instant Missed-Call Text-Back Automation ($450 one-time + $195/mo)",
      "#42 — 24/7 AI Voice Booking Agent & Conversational Webchat ($1,250 one-time + $350/mo)",
      "#31 / #35 — Automated Post-Service SMS Review Campaigns ($495 one-time + $195/mo)",
      "#1 — Google Business Profile Optimization & Audit ($795 + $150/mo)",
    ];
  }
  return list.map((s, i) => {
    const price = priceFor(s.id);
    return `${i + 1}. ${s.title}${price ? ` (${price})` : ""} — ${s.blurb}`;
  });
}

/**
 * Builds a read-along strategy-call script for the operator: prospect business
 * snapshot from the audit, the recommended service stack with pricing, and a
 * closing pitch to book a Microsoft Teams live-demo follow-up (screen share).
 * Deterministic — render instantly without any AI call.
 */
export function buildStrategyCallScript(input: CallScriptInput): CallScriptSection[] {
  const { booking, prospect } = input;
  const b = booking;
  const p = prospect ?? null;

  const business = p?.business_name || b.business_name || "your business";
  const rating = p?.google_rating;
  const reviews = p?.review_count ?? 0;
  const unanswered = p?.unanswered_reviews ?? Math.max(1, Math.round(reviews * 0.7));
  const competitor = p?.competitor_name || "your top local competitor";
  const compReviews = p?.competitor_reviews ?? 0;
  const grade = p?.audit_report?.grade ?? "C";
  const score = p?.audit_report?.health_score ?? 50;
  const flaws = p?.audit_report?.pain_points ?? [];
  const roi = p?.roi_projection;
  const callAt = formatCallTime(b.scheduled_at, b.timezone);

  const sections: CallScriptSection[] = [];

  sections.push({
    heading: `OPEN · ${b.call_type} with ${b.name}`,
    lines: [
      `[Call ${b.name}${b.phone ? ` at ${b.phone}` : ""} — booked for ${callAt}${b.timezone ? `, ${b.timezone}` : ""}.]`,
      `Hi ${b.name}, thanks for making time for this call. This is Daniel Brown with Biz Reborn Marketing. I wanted to walk you through ${business} growth picture and show you exactly what we would do to fix it.`,
      b.notes ? `[Their notes: ${b.notes}]` : "",
    ].filter(Boolean),
  });

  sections.push({
    heading: `1 · THE SNAPSHOT — ${business}${p?.city ? `, ${p.city}` : ""}`,
    lines: [
      `Our audit graded ${business} a ${grade} overall (${score}/100) for local visibility.`,
      p?.missing_gbp_apple
        ? `Critical finding: you have no verified Google Business Profile or Apple Maps listing — you are essentially invisible to local search right now.`
        : `Your Google listing sits at ${rating ?? "4.0"} stars with ${reviews} reviews (${unanswered} unanswered).`,
      `${competitor} is sitting on ${compReviews} reviews and pulling the local buyers your rankings should be capturing.`,
      roi
        ? `We project roughly ${roi.leads_per_month} extra booked leads and ${money(roi.projected_monthly)} in new monthly revenue for you — while you're currently leaking about ${money(roi.lost_monthly)}/month to the market leader.`
        : `That gap is costing you real money every single week.`,
    ],
  });

  if (flaws.length > 0) {
    sections.push({
      heading: "2 · WHAT'S HURTING (top findings)",
      lines: flaws.slice(0, 4).map((f, i) => `${i + 1}. ${f}`),
    });
  }

  sections.push({
    heading: "3 · WHAT WE RECOMMEND (services for your growth plan)",
    lines: [
      "Here's the exact stack I'd put to work for you — built from your audit:",
      ...recommendationLines(p?.recommended_services ?? null),
      "All of it is recurring revenue for your business: more calls answered, more leads booked, more reviews earned on autopilot.",
    ],
  });

  sections.push({
    heading: "4 · SUGGESTION — MICROSOFT TEAMS LIVE DEMO (follow-up appointment)",
    lines: [
      "Before we wrap up — I want to actually show you this running, not just talk about it.",
      `Let's set up a quick 30-45 minute Microsoft Teams call (screen share) — I'll pull up ${business} live: your Google listing, the review flow, the AI voice agent taking a test booking, and the missed-call text-back landing in real time.`,
      "That way you see exactly what you're buying before you decide anything.",
      "[Action: name two concrete slots from your calendar — e.g. tomorrow 10 AM ET or Thursday 2 PM ET — and tell them you'll lock one in right now.] If you have a time that works better, say the word and I'll add it to our calendar.",
      "Does the Teams demo work for you at one of those times?",
    ],
  });

  return sections;
}

/** Joins the sections into a continuous, copy-pasteable plain text script. */
export function strategyCallScriptText(input: CallScriptInput): string {
  return buildStrategyCallScript(input)
    .map((s) => `${s.heading}\n${s.lines.map((l) => `  ${l}`).join("\n")}`)
    .join("\n\n");
}