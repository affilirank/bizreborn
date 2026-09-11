import { NextResponse } from "next/server";
import { getProspectById, updateProspect } from "@/lib/prospects";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { buildBrandAudit } from "@/lib/services/brand-audit";
import { generatePitchScript } from "@/lib/services/script";
import { generateVoiceover } from "@/lib/services/tts";
import { renderPitchVideo } from "@/lib/services/renderer";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const { id } = await params;
  const prospect = await getProspectById(id);
  if (!prospect) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ prospect });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const { id } = await params;
  const prospect = await getProspectById(id);
  if (!prospect) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (body.business_name !== undefined) patch.business_name = String(body.business_name).trim();
  if (body.city !== undefined) patch.city = String(body.city).trim() || null;
  if (body.website !== undefined) patch.website = String(body.website).trim() || null;
  if (body.email !== undefined) patch.email = String(body.email).trim() || null;
  if (body.phone !== undefined) patch.phone = String(body.phone).trim() || null;
  if (body.instagram !== undefined) patch.instagram = String(body.instagram).trim() || null;
  if (body.facebook !== undefined) patch.facebook = String(body.facebook).trim() || null;
  if (body.tiktok !== undefined) patch.tiktok = String(body.tiktok).trim() || null;
  if (body.google_maps_link !== undefined) patch.google_maps_link = String(body.google_maps_link).trim() || null;

  // Honor exact entered stats (or null if blank), preventing silent fake metrics.
  if (body.google_rating !== undefined) patch.google_rating = body.google_rating !== "" && body.google_rating !== null && !isNaN(Number(body.google_rating)) ? Number(body.google_rating) : null;
  if (body.review_count !== undefined) patch.review_count = body.review_count !== "" && body.review_count !== null && !isNaN(Number(body.review_count)) ? Number(body.review_count) : null;
  if (body.unanswered_reviews !== undefined) patch.unanswered_reviews = body.unanswered_reviews !== "" && body.unanswered_reviews !== null && !isNaN(Number(body.unanswered_reviews)) ? Number(body.unanswered_reviews) : null;
  if (body.competitor_name !== undefined) patch.competitor_name = String(body.competitor_name).trim() || null;
  if (body.competitor_reviews !== undefined) patch.competitor_reviews = body.competitor_reviews !== "" && body.competitor_reviews !== null && !isNaN(Number(body.competitor_reviews)) ? Number(body.competitor_reviews) : null;

  // CRM state fields — these MUST persist (logs, temperature, last contact).
  if (body.status !== undefined) patch.status = String(body.status).trim() || null;
  if (body.temperature !== undefined) patch.temperature = String(body.temperature).trim() || null;
  if (body.last_contacted_at !== undefined && body.last_contacted_at !== null) patch.last_contacted_at = String(body.last_contacted_at).trim();
  if (body.error !== undefined) patch.error = body.error === null ? null : String(body.error).trim();
  if (Array.isArray(body.communication_logs)) patch.communication_logs = body.communication_logs;

  // Update base fields first
  let updated = await updateProspect(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Could not update prospect." }, { status: 500 });
  }

  // If stats changed or regenerate requested, re-run audit, script, voiceover, render
  if (body.regenerate || body.google_rating !== undefined || body.review_count !== undefined || body.competitor_name !== undefined) {
    try {
      const audit = buildBrandAudit(updated);
      const script = await generatePitchScript({
        business_name: updated.business_name,
        city: updated.city,
        google_rating: updated.google_rating,
        review_count: updated.review_count,
        unanswered_reviews: updated.unanswered_reviews,
        competitor_name: updated.competitor_name,
        competitor_reviews: updated.competitor_reviews,
        audit: audit.audit_report,
        roi: audit.roi_projection,
      });
      const { voiceover_url } = await generateVoiceover(script, updated.business_name);
      const nextForRender = { ...updated, ...audit, pitch_script: script, voiceover_url };
      const rendered = await renderPitchVideo(nextForRender as any);

      updated = (await updateProspect(id, {
        ...audit,
        pitch_script: script,
        voiceover_url,
        ...rendered,
        status: "ready",
        error: null,
      })) ?? updated;
    } catch (err) {
      console.error("[prospect update] regeneration failed:", err);
    }
  }

  return NextResponse.json({ prospect: updated });
}
