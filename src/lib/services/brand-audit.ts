import { runAudit } from "@/lib/audit";
import { SERVICE_MAP } from "@/data/services";
import type {
  Prospect,
  ProspectAudit,
  RoiProjection,
} from "@/lib/supabase-types";
import { clamp } from "@/lib/utils";

/**
 * Brand audit + ROI projection for a prospect.
 *
 * Reuses the site's audit engine (website, Google Business Profile, socials,
 * reputation) so the pitch talks about the same flaws the public /audit tool
 * would surface, then projects the return of the services those flaws call
 * for — using the same model as the service builder (leads × avg customer
 * value × 35% close rate).
 */

export interface BrandAuditResult {
  audit_report: ProspectAudit;
  roi_projection: RoiProjection;
  recommended_services: number[];
}

const DEFAULT_ACV = 500;
const LEAD_INCREASE_PCT = 50;
const CLOSE_RATE = 0.35;
const FALLBACK_SERVICES = [1, 31, 35];

function reviewBucket(count: number | null | undefined) {
  if (count == null) return undefined;
  if (count <= 5) return "none" as const;
  if (count <= 25) return "few" as const;
  if (count <= 80) return "some" as const;
  return "many" as const;
}

export function buildBrandAudit(
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
  >,
): BrandAuditResult {
  const rating = p.google_rating ?? 4.0;
  const reviews = p.review_count ?? 0;
  const isDominating = (rating >= 4.9 && reviews >= 100) || (rating === 5.0 && reviews >= 40);

  let competitorReviews = p.competitor_reviews;
  if (!isDominating) {
    if (competitorReviews == null || competitorReviews <= reviews) {
      competitorReviews = Math.max(reviews + 50, Math.round(reviews * 1.35));
    }
  } else {
    competitorReviews = Math.max(competitorReviews ?? 0, reviews + 25);
  }

  const hasSocial = Boolean(p.instagram || p.facebook || p.tiktok);
  const report = runAudit({
    url: p.website?.trim() || `${p.business_name.toLowerCase().replace(/\s+/g, "")}.com`,
    businessName: p.business_name,
    gbp: rating != null ? "google-business-profile" : undefined,
    instagram: p.instagram ?? undefined,
    facebook: p.facebook ?? undefined,
    tiktok: p.tiktok ?? undefined,
    reviews: reviewBucket(reviews),
    postingFreq: hasSocial ? "monthly" : "never",
    leadSource: "google",
  });

  const painPoints = [...report.painPoints];
  const fixes = [...report.fixes];

  if (isDominating) {
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
    painPoints.push("No website on record — every search that can't find a site becomes a competitor's call.");
    fixes.push("Conversion-focused landing site with tap-to-call (service #23).");
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

  // Same model as the service builder / orders.
  const leads_per_month = Math.round(
    (10 + investment_monthly / 25) * (1 + LEAD_INCREASE_PCT / 100),
  );
  const projected_monthly = Math.round(leads_per_month * acv * CLOSE_RATE);

  // Revenue currently leaking or expansion upside:
  const deficit = isDominating ? 0 : clamp((competitorReviews ?? 0) - (reviewCount ?? 0), 10, 350);
  const lost_monthly = isDominating ? Math.round(leads_per_month * acv * 0.2) : Math.round(deficit * 0.08 * acv);

  // Return per dollar of monthly-equivalent spend (one-time fees amortized over a year).
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
