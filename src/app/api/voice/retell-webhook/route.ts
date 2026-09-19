import { NextResponse } from "next/server";
import { upsertCallRecord, appendCallEntry } from "@/lib/call-store";
import { getProspectById } from "@/lib/prospects";
import { applyContactLog, makeContactLog } from "@/lib/crm-actions";
import { classifyCallTranscript, intentSummary } from "@/lib/call-intent";
import { performPostCallIntents } from "@/lib/call-actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Retell AI webhook — receives call_started / call_ended / call_analyzed
 * events for the audit follow-up agent and writes the outcome back into the
 * call log + the lead's CRM pipeline. Payload shape is tolerant: Retell has
 * shipped additive fields before; nothing here may throw on unknown shapes.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ received: true });
  }

  try {
    const event = String((body as Record<string, unknown>).event ?? "call_ended");
    const callId = String((body as Record<string, unknown>).call_id ?? "");
    if (!callId) return NextResponse.json({ received: true });

    const payload = body as Record<string, unknown>;
    const metadata = (payload.metadata ?? {}) as Record<string, unknown>;
    const prospectId = String(metadata.prospectId ?? "") || null;
    const businessName = String(metadata.businessName ?? "") || "Business";

    // Transcript → conversation entries.
    type Entry = { role: "user" | "ai" | "system"; text: string; time: string };
    const entries: Entry[] = [];
    const transcript = payload.transcript as unknown;
    if (Array.isArray(transcript)) {
      const now = new Date().toLocaleTimeString();
      for (const item of transcript) {
        const t = item as Record<string, unknown>;
        const role = String(t.role ?? "");
        const content = String(t.content ?? "");
        if (!content) continue;
        entries.push({ role: role === "agent" ? "ai" : "user", text: content, time: now });
      }
    }

    const analysis = (payload.call_analysis ?? {}) as Record<string, unknown>;
    const summary = String(analysis.call_summary ?? "");
    const successful = payload.call_analysis ? Boolean(analysis.call_successful) : undefined;
    const sentiment = String(analysis.user_sentiment ?? "");
    const durationMs = Number(payload.duration_ms ?? 0);
    const disconnect = String(payload.disconnection_reason ?? "");

    const startedAt = payload.start_timestamp ? new Date(Number(payload.start_timestamp)).toISOString() : new Date().toISOString();
    const endedAt = payload.end_timestamp ? new Date(Number(payload.end_timestamp)).toISOString() : new Date().toISOString();

    await upsertCallRecord({
      callSid: callId,
      prospectId,
      phone: "",
      businessName,
      simulated: false,
      status: "completed",
      startedAt,
      endedAt,
      durationSec: Math.round(durationMs / 1000),
      entries,
      outcome: summary
        ? `${disconnect || "ended"}${sentiment ? ` · sentiment: ${sentiment}` : ""}${successful != null ? ` · booked: ${successful ? "yes" : "no"}` : ""}${summary ? ` — ${summary.slice(0, 220)}` : ""}`
        : null,
    });
    for (const e of entries) await appendCallEntry(callId, e);
    if (summary) await appendCallEntry(callId, { role: "system", text: `Post-call analysis: ${summary}`, time: new Date().toLocaleTimeString() });

    // CRM pipeline log so the lead shows the call outcome.
    if (prospectId) {
      const p = await getProspectById(prospectId);
      if (p) {
        // Detect what the client actually asked for, and DO it (send audit /
        // place booking hold / honor stop-calling) even when the agent's live
        // tool call didn't fire.
        const userLines = entries.filter((e) => e.role === "user").map((e) => e.text);
        const flags = classifyCallTranscript(userLines, { disconnectionReason: disconnect, callSuccessful: successful });
        const performed = await performPostCallIntents(prospectId, flags, callId);

        const label = summary
          ? `AI call (${disconnect || "ended"}${sentiment ? `, ${sentiment}` : ""}): ${summary.slice(0, 180)}`
          : `AI call ended (${disconnect || "no details"})`;
        await applyContactLog(
          p,
          makeContactLog({ kind: "call", trigger: "outreach", stepLabel: flags.book_call || flags.send_audit || flags.stop_calling ? `${label} — ${intentSummary(flags)}${performed.length ? ` → ${performed.join("; ")}` : ""}` : label }),
          "outreach",
        );
      }
    }
  } catch (err) {
    console.warn("[retell-webhook] failed to process event:", err);
  }

  return NextResponse.json({ received: true });
}
