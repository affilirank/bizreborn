import { NextResponse } from "next/server";
import { z } from "zod";
import { runAudit } from "@/lib/audit";
import { buildBrandAudit, liveBrandAudit } from "@/lib/services/brand-audit";
import { generatePitchScript } from "@/lib/services/script";
import { generateVoiceover } from "@/lib/services/tts";
import { renderPitchVideo } from "@/lib/services/renderer";
import { scrapeReputation } from "@/lib/services/scraper";
import { insertProspects, updateProspect, listProspects } from "@/lib/prospects";
import { welcomeProspect } from "@/lib/crm-actions";
import type { AuditReport } from "@/lib/types";
import type { Prospect } from "@/lib/supabase-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AuditSchema = z.object({
  url: z.string().or(z.string().min(2)),
  businessName: z.string().max(120).optional().default(""),
  gbp: z.string().max(120).optional().default(""),
  instagram: z.string().max(120).optional().default(""),
  facebook: z.string().max(120).optional().default(""),
  tiktok: z.string().max(120).optional().default(""),
  // Lead capture (same fields the admin pipeline stores on the prospect) —
  // when present, the visitor is enrolled as a full lead-pitch prospect and
  // receives the pitch page with their audit video.
  contact: z
    .object({
      name: z.string().max(120).optional().default(""),
      email: z.string().email().max(160),
      phone: z.string().max(40).optional().default(""),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = AuditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid audit input.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const normalizedUrl = input.url.includes("://")
      ? input.url
      : `https://${input.url}`;

    const businessName = input.businessName || "Local Business";
    const email = input.contact?.email.trim() || "";

    // ---- Same pipeline as the admin lead-pitch build ----
    // 1. Create (or reuse) the prospect so the audit lands on a real pitch page.
    let prospect: Prospect | null = null;
    if (email) {
      const all = await listProspects();
      const existing = all.find(
        (p) => (p.email ?? "").toLowerCase() === email.toLowerCase(),
      );
      if (existing) {
        prospect = await updateProspect(existing.id, {
          business_name: businessName,
          website: normalizedUrl,
          phone: input.contact?.phone?.trim() || existing.phone,
          instagram: input.instagram || existing.instagram,
          facebook: input.facebook || existing.facebook,
          tiktok: input.tiktok || existing.tiktok,
        });
      } else {
        const [inserted] = await insertProspects([
          {
            business_name: businessName,
            website: normalizedUrl,
            email,
            phone: input.contact?.phone?.trim() || null,
            instagram: input.instagram || null,
            facebook: input.facebook || null,
            tiktok: input.tiktok || null,
            google_maps_link: null,
            status: "pending",
          },
        ]);
        prospect = inserted ?? null;
      }
    }

    let fullReport: AuditReport | null = null;

    if (prospect) {
      try {
        // 2. Real reputation metrics (skipped when the visitor's data is already verified).
        let scraped: Awaited<ReturnType<typeof scrapeReputation>> | null = null;
        if (prospect.google_rating == null || prospect.review_count == null) {
          scraped = await scrapeReputation({
            business_name: businessName,
            city: prospect.city ?? "",
            website: normalizedUrl,
            google_maps_link: prospect.google_maps_link,
            existing_email: email,
          });
          prospect =
            (await updateProspect(prospect.id, {
              google_rating: scraped.google_rating,
              review_count: scraped.review_count,
              unanswered_reviews: scraped.unanswered_reviews,
              competitor_name: scraped.competitor_name,
              competitor_reviews: scraped.competitor_reviews,
              email: scraped.email ?? prospect.email,
              phone: scraped.phone ?? prospect.phone,
              website: scraped.website ?? prospect.website,
              instagram: scraped.instagram ?? prospect.instagram,
              facebook: scraped.facebook ?? prospect.facebook,
            })) ?? prospect;
        }

        // 3. Live AI brand audit + ROI projection.
        const audit = await buildBrandAudit(prospect);
        fullReport = audit.full_report ?? null;
        prospect = (await updateProspect(prospect.id, { ...audit })) ?? prospect;

        // 4. Pitch script narrating the real audit results and the offer.
        const script = await generatePitchScript({
          business_name: businessName,
          city: prospect.city,
          google_rating: prospect.google_rating,
          review_count: prospect.review_count,
          unanswered_reviews: prospect.unanswered_reviews,
          competitor_name: prospect.competitor_name,
          competitor_reviews: prospect.competitor_reviews,
          audit: audit.audit_report,
          roi: audit.roi_projection,
        });
        prospect = (await updateProspect(prospect.id, { pitch_script: script })) ?? prospect;

        // 5. Voiceover (ElevenLabs flash) + poster/video render.
        const { voiceover_url } = await generateVoiceover(script, businessName);
        const withVoice = { ...prospect, voiceover_url } as Prospect;
        const rendered = await renderPitchVideo(withVoice);
        prospect =
          (await updateProspect(prospect.id, {
            voiceover_url,
            ...rendered,
            status: "ready",
            error: null,
          })) ?? prospect;

        // 6. Enroll in the campaign: welcome email now, pitch email 1h later.
        await welcomeProspect(prospect).catch((err) =>
          console.warn("[audit api] welcome email failed:", err),
        );
      } catch (err) {
        console.warn("[audit api] prospect pipeline failed:", err);
      }
    }

    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof req !== "undefined" ? new URL(req.url).origin : "") ||
      "https://www.bizreborn.com";
    const pitchUrl = prospect?.slug ? `${base}/pitch/${prospect.slug}` : null;

    // Display report: prefer the live AI report; fall back to the sealed engine
    // so the widget always has something to render.
    const report =
      fullReport ??
      (prospect?.audit_report
        ? {
            id: `AUD-${Date.now().toString(36).toUpperCase()}`,
            createdAt: new Date().toISOString(),
            url: normalizedUrl,
            businessName,
            gbp: input.gbp,
            socials: { instagram: input.instagram, facebook: input.facebook, tiktok: input.tiktok },
            healthScore: prospect.audit_report.health_score,
            grade: prospect.audit_report.grade,
            breakdowns: prospect.audit_report.breakdowns.map((b) => ({
              key: b.key as "localSeo" | "socialVelocity" | "conversion" | "reputation",
              label: b.label,
              score: b.score,
              description: "",
              issues: b.issues,
            })),
            painPoints: prospect.audit_report.pain_points,
            fixes: prospect.audit_report.fixes,
            comparedTo: [],
            keywordSearches: [],
          }
        : await liveFallbackReport(input, normalizedUrl));

    return NextResponse.json({ report, pitchUrl, prospectId: prospect?.id ?? null });
  } catch (err) {
    console.error("[audit api] error:", err);
    return NextResponse.json({ error: "Audit failed." }, { status: 500 });
  }
}

/** Sealed-engine fallback report (never blocks the widget from rendering). */
async function liveFallbackReport(
  input: { businessName?: string; gbp?: string; instagram?: string; facebook?: string; tiktok?: string },
  normalizedUrl: string,
): Promise<AuditReport> {
  const live = await liveBrandAudit(
    {
      business_name: input.businessName || "Local Business",
      website: normalizedUrl,
      instagram: input.instagram || null,
      facebook: input.facebook || null,
      tiktok: input.tiktok || null,
      google_rating: null,
      review_count: null,
      unanswered_reviews: null,
      competitor_name: null,
      competitor_reviews: null,
      city: null,
    },
    false,
  );
  return (
    live ??
    runAudit({
      url: normalizedUrl,
      businessName: input.businessName || "Local Business",
      gbp: input.gbp || undefined,
      instagram: input.instagram || undefined,
      facebook: input.facebook || undefined,
      tiktok: input.tiktok || undefined,
    })
  );
}
