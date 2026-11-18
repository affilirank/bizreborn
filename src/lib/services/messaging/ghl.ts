import "server-only";

import type { OutreachDeliveryMode, OutreachLog } from "@/lib/supabase-types";
import { updateOutreachLog } from "@/lib/services/messaging/outreach-store";
import {
  channelLabel,
  channelTag,
  type VideoPitchPayload,
} from "@/lib/services/messaging/types";

/**
 * GoHighLevel CRM sync.
 *
 * Every meaningful outbound event (sent, delivered, replied, failed) posts to
 * the GHL inbound webhook (`GHL_WEBHOOK_URL`). GHL maps `email` / `phone` /
 * `contactId` to the contact and applies the tags we send — e.g.
 * `video_sent_ig`, `video_sent_whatsapp`, `video_replied_fb`.
 *
 * Best-effort: a CRM outage must never fail or block a message that already
 * reached the lead. Failures are stored on the outreach log (`ghl_error`) for
 * retry/observability.
 */

export type GhlEvent = "sent" | "delivered" | "read" | "replied" | "failed";

export interface GhlSyncResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  tags: string[];
}

export function buildGhlTags(
  channel: OutreachLog["channel"],
  event: GhlEvent,
  deliveryMode: OutreachDeliveryMode = "api",
): string[] {
  const tag = channelTag(channel);
  const tags = [
    "video_outreach",
    `channel_${channel}`,
    `video_${event}_${tag}`,
    `video_${event}`,
  ];
  if (deliveryMode === "manual") tags.push("video_manual");
  if (event === "replied") tags.push("replied", "video_replied");
  if (event === "sent") tags.push("video_sent");
  return [...new Set(tags)];
}

function ghlHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.GHL_WEBHOOK_SECRET || process.env.GHL_API_KEY;
  if (secret) {
    headers["x-bizreborn-secret"] = secret;
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}

export function ghlPayloadFromLog(
  log: OutreachLog,
  event: GhlEvent,
  extra: { text?: string | null } = {},
): Record<string, unknown> {
  const stored = (log.payload ?? {}) as Partial<VideoPitchPayload>;
  const metadata = stored.metadata ?? {};
  const leadName =
    stored.leadName || log.recipient_name || stored.businessName || "Lead";
  const phone =
    log.channel === "whatsapp" && log.recipient && !log.recipient.startsWith("+")
      ? `+${log.recipient}`
      : log.recipient;

  return {
    source: "bizreborn-video-dispatcher",
    event,
    eventAt: new Date().toISOString(),
    contactId: metadata.ghlContactId || undefined,
    email: metadata.email || undefined,
    phone,
    firstName: leadName,
    companyName: stored.businessName || undefined,
    businessName: stored.businessName || undefined,
    leadName,
    tags: buildGhlTags(log.channel, event, log.delivery_mode ?? "api"),
    channel: log.channel,
    channelLabel: channelLabel(log.channel),
    status: log.status,
    direction: log.direction,
    deliveryMode: log.delivery_mode ?? "api",
    prospectId: log.prospect_id || stored.prospectId || undefined,
    outreachLogId: log.id,
    providerMessageId: log.provider_message_id || undefined,
    videoUrl: log.video_url || undefined,
    thumbnailUrl: log.thumbnail_url || undefined,
    message: extra.text || log.message || undefined,
    errorCode: log.error_code || undefined,
    errorMessage: log.error_message || undefined,
  };
}

export async function syncOutreachToGhl(
  log: OutreachLog,
  event: GhlEvent,
  options: { text?: string | null } = {},
): Promise<GhlSyncResult> {
  const tags = buildGhlTags(log.channel, event, log.delivery_mode ?? "api");
  const url = process.env.GHL_WEBHOOK_URL;

  if ((log.payload as { metadata?: { skipGhl?: boolean } } | null)?.metadata?.skipGhl) {
    return { ok: true, skipped: true, tags };
  }
  if (!url) {
    return { ok: false, skipped: true, tags, error: "GHL_WEBHOOK_URL is not configured." };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify(ghlPayloadFromLog(log, event, options)),
      signal: AbortSignal.timeout(Number(process.env.GHL_TIMEOUT_MS || 10_000)),
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const error = `GHL webhook failed (HTTP ${res.status})${text ? `: ${text.slice(0, 300)}` : ""}`;
      await updateOutreachLog(log.id, { ghl_error: error });
      return { ok: false, tags, error };
    }
    await updateOutreachLog(log.id, {
      ghl_synced_at: new Date().toISOString(),
      ghl_error: null,
    });
    return { ok: true, tags };
  } catch (err) {
    const error = err instanceof Error ? err.message : "GHL webhook exception";
    await updateOutreachLog(log.id, { ghl_error: error });
    return { ok: false, tags, error };
  }
}
