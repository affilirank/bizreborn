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
        logs: (p.communication_logs ?? []).length,
        welcomeLogs: (p.communication_logs ?? []).filter((l) => l.meta?.kind === "welcome").length,
      })),
    });
  }

  const stats = await runAllProspectCampaigns(false);
  return NextResponse.json({ success: true, ...stats });
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