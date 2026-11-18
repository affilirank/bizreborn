import {
  MessagingError,
  recipientFor,
  type AdapterResult,
  type AdapterSendContext,
  type ChannelAdapter,
  type VideoPitchPayload,
} from "@/lib/services/messaging/types";
import { isRetryableStatus, parseRetryAfterMs, postJson } from "@/lib/services/messaging/http";

/**
 * TikTok Business Messaging adapter.
 *
 * TikTok does not expose a single public "send DM" endpoint for every business
 * account. This adapter therefore supports both shapes teams actually get:
 *
 *  1. `TIKTOK_MESSAGING_API_URL` — an approved Business API / partner endpoint.
 *  2. `TIKTOK_MESSAGING_WEBHOOK_URL` — a webhook/automation hook (Make, Zapier,
 *     n8n, or an internal service) that owns the creator-inbox delivery.
 *
 * Both are configured, never hard-coded, so a TikTok API revision cannot break
 * the dispatcher at build time.
 */

function endpoint(): { url: string | null; kind: "api" | "webhook" } {
  if (process.env.TIKTOK_MESSAGING_API_URL) {
    return { url: process.env.TIKTOK_MESSAGING_API_URL, kind: "api" };
  }
  if (process.env.TIKTOK_MESSAGING_WEBHOOK_URL) {
    return { url: process.env.TIKTOK_MESSAGING_WEBHOOK_URL, kind: "webhook" };
  }
  return { url: null, kind: "api" };
}

function accessToken(): string | null {
  return process.env.TIKTOK_ACCESS_TOKEN || process.env.TIKTOK_MESSAGING_TOKEN || null;
}

function authHeaders(): Record<string, string> {
  const token = accessToken();
  if (!token) return {};
  const headerName = process.env.TIKTOK_AUTH_HEADER || "Authorization";
  const scheme = process.env.TIKTOK_AUTH_SCHEME ?? "Bearer";
  return { [headerName]: scheme ? `${scheme} ${token}` : token };
}

function resolveRecipient(payload: VideoPitchPayload): string | null {
  const meta = payload.metadata ?? {};
  const explicit = meta.tiktokOpenId || meta.openId;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const handle = (recipientFor(payload, "tiktok") ?? "").trim();
  return handle ? handle.replace(/^@/, "") : null;
}

function messageIdFrom(data: Record<string, unknown>): string | undefined {
  const nested = data.data as Record<string, unknown> | undefined;
  const candidate =
    data.message_id ??
    data.messageId ??
    data.id ??
    nested?.message_id ??
    nested?.messageId ??
    nested?.id;
  return typeof candidate === "string" ? candidate : undefined;
}

export const tiktokAdapter: ChannelAdapter = {
  channel: "tiktok",
  label: "TikTok inbox",
  supportsThumbnail: true,

  isConfigured(): boolean {
    const { url } = endpoint();
    return Boolean(url);
  },

  preflight(payload) {
    const { url } = endpoint();
    if (!url) {
      return {
        recipient: null,
        errorCode: "tiktok_not_configured",
        error:
          "TikTok messaging is not configured. Set TIKTOK_MESSAGING_API_URL (approved Business API) or TIKTOK_MESSAGING_WEBHOOK_URL (automation hook).",
      };
    }
    const recipient = resolveRecipient(payload);
    if (!recipient) {
      return {
        recipient: null,
        errorCode: "tiktok_recipient_missing",
        error:
          "TikTok dispatch needs a creator/business handle, open id, or user id (payload.platformHandle / metadata.tiktokOpenId).",
      };
    }
    return { recipient };
  },

  async send(ctx: AdapterSendContext): Promise<AdapterResult> {
    const { url, kind } = endpoint();
    const token = accessToken();
    if (!url) {
      throw new MessagingError("TikTok messaging is not configured.", {
        code: "tiktok_not_configured",
      });
    }
    if (kind === "api" && !token) {
      throw new MessagingError("TikTok access token is not configured.", {
        code: "tiktok_token_missing",
      });
    }

    const isNumeric = /^\d{5,}$/.test(ctx.recipient);
    const body = {
      business_id: process.env.TIKTOK_BUSINESS_ID || undefined,
      recipient: isNumeric
        ? { user_id: ctx.recipient }
        : { username: ctx.recipient },
      message: {
        type: ctx.payload.thumbnailUrl ? "image" : "text",
        text: ctx.text,
        link: ctx.payload.videoUrl,
        ...(ctx.payload.thumbnailUrl
          ? { attachment: { type: "image", url: ctx.payload.thumbnailUrl } }
          : {}),
      },
      // Extra context for API partners / automation hooks.
      lead: {
        name: ctx.payload.leadName,
        business_name: ctx.payload.businessName,
        video_url: ctx.payload.videoUrl,
        thumbnail_url: ctx.payload.thumbnailUrl ?? null,
        prospect_id: ctx.payload.prospectId ?? null,
      },
      source: "bizreborn-video-dispatcher",
    };

    let res: Response;
    let data: Record<string, unknown>;
    try {
      ({ res, data } = await postJson(url, body, authHeaders()));
    } catch (err) {
      throw new MessagingError(
        err instanceof Error ? err.message : "TikTok messaging request failed.",
        { code: "tiktok_network_error", retryable: true },
      );
    }

    if (!res.ok) {
      const nested = data.data as Record<string, unknown> | undefined;
      const code = Number(data.code ?? nested?.code ?? res.status);
      const message =
        (data.message as string | undefined) ||
        (nested?.message as string | undefined) ||
        (data.error as string | undefined) ||
        `TikTok messaging failed (HTTP ${res.status}).`;
      throw new MessagingError(message, {
        code: `tiktok_${code}`,
        retryable: isRetryableStatus(res.status) || code === 40100 || code === 50000,
        retryAfterMs: parseRetryAfterMs(res.headers),
        response: data,
      });
    }

    return { providerMessageId: messageIdFrom(data), response: data };
  },
};
