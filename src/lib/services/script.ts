import { config, hasGemini } from "@/lib/integrations/config";
import { LEADGEN } from "@/lib/config";
import type { ProspectAudit, RoiProjection } from "@/lib/supabase-types";

export interface ScriptInput {
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

function topFlaws(input: ScriptInput, n = 2): string[] {
  return (input.audit?.pain_points ?? []).slice(0, n);
}

function buildPrompt(input: ScriptInput): string {
  const target = `${input.business_name}${input.city ? `, ${input.city}` : ""}`;
  const flaws = topFlaws(input, 3);
  const roi = input.roi;
  return (
    "Write a 45-second high-urgency video pitch script from Biz Reborn Marketing to " +
    `${target}. Facts: Google rating ${input.google_rating ?? "4.0"} with ` +
    `${input.review_count ?? 0} reviews (${input.unanswered_reviews ?? 0} unanswered) while ` +
    `${input.competitor_name ?? "a local competitor"} has ${input.competitor_reviews ?? 0}. ` +
    `Brand audit grade: ${input.audit?.grade ?? "C"} (${input.audit?.health_score ?? 50}/100). ` +
    (flaws.length ? `Specific flaws we found: ${flaws.join(" | ")}. ` : "") +
    (roi
      ? `If they fix this with our recommended services, project about ${roi.leads_per_month} extra leads ` +
        `and ${money(roi.projected_monthly)} in new monthly revenue; they are currently leaking roughly ` +
        `${money(roi.lost_monthly)} a month to the market leader. `
      : "") +
    "Structure: hook naming the business, the 2 biggest flaws in plain language, what it costs them, " +
    `the projected return, then direct them to email ${LEADGEN.email}. Under 110 words. ` +
    "Write only the spoken script — no preamble, no headings, no stage directions."
  );
}

/**
 * Free Google Gemini 1.5 Flash text synthesis for the pitch script.
 * Falls back to a deterministic template when GEMINI_API_KEY is absent.
 */
export async function generatePitchScript(input: ScriptInput): Promise<string> {
  if (hasGemini()) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildPrompt(input) }] }],
          }),
        },
      );
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
      console.warn("[gemini] no text in response, using fallback");
    } catch (err) {
      console.warn("[gemini] request failed, using fallback:", err);
    }
  }
  return fallbackScript(input);
}

function shorten(s: string, max = 110): string {
  const clean = s.replace(/\s*\([^)]*service #\d+[^)]*\)/gi, "").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).replace(/[,;:\s]+\S*$/, "")}…` : clean;
}

export function fallbackScript(input: ScriptInput): string {
  const rating = input.google_rating ?? 4.0;
  const reviews = input.review_count ?? 0;
  const isDominating = (rating >= 4.9 && reviews >= 100) || (rating === 5.0 && reviews >= 40);

  if (isDominating) {
    return `Hi ${input.business_name}, this is Biz Reborn Marketing. You have achieved a rare local market monopoly with ${rating} stars and ${reviews} reviews. Your challenge is no longer beating local competitors, but multi-location expansion, 24/7 AI voice receptionists, and automated lead capture. Email ${LEADGEN.email} today to claim your scaling growth playbook.`;
  }

  const unanswered = input.unanswered_reviews ?? Math.max(1, Math.round(reviews * 0.7));
  const competitor = input.competitor_name ?? "your top local competitor";
  const compReviews = input.competitor_reviews ?? 0;
  const grade = input.audit?.grade ?? "C";
  const flaws = topFlaws(input, 2).map((f) => shorten(f));
  const roi = input.roi;

  const parts = [
    `Hi ${input.business_name}, this is Biz Reborn Marketing — we just ran a full audit on your brand and it came back a ${grade}.`,
    `Your Google listing holds ${rating} stars with ${reviews} reviews, ${unanswered} of them unanswered, while ${competitor} already has ${compReviews} and is taking the calls that should be yours.`,
  ];
  if (flaws.length) {
    parts.push(`Two things are holding you back: ${flaws.join(" And ")}`);
  }
  if (roi) {
    parts.push(
      `That gap is costing you roughly ${money(roi.lost_monthly)} a month. Fix it with our plan and we project about ${roi.leads_per_month} extra leads and ${money(roi.projected_monthly)} in new monthly revenue.`,
    );
  } else {
    parts.push("Our automated review-boost system turns that around fast and locks in your Top 3 spot.");
  }
  parts.push(`Email ${LEADGEN.email} today — your competitors aren't waiting.`);
  return parts.join(" ");
}
