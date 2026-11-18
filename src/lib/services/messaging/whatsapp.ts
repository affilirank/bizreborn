import {
  MessagingError,
  recipientFor,
  type AdapterResult,
  type AdapterSendContext,
  type ChannelAdapter,
  type VideoPitchPayload,
  type WhatsAppTemplateRequest,
} from "@/lib/services/messaging/types";
import {
  isRetryableStatus,
  parseRetryAfterMs,
  postJson,
  truncate,
} from "@/lib/services/messaging/http";

/**
 * WhatsApp Business Cloud API adapter.
 *
 * Endpoint: POST https://graph.facebook.com/{version}/{phone-number-id}/messages
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 *
 * Strategy:
 *  - When a template is configured (env or payload), send a template message —
 *    required for the first touch outside WhatsApp's 24-hour service window.
 *  - Otherwise send an image-with-caption (when a thumbnail exists) or a text
 *    message with link preview enabled.
 */

const GRAPH_BASE = process.env.WHATSAPP_API_BASE_URL || "https://graph.facebook.com";

function graphVersion(): string {
  const raw =
    process.env.WHATSAPP_API_VERSION || process.env.META_GRAPH_VERSION || "v23.0";
  return raw.startsWith("v") ? raw : `v${raw}`;
}

/** Normalizes a local/US number to E.164 digits (Cloud API wants no `+`). */
export function toWhatsAppNumber(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

function expandTemplateParam(
  token: string,
  payload: VideoPitchPayload,
  text: string,
): string {
  return token
    .replace(/\{leadName\}/g, payload.leadName || "")
    .replace(/\{businessName\}/g, payload.businessName || "")
    .replace(/\{videoUrl\}/g, payload.videoUrl || "")
    .replace(/\{message\}/g, text);
}

function buildTemplate(
  payload: VideoPitchPayload,
  text: string,
): Record<string, unknown> | null {
  const requested: WhatsAppTemplateRequest = payload.metadata?.whatsappTemplate ?? {};
  const name = requested.name || process.env.WHATSAPP_TEMPLATE_NAME;
  if (!name) return null;

  const language =
    requested.language ||
    process.env.WHATSAPP_TEMPLATE_LANG ||
    process.env.WHATSAPP_TEMPLATE_LANGUAGE ||
    "en_US";

  const rawParams =
    requested.bodyParams ??
    (process.env.WHATSAPP_TEMPLATE_BODY_PARAMS
      ? process.env.WHATSAPP_TEMPLATE_BODY_PARAMS.split("|")
      : [`{leadName}`, `{businessName}`, `{videoUrl}`]);

  const components: Array<Record<string, unknown>> = [];
  const headerImage =
    requested.headerImageUrl ||
    (process.env.WHATSAPP_TEMPLATE_HEADER_IMAGE === "1"
      ? payload.thumbnailUrl
      : null);
  if (headerImage) {
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { link: headerImage } }],
    });
  }

  const params = rawParams
    .map((p) => expandTemplateParam(p, payload, text).trim())
    .filter(Boolean);
  if (params.length > 0) {
    components.push({
      type: "body",
      parameters: params.map((value) => ({ type: "text", text: value })),
    });
  }

  const urlParam =
    requested.urlButtonParam ??
    (process.env.WHATSAPP_TEMPLATE_URL_BUTTON === "1"
      ? payload.videoUrl
      : undefined);
  if (urlParam) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: urlParam }],
    });
  }

  return {
    name,
    language: { code: language },
    ...(components.length > 0 ? { components } : {}),
  };
}

function whatsappErrorHint(code: number): string {
  switch (code) {
    case 190:
      return " Access token expired or was revoked — refresh WHATSAPP_ACCESS_TOKEN.";
    case 131026:
      return " The recipient number is not on WhatsApp or cannot receive messages.";
    case 131047:
      return " The 24-hour customer-service window is closed. Configure WHATSAPP_TEMPLATE_NAME to send an approved template.";
    case 132000:
      return " Template variable count does not match the approved template — check WHATSAPP_TEMPLATE_BODY_PARAMS.";
    case 132001:
      return " WhatsApp template was not found for this language/WABA — verify the template name and language code.";
    default:
      return "";
  }
}

export const whatsappAdapter: ChannelAdapter = {
  channel: "whatsapp",
  label: "WhatsApp",
  supportsThumbnail: true,

  isConfigured(): boolean {
    return Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
    );
  },

  preflight(payload) {
    if (!process.env.WHATSAPP_ACCESS_TOKEN) {
      return {
        recipient: null,
        errorCode: "whatsapp_token_missing",
        error:
          "WhatsApp Cloud API token missing. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
      };
    }
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return {
        recipient: null,
        errorCode: "whatsapp_phone_id_missing",
        error:
          "WhatsApp sender phone-number id missing. Set WHATSAPP_PHONE_NUMBER_ID (Cloud API → Phone numbers).",
      };
    }
    const raw = recipientFor(payload, "whatsapp");
    const recipient = raw ? toWhatsAppNumber(raw) : null;
    if (!recipient) {
      return {
        recipient: null,
        errorCode: "whatsapp_recipient_missing",
        error:
          "WhatsApp dispatch needs a valid phone number (payload.phoneNumber, 8–15 digits, E.164).",
      };
    }
    return { recipient };
  },

  async send(ctx: AdapterSendContext): Promise<AdapterResult> {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      throw new MessagingError("WhatsApp Cloud API is not configured.", {
        code: "whatsapp_not_configured",
      });
    }

    const template = buildTemplate(ctx.payload, ctx.text);
    const to = ctx.recipient;
    const message = template
      ? {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template,
        }
      : ctx.payload.thumbnailUrl
        ? {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "image",
            image: {
              link: ctx.payload.thumbnailUrl,
              caption: truncate(ctx.text, 1_000),
            },
          }
        : {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { preview_url: true, body: truncate(ctx.text, 4_000) },
          };

    let res: Response;
    let data: Record<string, unknown>;
    try {
      ({ res, data } = await postJson(
        `${GRAPH_BASE}/${graphVersion()}/${encodeURIComponent(phoneNumberId)}/messages`,
        message,
        { Authorization: `Bearer ${token}` },
      ));
    } catch (err) {
      throw new MessagingError(
        err instanceof Error ? err.message : "WhatsApp Cloud API request failed.",
        { code: "whatsapp_network_error", retryable: true },
      );
    }

    if (!res.ok) {
      const error = (data.error ?? {}) as {
        message?: string;
        code?: number;
        error_subcode?: number;
        error_user_msg?: string;
        error_data?: { details?: string };
      };
      const code = Number(error.code ?? res.status);
      const retryable =
        isRetryableStatus(res.status) || [130429, 131056, 131016].includes(code);
      throw new MessagingError(
        `${error.error_user_msg || error.error_data?.details || error.message || `WhatsApp send failed (HTTP ${res.status}).`}${whatsappErrorHint(code)}`,
        {
          code: `whatsapp_${code}${error.error_subcode ? `_${error.error_subcode}` : ""}`,
          retryable,
          retryAfterMs: parseRetryAfterMs(res.headers),
          response: data,
        },
      );
    }

    const providerMessageId = (
      data.messages as Array<{ id?: string }> | undefined
    )?.[0]?.id;
    return { providerMessageId, response: data };
  },
};
