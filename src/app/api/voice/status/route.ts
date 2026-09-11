import { NextResponse } from "next/server";
import { finishCall, getCallRecord, upsertCallRecord } from "@/lib/call-store";
import type { CallStatus, CallRecord } from "@/lib/call-store";
import { getProspectById } from "@/lib/prospects";
import { applyContactLog, makeContactLog } from "@/lib/crm-actions";

export const dynamic = "force-dynamic";

/**
 * Twilio Call Status webhook (/api/voice/status).
 * Receives initiated/ringing/answered/completed + busy/no-answer/failed/canceled
 * events and records the live transcript + final outcome into prospect_calls.
 * Preserves the caller record's prospect_id/phone/entries across event replay,
 * and bumps the pipeline when a call is actually answered.
 */
export async function POST(req: Request) {
  const text = await req.text();
  const params = new URLSearchParams(text);
  const callSid = params.get("CallSid") || params.get("sid") || "";
  const status = params.get("CallStatus") || params.get("Status") || "";
  const duration = Number(params.get("CallDuration") || params.get("Duration") || 0);

  const now = new Date().toISOString();

  if (!callSid) {
    return new NextResponse("missing CallSid", { status: 200 });
  }

  const base = (): Promise<CallRecord | null> => getCallRecord(callSid);
  const merge = async (): Promise<CallRecord> => {
    const existing = await base();
    return {
      callSid,
      prospectId: existing?.prospectId ?? null,
      phone: existing?.phone ?? "",
      businessName: existing?.businessName ?? "",
      simulated: existing?.simulated ?? false,
      status: "ringing",
      startedAt: existing?.startedAt ?? now,
      endedAt: existing?.endedAt ?? null,
      durationSec: existing?.durationSec ?? 0,
      entries: existing?.entries ?? [],
      outcome: existing?.outcome ?? null,
    };
  };

  if (status === "ringing" || status === "queued" || status === "initiated") {
    const rec = await merge();
    rec.status = "ringing";
    await upsertCallRecord(rec);
    return new NextResponse("ok", { status: 200 });
  }

  if (status === "in-progress" || status === "answered") {
    const rec = await merge();
    rec.status = "in-progress";
    await upsertCallRecord(rec);
    return new NextResponse("ok", { status: 200 });
  }

  const mapped: CallStatus | null =
    status === "completed"
      ? "completed"
      : status === "busy"
        ? "busy"
        : status === "no-answer"
          ? "no-answer"
          : status === "canceled"
            ? "canceled"
            : status === "failed"
              ? "failed"
              : null;

  if (mapped) {
    const finished = await finishCall(callSid, mapped, duration);
    if (mapped === "completed" && finished?.prospectId) {
      try {
        const p = await getProspectById(finished.prospectId);
        if (p) {
          await applyContactLog(
            p,
            makeContactLog({
              kind: "call",
              trigger: "answered",
              stepLabel: `Call answered ${duration > 0 ? `(${duration}s) ` : ""}`,
              outcome: finished.outcome ?? "completed",
            }),
            "answered",
          );
        }
      } catch (err) {
        console.warn("[voice/status] pipeline bump failed:", err);
      }
    }
  }

  return new NextResponse("ok", { status: 200 });
}