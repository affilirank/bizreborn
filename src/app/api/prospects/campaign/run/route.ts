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

  const startedAt = Date.now();
  // Campaign engine sends within its own budget; Maps reconciliation only
  // runs when the 60s function cap still has headroom.
  const stats = await runAllProspectCampaigns(false, 30_000);

  let maps: { processed: Array<{ runId: string; saved: number; keyword: string; city: string }>; skipped: number } | null = null;
  if (Date.now() - startedAt < 40_000) {
    // Safety net: import any Maps scans that completed without being processed
    // (tab closed, poll missed). Idempotent — dedupe + processed-marker.
    try {
      const { reconcileRecentRuns } = await import("@/lib/services/apify-maps");
      maps = await reconcileRecentRuns();
    } catch (err) {
      console.warn("[campaign] maps reconciliation failed:", err);
    }
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