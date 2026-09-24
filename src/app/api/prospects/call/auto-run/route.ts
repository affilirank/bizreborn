import { NextResponse } from "next/server";
import { listProspects } from "@/lib/prospects";
import { listCallRecordsForProspect } from "@/lib/call-store";
import { dialProspect, withinBusinessHours } from "@/lib/services/dialer";
import { classifyCallTranscript } from "@/lib/call-intent";
import { isAdminOrDemo } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Cron auth: Vercel sends Authorization: Bearer <CRON_SECRET>. */
function isCronAuth(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return !!secret && auth === `Bearer ${secret}`;
}

const MAX_ATTEMPTS = Number(process.env.CALL_MAX_ATTEMPTS ?? 3); // business days of tries
const RETRY_GAP_MS = Number(process.env.CALL_RETRY_HOURS ?? 20) * 60 * 60 * 1000; // ~1/day
const DIALS_PER_PASS = Number(process.env.CALL_AUTO_DIALS_PER_PASS ?? 1);

/**
 * Auto-call scheduler (Vercel Cron, every 30 min).
 *
 * ONLY dials inside business hours (Mon–Fri 10:00–19:00 ET — enforced here,
 * independent of the cron schedule). For each lead with a phone that has NOT
 * explicitly opted out and whose owner we have never spoken to, retries the
 * AI call roughly once per business day until:
 *   - the owner/conversation happens,
 *   - the client says "stop calling" (hard opt-out, logged by the webhook),
 *   - or MAX_ATTEMPTS is exhausted (marked "call_exhausted" in the CRM).
 */
export async function GET(req: Request) {
  // Vercel Cron (Bearer CRON_SECRET) or an admin session (manual trigger).
  if (!isCronAuth(req) && !(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const window = withinBusinessHours();
  if (!window.ok) {
    return NextResponse.json({ skipped: true, reason: "outside business hours", et: window.et });
  }

  const all = await listProspects();
  const dialable = all.filter(
    (p) => p.phone && !["do_not_call", "closed", "invalid", "call_exhausted"].includes(p.status ?? ""),
  );

  let dialed = 0;
  const results: Array<{ business: string; result: string }> = [];
  const skipped = { optedOut: 0, ownerReached: 0, maxAttempts: 0, tooSoon: 0 };

  for (const p of dialable) {
    if (dialed >= DIALS_PER_PASS) break;

    const calls = await listCallRecordsForProspect(p.id, 20);
    if (calls.length > 0) {
      // Stop conditions from the call history.
      const ownerReached = calls.some((c) => {
        const userLines = c.entries.filter((e) => e.role === "user").map((e) => e.text);
        const flags = classifyCallTranscript(userLines, { disconnectionReason: c.outcome ?? "" });
        return flags.owner_reached && c.durationSec >= 45;
      });
      const toldToStop = p.status === "do_not_call" ||
        calls.some((c) => (c.outcome ?? "").toUpperCase().includes("STOP CALLING"));
      if (toldToStop) { skipped.optedOut++; continue; }
      if (ownerReached) { skipped.ownerReached++; continue; }
      if (calls.length >= MAX_ATTEMPTS) {
        skipped.maxAttempts++;
        const { updateProspect } = await import("@/lib/prospects");
        await updateProspect(p.id, { status: "call_exhausted" }).catch(() => null);
        continue;
      }
      const last = calls[0];
      if (Date.now() - new Date(last.startedAt).getTime() < RETRY_GAP_MS) { skipped.tooSoon++; continue; }
    }

    const r = await dialProspect(p, "twilio");
    dialed++;
    results.push({ business: p.business_name, result: r.ok ? `dialing (${calls.length + 1}/${MAX_ATTEMPTS})` : r.error ?? "failed" });
  }

  return NextResponse.json({
    success: true,
    et: window.et,
    dialed,
    skipped,
    results,
  });
}
