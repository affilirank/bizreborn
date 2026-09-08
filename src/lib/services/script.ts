import { LEADGEN } from "@/lib/config";
import type { ProspectAudit, RoiProjection } from "@/lib/supabase-types";
import { callAi } from "@/lib/ai-router";

export interface ScriptInput {
  missing_gbp_apple?: boolean | null;
  business_name: string;
  city?: string | null;
  google_rating?: number | null;
  review_count?: number | null;
  unanswered_reviews?: number | null;
  competitor_name?: string | null;
  competitor_reviews?: number | null;
  audit?: ProspectAudit | null;
  roi?: RoiProjection | null;
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function topFlaws(input: ScriptInput, n = 3): string[] {
  return (input.audit?.pain_points ?? []).slice(0, n);
}

function buildPrompt(input: ScriptInput): string {
  const target = `${input.business_name}${input.city ? `, ${input.city}` : ""}`;
  const flaws = topFlaws(input, 3);
  const missingGbp = input.missing_gbp_apple;
  const roi = input.roi;
  return (
    "Write a comprehensive 60-second high-urgency video pitch script (130-150 words) from Biz Reborn Marketing to " +
    `${target}. Facts: Google rating ${input.google_rating ?? "4.0"} with ` +
    `${input.review_count ?? 0} reviews (${input.unanswered_reviews ?? 0} unanswered) while ` +
    `${input.competitor_name ?? "a local competitor"} has ${input.competitor_reviews ?? 0}. ` +
    `Brand audit grade: ${input.audit?.grade ?? "C"} (${input.audit?.health_score ?? 50}/100). ${missingGbp ? "CRITICAL FATAL FLAW: Completely missing verified Google Business Profile (GBP) and Apple Maps presence. " : ""} ` +
    (flaws.length ? `Specific flaws: ${flaws.join(" | ")}. ` : "") +
    (roi
      ? `Projected return: ${roi.leads_per_month} extra leads and ${money(roi.projected_monthly)} in new monthly revenue; leaking roughly ${money(roi.lost_monthly)}/month to the market leader. `
      : "") +
    "Forcefully emphasize high-ticket AI automation services: Instant Missed-Call Text-Back Automation (service #41), 24/7 AI Voice Booking Agent & Conversational Webchat (service #42), and Automated Post-Service SMS Review Campaigns (service #31 / #35). " +
    `Structure: hook naming the business, reputation gap, after-hours missed call leak solved by service #41 & #42, review velocity solved by service #31 / #35, projected ROI, then direct them to email ${LEADGEN.email}. ` +
    "Write only the spoken script — no preamble, no headings, no stage directions."
  );
}

export async function generatePitchScript(input: ScriptInput): Promise<string> {
  const text = await callAi({
    prompt: buildPrompt(input),
    systemPrompt: "You are an expert short-form video copywriter for local marketing agency Biz Reborn Marketing.",
  });
  if (text) return text;
  return fallbackScript(input);
}

function shorten(s: string, max = 120): string {
  const clean = s.replace(/\s*\([^)]*service #\d+[^)]*\)/gi, "").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).replace(/[,;:\s]+\S*$/, "")}…` : clean;
}

export function fallbackScript(input: ScriptInput): string {
  const rating = input.google_rating ?? 4.0;
  const reviews = input.review_count ?? 0;
  const unanswered = input.unanswered_reviews ?? Math.max(1, Math.round(reviews * 0.7));
  const competitor = input.competitor_name ?? "your top local competitor";
  const compReviews = input.competitor_reviews ?? 0;
  const grade = input.audit?.grade ?? "C";
  const flaws = topFlaws(input, 2).map((f) => shorten(f));
  const roi = input.roi;

  const parts = [
    `Hi ${input.business_name}, this is Biz Reborn Marketing — we just completed a comprehensive 60-second growth audit on your brand, and it came back a ${grade}.`,
    `${input.missing_gbp_apple ? "Your business has no verified Google Business Profile or Apple Maps listing, making you completely invisible to local searchers." : `Your Google listing holds ${rating} stars`} with ${reviews} reviews (${unanswered} unanswered), while ${competitor} has ${compReviews} reviews and is capturing the local calls that should be yours.`,
    `Worse yet, every after-hours call going to voicemail is a lost high-ticket client.`,
    `That leak is costing you roughly ${roi ? money(roi.lost_monthly) : "$3,500"} a month.`,
    `With our Instant Missed-Call Text-Back Automation (service #41) and 24/7 AI Voice Booking Agent (service #42), you will never miss another lead, day or night.`,
    `Combined with our Automated Post-Service SMS Review Campaigns (service #31 / #35), we project about ${roi?.leads_per_month ?? 25} extra booked leads and ${roi ? money(roi.projected_monthly) : "$12,500"} in new monthly revenue.`,
    `Email ${LEADGEN.email} today to claim your Top 3 map-pack dominance.`,
  ];
  return parts.join(" ");
}
