/**
 * GoHighLevel v2 High-Intent Bridge — /api/merit-bridge
 *
 * Protected endpoint for external automation / manual curl tests.
 * Browser preview events use the public /api/preview/engage route instead.
 *
 * Example:
 *   curl -X POST http://localhost:3000/api/merit-bridge \\
 *     -H "Content-Type: application/json" \\
 *     -H "x-merit-bridge-token: <secret>" \\
 *     -d '{"prospectId":"<uuid>","eventType":"audio_played"}'
 */
import { NextResponse } from "next/server";
import { syncProspectToGhl, type GhlEventType } from "@/lib/ghl-bridge";

const EVENT_TYPES = new Set<GhlEventType>([
  "audio_played",
  "chat_interaction",
  "lead_capture",
]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function verifyAuth(req: Request): boolean {
  const secret = process.env.MERIT_BRIDGE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return false;
  const token = req.headers.get("x-merit-bridge-token") ?? "";
  // Simple constant-time-ish comparison to avoid timing leaks.
  if (token.length !== secret.length) return false;
  let match = true;
  for (let i = 0; i < token.length; i++) {
    if (token.charCodeAt(i) !== secret.charCodeAt(i)) match = false;
  }
  return match;
}

export async function POST(req: Request) {
  try {
    if (!verifyAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      prospectId?: string;
      eventType?: GhlEventType;
      name?: string;
      email?: string;
      phone?: string;
    };
    const { prospectId, eventType, name, email, phone } = body ?? {};

    if (!prospectId || typeof prospectId !== "string") {
      return NextResponse.json(
        { error: "prospectId (string) is required." },
        { status: 400 },
      );
    }

    if (!eventType || !EVENT_TYPES.has(eventType)) {
      return NextResponse.json(
        { error: `eventType must be one of: ${Array.from(EVENT_TYPES).join(", ")}` },
        { status: 400 },
      );
    }

    // Non-blocking GHL sync — fire-and-forget so the caller isn't blocked.
    void syncProspectToGhl(prospectId, eventType, { name, email, phone });

    return NextResponse.json({ queued: true, prospectId, eventType });
  } catch {
    return NextResponse.json({ error: "Bridge request failed." }, { status: 500 });
  }
}
