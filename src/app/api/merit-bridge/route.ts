/**
 * GoHighLevel v2 High-Intent Bridge — /api/merit-bridge
 *
 * Two auth paths:
 *  1. Master secret (x-merit-bridge-token === MERIT_BRIDGE_SECRET or
 *     SUPABASE_SERVICE_ROLE_KEY) — external automation, any event type.
 *  2. Short-lived prospect-scoped HMAC token minted by the isolated preview
 *     page — browser client events only (audio_played / chat_interaction).
 *
 * Example (automation):
 *   curl -X POST http://localhost:3000/api/merit-bridge \\
 *     -H "Content-Type: application/json" \\
 *     -H "x-merit-bridge-token: <secret>" \\
 *     -d '{"prospectId":"<uuid>","eventType":"audio_played"}'
 */
import { NextResponse } from "next/server";
import { syncProspectToGhl, type GhlEventType } from "@/lib/ghl-bridge";
import { verifyBridgeToken } from "@/lib/preview/bridge-token";

const EVENT_TYPES = new Set<GhlEventType>([
  "audio_played",
  "chat_interaction",
  "lead_capture",
]);
const CLIENT_EVENT_TYPES = new Set<GhlEventType>([
  "audio_played",
  "chat_interaction",
]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      prospectId?: string;
      eventType?: GhlEventType;
      expiresAt?: number;
      name?: string;
      email?: string;
      phone?: string;
    };

    const token = req.headers.get("x-merit-bridge-token") ?? "";
    const masterSecret =
      process.env.MERIT_BRIDGE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
    const prospectId = body.prospectId ?? "";

    const isMaster = Boolean(
      masterSecret && token && token === masterSecret,
    );
    const isScoped = verifyBridgeToken({
      presented: token,
      masterSecret,
      prospectId,
      expiresAt: body.expiresAt,
    });

    if (!isMaster && !isScoped) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (typeof body.prospectId !== "string" || !body.prospectId) {
      return NextResponse.json(
        { error: "prospectId (string) is required." },
        { status: 400 },
      );
    }

    if (!body.eventType || !EVENT_TYPES.has(body.eventType)) {
      return NextResponse.json(
        { error: `eventType must be one of: ${Array.from(EVENT_TYPES).join(", ")}` },
        { status: 400 },
      );
    }

    // Scoped browser tokens may never trigger PII-bearing lead_capture syncs.
    if (isScoped && !isMaster && !CLIENT_EVENT_TYPES.has(body.eventType)) {
      return NextResponse.json(
        { error: "This event type requires master-secret authorization." },
        { status: 403 },
      );
    }

    // Non-blocking GHL sync — fire-and-forget so the caller isn't blocked.
    void syncProspectToGhl(body.prospectId, body.eventType, {
      name: body.name,
      email: body.email,
      phone: body.phone,
    });

    return NextResponse.json({ queued: true, prospectId: body.prospectId, eventType: body.eventType });
  } catch {
    return NextResponse.json({ error: "Bridge request failed." }, { status: 500 });
  }
}
