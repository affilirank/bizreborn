import { createServiceClient } from "@/lib/supabase/admin";
import { getSupabase } from "@/lib/supabase";

export interface CallTranscriptEntry {
  role: "ai" | "user" | "system";
  text: string;
  time: string;
}

export type CallStatus =
  | "dialing"
  | "ringing"
  | "in-progress"
  | "completed"
  | "failed"
  | "no-answer"
  | "busy"
  | "canceled";

export interface CallRecord {
  callSid: string;
  prospectId: string | null;
  phone: string;
  businessName: string;
  simulated: boolean;
  status: CallStatus;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  entries: CallTranscriptEntry[];
  outcome: string | null;
}

/**
 * Call records store.
 *
 * Persists each AI voice call to the `prospect_calls` table (shared across
 * serverless instances — Twilio webhooks and the CRM poll can land on
 * different lambdas), with an in-memory fallback so calls still record when
 * the table/client isn't configured.
 */
let tableMissing = false;

async function serviceDb() {
  const service = createServiceClient();
  if (service) return service;
  const anon = getSupabase();
  return anon;
}

const memoryCalls = new Map<string, CallRecord>();

function toRecord(row: any): CallRecord {
  return {
    callSid: row.call_sid,
    prospectId: row.prospect_id,
    phone: row.phone,
    businessName: row.business_name ?? "Business",
    simulated: Boolean(row.simulated),
    status: (row.status ?? "in-progress") as CallStatus,
    startedAt: row.started_at ?? new Date().toISOString(),
    endedAt: row.ended_at ?? null,
    durationSec: Number(row.duration_sec ?? 0),
    entries: Array.isArray(row.entries) ? (row.entries as CallTranscriptEntry[]) : [],
    outcome: row.outcome ?? null,
  };
}

export async function upsertCallRecord(rec: CallRecord): Promise<CallRecord> {
  memoryCalls.set(rec.callSid, rec);
  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const { error } = await sb
      .from("prospect_calls")
      .upsert(
        {
          call_sid: rec.callSid,
          prospect_id: rec.prospectId,
          phone: rec.phone,
          business_name: rec.businessName,
          simulated: rec.simulated,
          status: rec.status,
          started_at: rec.startedAt,
          ended_at: rec.endedAt,
          duration_sec: rec.durationSec,
          entries: rec.entries,
          outcome: rec.outcome,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "call_sid" },
      );
    if (error) {
      const msg = error.message ?? error.code ?? "";
      if (/Could not find the table|relation .* does not exist|PGRST205|PGRST204/i.test(msg)) {
        tableMissing = true;
      }
    }
  }
  return rec;
}

export async function getCallRecord(callSid: string): Promise<CallRecord | null> {
  if (memoryCalls.has(callSid)) return memoryCalls.get(callSid)!;
  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const { data, error } = await sb.from("prospect_calls").select("*").eq("call_sid", callSid).maybeSingle();
    if (!error && data) {
      const rec = toRecord(data);
      memoryCalls.set(callSid, rec);
      return rec;
    }
  }
  return null;
}

export async function getLatestCallRecord(prospectId: string): Promise<CallRecord | null> {
  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const { data, error } = await sb
      .from("prospect_calls")
      .select("*")
      .eq("prospect_id", prospectId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      const rec = toRecord(data);
      memoryCalls.set(rec.callSid, rec);
      return rec;
    }
  }
  let latest: CallRecord | null = null;
  for (const rec of memoryCalls.values()) {
    if (rec.prospectId === prospectId) {
      if (!latest || rec.startedAt > latest.startedAt) latest = rec;
    }
  }
  return latest;
}

export async function appendCallEntry(
  callSid: string,
  entry: CallTranscriptEntry,
): Promise<CallRecord | null> {
  const rec = await getCallRecord(callSid);
  if (!rec) return null;
  const prev = rec.entries;
  const last = prev[prev.length - 1];
  if (last && last.role === entry.role && entry.text === last.text) return rec;
  rec.entries = [...prev, entry];
  rec.outcome = summarizeOutcome(rec.entries);
  return upsertCallRecord(rec);
}

export async function finishCall(
  callSid: string,
  status: CallStatus,
  durationSec: number,
): Promise<CallRecord | null> {
  const rec = await getCallRecord(callSid);
  if (!rec) return null;
  rec.status = status;
  rec.endedAt = new Date().toISOString();
  rec.durationSec = durationSec > 0 ? durationSec : Math.max(rec.durationSec, 0);
  rec.outcome = summarizeOutcome(rec.entries) ?? defaultOutcome(status);
  return upsertCallRecord(rec);
}

function defaultOutcome(status: CallStatus): string {
  switch (status) {
    case "no-answer":
      return "No answer — voicemail left";
    case "busy":
      return "Line busy — will retry";
    case "failed":
    case "canceled":
      return `Call ${status}`;
    case "completed":
      return "Call answered — outcome tied to conversation";
    default:
      return "In progress";
  }
}

function summarizeOutcome(entries: CallTranscriptEntry[]): string | null {
  const userLines = entries
    .filter((e) => e.role === "user")
    .map((e) => e.text.toLowerCase());
  if (userLines.length === 0) return null;
  const joined = userLines.join(" ");

  const positives = [/\b(yes|sure|great|okay|ok\b|sounds good|interested|absolutely|schedule|book)\b/];
  const negatives = [/\b(no thanks|not interested|no interest|stop calling|take me off|already have|don'?t need)\b/];
  const callbacks = [/\b(call me (back|later)|callback|another time|next (week|monday|day))\b/];
  const emails = [/\b(email|send.*email|text.*(link|over)|email me)\b/];
  const voicemail = [/\b(voicemail|msg|message screen)\b/];

  const found = (regs: RegExp[]) => regs.some((r) => r.test(joined));

  if (found(callbacks)) return "Interested — requested a callback";
  if (found(emails)) return "Interested — asked for pitch email/audit link";
  if (found(negatives)) return "Not interested — polite no";
  if (found(positives)) return "Interested — likely to book a call";

  return joined.length > 0 ? "Call answered — needs follow-up" : null;
}