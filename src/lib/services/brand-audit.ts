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
    | "competitor_reviews"
  >,
): BrandAuditResult {
  const hasSocial = Boolean(p.instagram || p.facebook || p.tiktok);
  const report = runAudit({
    url: p.website?.trim() || `${p.business_name.toLowerCase().replace(/\s+/g, "")}.com`,
    businessName: p.business_name,
    gbp: p.google_rating != null ? "google-business-profile" : undefined,
    instagram: p.instagram ?? undefined,
    facebook: p.facebook ?? undefined,
    tiktok: p.tiktok ?? undefined,
    reviews: reviewBucket(p.review_count),
    postingFreq: hasSocial ? "monthly" : "never",
    leadSource: "google",
  });

  const painPoints = [...report.painPoints];
  const fixes = [...report.fixes];
  const unanswered = p.unanswered_reviews ?? 0;
  if (unanswered > 0) {
    painPoints.unshift(
      `${unanswered} Google review${unanswered === 1 ? "" : "s"} left unanswered — Google reads silence as neglect and ranks you lower for it.`,
    );
    fixes.unshift("Review Response Automation (service #35) answers every review within hours.");
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
    roi_projection: projectRoi(recommended_services, p.review_count, p.competitor_reviews),
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
): RoiProjection {
  const items = serviceIds.map((id) => SERVICE_MAP[id]).filter(Boolean);
  const investment_one_time = items.reduce((s, x) => s + x.oneTime, 0);
  const investment_monthly = items.reduce((s, x) => s + x.monthly, 0);

  // Same model as the service builder / orders.
  const leads_per_month = Math.round(
    (10 + investment_monthly / 25) * (1 + LEAD_INCREASE_PCT / 100),
  );
  const projected_monthly = Math.round(leads_per_month * acv * CLOSE_RATE);

  // Revenue currently leaking to the market leader: each missing review is a
  // proxy for lost local-pack clicks; scaled conservatively.
  const deficit = clamp((competitorReviews ?? 0) - (reviewCount ?? 0), 5, 300);
  const lost_monthly = Math.round(deficit * 0.08 * acv);

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
