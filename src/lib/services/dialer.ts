import "server-only";
import type { Prospect } from "@/lib/supabase-types";
import { upsertCallRecord } from "@/lib/call-store";

/**
 * Reusable Retell AI dialer — used by the manual "Call" action AND the
 * business-hours auto-caller, so both paths get identical transcripts,
 * metadata, and dynamic variables.
 */

export interface DialResult {
  ok: boolean;
  callId?: string;
  error?: string;
}

export function buildRetellDynVars(p: Prospect): Record<string, string> {
  const roi = p.roi_projection;
  return {
    contact_name: "the business owner",
    business_name: p.business_name,
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

export function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

export async function dialProspect(p: Prospect): Promise<DialResult> {
  const retellKey = process.env.RETELL_API_KEY;
  const retellAgent = process.env.RETELL_AGENT_ID;
  if (!retellKey || !retellAgent) {
    return { ok: false, error: "Retell is not configured (RETELL_API_KEY / RETELL_AGENT_ID)." };
  }
  const phone = p.phone;
  if (!phone) return { ok: false, error: "No phone number on the lead." };
  const e164 = toE164(phone);
  if (!e164) return { ok: false, error: `Invalid phone number: ${phone}` };

  const fromNumber = process.env.RETELL_FROM_NUMBER;
  const res = await fetch("https://api.retellai.com/v2/create-phone-call", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${retellKey}` },
    body: JSON.stringify({
      to_number: e164,
      ...(fromNumber ? { from_number: fromNumber } : { from_agent: retellAgent }),
      retell_llm_dynamic_variables: buildRetellDynVars(p),
      metadata: { prospectId: p.id, businessName: p.business_name },
      reduced_latency: true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: `Retell call failed: ${(data as Record<string, unknown>)?.message || res.status}` };
  }
  const callId = String((data as Record<string, unknown>).call_id ?? `retell_${Date.now()}`);
  await upsertCallRecord({
    callSid: callId,
    prospectId: p.id,
    phone: e164,
    businessName: p.business_name,
    simulated: false,
    status: "dialing",
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationSec: 0,
    entries: [
      {
        role: "system",
        text: `Auto-call initiated to ${e164} for ${p.business_name}.`,
        time: new Date().toLocaleTimeString(),
      },
    ],
    outcome: null,
  });
  return { ok: true, callId };
}

/** Is it within the calling window right now (Mon–Fri, 10:00–19:00 ET)? */
export function withinBusinessHours(now = new Date()): { ok: boolean; et: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hour12: false,
    minute: "numeric",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const minutes = hour * 60 + minute;
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const ok = isWeekday && minutes >= 600 && minutes <= 1140; // 10:00–19:00 ET
  return { ok, et: `${weekday} ${hour}:${String(minute).padStart(2, "0")} ET` };
}
