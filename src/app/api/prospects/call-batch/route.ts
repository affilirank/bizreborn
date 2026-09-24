import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { listProspects } from "@/lib/prospects";
import { listCallRecords } from "@/lib/call-store";
import { applyContactLog, makeContactLog } from "@/lib/crm-actions";
import type { Prospect } from "@/lib/supabase-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

/** Audit-data dynamic variables for a lead (same shape as single calls). */
function dynVars(p: Prospect): Record<string, string> {
  const roi = p.roi_projection;
  return {
    contact_name: "the business owner",
    business_name: p.business_name || "the business",
    grade: p.audit_report?.grade ?? "n/a",
    health_score: p.audit_report?.health_score != null ? String(p.audit_report.health_score) : "n/a",
    rating: p.google_rating != null ? String(p.google_rating) : "n/a",
    reviews: p.review_count != null ? String(p.review_count) : "n/a",
    unanswered: p.unanswered_reviews != null ? String(p.unanswered_reviews) : "n/a",
    competitor_name: p.competitor_name ?? "the local market leader",
    competitor_reviews: p.competitor_reviews != null ? String(p.competitor_reviews) : "n/a",
    lost_monthly: roi ? `$${Math.round(roi.lost_monthly).toLocaleString()}` : "n/a",
    extra_leads: roi ? String(roi.leads_per_month) : "n/a",
    projected_monthly: roi ? `$${Math.round(roi.projected_monthly).toLocaleString()}` : "n/a",
  };
}

const CALLED_RECENTLY_DAYS = 3;

/** GET — call-tracker stats + recent calls for the dashboard panel. */
export async function GET() {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const prospects = await listProspects();
  const callable = prospects.filter((p) => toE164(p.phone ?? ""));
  let called = 0;
  let last24h = 0;
  const dayAgo = new Date(Date.now() - 24 * 3600e3).toISOString();
  for (const p of callable) {
    const logs = (p.communication_logs ?? []).filter((l) => (l.meta?.kind ?? "") === "call");
    if (logs.length > 0) called++;
    if (logs.some((l) => (l.date ?? "") >= dayAgo)) last24h++;
  }

  const calls = await listCallRecords(30);
  const outcomes = { booked: 0, interested: 0, "not interested": 0, other: 0 } as Record<string, number>;
  for (const c of calls) {
    const o = (c.outcome ?? "").toLowerCase();
    if (o.includes("booked: yes") || o.includes("book")) outcomes.booked++;
    else if (o.includes("not interested")) outcomes["not interested"]++;
    else if (o.includes("interested")) outcomes.interested++;
    else outcomes.other++;
  }

  return NextResponse.json({
    callable: callable.length,
    called,
    neverCalled: callable.length - called,
    last24h,
    recentCalls: calls.map((c) => ({
      callSid: c.callSid,
      prospectId: c.prospectId,
      businessName: c.businessName,
      phone: c.phone,
      status: c.status,
      durationSec: c.durationSec,
      outcome: c.outcome,
      startedAt: c.startedAt,
    })),
    outcomes,
  });
}

/** POST — queue a batch of AI calls for leads with phone numbers. */
export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(200, Math.max(1, Number(body?.limit ?? 50)));
  const cooldownDays = Math.max(0, Number(body?.cooldownDays ?? CALLED_RECENTLY_DAYS));

  const batchProvider = process.env.CALL_BATCH_PROVIDER?.toLowerCase() === "retell" ? "retell" : "twilio";

  // Hard daily dial budget (Retell bills ~$0.07-0.15/voice-minute + LLM tokens;
  // one "Call All Leads" click used to queue EVERY callable lead at once).
  const dailyBudget = Number(process.env.CALL_MAX_DAILY_DIALS ?? 2);
  const dayStart = new Date().toISOString().slice(0, 10);
  const recentCalls = await listCallRecords(500);
  const dialedToday = recentCalls.filter((c) => (c.startedAt ?? "").slice(0, 10) === dayStart).length;
  if (dialedToday >= dailyBudget) {
    return NextResponse.json(
      { error: `Daily call budget reached (${dialedToday}/${dailyBudget} dials today). Raise CALL_MAX_DAILY_DIALS in Vercel env if you want more.` },
      { status: 429 },
    );
  }
  const remainingToday = Math.max(0, dailyBudget - dialedToday);

  const prospects = await listProspects();
  const cooldownCutoff = new Date(Date.now() - cooldownDays * 24 * 3600e3).toISOString();

  type Task = Record<string, unknown>;
  const tasks: Task[] = [];
  const skipped: string[] = [];

  for (const p of prospects) {
    if (tasks.length >= limit) break;
    if (p.status === "invalid" || p.status === "failed" || p.status === "closed") continue;
    const e164 = toE164(p.phone ?? "");
    if (!e164) {
      skipped.push(`${p.business_name}: no callable phone`);
      continue;
    }
    // Cooldown: skip leads called within the window (log-based, provider-agnostic).
    const callLogs = (p.communication_logs ?? []).filter(
      (l) => (l.meta?.kind ?? "") === "call" && (l.date ?? "") >= cooldownCutoff,
    );
    if (callLogs.length > 0) {
      skipped.push(`${p.business_name}: called within ${cooldownDays}d`);
      continue;
    }
    if (tasks.length >= remainingToday) {
      skipped.push(`daily dial budget reached (${dailyBudget}/day)`);
      continue;
    }
    tasks.push({
      to_number: e164,
      retell_llm_dynamic_variables: dynVars(p),
      metadata: { prospectId: p.id, businessName: p.business_name },
    });
  }

  if (tasks.length === 0) {
    return NextResponse.json({ error: "No leads to call (phones missing or cooldown active).", skipped: skipped.slice(0, 10) }, { status: 400 });
  }

  // Twilio mode (~$0.02-0.03/call): dial each lead directly (3 concurrent) —
  // no Retell platform fee. Same transcripts via the TwiML webhook.
  // Business-hours guard: Twilio dials FIRE IMMEDIATELY (unlike Retell batch
  // mode, which schedules inside its window), so bulk calls must never land
  // on someone's phone at night.
  const { dialProspect, withinBusinessHours } = await import("@/lib/services/dialer");
  if (batchProvider === "twilio") {
    const window = withinBusinessHours();
    if (!window.ok) {
      return NextResponse.json(
        { error: `Bulk calling is only allowed Mon–Fri 10am–7pm ET (it's ${window.et}). The daily auto-caller will dial for you at 10:30am ET.` },
        { status: 403 },
      );
    }
    const byId = new Map(prospects.map((p) => [p.id, p] as const));
    let dialed = 0;
    const failed: string[] = [];
    for (let i = 0; i < tasks.length; i += 3) {
      await Promise.all(tasks.slice(i, i + 3).map(async (t) => {
        const pid = String((t.metadata as Record<string, unknown>)?.prospectId ?? "");
        const p = pid ? byId.get(pid) : undefined;
        if (!p) return;
        const r = await dialProspect(p);
        if (r.ok) dialed++;
        else failed.push(`${p.business_name}: ${r.error ?? "failed"}`);
      }));
    }
    return NextResponse.json({
      success: dialed > 0,
      provider: "twilio",
      queued: dialed,
      failedCount: failed.length,
      failed: failed.slice(0, 5),
      skippedCount: skipped.length,
      skipped: skipped.slice(0, 10),
    });
  }

  const retellKey = process.env.RETELL_API_KEY;
  const fromNumber = process.env.RETELL_FROM_NUMBER;
  const agentId = process.env.RETELL_AGENT_ID;
  if (!retellKey || !fromNumber || !agentId) {
    return NextResponse.json(
      { error: "Retell bulk calling is disabled unless CALL_BATCH_PROVIDER=retell and Retell is fully configured." },
      { status: 400 },
    );
  }

  // Calling window: 10:00-19:00 ET, Mon-Fri — keeps cold calls inside polite
  // (and TCPA-friendlier) hours regardless of when the batch is triggered.
  const res = await fetch("https://api.retellai.com/create-batch-call", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${retellKey}` },
    body: JSON.stringify({
      name: `bizreborn-campaign-${new Date().toISOString().slice(0, 10)}-${tasks.length}`,
      from_number: fromNumber,
      tasks,
      call_time_window: {
        timezone: "America/New_York",
        windows: [{ start: 600, end: 1140 }],
        day: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: `Retell batch call failed: ${data?.message ?? res.status}` },
      { status: 400 },
    );
  }

  // Log the queue event per lead (cooldown + CRM visibility).
  for (const t of tasks) {
    const pid = String((t.metadata as Record<string, unknown>)?.prospectId ?? "");
    if (!pid) continue;
    const p = prospects.find((x) => x.id === pid);
    if (p) {
      await applyContactLog(
        p,
        makeContactLog({ kind: "call", trigger: "outreach", stepLabel: "Queued in Retell batch call campaign" }),
        "outreach",
      );
    }
  }

  return NextResponse.json({
    success: true,
    batchCallId: data.batch_call_id,
    queued: tasks.length,
    skippedCount: skipped.length,
    skipped: skipped.slice(0, 10),
  });
}