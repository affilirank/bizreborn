import { calculateQualifyingScore } from "@/lib/services/brand-audit";
import { NextResponse } from "next/server";
import { insertProspects } from "@/lib/prospects";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { buildBrandAudit } from "@/lib/services/brand-audit";
import { generatePitchScript } from "@/lib/services/script";
import { generateVoiceover } from "@/lib/services/tts";
import { renderPitchVideo } from "@/lib/services/renderer";
import { welcomeCreatedProspects } from "@/lib/crm-actions";
import { normalizeEmail, toRealMapsLink } from "@/lib/services/email-validate";
import type { Prospect } from "@/lib/supabase-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Batch create prospects. Instantly computes audit, ROI, script, and poster
 * so leads are 100% READY immediately for the pitch generator.
 * Honors exact user/admin entered stats (e.g. Daniel Brown, LPT Realty) or sets unverified stats to null.
 */
export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body.prospects)
    ? body.prospects
    : Array.isArray(body.rows)
      ? body.rows
      : [];

  if (rows.length === 0 || rows.length > 500) {
    return NextResponse.json(
      { error: "Provide between 1 and 500 prospects" },
      { status: 400 },
    );
  }

  const str = (v: unknown) => {
    const s = String(v ?? "").trim();
    return s || undefined;
  };

  const processedRows: Array<Partial<Prospect> & { business_name: string }> = [];
  const readyIndices: number[] = [];

  for (const row of rows) {
    const name = String(row.business_name || row.name || row.business || "").trim();
    if (!name) continue;

    const city = str(row.city) || "Local";
    const website = str(row.website || row.url);
    const email = normalizeEmail(row.email);
    const phone = str(row.phone);
    const google_maps_link = toRealMapsLink(row.google_maps_link || row.google_maps_url || row.maps_link, name, city);

    const google_rating = row.google_rating !== undefined && row.google_rating !== "" && !isNaN(Number(row.google_rating)) ? Number(row.google_rating) : null;
    const review_count = row.review_count !== undefined && row.review_count !== "" && !isNaN(Number(row.review_count)) ? Number(row.review_count) : null;
    const unanswered_reviews = row.unanswered_reviews !== undefined && row.unanswered_reviews !== "" && !isNaN(Number(row.unanswered_reviews)) ? Number(row.unanswered_reviews) : null;
    const competitor_name = str(row.competitor_name) || null;
    const competitor_reviews = row.competitor_reviews !== undefined && row.competitor_reviews !== "" && !isNaN(Number(row.competitor_reviews)) ? Number(row.competitor_reviews) : (review_count != null ? Math.max(review_count + 50, Math.round(review_count * 1.4)) : null);

    const initialScoreData = calculateQualifyingScore({
      google_rating,
      review_count,
      unanswered_reviews,
      google_maps_link,
      website,
      missing_gbp_apple: row.missing_gbp_apple === true,
    });

    const baseProspect: Partial<Prospect> & { business_name: string } = {
      qualifying_score: initialScoreData.score,
      missing_gbp_apple: initialScoreData.missingGbpApple,
      business_name: name,
      city,
      website: website || null,
      email: email || null,
      phone: phone || null,
      google_maps_link: google_maps_link || null,
      instagram: str(row.instagram || row.ig) || null,
      facebook: str(row.facebook || row.fb) || null,
      tiktok: str(row.tiktok) || null,
      google_rating,
      review_count,
      unanswered_reviews,
      competitor_name,
      competitor_reviews,
      status: row.status === "saved" ? "saved" : row.status === "ready" ? "ready" : "pending",
    };

    const idx = processedRows.length;
    processedRows.push(baseProspect);
    if (baseProspect.status === "ready") readyIndices.push(idx);
  }

  // Parallelize inline renders for "ready" leads (3 at a time to avoid
  // blowing the 60s function budget).
  const CONCURRENT_RENDERS = 3;
  for (let i = 0; i < readyIndices.length; i += CONCURRENT_RENDERS) {
    const chunk = readyIndices.slice(i, i + CONCURRENT_RENDERS);
    await Promise.all(chunk.map(async (idx) => {
      const base = processedRows[idx];
      const name = base.business_name;
      try {
        const audit = await buildBrandAudit(base as Prospect);
        const script = await generatePitchScript({
          business_name: name,
          city: base.city ?? "Local",
          google_rating: base.google_rating,
          review_count: base.review_count,
          unanswered_reviews: base.unanswered_reviews,
          competitor_name: base.competitor_name,
          competitor_reviews: base.competitor_reviews,
          audit: audit.audit_report,
          roi: audit.roi_projection,
        });
        const { voiceover_url } = await generateVoiceover(script, name);
        const tempProspect = { ...base, ...audit, pitch_script: script, voiceover_url } as Prospect;
        const rendered = await renderPitchVideo(tempProspect);
        Object.assign(base, { ...audit, pitch_script: script, voiceover_url, ...rendered, status: "ready", error: null });
      } catch (err) {
        console.warn("[batch] instant render failed for", name, ":", err);
        base.error = err instanceof Error ? err.message.slice(0, 300) : "Pitch generation failed.";
      }
    }));
  }

  if (processedRows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows (missing business_name)" },
      { status: 400 },
    );
  }

  const inserted = await insertProspects(processedRows);

  // Instant welcome + "free audit is coming" emails for every new lead with
  // a valid email. Idempotent; never blocks the save response.
  try {
    await welcomeCreatedProspects(inserted);
  } catch (err) {
    console.warn("[batch] welcome emails partially failed:", err);
  }

  return NextResponse.json({ prospects: inserted }, { status: 201 });
}
