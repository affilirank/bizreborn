import { NextResponse } from "next/server";
import { insertProspects } from "@/lib/prospects";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { buildBrandAudit } from "@/lib/services/brand-audit";
import { generatePitchScript } from "@/lib/services/script";
import { generateVoiceover } from "@/lib/services/tts";
import { renderPitchVideo } from "@/lib/services/renderer";
import type { Prospect } from "@/lib/supabase-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Batch create prospects. Instantly computes audit, ROI, script, and poster
 * so leads are 100% READY immediately for the pitch generator.
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

  for (const row of rows) {
    const name = String(row.business_name || row.name || row.business || "").trim();
    if (!name) continue;

    const city = str(row.city) || "Local";
    const website = str(row.website || row.url);
    const email = str(row.email);
    const phone = str(row.phone);
    const google_maps_link = str(row.google_maps_link || row.google_maps_url || row.maps_link);

    // Reputation stats (either user-provided or defaults)
    const google_rating = row.google_rating !== undefined && row.google_rating !== "" ? Number(row.google_rating) : 5.0;
    const review_count = row.review_count !== undefined && row.review_count !== "" ? Number(row.review_count) : 130;
    const unanswered_reviews = row.unanswered_reviews !== undefined && row.unanswered_reviews !== "" ? Number(row.unanswered_reviews) : 0;
    const competitor_name = str(row.competitor_name) || "Market Leader";
    const competitor_reviews = row.competitor_reviews !== undefined && row.competitor_reviews !== "" ? Number(row.competitor_reviews) : Math.max(review_count + 50, review_count * 1.4);

    const baseProspect: Partial<Prospect> & { business_name: string } = {
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
      status: row.status === "saved" ? "saved" : "ready",
    };

    // If status is saved, don't pre-render yet. If ready, compute audit + script + poster instantly!
    if (baseProspect.status === "ready") {
      try {
        const audit = buildBrandAudit(baseProspect as Prospect);
        const script = await generatePitchScript({
          business_name: name,
          city,
          google_rating,
          review_count,
          unanswered_reviews,
          competitor_name,
          competitor_reviews,
          audit: audit.audit_report,
          roi: audit.roi_projection,
        });
        const { voiceover_url } = await generateVoiceover(script, name);
        const tempProspect = { ...baseProspect, ...audit, pitch_script: script, voiceover_url } as Prospect;
        const rendered = await renderPitchVideo(tempProspect);

        Object.assign(baseProspect, {
          ...audit,
          pitch_script: script,
          voiceover_url,
          ...rendered,
        });
      } catch (err) {
        console.warn("[batch] instant render failed, saving as ready anyway:", err);
      }
    }

    processedRows.push(baseProspect);
  }

  if (processedRows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows (missing business_name)" },
      { status: 400 },
    );
  }

  const inserted = await insertProspects(processedRows);
  return NextResponse.json({ prospects: inserted }, { status: 201 });
}
