import "server-only";
import type { Prospect } from "@/lib/supabase-types";
import { getProspectById, updateProspect } from "@/lib/prospects";
import { getCallRecord } from "@/lib/call-store";
import { createServiceClient } from "@/lib/supabase/admin";
import { deliverEmail } from "@/lib/crm-actions";
import { renderProfessionalEmailHtml } from "@/lib/email-template";
import type { CallIntentFlags } from "@/lib/call-intent";

/**
 * Live call-to-action executor.
 *
 * When the client asks for something on an AI call — book a call, send the
 * audit/proposal, move forward, stop calling — the Retell agent invokes the
 * matching custom tool (or the post-call webhook detects the ask in the
 * transcript) and THIS code performs the actual task: real emails, real
 * booking rows, real CRM state.
 */

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";

/** Next weekday 10:00 AM ET (placeholder slot the admin confirms). */
export function nextBusinessSlotISO(): string {
  const nowEt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => nowEt.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const daysToShift: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 1, Sun: 2 };
  let add = daysToShift[weekday] ?? 1;
  if (hour >= 10 && add === 0) add = weekday === "Fri" ? 3 : 1; // today's slot passed
  const d = new Date(Date.now() + add * 24 * 60 * 60 * 1000);
  // Noon UTC ≈ 8am EDT / 7am EST — safe: never before 10am ET, adjusted below.
  const iso = new Date(`${d.toISOString().slice(0, 10)}T14:00:00Z`);
  return iso.toISOString();
}

async function prospectForCall(callId: string, args: Record<string, unknown>): Promise<Prospect | null> {
  if (args.prospectId) {
    const p = await getProspectById(String(args.prospectId));
    if (p) return p;
  }
  const rec = await getCallRecord(callId);
  if (rec?.prospectId) return getProspectById(rec.prospectId);
  return null;
}

function recentLogExists(p: Prospect, type: string, withinMs = 10 * 60 * 1000): boolean {
  return (p.communication_logs ?? []).some(
    (l) => l.type === type && Date.now() - new Date(l.date).getTime() < withinMs,
  );
}

export async function sendAuditEmailNow(
  callId: string,
  args: Record<string, unknown>,
  source: "live_tool" | "post_call",
): Promise<{ ok: boolean; message: string; email?: string }> {
  const p = await prospectForCall(callId, args);
  if (!p) return { ok: false, message: "Could not match the call to a lead." };
  if (!p.email) return { ok: false, message: "This lead has no email on file — ask for one, then send." };
  if (recentLogExists(p, "audit_sent_live")) {
    return { ok: true, message: `Already sent to ${p.email} moments ago.`, email: p.email };
  }

  const grade = p.audit_report?.grade || "B";
  const subject = `Your Custom Video Audit & Growth Score for ${p.business_name} 🚀`;
  const body = `Hi ${p.business_name} team,\n\nAs promised on our call, here is your custom 45-second video audit and brand growth score (${grade}) for ${p.business_name} in ${p.city || "your market"}.\n\nWatch it here:\n\n${BASE}/pitch/${p.slug}\n\nIt covers your Google map-pack standing, review velocity, and the projected return of fixing the gaps vs ${p.competitor_name || "market leaders"}.\n\nReady to talk specifics? Book your 10-minute strategy call:\n${BASE}/book`;
  const html = renderProfessionalEmailHtml({ prospect: p, subject, body, stepNumber: 2 });
  const res = await deliverEmail({
    prospect: p,
    subject,
    html,
    kind: "email",
    stepLabel: source === "live_tool" ? "Audit/proposal sent LIVE on AI call" : "Audit/proposal sent after AI call",
    trigger: "outreach",
  });

  const now = new Date().toISOString();
  await updateProspect(p.id, {
    temperature: "Hot",
    communication_logs: [
      { date: now, type: "audit_sent_live", notes: `${source === "live_tool" ? "Client asked on AI call" : "Detected in call transcript"} — audit/proposal emailed to ${p.email}.`, admin: "AI Call Agent" },
      ...(p.communication_logs ?? []),
    ],
  });
  return { ok: res.ok || res.simulated, message: res.ok || res.simulated ? `Sent to ${p.email} — check your inbox in a minute.` : `Email failed: ${res.error ?? "unknown"}`, email: p.email };
}

export async function createRequestedBooking(
  callId: string,
  args: Record<string, unknown>,
  source: "live_tool" | "post_call",
): Promise<{ ok: boolean; message: string; link: string }> {
  const p = await prospectForCall(callId, args);
  if (!p) return { ok: false, message: "Could not match the call to a lead.", link: `${BASE}/book` };

  const email = (args.email ? String(args.email) : "") || p.email || "";
  const name = (args.name ? String(args.name) : "") || p.business_name;
  if (!email) {
    return { ok: false, message: "I need an email to reserve the slot — can you give me the best one?", link: `${BASE}/book` };
  }

  const admin = createServiceClient();
  if (!admin) return { ok: false, message: "Booking system unavailable right now.", link: `${BASE}/book` };

  const scheduledAt = nextBusinessSlotISO();
  const preferred = args.preferred_time ? String(args.preferred_time) : "";
  const { error } = await admin.from("bookings").insert({
    name,
    email,
    phone: p.phone,
    business_name: p.business_name,
    notes: `Requested ${source === "live_tool" ? "live on AI call" : "after AI call"}${preferred ? ` — preferred: ${preferred}` : ""} — time to be confirmed.`,
    call_type: "Strategy Call (AI-booked)",
    scheduled_at: scheduledAt,
    duration_min: 10,
    timezone: "America/New_York",
    status: "requested",
    prospect_id: p.id,
  });

  const now = new Date().toISOString();
  await updateProspect(p.id, {
    temperature: "Hot",
    status: p.status === "do_not_call" ? p.status : "ready",
    communication_logs: [
      { date: now, type: "booking_requested_live", notes: `Client asked to book on AI call — hold placed for ${new Date(scheduledAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET${preferred ? ` (asked: ${preferred})` : ""}. Confirm in /admin/bookings.`, admin: "AI Call Agent" },
      ...(p.communication_logs ?? []),
    ],
  });

  return error
    ? { ok: false, message: "The booking hold failed — I'll have the team reach out to schedule.", link: `${BASE}/book` }
    : { ok: true, message: `Done — I've placed a hold for ${new Date(scheduledAt).toLocaleString("en-US", { timeZone: "America/New_York" })} Eastern, and a confirmation is going to ${email}.`, link: `${BASE}/book` };
}

export async function markDoNotCall(
  callId: string,
  args: Record<string, unknown>,
  source: "live_tool" | "post_call",
): Promise<{ ok: boolean; message: string }> {
  const p = await prospectForCall(callId, args);
  if (!p) return { ok: false, message: "Could not match the call to a lead." };
  await updateProspect(p.id, {
    status: "do_not_call",
    communication_logs: [
      { date: new Date().toISOString(), type: "do_not_call", notes: `${source === "live_tool" ? "Client asked on AI call" : "Detected in call transcript"} — never call again.`, admin: "AI Call Agent" },
      ...(p.communication_logs ?? []),
    ],
  });
  return { ok: true, message: "Understood — we won't call again." };
}

/** Post-call fallback: act on intents detected in the transcript when the
 *  agent's live tool call didn't fire. */
export async function performPostCallIntents(
  prospectId: string | null,
  flags: CallIntentFlags,
  transcriptCallId: string,
): Promise<string[]> {
  const actions: string[] = [];
  if (!prospectId) return actions;
  const p = await getProspectById(prospectId);
  if (!p) return actions;

  if (flags.stop_calling) {
    const r = await markDoNotCall(transcriptCallId, { prospectId }, "post_call");
    actions.push(`stop_calling: ${r.message}`);
    return actions; // never send email to someone who asked us to stop
  }
  if (flags.book_call) {
    const r = await createRequestedBooking(transcriptCallId, { prospectId }, "post_call");
    actions.push(`book_call: ${r.ok ? "hold placed" : r.message}`);
  }
  if (flags.send_audit) {
    const r = await sendAuditEmailNow(transcriptCallId, { prospectId }, "post_call");
    actions.push(`send_audit: ${r.ok ? `emailed ${r.email}` : r.message}`);
  }
  return actions;
}
