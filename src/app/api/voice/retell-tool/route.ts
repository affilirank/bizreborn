import { NextResponse } from "next/server";
import {
  sendAuditEmailNow,
  createRequestedBooking,
  markDoNotCall,
} from "@/lib/call-actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Retell AI custom function tools — invoked LIVE by the agent mid-call when
 * the client asks for something concrete:
 *
 *   send_audit    → emails the pitch/audit link while the client is still on the phone
 *   book_call     → places a booking hold and reads back the confirmed time
 *   move_forward  → sends the proposal and flags the lead hot
 *   stop_calling  → permanently opts the lead out
 *
 * Register these on the Retell agent as custom tools pointing at
 * `{site}/api/voice/retell-tool` (see /api/voice/retell-setup for one-click
 * registration). The JSON returned is spoken/summarized by the agent.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const callId = String(body.call_id ?? body.callId ?? "");
  const name = String(body.name ?? body.tool ?? body.tool_name ?? "").toLowerCase();
  const args = (body.args ?? body.parameters ?? body.args_json ?? {}) as Record<string, unknown>;

  if (!callId) {
    return NextResponse.json({ error: "call_id missing — the agent could not act." }, { status: 400 });
  }

  switch (name) {
    case "send_audit":
    case "send_proposal":
    case "move_forward": {
      const r = await sendAuditEmailNow(callId, args, "live_tool");
      return NextResponse.json({
        status: r.ok ? "sent" : "failed",
        detail: r.message,
        // The agent says something close to this back to the client:
        say: r.ok
          ? `Perfect — it's on its way to your inbox right now. ${args.email ? "" : "Give it about a minute."}`
          : r.message,
      });
    }
    case "book_call":
    case "schedule_call": {
      const r = await createRequestedBooking(callId, args, "live_tool");
      return NextResponse.json({
        status: r.ok ? "booked" : "failed",
        detail: r.message,
        booking_link: r.link,
        say: r.message,
      });
    }
    case "stop_calling":
    case "opt_out": {
      const r = await markDoNotCall(callId, args, "live_tool");
      return NextResponse.json({ status: r.ok ? "stopped" : "failed", detail: r.message, say: r.message });
    }
    default:
      return NextResponse.json(
        { error: `Unknown tool "${name}". Available: send_audit, book_call, move_forward, stop_calling.` },
        { status: 400 },
      );
  }
}
