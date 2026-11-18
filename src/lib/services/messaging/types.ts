import type {
  OutreachChannel,
  OutreachStatus,
} from "@/lib/supabase-types";

/**
 * Shared vocabulary for the multi-channel video dispatcher.
 *
 * Every adapter consumes the same `VideoPitchPayload` and returns the same
 * `AdapterResult` shape, so the dispatcher (queue, retries, GHL sync) never
 * needs channel-specific branches.
 */

export const OUTREACH_CHANNELS: OutreachChannel[] = [
  "instagram",
  "facebook",
  "whatsapp",
  "tiktok",
];

export interface WhatsAppTemplateRequest {
  /** Template name registered in WhatsApp Manager. */
  name?: string;
  /** e.g. "en_US". */
  language?: string;
  /** Ordered body variables ({{1}}, {{2}}, …). */
  bodyParams?: string[];
  /** Value for a dynamic URL button. Pass "" to skip the button component. */
  urlButtonParam?: string;
  /** Header image for templates that declare an IMAGE header. */
  headerImageUrl?: string;
}

export interface VideoPitchMetadata {
  /** GHL contact id, when the lead is already in the CRM. */
  ghlContactId?: string;
  /** Lead email — used by GHL to match the contact when no id is present. */
  email?: string;
  /** Messenger PSID / Instagram-scoped id overrides. */
  psid?: string;
  igsid?: string;
  instagramUserId?: string;
  tiktokOpenId?: string;
  openId?: string;
  /** WhatsApp template override (otherwise env defaults apply). */
  whatsappTemplate?: WhatsAppTemplateRequest;
  /** Skip the CRM sync for this message (rare; e.g. internal tests). */
  skipGhl?: boolean;
  /** Free-form extras stored with the outreach log. */
  [key: string]: unknown;
}

/**
 * Unified outbound payload (the blueprint's contract).
 *
 * `platformHandle` is the channel-native recipient for the primary channel;
 * `handles` allows one lead to be fanned out across several platforms in a
 * single dispatch. Instagram and Messenger additionally need the Facebook
 * Page that owns the conversation (`pageId`).
 */
export interface VideoPitchPayload {
  leadName: string;
  businessName: string;
  videoUrl: string;
  /** Optional single-channel hint when no explicit channels array is passed. */
  channel?: OutreachChannel | null;
  /** Optional fan-out list; explicit `channels` on the dispatch call wins. */
  channels?: OutreachChannel[];
  platformHandle?: string | null;
  phoneNumber?: string | null;
  pageId?: string | null;
  thumbnailUrl?: string | null;
  /** Optional pre-written copy. A personalized default is composed otherwise. */
  message?: string | null;
  /** Optional map so one lead can be sent to several channels at once. */
  handles?: Partial<Record<OutreachChannel, string | null>>;
  phoneNumbers?: Partial<Record<OutreachChannel, string | null>>;
  pageIds?: Partial<Record<OutreachChannel, string | null>>;
  metadata?: VideoPitchMetadata;
  /** Set by the API route when dispatching for a stored prospect. */
  prospectId?: string | null;
}

export interface AdapterSendContext {
  payload: VideoPitchPayload;
  recipient: string;
  text: string;
  pageId?: string | null;
}

export interface AdapterResult {
  providerMessageId?: string;
  response?: unknown;
}

export interface AdapterPreflight {
  recipient: string | null;
  pageId?: string | null;
  /** Human-readable reason the payload cannot be dispatched right now. */
  error?: string;
  /** Stable code persisted on outreach_logs.error_code. */
  errorCode?: string;
}

export interface ChannelAdapter {
  channel: OutreachChannel;
  label: string;
  /** Whether a thumbnail can be attached by this channel. */
  supportsThumbnail: boolean;
  /** True when every required credential is present. */
  isConfigured(): boolean;
  /** Resolves + sanity-checks the recipient for this channel. */
  preflight(payload: VideoPitchPayload): AdapterPreflight;
  /** Sends one message. Throws `MessagingError` on failure. */
  send(ctx: AdapterSendContext): Promise<AdapterResult>;
}

/** Error thrown by adapters; carries retry semantics back to the queue. */
export class MessagingError extends Error {
  code: string;
  retryable: boolean;
  retryAfterMs?: number;
  response?: unknown;

  constructor(
    message: string,
    opts: {
      code?: string;
      retryable?: boolean;
      retryAfterMs?: number;
      response?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "MessagingError";
    this.code = opts.code ?? "messaging_error";
    this.retryable = opts.retryable ?? false;
    this.retryAfterMs = opts.retryAfterMs;
    this.response = opts.response;
  }
}

export function channelTag(channel: OutreachChannel): string {
  switch (channel) {
    case "instagram":
      return "ig";
    case "facebook":
      return "fb";
    case "whatsapp":
      return "whatsapp";
    case "tiktok":
      return "tiktok";
  }
}

export function channelLabel(channel: OutreachChannel): string {
  switch (channel) {
    case "instagram":
      return "Instagram DM";
    case "facebook":
      return "Facebook Messenger";
    case "whatsapp":
      return "WhatsApp";
    case "tiktok":
      return "TikTok inbox";
  }
}

export const OUTREACH_STATUS_RANK: Record<OutreachStatus, number> = {
  queued: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
  replied: 5,
  failed: -1,
  cancelled: -1,
};

/** True when `next` is a forward move (or a retry recovering from failed). */
export function shouldAdvanceStatus(
  current: OutreachStatus,
  next: OutreachStatus,
): boolean {
  if (current === next) return false;
  if (current === "replied") return false;
  if (next === "failed") {
    return current === "queued" || current === "sending" || current === "sent";
  }
  if (current === "failed") {
    // A retry can recover into any forward state.
    return next === "sending" || next === "sent" || next === "delivered" || next === "replied";
  }
  return OUTREACH_STATUS_RANK[next] > OUTREACH_STATUS_RANK[current];
}

export function recipientFor(
  payload: VideoPitchPayload,
  channel: OutreachChannel,
): string | null {
  const handle = payload.handles?.[channel] ?? payload.platformHandle ?? null;
  if (channel === "whatsapp") {
    return (
      payload.phoneNumbers?.whatsapp ??
      payload.phoneNumber ??
      handle ??
      null
    );
  }
  return handle;
}

/**
 * Personalized first-touch copy. Kept short because WhatsApp image captions
 * cap at 1,024 characters and Messenger template subtitles at 80.
 */
export function composeVideoMessage(payload: VideoPitchPayload): string {
  const rawName = (payload.leadName || "").trim();
  const parts = rawName.split(/\s+/).filter(Boolean);
  const honorific = /^(dr|mr|mrs|ms|prof|sir|rev)\.?$/i;
  const firstName =
    honorific.test(parts[0] ?? "") && parts[1]
      ? `${parts[0]} ${parts[1]}`
      : parts[0] || "there";
  const business = (payload.businessName || "your business").trim();
  const link = payload.videoUrl.trim();
  return `Hi ${firstName}, I put together a quick 45-second video walkthrough for ${business} — it breaks down the gaps costing you local customers and the exact fix. Watch it here: ${link}`;
}

