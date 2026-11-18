import { createHmac, timingSafeEqual } from "node:crypto";
import type { OutreachChannel } from "@/lib/supabase-types";
import type { MessagingEvent } from "@/lib/services/messaging/events";

/**
 * Webhook signature verification + payload normalization for Meta, WhatsApp,
 * and TikTok. Kept separate from the routes so each parser is testable and the
 * route files stay thin.
 */

function safeEqual(a: string, b: string, encoding: "hex" | "base64" = "hex"): boolean {
  try {
    const provided = Buffer.from(a, encoding);
    const expected = Buffer.from(b, encoding);
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

/** Meta/WhatsApp `X-Hub-Signature-256: sha256=<hex>` (legacy sha1 also accepted). */
export function verifyMetaSignature(
  rawBody: string,
  signature: string | null,
  secret: string | null,
): boolean {
  if (!signature || !secret) return false;
  const [algorithmRaw, ...rest] = signature.includes("=")
    ? signature.split("=")
    : ["sha256", signature];
  const value = rest.join("=");
  if (!value) return false;
  const algorithm = algorithmRaw === "sha1" ? "sha1" : "sha256";
  const expected = createHmac(algorithm, secret).update(rawBody, "utf8").digest("hex");
  return safeEqual(value, expected);
}

/**
 * TikTok signs with `TikTok-Signature: t=<ts>,s=<hmac(secret, `${t}.${body}`)>`.
 * Some partner setups send a plain HMAC in `x-tiktok-signature` instead.
 */
export function verifyTikTokSignature(
  rawBody: string,
  headers: Headers,
  secret: string | null,
): boolean {
  if (!secret) return false;
  const header = headers.get("tiktok-signature");
  if (header) {
    const parts = header.split(",").reduce<Record<string, string>>((acc, part) => {
      const [key, ...rest] = part.split("=");
      if (key && rest.length) acc[key.trim()] = rest.join("=").trim();
      return acc;
    }, {});
    if (parts.t && parts.s) {
      const expected = createHmac("sha256", secret)
        .update(`${parts.t}.${rawBody}`)
        .digest("hex");
      return safeEqual(parts.s, expected);
    }
  }

  const plain = headers.get("x-tiktok-signature");
  if (plain) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (safeEqual(plain, expected)) return true;
    const expectedBase64 = createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");
    return safeEqual(plain, expectedBase64, "base64");
  }

  return false;
}

export function timingSafeStringEqual(provided: string | null, expected: string | null): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ */
/* Meta (Instagram + Facebook Messenger)                               */
/* ------------------------------------------------------------------ */

type Json = Record<string, unknown>;

function obj(value: unknown): Json {
  return value && typeof value === "object" ? (value as Json) : {};
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseMetaEvents(payload: Json, hint?: OutreachChannel): MessagingEvent[] {
  const object = str(payload.object) ?? "";
  const fallbackChannel: OutreachChannel =
    hint === "instagram" || object === "instagram" ? "instagram" : "facebook";
  const events: MessagingEvent[] = [];

  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  for (const rawEntry of entries) {
    const entry = obj(rawEntry);
    const entryChannel: OutreachChannel =
      object === "instagram" || hint === "instagram"
        ? "instagram"
        : hint === "facebook"
          ? "facebook"
          : fallbackChannel;

    const messages = Array.isArray(entry.messaging) ? entry.messaging : [];
    for (const raw of messages) {
      const item = obj(raw);
      const sender = obj(item.sender);
      const recipient = obj(item.recipient);
      const timestamp = item.timestamp as string | number | undefined;
      const senderId = str(sender.id);
      const recipientId = str(recipient.id);

      const delivery = obj(item.delivery);
      const mids = Array.isArray(delivery.mids) ? delivery.mids : [];
      for (const mid of mids) {
        const id = str(mid);
        if (!id) continue;
        events.push({
          channel: entryChannel,
          providerMessageId: id,
          status: "delivered",
          timestamp: typeof delivery.watermark === "number" ? String(delivery.watermark) : null,
          raw: { delivery: item.delivery },
        });
      }

      if (item.read) {
        events.push({
          channel: entryChannel,
          status: "read",
          // Messenger read events: sender = the person who read the thread.
          recipient: senderId || recipientId,
          sender: senderId,
          timestamp: String(obj(item.read).watermark ?? timestamp ?? ""),
          raw: { read: item.read },
        });
      }

      const message = obj(item.message);
      if (message.mid || message.text || message.attachments) {
        const attachments = Array.isArray(message.attachments) ? message.attachments : [];
        const attachmentText = attachments
          .map((a) => str(obj(obj(a).payload).url) || str(obj(a).type))
          .filter(Boolean)
          .join(" ");
        const text = str(message.text) || attachmentText || null;
        const isEcho = message.is_echo === true;

        if (isEcho) {
          events.push({
            channel: entryChannel,
            providerMessageId: str(message.mid),
            status: "sent",
            direction: "outbound",
            recipient: recipientId || senderId,
            text,
            timestamp: timestamp != null ? String(timestamp) : null,
            raw: { message },
          });
        } else {
          events.push({
            channel: entryChannel,
            providerMessageId: str(message.mid),
            status: "replied",
            direction: "inbound",
            sender: senderId,
            recipient: recipientId,
            text,
            timestamp: timestamp != null ? String(timestamp) : null,
            raw: { message },
          });
        }
        continue;
      }

      const postback = obj(item.postback);
      if (postback.title || postback.payload) {
        events.push({
          channel: entryChannel,
          direction: "inbound",
          status: "replied",
          sender: senderId,
          recipient: recipientId,
          text: str(postback.title) || str(postback.payload),
          timestamp: timestamp != null ? String(timestamp) : null,
          raw: { postback },
        });
      }
    }
  }

  return events;
}

/* ------------------------------------------------------------------ */
/* WhatsApp Cloud API                                                  */
/* ------------------------------------------------------------------ */

function whatsappStatus(value: string): MessagingEvent["status"] {
  switch (value) {
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

function whatsappMessageText(message: Json): string | null {
  const text = obj(message.text);
  if (str(text.body)) return str(text.body);
  const button = obj(message.button);
  if (str(button.text)) return str(button.text);
  const interactive = obj(message.interactive);
  const reply = obj(interactive.button_reply);
  if (str(reply.title)) return str(reply.title);
  const list = obj(interactive.list_reply);
  if (str(list.title)) return str(list.title);
  const media = ["image", "video", "audio", "document", "sticker"].find(
    (key) => message[key] != null,
  );
  if (media) {
    const caption = str(obj(message[media]).caption);
    return caption || `[${media}]`;
  }
  return null;
}

export function parseWhatsAppEvents(payload: Json): MessagingEvent[] {
  const events: MessagingEvent[] = [];
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const rawEntry of entries) {
    const entry = obj(rawEntry);
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const rawChange of changes) {
      const change = obj(rawChange);
      if (str(change.field) && change.field !== "messages") continue;
      const value = obj(change.value);

      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const rawStatus of statuses) {
        const status = obj(rawStatus);
        const errors = Array.isArray(status.errors) ? status.errors : [];
        const firstError = obj(errors[0]);
        events.push({
          channel: "whatsapp",
          providerMessageId: str(status.id),
          status: whatsappStatus(str(status.status) ?? ""),
          recipient: str(status.recipient_id),
          timestamp: status.timestamp != null ? String(status.timestamp) : null,
          errorCode: firstError.code != null ? String(firstError.code) : null,
          errorMessage: str(firstError.title) || str(firstError.message) || str(obj(firstError.error_data).details),
          raw: { status },
        });
      }

      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const rawMessage of messages) {
        const message = obj(rawMessage);
        events.push({
          channel: "whatsapp",
          providerMessageId: str(message.id),
          status: "replied",
          direction: "inbound",
          sender: str(message.from),
          recipient: str(obj(value.metadata).display_phone_number),
          text: whatsappMessageText(message),
          timestamp: message.timestamp != null ? String(message.timestamp) : null,
          raw: { message },
        });
      }
    }
  }

  return events;
}

/* ------------------------------------------------------------------ */
/* TikTok Business / partner webhooks                                  */
/* ------------------------------------------------------------------ */

function tiktokStatus(value: string): MessagingEvent["status"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("deliver")) return "delivered";
  if (normalized.includes("read")) return "read";
  if (normalized.includes("fail") || normalized.includes("error")) return "failed";
  if (normalized.includes("reply") || normalized.includes("receive") || normalized.includes("inbound")) {
    return "replied";
  }
  if (normalized.includes("sent") || normalized.includes("send")) return "sent";
  return null;
}

export function parseTikTokEvents(payload: Json): MessagingEvent[] {
  const raw = Array.isArray(payload.events)
    ? payload.events
    : Array.isArray(obj(payload.data).events)
      ? (obj(payload.data).events as unknown[])
      : [payload];

  const events: MessagingEvent[] = [];
  for (const rawEvent of raw) {
    const event = obj(rawEvent);
    const data = obj(event.data);
    const message = obj(event.message);

    const statusValue =
      str(event.status) ||
      str(event.event_type) ||
      str(event.event) ||
      str(data.status) ||
      str(data.event);
    if (!statusValue) continue;
    const status = tiktokStatus(statusValue);
    if (!status) continue;

    const inbound =
      status === "replied" || statusValue.toLowerCase().includes("received");
    const providerMessageId =
      str(event.message_id) ||
      str(event.messageId) ||
      str(event.mid) ||
      str(data.message_id) ||
      str(data.messageId) ||
      str(message.id);

    events.push({
      channel: "tiktok",
      providerMessageId,
      status,
      direction: inbound ? "inbound" : "outbound",
      sender: str(event.sender) || str(event.from) || str(data.sender) || str(data.from),
      recipient:
        str(event.recipient) ||
        str(event.to) ||
        str(data.recipient) ||
        str(data.to) ||
        str(event.username),
      text:
        str(event.text) ||
        str(message.text) ||
        str(data.text) ||
        str(event.content),
      timestamp:
        event.timestamp != null
          ? String(event.timestamp)
          : data.timestamp != null
            ? String(data.timestamp)
            : null,
      errorCode: str(event.error_code) || str(data.error_code),
      errorMessage: str(event.error_message) || str(data.error_message),
      raw: { event },
    });
  }

  return events;
}
