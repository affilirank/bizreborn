import { NextResponse } from "next/server";
import { listProspects } from "@/lib/prospects";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { emailsSentToday, campaignDailyBudget, welcomeDailyCap } from "@/lib/crm-actions";

export const dynamic = "force-dynamic";

const STAGES = ["welcome", "pitch", "drip_1", "drip_2", "drip_3", "done"] as const;

export async function GET() {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const prospects = await listProspects();
  const today = new Date().toISOString().slice(0, 10);

  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
  let noEmail = 0;
  let bouncesToday = 0;
  let complaintsToday = 0;
  let sentToday = 0;
  let savedToday = 0;

  for (const p of prospects) {
    const stage = (p.campaign_stage || "welcome") as string;
    if (STAGES.includes(stage as (typeof STAGES)[number])) byStage[stage]++;
    const hasEmail = /[^@\s]+@[^@\s]+/.test(p.email || "");
    if (!hasEmail) noEmail++;
    if ((p.created_at ?? "").slice(0, 10) === today) savedToday++;
    for (const l of p.communication_logs ?? []) {
      const ts = String(l.meta?.sent_at ?? l.meta?.ts ?? "");
      if (ts.slice(0, 10) !== today) continue;
      if (l.meta?.status === "sent") sentToday++;
      if (l.meta?.status === "bounced" || l.meta?.kind === "bounce") bouncesToday++;
      if (l.meta?.kind === "complaint") complaintsToday++;
    }
  }

  return NextResponse.json({
    total: prospects.length,
    byStage,
    noEmail,
    sentToday,
    bouncesToday,
    complaintsToday,
    savedToday,
    budget: campaignDailyBudget(),
    welcomeCap: welcomeDailyCap(),
    provider: process.env.SMTP_HOST || "Resend",
  });
}