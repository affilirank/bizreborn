import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { getProspectById } from "@/lib/prospects";
import type { OutreachChannel, Prospect } from "@/lib/supabase-types";
import {
  dispatchVideoPitch,
  inferChannels,
} from "@/lib/services/messagingDispatcher";
import {
  OUTREACH_CHANNELS,
  type VideoPitchMetadata,
  type VideoPitchPayload,
} from "@/lib/services/messaging/types";
import {
  absoluteUrl,
  channelsForProspect,
  channelsFromInput,
  clean,
  socialHandle,
} from "@/lib/services/messaging/request";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/outreach/dispatch
 *
 * Fan a generated video pitch out to Instagram, Messenger, WhatsApp, and/or
 * TikTok. Accepts either a stored `prospectId` or an explicit payload:
 *
 * {
 *   "prospectId": "uuid",
 *   "channels": ["instagram", "whatsapp"],
 *   "videoUrl": "https://loom.com/share/…",   // optional override
 *   "pageId": "1234567890",                  // optional Page override
 *   "ghlContactId": "ghl_…",                 // optional CRM match
 *   "payload": { …unified VideoPitchPayload }
 * }
 */
export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nested =
    body.payload && typeof body.payload === "object"
      ? (body.payload as Record<string, unknown>)
      : {};

  const prospectId =
    clean(body.prospectId) || clean(body.id) || clean(nested.prospectId);
  let prospect: Prospect | null = null;
  if (prospectId) {
    prospect = await getProspectById(prospectId);
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
    }
  }

  const rawChannels = body.channels ?? nested.channels;
  const rawChannel = body.channel ?? nested.channel;
  const explicitChannels = channelsFromInput(rawChannels, rawChannel);
  const hasChannelHint =
    (Array.isArray(rawChannels) && rawChannels.length > 0) ||
    (typeof rawChannel === "string" && rawChannel.trim().length > 0);
  if (hasChannelHint && explicitChannels.length === 0) {
    return NextResponse.json(
      {
        error: `No valid channels. Use any of: ${OUTREACH_CHANNELS.join(", ")}.`,
      },
      { status: 400 },
    );
  }
  const channels = explicitChannels.length
    ? explicitChannels
    : prospect
      ? channelsForProspect(prospect)
      : [];

  const handlesInput =
    (nested.handles && typeof nested.handles === "object"
      ? (nested.handles as Record<string, unknown>)
      : {}) as Record<string, unknown>;
  const bodyHandles =
    (body.handles && typeof body.handles === "object"
      ? (body.handles as Record<string, unknown>)
      : {}) as Record<string, unknown>;

  const handles: Partial<Record<OutreachChannel, string | null>> = {
    instagram:
      clean(handlesInput.instagram) ||
      clean(bodyHandles.instagram) ||
      socialHandle(prospect?.instagram ?? null),
    facebook:
      clean(handlesInput.facebook) ||
      clean(bodyHandles.facebook) ||
      socialHandle(prospect?.facebook ?? null),
    tiktok:
      clean(handlesInput.tiktok) ||
      clean(bodyHandles.tiktok) ||
      socialHandle(prospect?.tiktok ?? null),
    whatsapp:
      clean(handlesInput.whatsapp) ||
      clean(bodyHandles.whatsapp) ||
      clean(body.phoneNumber) ||
      prospect?.phone ||
      null,
  };

  const businessName =
    clean(nested.businessName) || clean(body.businessName) || prospect?.business_name || null;
  const leadName =
    clean(nested.leadName) ||
    clean(body.leadName) ||
    businessName ||
    prospect?.business_name ||
    "there";

  const fallbackVideo = prospect?.slug ? `/pitch/${prospect.slug}` : null;
  const videoUrl = absoluteUrl(
    clean(nested.videoUrl) ||
      clean(body.videoUrl) ||
      prospect?.video_url ||
      fallbackVideo,
  );
  const thumbnailUrl = absoluteUrl(
    clean(nested.thumbnailUrl) || clean(body.thumbnailUrl) || prospect?.thumbnail_url || null,
  );

  if (!businessName) {
    return NextResponse.json(
      { error: "businessName is required (or pass a valid prospectId)." },
      { status: 400 },
    );
  }
  if (!videoUrl) {
    return NextResponse.json(
      { error: "videoUrl is required (or generate a pitch video for the prospect first)." },
      { status: 400 },
    );
  }

  const singleChannel = channels.length === 1 ? channels[0] : null;
  const platformHandle =
    clean(nested.platformHandle) ||
    clean(body.platformHandle) ||
    (singleChannel ? handles[singleChannel] ?? null : null);

  const metadataInput =
    nested.metadata && typeof nested.metadata === "object"
      ? (nested.metadata as VideoPitchMetadata)
      : {};
  const metadata: VideoPitchMetadata = {
    ...metadataInput,
    email: clean(metadataInput.email) || prospect?.email || undefined,
    ghlContactId:
      clean(body.ghlContactId) ||
      clean(metadataInput.ghlContactId) ||
      undefined,
    skipGhl:
      body.skipGhl === true || nested.skipGhl === true || metadataInput.skipGhl,
  };

  const payload: VideoPitchPayload = {
    leadName,
    businessName,
    videoUrl,
    channel: singleChannel,
    platformHandle,
    phoneNumber:
      clean(nested.phoneNumber) ||
      clean(body.phoneNumber) ||
      prospect?.phone ||
      null,
    pageId: clean(nested.pageId) || clean(body.pageId) || null,
    thumbnailUrl,
    message: clean(nested.message) || clean(body.message) || null,
    handles,
    phoneNumbers:
      nested.phoneNumbers && typeof nested.phoneNumbers === "object"
        ? (nested.phoneNumbers as VideoPitchPayload["phoneNumbers"])
        : undefined,
    pageIds:
      nested.pageIds && typeof nested.pageIds === "object"
        ? (nested.pageIds as VideoPitchPayload["pageIds"])
        : undefined,
    metadata,
    prospectId: prospect?.id ?? null,
  };

  const resolvedChannels = channels.length ? channels : inferChannels(payload);
  if (resolvedChannels.length === 0) {
    return NextResponse.json(
      {
        error:
          "No channels available. Pass channels: [instagram|facebook|whatsapp|tiktok] or store an Instagram/Facebook/TikTok handle or phone number on the prospect.",
      },
      { status: 400 },
    );
  }

  const maxAttemptsRaw = Number(body.maxAttempts ?? nested.maxAttempts);
  const summary = await dispatchVideoPitch({
    payload,
    channels: resolvedChannels,
    prospect,
    maxAttempts: Number.isFinite(maxAttemptsRaw) ? maxAttemptsRaw : undefined,
    requestedBy: `admin:${req.headers.get("x-forwarded-for") ?? "session"}`,
    skipGhl: body.skipGhl === true,
  });

  const failures = summary.results.filter((r) => r.status !== "sent");
  return NextResponse.json({
    success: failures.length === 0,
    sent: summary.sent,
    failed: summary.failed,
    channels: summary.channels,
    results: summary.results,
    message:
      failures.length === 0
        ? "Video pitch dispatched on every selected channel."
        : summary.sent > 0
          ? `Dispatched on ${summary.sent}/${summary.results.length} channels. ${failures
              .map((f) => `${f.channelLabel}: ${f.error ?? "failed"}`)
              .join("; ")}`
          : failures.map((f) => `${f.channelLabel}: ${f.error ?? "failed"}`).join("; "),
  });
}
