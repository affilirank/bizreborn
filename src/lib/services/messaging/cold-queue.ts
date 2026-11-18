import "server-only";

import type { OutreachChannel, Prospect } from "@/lib/supabase-types";
import {
  queueManualOutreach,
  type ManualQueueSummary,
} from "@/lib/services/messagingDispatcher";
import {
  absoluteUrl,
  channelsForProspect,
  socialHandle,
} from "@/lib/services/messaging/request";
import {
  cityMatchesColdQueue,
  coldQueueEnabled,
  configuredColdChannels,
} from "@/lib/services/messaging/cold-queue-config";

export interface QueueProspectOptions {
  /** Override OUTREACH_QUEUE_CHANNELS for one call. */
  channels?: OutreachChannel[];
  requestedBy?: string | null;
  /** Bypass the on-ready flag/city filter (manual re-queue from an admin action). */
  force?: boolean;
}

function httpThumbnail(value: string | null | undefined): string | null {
  if (!value || !/^https?:\/\//i.test(value)) return null;
  return value;
}

/**
 * Pushes one rendered prospect into the manual cold-outreach queue.
 *
 * Called automatically after the audit/video pipeline reaches `ready`, and
 * reusable from any future admin "queue for DM" action. Returns null when the
 * lead is filtered out (disabled, wrong city, no social handle, no video URL).
 */
export async function queueProspectForColdOutreach(
  prospect: Prospect,
  options: QueueProspectOptions = {},
): Promise<ManualQueueSummary | null> {
  if (!options.force) {
    if (!coldQueueEnabled()) return null;
    if (!cityMatchesColdQueue(prospect.city)) return null;
  }

  const requested = options.channels?.length
    ? options.channels
    : configuredColdChannels();
  const available = channelsForProspect(prospect);
  const channels = requested.filter((channel) => available.includes(channel));
  if (channels.length === 0) return null;

  const videoUrl = absoluteUrl(
    prospect.video_url || (prospect.slug ? `/pitch/${prospect.slug}` : null),
  );
  if (!videoUrl) return null;

  const handles: Partial<Record<OutreachChannel, string | null>> = {
    instagram: socialHandle(prospect.instagram ?? null),
    facebook: socialHandle(prospect.facebook ?? null),
    tiktok: socialHandle(prospect.tiktok ?? null),
    whatsapp: prospect.phone ?? null,
  };

  return queueManualOutreach({
    payload: {
      leadName: prospect.business_name,
      businessName: prospect.business_name,
      videoUrl,
      platformHandle: channels.length === 1 ? handles[channels[0]] ?? null : null,
      phoneNumber: prospect.phone ?? null,
      thumbnailUrl: httpThumbnail(prospect.thumbnail_url),
      handles,
      metadata: {
        email: prospect.email ?? undefined,
        campaign: "google-profile-revamp-sprint",
      },
      prospectId: prospect.id,
    },
    channels,
    prospect,
    requestedBy: options.requestedBy ?? "pipeline:ready",
  });
}
