import { NextResponse } from "next/server";
import type { OutreachChannel } from "@/lib/supabase-types";
import {
  parseMetaEvents,
  parseTikTokEvents,
  parseWhatsAppEvents,
  timingSafeStringEqual,
  verifyMetaSignature,
  verifyTikTokSignature,
} from "@/lib/services/messaging/webhooks";
import { processMessagingEvents } from "@/lib/services/messaging/events";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChannelRoute = "instagram" | "facebook" | "meta" | "whatsapp" | "tiktok";

function normalizeChannel(value: string): ChannelRoute | null {
  const channel = value.trim().toLowerCase();
  if (
    channel === "instagram" ||
    channel === "facebook" ||
    channel === "meta" ||
    channel === "whatsapp" ||
    channel === "tiktok"
  ) {
    return channel;
  }
  return null;
}

function verifyTokenFor(channel: ChannelRoute): string | null {
  if (channel === "whatsapp") {
    return process.env.WHATSAPP_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || null;
  }
  return (
    process.env.META_VERIFY_TOKEN ||
    process.env.INSTAGRAM_VERIFY_TOKEN ||
    process.env.FACEBOOK_VERIFY_TOKEN ||
    process.env.WHATSAPP_VERIFY_TOKEN ||
    null
  );
}

function appSecretFor(channel: ChannelRoute): string | null {
  if (channel === "whatsapp") {
    return process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || null;
  }
  if (channel === "instagram") {
    return process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || null;
  }
  if (channel === "facebook") {
    return process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || null;
  }
  return (
    process.env.META_APP_SECRET ||
    process.env.INSTAGRAM_APP_SECRET ||
    process.env.FACEBOOK_APP_SECRET ||
    null
  );
}

/**
 * GET /api/webhooks/messaging/{instagram|facebook|meta|whatsapp}
 * Meta webhook verification handshake (`hub.challenge`).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel: raw } = await params;
  const channel = normalizeChannel(raw);
  if (!channel || channel === "tiktok") {
    return NextResponse.json({ error: "Unsupported webhook channel." }, { status: 404 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = verifyTokenFor(channel);

  if (!expected) {
    return NextResponse.json(
      { error: "Webhook verify token is not configured (META_VERIFY_TOKEN / WHATSAPP_VERIFY_TOKEN)." },
      { status: 503 },
    );
  }
  if (mode === "subscribe" && timingSafeStringEqual(token, expected) && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ error: "Verification failed." }, { status: 403 });
}

/**
 * POST /api/webhooks/messaging/{instagram|facebook|meta|whatsapp|tiktok}
 *
 * Handles delivery/read receipts, outbound echoes, and inbound replies.
 * Every request is signature-verified before it can mutate the queue.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel: raw } = await params;
  const channel = normalizeChannel(raw);
  if (!channel) {
    return NextResponse.json({ error: "Unsupported webhook channel." }, { status: 404 });
  }

  const rawBody = await req.text();

  if (channel === "tiktok") {
    const secret = process.env.TIKTOK_WEBHOOK_SECRET || null;
    if (!secret) {
      return NextResponse.json(
        { error: "TIKTOK_WEBHOOK_SECRET is not configured." },
        { status: 503 },
      );
    }
    if (!verifyTikTokSignature(rawBody, req.headers, secret)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
  } else {
    const secret = appSecretFor(channel);
    if (!secret) {
      return NextResponse.json(
        {
          error:
            "Meta app secret is not configured (META_APP_SECRET / WHATSAPP_APP_SECRET). Refusing unsigned webhooks.",
        },
        { status: 503 },
      );
    }
    const signature =
      req.headers.get("x-hub-signature-256") || req.headers.get("x-hub-signature");
    if (!verifyMetaSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const hint: OutreachChannel | undefined =
    channel === "instagram"
      ? "instagram"
      : channel === "facebook"
        ? "facebook"
        : undefined;

  const events =
    channel === "whatsapp"
      ? parseWhatsAppEvents(payload)
      : channel === "tiktok"
        ? parseTikTokEvents(payload)
        : parseMetaEvents(payload, hint);

  const result = await processMessagingEvents(events);

  return NextResponse.json({
    ok: true,
    channel,
    ...result,
  });
}
