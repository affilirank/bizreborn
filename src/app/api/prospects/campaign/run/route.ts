import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { runAllProspectCampaigns, advanceProspectCampaign } from "@/lib/campaign-engine";
import { getProspectById } from "@/lib/prospects";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cron auth: Vercel sends Authorization: Bearer <CRON_SECRET>. */
function isCronAuth(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return !!secret && auth === `Bearer ${secret}`;
}

/**
 * Cron-triggered campaign dispatcher (Vercel Cron).
 * Runs campaign advancement across all active leads.
 */
export async function GET(req: Request) {
  if (!isCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // TEMPORARY diagnostic: ?debug=1 dumps per-lead campaign state (no sends).
  if (new URL(req.url).searchParams.get("debug")) {
    const { listProspects } = await import("@/lib/prospects");
    const prospects = await listProspects();
    return NextResponse.json({
      count: prospects.length,
      leads: prospects.slice(0, 300).map((p) => ({
        email: p.email,
        status: p.status,
        stage: p.campaign_stage,
        last_contacted_at: p.last_contacted_at,
        updated_at: p.updated_at,
        logs: (p.communication_logs ?? []).length,
        welcomeLogs: (p.communication_logs ?? []).filter((l) => l.meta?.kind === "welcome").length,
        lastLogAt: (p.communication_logs ?? [])[0]?.meta?.sent_at ?? (p.communication_logs ?? [])[0]?.date ?? null,
      })),
    });
  }

  // TEMPORARY repair: ?forceAdvance=1 advances every welcomed-but-stuck lead
  // to pitch, reporting per-lead write errors so failures are visible.
  if (new URL(req.url).searchParams.get("forceAdvance")) {
    const { listProspects, updateProspect } = await import("@/lib/prospects");
    const prospects = await listProspects();
    const stuck = prospects.filter(
      (p) => p.email && (p.campaign_stage ?? "") === "" && (p.communication_logs ?? []).some((l) => l.meta?.kind === "welcome"),
    );
    const results: Array<{ email: string; ok: boolean; err?: string }> = [];
    for (const p of stuck) {
      const res = await updateProspect(p.id, {
        campaign_stage: "pitch",
        campaign_last_run_at: new Date().toISOString(),
      });
      results.push({ email: p.email ?? "(none)", ok: !!res, err: res ? undefined : "updateProspect returned null (DB write failed)" });
    }
    return NextResponse.json({ stuckCount: stuck.length, results: results.slice(0, 60) });
  }

  const stats = await runAllProspectCampaigns(false);

  // Safety net: import any Maps scans that completed without being processed
  // (tab closed, poll missed). Idempotent — dedupe + processed-marker.
  let maps: { processed: Array<{ runId: string; saved: number; keyword: string; city: string }>; skipped: number } | null = null;
  try {
    const { reconcileRecentRuns } = await import("@/lib/services/apify-maps");
    maps = await reconcileRecentRuns();
  } catch (err) {
    console.warn("[campaign] maps reconciliation failed:", err);
  }

  return NextResponse.json({ success: true, ...stats, maps });
}

export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const prospectId = String(body?.id ?? "").trim();
  const force = body?.force === true;

  if (prospectId) {
    const p = await getProspectById(prospectId);
    if (!p) {
      return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
    }
    const result = await advanceProspectCampaign(p, force);
    return NextResponse.json(result);
  }

  const stats = await runAllProspectCampaigns(force);
  return NextResponse.json({ success: true, ...stats });
}