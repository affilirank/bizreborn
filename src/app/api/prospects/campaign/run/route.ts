import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { runAllProspectCampaigns, advanceProspectCampaign } from "@/lib/campaign-engine";
import { getProspectById } from "@/lib/prospects";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Automated campaign dispatcher API.
 * Runs campaign advancement across all active leads (Welcome -> Pitch -> 3-Part Drip -> 100-Day Blog Newsletter sequence).
 */
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