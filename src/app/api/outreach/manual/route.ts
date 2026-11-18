import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import {
  bridgeManualOutreach,
  cancelManualOutreach,
  markManualOutreachSent,
} from "@/lib/services/messagingDispatcher";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/outreach/manual
 *
 * Completes a cold-outreach row queued by /api/outreach/queue:
 *   { "id": "uuid", "action": "sent", "providerMessageId": "…" }
 *   { "id": "uuid", "action": "cancel" }
 *   { "id": "uuid", "action": "bridge" }   // MANUAL_DM_BRIDGE_URL
 *
 * "sent" is the trigger that syncs `video_sent_<channel>` to GoHighLevel.
 */
export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "sent";

  if (!id) {
    return NextResponse.json({ error: "Outreach log id is required." }, { status: 400 });
  }

  try {
    if (action === "sent") {
      const result = await markManualOutreachSent(id, {
        providerMessageId:
          typeof body.providerMessageId === "string" ? body.providerMessageId : null,
        note: typeof body.note === "string" ? body.note : null,
      });
      return NextResponse.json({
        success: true,
        result,
        message: "Marked sent — GHL tag sync triggered.",
      });
    }

    if (action === "cancel") {
      const result = await cancelManualOutreach(id);
      return NextResponse.json({
        success: true,
        result,
        message: "Removed from the manual queue.",
      });
    }

    if (action === "bridge") {
      const result = await bridgeManualOutreach(id);
      return NextResponse.json({
        success: true,
        result,
        message: "Bridge accepted the message and the row was marked sent.",
      });
    }

    return NextResponse.json(
      { error: 'Unknown action. Use "sent", "cancel", or "bridge".' },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Manual queue action failed." },
      { status: 400 },
    );
  }
}
