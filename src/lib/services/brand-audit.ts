import { runAudit } from "@/lib/audit";
import { callAi, parseAiJson } from "@/lib/ai-router";
import { ALL_SERVICES, SERVICE_MAP } from "@/data/services";
import type { AuditReport } from "@/lib/types";
import type {
  Prospect,
  ProspectAudit,
  RoiProjection,
} from "@/lib/supabase-types";
import { clamp } from "@/lib/utils";

/**
 * Brand audit + ROI projection for a prospect.
 *
 * Reuses the site's audit engine (website, Google Business Profile, Apple Maps, socials,
 * reputation) and calculates an Opportunity Qualifying Score (0-100) and Missing GBP/Apple detection.
 */

export interface BrandAuditResult {
  audit_report: ProspectAudit;
  roi_projection: RoiProjection;
  recommended_services: number[];
  qualifying_score: number;
  missing_gbp_apple: boolean;
  /** The complete live AI report (incl. comparedTo/keywordSearches) when the
   *  AI engine produced it — undefined when the sealed fallback engine ran. */
  full_report?: AuditReport;
}

const DEFAULT_ACV = 500;
const LEAD_INCREASE_PCT = 50;
const CLOSE_RATE = 0.35;
const FALLBACK_SERVICES = [41, 42, 31, 35, 1];

export function detectMissingGbpApple(p: {
  google_rating?: number | null;
  review_count?: number | null;
  google_maps_link?: string | null;
  missing_gbp_apple?: boolean | null;
}): boolean {
  if (p.missing_gbp_apple === true) return true;
  if (!p.google_maps_link || p.google_rating == null || p.review_count == null || p.review_count === 0) {
    return true;
  }
  return false;
}

export function calculateQualifyingScore(p: {
  google_rating?: number | null;
  review_count?: number | null;
  unanswered_reviews?: number | null;
  google_maps_link?: string | null;
  website?: string | null;
  missing_gbp_apple?: boolean | null;
}): { score: number; missingGbpApple: boolean } {
  const missingGbpApple = detectMissingGbpApple(p);
  let score = 0;

  // 1. Missing Google Business Profile or Apple Maps presence (fatal flaw / highest agency opportunity)
  if (missingGbpApple) {
    score += 45;
  }

  // 2. Rating factor (lower rating = easier reputation win)
  const rating = p.google_rating ?? 4.0;
  if (rating < 3.5) {
    score += 25;
  } else if (rating < 4.2) {
    score += 15;
  } else if (rating < 4.7) {
    score += 8;
  }

  // 3. Unanswered reviews
  const unanswered = p.unanswered_reviews ?? 0;
  if (unanswered > 10) {
    score += 20;
  } else if (unanswered > 0) {
    score += 10;
  }

  // 4. Missing website
  if (!p.website || !p.website.trim()) {
    score += 10;
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    missingGbpApple,
  };
}

function reviewBucket(count: number | null | undefined) {
  if (count == null) return undefined;
  if (count <= 5) return "none" as const;
  if (count <= 25) return "few" as const;
  if (count <= 80) return "some" as const;
  return "many" as const;
}

/**
 * LIVE AI brand audit. Instead of the seeded mockup calculation in runAudit(),
 * this asks the AI router (Gemini -> OpenAI fallback) to analyse the business's
 * REAL public data (website, Google rating/reviews, competitor, socials) and
 * return a genuinely-derived audit. Returns null on any failure so callers fall
 * back to the deterministic mock engine — the audit is never blocked.
 */
export async function liveBrandAudit(
  p: Pick<
    Prospect,
    "business_name" | "website" | "instagram" | "facebook" | "tiktok"
    | "google_rating" | "review_count" | "unanswered_reviews"
    | "competitor_name" | "competitor_reviews" | "city"
  >,
  missingGbp: boolean,
): Promise<AuditReport | null> {
  const rating = p.google_rating ?? 4.0;
  const reviews = p.review_count ?? 0;
  const unanswered = p.unanswered_reviews ?? 0;
  const target = `${p.business_name}${p.city ? `, ${p.city}` : ""}`;

  // Always benchmark against a named market leader — when no specific
  // competitor was verified, use the generic area-leader label and a
  // realistic estimated review count so the audit (and the pitch built from
  // it) always has a concrete competitive gap.
  const competitorName = p.competitor_name?.trim() || (p.city?.trim() ? `${p.city.trim()} Market Leader` : "Local Market Leader");
  const competitorReviews = p.competitor_reviews != null && p.competitor_reviews > reviews
    ? p.competitor_reviews
    : Math.max(reviews + 50, Math.round(reviews * 1.35));

  const catalog = JSON.stringify(
    ALL_SERVICES.map((s) => ({ id: s.id, title: s.title, pillar: s.pillar })),
  );

  const prompt = [
    `Business: ${target}`,
    `Website: ${p.website?.trim() || "no website on record"}`,
    `Google rating: ${rating}, reviews: ${reviews}, unanswered: ${unanswered}`,
    `Competitor: ${competitorName} (${competitorReviews} reviews)`,
    `Socials: IG=${p.instagram || "-"}, FB=${p.facebook || "-"}, TikTok=${p.tiktok || "-"}`,
    `Missing Google Business Profile / Apple Maps: ${missingGbp ? "YES (fatal)" : "no"}`,
    `Available Services Catalog (id, title): ${catalog}`,
    "",
    "You are a rigorous local SEO agency auditor. Assess this business's ACTUAL public footprint and return a JSON object with:",
    "- healthScore (number 10-95)",
    "- grade (string A, B, C, or D)",
    "- breakdowns (array of 4 objects: key in ['localSeo','socialVelocity','conversion','reputation'], label, score (10-95), description, issues (array of strings))",
    "- painPoints (array of 4-6 real, specific flaws for THIS business grounded in the data above)",
    "- fixes (array of 3-6 specific fixes, each referencing a real service id from the catalog, e.g. \"Instant Missed-Call Text-Back Automation (service #41)\")",
    "- comparedTo (array of 2 objects: label, count)",
    "- keywordSearches (array of 3 objects: term, volume, difficulty)",
    "Base every number on the provided real metrics. Do not inflate review counts or invent websites. Raw JSON only, no markdown fences.",
  ].join("\n");

  const text = await callAi({
    prompt,
    systemPrompt: "You are an expert agency auditor and local SEO specialist. Provide real, rigorous intelligence grounded in the supplied business data.",
    jsonMode: true,
    maxTokens: 4000,
    timeoutMs: 20000,
  });

  if (!text) return null;

  const parsed = parseAiJson<{
    healthScore?: number;
    grade?: string;
    breakdowns?: Array<{ label?: string; score?: number; description?: string; issues?: unknown[] }>;
    painPoints?: unknown[];
    fixes?: unknown[];
    comparedTo?: { label: string; count: number }[];
    keywordSearches?: { term: string; volume: number; difficulty: number }[];
  }>(text);
  if (!parsed || typeof parsed.healthScore !== "number") return null;

  // The model sometimes returns fixes/pain points as objects
  // ({ serviceId, title, description }) instead of plain strings — flatten them.
  const stringify = (v: unknown): string => {
    if (typeof v === "string") return v.trim();
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title : "";
      const desc = typeof o.description === "string" ? o.description : "";
      const serviceId = typeof o.serviceId === "string" || typeof o.serviceId === "number" ? String(o.serviceId) : "";
      const mapped = serviceId && SERVICE_MAP[Number(serviceId)] ? `${title} (service #${serviceId}).` : title || desc;
      return (mapped || desc).trim();
    }
    return "";
  };

  return {
    id: `AUD-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    url: p.website?.trim() || "",
    businessName: p.business_name,
    socials: { instagram: p.instagram ?? undefined, facebook: p.facebook ?? undefined, tiktok: p.tiktok ?? undefined },
    healthScore: Math.round(Math.min(95, Math.max(10, parsed.healthScore))),
    grade: ["A", "B", "C", "D"].includes(String(parsed.grade).trim().toUpperCase().charAt(0))
      ? String(parsed.grade).trim().toUpperCase().charAt(0)
      : "C",
    breakdowns: [
      "localSeo",
      "socialVelocity",
      "conversion",
      "reputation",
    ].map((key, i) => {
      const b = (parsed.breakdowns || [])[i] || {};
      return {
        key: key as AuditReport["breakdowns"][number]["key"],
        label: b.label || ["Local SEO Score", "Social Content Velocity", "Conversion Infrastructure", "Reputation Score"][i],
        score: Math.round(Math.min(95, Math.max(10, Number(b.score) || 40))),
        description: b.description || "",
        issues: Array.isArray(b.issues) ? b.issues.map(String) : [],
      };
    }),
    painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints.map(stringify).filter(Boolean) : [],
    fixes: Array.isArray(parsed.fixes) ? parsed.fixes.map(stringify).filter(Boolean) : [],
    comparedTo: Array.isArray(parsed.comparedTo) ? parsed.comparedTo : [
      { label: "Local avg. competitor", count: 24 },
      { label: "Top map-pack performer", count: 180 },
    ],
    keywordSearches: Array.isArray(parsed.keywordSearches) ? parsed.keywordSearches : [
      { term: `${p.business_name} near me`, volume: 1200, difficulty: 30 },
    ],
  };
}

export async function buildBrandAudit(
  p: Pick<
    Prospect,
    | "business_name"
    | "website"
    | "instagram"
    | "facebook"
    | "tiktok"
    | "google_rating"
    | "review_count"
    | "unanswered_reviews"
    | "competitor_name"
    | "competitor_reviews"
    | "google_maps_link"
    | "missing_gbp_apple"
    | "city"
  >,
): Promise<BrandAuditResult> {
  const { score: qualifying_score, missingGbpApple: missing_gbp_apple } = calculateQualifyingScore(p);
  const hasVerifiedStats = p.google_rating != null && p.review_count != null && !missing_gbp_apple;
  const rating = p.google_rating ?? 4.0;
  const reviews = p.review_count ?? 0;
  const isDominating = hasVerifiedStats && ((rating >= 4.9 && reviews >= 100) || (rating === 5.0 && reviews >= 40));

  let competitorReviews = p.competitor_reviews;
  if (!isDominating) {
    if (competitorReviews == null || competitorReviews <= reviews) {
      competitorReviews = Math.max(reviews + 50, Math.round(reviews * 1.35));
    }
  } else {
    competitorReviews = Math.max(competitorReviews ?? 0, reviews + 25);
  }

  const hasSocial = Boolean(p.instagram || p.facebook || p.tiktok);

  // LIVE AI brand audit first — grounded in the business's real public data.
  // Falls back to the deterministic sealed engine if the AI is unavailable,
  // so lead generation is never blocked.
  let report: AuditReport;
  const live = await liveBrandAudit(p, missing_gbp_apple);
  if (live) {
    report = live;
  } else {
    report = runAudit({
      url: p.website?.trim() || `${p.business_name.toLowerCase().replace(/\s+/g, "")}.com`,
      businessName: p.business_name,
      gbp: p.google_rating != null ? "google-business-profile" : undefined,
      instagram: p.instagram ?? undefined,
      facebook: p.facebook ?? undefined,
      tiktok: p.tiktok ?? undefined,
      reviews: reviewBucket(reviews),
      postingFreq: hasSocial ? "monthly" : "never",
      leadSource: "google",
    });
  }

  const painPoints = [...report.painPoints];
  const fixes = [...report.fixes];

  if (missing_gbp_apple) {
    painPoints.unshift("Fatal Flaw: No verified Google Business Profile (GBP) or Apple Maps presence found — your business is completely invisible on local map packs and mobile voice searches.");
    fixes.unshift("Google Business Profile & Apple Maps Setup, Verification & Local Optimization (service #1).");
  } else if (!hasVerifiedStats) {
    painPoints.unshift("Google Business Profile rating and review count unverified / not provided — claim and optimize your GBP listing to display real public metrics.");
    fixes.unshift("Google Business Profile Setup & Verification (service #1).");
  } else if (isDominating) {
    painPoints.unshift(
      `Local market monopoly achieved (${rating.toFixed(1)} stars, ${reviews} reviews) — primary growth bottleneck is no longer beating local competitors, but multi-location expansion and automated 24/7 AI lead capture.`,
    );
    fixes.unshift("24/7 AI Conversational Webchat Widget & AI Voice Booking Agent (service #42) + Multi-Location Franchise SEO Architecture (service #10).");
  } else {
    const unanswered = p.unanswered_reviews ?? 0;
    if (unanswered > 0) {
      painPoints.unshift(
        `${unanswered} Google review${unanswered === 1 ? "" : "s"} left unanswered — Google reads silence as neglect and ranks you lower for it.`,
      );
      fixes.unshift("Review Response Automation (service #35) answers every review within hours.");
    }
  }

  if (!p.website?.trim()) {
    painPoints.push("No website on record — every search that cannot find a site becomes a competitor's call.");
    fixes.push("Conversion-focused landing site with tap-to-call (service #23).");
  }

  // Forcefully inject high-ticket revenue-leak and AI automation services in every audit
  if (!fixes.some(f => f.includes("#41"))) {
    fixes.push("Instant Missed-Call Text-Back Automation (service #41) to stop after-hours lead leaks.");
  }
  if (!fixes.some(f => f.includes("#42"))) {
    fixes.push("24/7 AI Voice Booking Agent & Conversational Webchat (service #42) to answer every call instantly.");
  }
  if (!fixes.some(f => f.includes("#31") || f.includes("#35"))) {
    fixes.push("Automated Post-Service SMS Review Campaigns & Auto Reputation Management (service #31 / #35).");
  }

  const recommended_services = uniqueServiceIds(fixes);

  const audit_report: ProspectAudit = {
    health_score: report.healthScore,
    grade: report.grade,
    breakdowns: report.breakdowns.map((b) => ({
      key: b.key,
      label: b.label,
      score: b.score,
      issues: b.issues,
    })),
    pain_points: painPoints.slice(0, 6),
    fixes: fixes.slice(0, 6),
  };

  return {
    audit_report,
    roi_projection: projectRoi(recommended_services, reviews, competitorReviews, DEFAULT_ACV, isDominating),
    recommended_services,
    qualifying_score,
    missing_gbp_apple,
    ...(live ? { full_report: live } : {}),
  };
}

function uniqueServiceIds(fixes: string[]): number[] {
  const ids: number[] = [];
  for (const f of fixes) {
    for (const m of f.matchAll(/#(\d+)/g)) {
      const id = Number(m[1]);
      if (SERVICE_MAP[id] && !ids.includes(id)) ids.push(id);
    }
  }
  const out = ids.slice(0, 5);
  return out.length ? out : FALLBACK_SERVICES.filter((id) => SERVICE_MAP[id]);
}

export function projectRoi(
  serviceIds: number[],
  reviewCount: number | null | undefined,
  competitorReviews: number | null | undefined,
  acv = DEFAULT_ACV,
  isDominating = false,
): RoiProjection {
  const items = serviceIds.map((id) => SERVICE_MAP[id]).filter(Boolean);
  const investment_one_time = items.reduce((s, x) => s + x.oneTime, 0);
  const investment_monthly = items.reduce((s, x) => s + x.monthly, 0);

  const leads_per_month = Math.round(
    (10 + investment_monthly / 25) * (1 + LEAD_INCREASE_PCT / 100),
  );
  const projected_monthly = Math.round(leads_per_month * acv * CLOSE_RATE);

  const deficit = isDominating ? 0 : clamp((competitorReviews ?? 0) - (reviewCount ?? 0), 10, 350);
  const lost_monthly = isDominating ? Math.round(leads_per_month * acv * 0.2) : Math.round(deficit * 0.08 * acv);

  const monthlyEquivalent = investment_monthly + investment_one_time / 12;
  const roas = Math.round(projected_monthly / Math.max(monthlyEquivalent, 1));
  const payback_months =
    projected_monthly > 0
      ? Math.round((investment_one_time / projected_monthly) * 10) / 10
      : 0;

  return {
    acv,
    leads_per_month,
    projected_monthly,
    lost_monthly,
    investment_one_time,
    investment_monthly,
    roas,
    payback_months,
  };
}
