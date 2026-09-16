import { NextResponse } from "next/server";
import { listProspects } from "@/lib/prospects";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { campaignDailyBudget, welcomeDailyCap } from "@/lib/crm-actions";

export const dynamic = "force-dynamic";

const STAGES = ["welcome", "pitch", "drip_1", "drip_2", "drip_3", "done"] as const;

export async function GET() {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const prospects = await listProspects();
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();

  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
  let noEmail = 0;
  let savedToday = 0;
  let sentToday = 0;
  let sentLast24h = 0;
  let sentLifetime = 0;
  let openedDistinct = 0;
  let openedEvents = 0;
  let openList: { id: string; business_name: string; opens: number; opened_at: string }[] = [];
  let errorsToday = 0;
  let reachable = 0;

  for (const p of prospects) {
    const stage = (p.campaign_stage || "welcome") as string;
    if (STAGES.includes(stage as (typeof STAGES)[number])) byStage[stage]++;
    const hasEmail = /[^@\s]+@[^@\s]+/.test(p.email || "");
    if (!hasEmail) noEmail++;
    else if (p.status !== "invalid" && p.status !== "failed") reachable++;
    if ((p.created_at ?? "").slice(0, 10) === today) savedToday++;

    const logs = p.communication_logs ?? [];
    const meta = (l: (typeof logs)[number]) => l.meta ?? {};
    // an email counts toward opens when this exact send was opened
    const openedLog = logs.find((l) => (meta(l).opened || Number(meta(l).opens ?? 0) > 0) && meta(l).email_uid);

    for (const l of logs) {
      const m = meta(l);
      const status = m.status;
      const sentAt = String(m.sent_at ?? m.ts ?? "");
      const kind = m.kind ?? l.type;
      const isEmailSend = status === "sent";
      if (!isEmailSend) continue;
      sentLifetime++;
      if (sentAt.slice(0, 10) === today) sentToday++;
      if (sentAt >= dayAgo) sentLast24h++;
      void kind;
    }

    if (openedLog) {
      const m = meta(openedLog);
      const opens = Number(m.opens ?? 1);
      openedDistinct++;
      openedEvents += opens;
      openList.push({
        id: p.id,
        business_name: p.business_name,
        opens,
        opened_at: String(m.opened_at ?? m.last_opened_at ?? ""),
      });
    }

    for (const l of logs) {
      const m = meta(l);
      if ((m.status === "error" || m.status === "bounced") && String(m.sent_at ?? m.ts ?? "").slice(0, 10) === today) {
        errorsToday++;
      }
    }
  }

  openList = openList
    .sort((a, b) => (b.opened_at || "").localeCompare(a.opened_at || ""))
    .slice(0, 10);

  return NextResponse.json({
    total: prospects.length,
    reachable,
    byStage,
    noEmail,
    savedToday,
    sentToday,
    sentLast24h,
    sentLifetime,
    openedDistinct,
    openedEvents,
    willRespondProb: openedDistinct
      ? {
          distinctPct: Math.round((openedDistinct / Math.max(sentLifetime, 1)) * 100),
        }
      : null,
    errorsToday,
    recentOpens: openList,
    budget: campaignDailyBudget(),
    welcomeCap: welcomeDailyCap(),
    provider: process.env.SMTP_HOST || process.env.SMTP_USER || "Resend",
  });
}