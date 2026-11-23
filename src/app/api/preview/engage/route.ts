/**
 * Lightweight, public engagement tracker for /impressive-site/[id].
 *
 * The browser never sees GHL_API_KEY / MERIT_BRIDGE_SECRET: this route
 * validates the request, stamps the prospect's tracking column, and triggers
 * the server-side GHL v2 sync. Failures are swallowed so preview UX is never
 * interrupted.
 *
 * POST { prospectId: string, eventType: "audio_played" | "chat_interaction" }
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { syncProspectToGhl } from "@/lib/ghl-bridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_TYPES = new Set(["audio_played", "chat_interaction"] as const);
type EngagementEvent = "audio_played" | "chat_interaction";

function ok(extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...extra });
}

export async function POST(req: Request) {
  let prospectId = "";
  let eventType: EngagementEvent | null = null;

  try {
    const body = (await req.json()) as {
      prospectId?: string;
      eventType?: string;
    };
    prospectId = String(body?.prospectId ?? "").trim();
    const candidate = String(body?.eventType ?? "");

    if (!UUID_RE.test(prospectId) || !EVENT_TYPES.has(candidate as EngagementEvent)) {
      return NextResponse.json(
        { ok: false, error: "Invalid prospectId or eventType." },
        { status: 400 },
      );
    }
    eventType = candidate as EngagementEvent;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const admin = createServiceClient();
  if (!admin) return ok({ skipped: "database_unconfigured" });

  try {
    // Validate the prospect actually exists before writing/syncing.
    const { data, error } = await admin
      .from("prospects")
      .select("id")
      .eq("id", prospectId)
      .maybeSingle();

    if (error || !data) return ok({ skipped: "prospect_not_found" });

    // Keep the latest engagement timestamp (idempotent for repeat sessions).
    const { error: updateError } = await admin
      .from("prospects")
      .update({ [eventType]: new Date().toISOString() })
      .eq("id", prospectId);

    if (updateError) {
      console.warn("[preview:engage] timestamp update failed:", updateError.message);
    }
  } catch (err) {
    console.warn("[preview:engage] database error:", err);
  }

  try {
    await syncProspectToGhl(prospectId, eventType);
  } catch (err) {
    console.warn("[preview:engage] GHL sync error:", err);
  }

  return ok({ prospectId, eventType });
}
