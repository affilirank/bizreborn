import { NextResponse } from "next/server";
import { finishCall, upsertCallRecord } from "@/lib/call-store";
import type { CallStatus } from "@/lib/call-store";

export const dynamic = "force-dynamic";

/**
 * Twilio Call Status webhook (/api/voice/status).
 * Receives initiated/ringing/answered/completed + busy/no-answer/failed/canceled
 * events and records the live transcript + final outcome into prospect_calls.
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

  if (status === "ringing" || status === "queued" || status === "initiated") {
    await upsertCallRecord({
      callSid,
      prospectId: null,
      phone: "",
      businessName: "",
      simulated: false,
      status: "ringing",
      startedAt: now,
      endedAt: null,
      durationSec: 0,
      entries: [],
      outcome: null,
    });
    return new NextResponse("ok", { status: 200 });
  }

  if (status === "in-progress" || status === "answered") {
    await upsertCallRecord({
      callSid,
      prospectId: null,
      phone: "",
      businessName: "",
      simulated: false,
      status: "in-progress",
      startedAt: now,
      endedAt: null,
      durationSec: 0,
      entries: [],
      outcome: null,
    });
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
    await finishCall(callSid, mapped, duration);
  }

  return new NextResponse("ok", { status: 200 });
}