import type { OutreachChannel } from "@/lib/supabase-types";
import {
  MessagingError,
  recipientFor,
  type AdapterResult,
  type AdapterSendContext,
  type ChannelAdapter,
  type VideoPitchPayload,
} from "@/lib/services/messaging/types";
import {
  isRetryableStatus,
  parseRetryAfterMs,
  postJson,
  truncate,
} from "@/lib/services/messaging/http";

/**
 * Meta Graph Send API adapter — powers both Instagram Direct and Facebook
 * Messenger. The two channels share the endpoint and page token; only the
 * recipient id (IGSID vs PSID) differs.
 *
 * Endpoint: POST https://graph.facebook.com/{version}/{page-id}/messages
 * Docs: https://developers.facebook.com/docs/messenger-platform/send-messages
 *       https://developers.facebook.com/docs/instagram-platform/messaging
 */

const GRAPH_BASE = process.env.META_GRAPH_BASE_URL || "https://graph.facebook.com";

function graphVersion(): string {
  const raw = process.env.META_GRAPH_VERSION || "v23.0";
  return raw.startsWith("v") ? raw : `v${raw}`;
}

function parseJsonMap(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) out[key.trim()] = value.trim();
    }
    return out;
  } catch {
    console.warn("[messaging:meta] Ignoring malformed recipient/token JSON env value.");
    return {};
  }
}

function pageToken(pageId: string | null | undefined): string | null {
  const tokens = parseJsonMap(process.env.META_PAGE_ACCESS_TOKENS);
  if (pageId && tokens[pageId]) return tokens[pageId];
  return (
    process.env.META_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    null
  );
}

function resolvePageId(payload: VideoPitchPayload, channel: OutreachChannel): string | null {
  return (
    payload.pageIds?.[channel] ||
    payload.pageId ||
    process.env.META_PAGE_ID ||
    process.env.FACEBOOK_PAGE_ID ||
    null
  );
}

/**
 * Instagram/Messenger cannot resolve an @handle to a messaging id — the
 * platform only exposes IGSIDs/PSIDs from a prior interaction or the Graph
 * API. `INSTAGRAM_HANDLE_TO_ID` / `FACEBOOK_HANDLE_TO_ID` let ops pin known
 * leads until the webhook fills in the real id.
 */
function resolveRecipient(
  payload: VideoPitchPayload,
  channel: OutreachChannel,
): string | null {
  const metadata = payload.metadata ?? {};
  const explicit =
    channel === "instagram"
      ? metadata.igsid || metadata.instagramUserId
      : metadata.psid;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();

  const handle = (recipientFor(payload, channel) ?? "").trim();
  if (!handle) return null;

  const map = parseJsonMap(
    channel === "instagram"
      ? process.env.INSTAGRAM_HANDLE_TO_ID
      : process.env.FACEBOOK_HANDLE_TO_ID,
  );
  const normalized = handle.replace(/^@/, "");
  return (
    map[handle] ||
    map[normalized] ||
    map[`@${normalized}`] ||
    (/^\d{5,}$/.test(handle) ? handle : null)
  );
}

function buildMessage(payload: VideoPitchPayload, text: string) {
  const thumbnail =
    payload.thumbnailUrl || process.env.META_DEFAULT_THUMBNAIL_URL || null;
  const element: Record<string, unknown> = {
    title: truncate(`${payload.leadName || "Hi"}, your video for ${payload.businessName}`, 80),
    subtitle: truncate(text, 80),
    default_action: { type: "web_url", url: payload.videoUrl },
    buttons: [
      {
        type: "web_url",
        url: payload.videoUrl,
        title: "Watch the video",
      },
    ],
  };
  if (thumbnail) element.image_url = thumbnail;

  return {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements: [element],
      },
    },
  };
}

function makeAdapter(channel: "instagram" | "facebook"): ChannelAdapter {
  const label = channel === "instagram" ? "Instagram DM" : "Facebook Messenger";

  return {
    channel,
    label,
    supportsThumbnail: true,

    isConfigured(): boolean {
      const pageId = process.env.META_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
      return Boolean(pageId && pageToken(pageId));
    },

    preflight(payload) {
      const pageId = resolvePageId(payload, channel);
      if (!pageId) {
        return {
          recipient: null,
          errorCode: "meta_page_missing",
          error:
            "No Facebook Page id configured. Set META_PAGE_ID or pass payload.pageId (the Page must own the Instagram account for IG DMs).",
        };
      }
      const token = pageToken(pageId);
      if (!token) {
        return {
          recipient: null,
          pageId,
          errorCode: "meta_token_missing",
          error:
            "No Page access token configured. Set META_PAGE_ACCESS_TOKEN (or META_PAGE_ACCESS_TOKENS for multi-page setups).",
        };
      }
      const recipient = resolveRecipient(payload, channel);
      if (!recipient) {
        return {
          recipient: null,
          pageId,
          errorCode: channel === "instagram" ? "igsid_missing" : "psid_missing",
          error:
            channel === "instagram"
              ? "Instagram messaging requires an Instagram-scoped id (IGSID) captured from a webhook, not an @handle. Pass metadata.igsid or map the handle in INSTAGRAM_HANDLE_TO_ID."
              : "Messenger requires a Page-scoped id (PSID) captured from a webhook, not a vanity URL. Pass metadata.psid or map the handle in FACEBOOK_HANDLE_TO_ID.",
        };
      }
      return { recipient, pageId };
    },

    async send(ctx: AdapterSendContext): Promise<AdapterResult> {
      const pageId = ctx.pageId || resolvePageId(ctx.payload, channel);
      const token = pageToken(pageId);
      if (!pageId || !token) {
        throw new MessagingError("Meta Page id or access token is not configured.", {
          code: "meta_not_configured",
        });
      }

      const body: Record<string, unknown> = {
        recipient: { id: ctx.recipient },
        message: buildMessage(ctx.payload, ctx.text),
      };
      // Messenger cold outreach must respect Meta's 24h window / message tags.
      // Instagram currently accepts RESPONSE only, so omit it there.
      if (channel === "facebook") {
        body.messaging_type = process.env.META_MESSAGING_TYPE || "RESPONSE";
        if (process.env.META_MESSAGE_TAG) body.tag = process.env.META_MESSAGE_TAG;
      }

      let res: Response;
      let data: Record<string, unknown>;
      try {
        ({ res, data } = await postJson(
          `${GRAPH_BASE}/${graphVersion()}/${encodeURIComponent(pageId)}/messages`,
          body,
          { Authorization: `Bearer ${token}` },
        ));
      } catch (err) {
        throw new MessagingError(
          err instanceof Error ? err.message : "Meta Send API request failed.",
          { code: "meta_network_error", retryable: true },
        );
      }

      if (!res.ok) {
        const error = (data.error ?? {}) as {
          message?: string;
          code?: number;
          error_subcode?: number;
          error_user_msg?: string;
          type?: string;
        };
        const code = error.code ?? res.status;
        const retryable =
          isRetryableStatus(res.status) ||
          [1, 2, 4, 17, 32, 613, 1200].includes(Number(code));
        const hint =
          Number(code) === 190
            ? " Page access token expired or was revoked — refresh META_PAGE_ACCESS_TOKEN."
            : Number(code) === 10 || Number(code) === 2018278
              ? " The 24-hour messaging window is closed; send a compliant message tag or wait for the lead to reply."
              : "";
        throw new MessagingError(
          `${error.error_user_msg || error.message || `Meta Send API failed (HTTP ${res.status}).`}${hint}`,
          {
            code: `meta_${code}${error.error_subcode ? `_${error.error_subcode}` : ""}`,
            retryable,
            retryAfterMs: parseRetryAfterMs(res.headers),
            response: data,
          },
        );
      }

      const messageId =
        (data.message_id as string | undefined) ||
        ((data.messages as Array<{ id?: string }> | undefined)?.[0]?.id);
      return { providerMessageId: messageId, response: data };
    },
  };
}

export const instagramAdapter = makeAdapter("instagram");
export const facebookAdapter = makeAdapter("facebook");
