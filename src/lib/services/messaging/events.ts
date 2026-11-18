import "server-only";

import type {
  OutreachChannel,
  OutreachLog,
  OutreachStatus,
  Prospect,
} from "@/lib/supabase-types";
import { getProspectById } from "@/lib/prospects";
import { applyContactLog, makeLog } from "@/lib/crm-actions";
import {
  findLatestOutboundForRecipient,
  findOutreachLogByProviderMessageId,
  insertOutreachLog,
  updateOutreachLog,
} from "@/lib/services/messaging/outreach-store";
import { syncOutreachToGhl, type GhlEvent } from "@/lib/services/messaging/ghl";
import {
  channelLabel,
  shouldAdvanceStatus,
} from "@/lib/services/messaging/types";
import { truncate } from "@/lib/services/messaging/http";

/**
 * Normalized provider events → outreach_logs + CRM.
 *
 * Webhook routes translate Meta/WhatsApp/TikTok payloads into these events;
 * this module owns the idempotent state machine, reply capture, and GHL sync.
 */

export interface MessagingEvent {
  channel: OutreachChannel;
  /** Provider message id (mid / wamid). */
  providerMessageId?: string | null;
  status?: OutreachStatus | null;
  direction?: "outbound" | "inbound";
  /** Outbound recipient (IGSID/PSID/phone) — used for read receipts. */
  recipient?: string | null;
  /** Inbound sender id/handle. */
  sender?: string | null;
  text?: string | null;
  eventId?: string | null;
  timestamp?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  raw?: Record<string, unknown> | null;
}

export interface ProcessEventsResult {
  received: number;
  processed: number;
  unmatched: number;
  errors: string[];
}

function isoFromTimestamp(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    // WhatsApp timestamps are epoch seconds; Graph uses milliseconds.
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && /^\d+$/.test(value.trim())) {
      const ms = numeric < 1e12 ? numeric * 1000 : numeric;
      return new Date(ms).toISOString();
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

function ghlEventFor(status: OutreachStatus): GhlEvent | null {
  switch (status) {
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "replied":
      return "replied";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

async function appendReplyToProspect(
  log: OutreachLog,
  text: string | null,
): Promise<Prospect | null> {
  if (!log.prospect_id) return null;
  try {
    const probe = await getProspectById(log.prospect_id);
    if (!probe) return null;
    const snippet = text ? truncate(text.replace(/\s+/g, " ").trim(), 160) : "Reply received";
    const updated = await applyContactLog(
      probe,
      makeLog("message", `${channelLabel(log.channel)} reply: "${snippet}"`, {
        kind: `${log.channel}_reply`,
        channel: log.channel,
        status: "replied",
        outreach_log_id: log.id,
        reply_text: text ?? undefined,
        provider_message_id: log.provider_message_id ?? undefined,
        video_url: log.video_url ?? undefined,
        to: log.recipient,
        replied_at: new Date().toISOString(),
      }),
      "answered",
    );
    return updated;
  } catch (err) {
    console.warn("[messaging:events] failed to record reply on prospect:", err);
    return null;
  }
}

/**
 * Applies one normalized event. Returns whether a row changed.
 */
export async function processMessagingEvent(
  event: MessagingEvent,
): Promise<{ matched: boolean; updated: boolean; log: OutreachLog | null }> {
  const at = isoFromTimestamp(event.timestamp);
  const inbound = event.direction === "inbound";
  const status: OutreachStatus | null =
    event.status ?? (inbound ? "replied" : null);

  let log = event.providerMessageId
    ? await findOutreachLogByProviderMessageId(event.channel, event.providerMessageId)
    : null;

  // Read receipts carry no message id — match the newest outbound message to
  // the same recipient.
  if (!log && status === "read") {
    const recipient = event.recipient || event.sender;
    if (recipient) {
      log = await findLatestOutboundForRecipient(event.channel, recipient, [
        "sent",
        "delivered",
      ]);
    }
  }

  // Inbound replies carry their own (new) message id, so match them back to
  // the newest outbound message from that same person.
  if (!log && inbound) {
    const sender = event.sender || event.recipient;
    if (sender) {
      log = await findLatestOutboundForRecipient(event.channel, sender, [
        "sent",
        "delivered",
        "read",
      ]);
    }
  }

  // Inbound message with no prior outbound row: keep it for the audit trail.
  if (!log && inbound) {
    const created = await insertOutreachLog({
      channel: event.channel,
      direction: "inbound",
      recipient: event.sender || "unknown",
      recipient_name: null,
      message: event.text ?? null,
      status: "replied",
      attempt: 0,
      max_attempts: 0,
      provider_message_id: event.providerMessageId ?? null,
      payload: {
        eventId: event.eventId ?? null,
        inbound: true,
        raw: event.raw ?? null,
      },
    });
    const replied = await updateOutreachLog(created.id, { replied_at: at });
    return { matched: false, updated: true, log: replied ?? created };
  }

  if (!log || !status) return { matched: Boolean(log), updated: false, log };

  const patch: Partial<OutreachLog> = {};
  const advance = shouldAdvanceStatus(log.status, status);

  if (advance) patch.status = status;
  if (status === "delivered" && !log.delivered_at) patch.delivered_at = at;
  if (status === "replied" && !log.replied_at) patch.replied_at = at;
  if (status === "failed") {
    patch.error_code = event.errorCode ?? log.error_code ?? "provider_failed";
    patch.error_message = event.errorMessage ?? log.error_message ?? "Provider reported failure.";
  }
  if (event.providerMessageId && !log.provider_message_id) {
    patch.provider_message_id = event.providerMessageId;
  }

  if (Object.keys(patch).length === 0) {
    return { matched: true, updated: false, log };
  }

  const updated = (await updateOutreachLog(log.id, patch)) ?? { ...log, ...patch };

  const ghl = ghlEventFor(status);
  if (advance && ghl) {
    await syncOutreachToGhl(updated, ghl, { text: event.text });
  }

  if (inbound) {
    await appendReplyToProspect(updated, event.text ?? null);
  }

  return { matched: true, updated: true, log: updated };
}

export async function processMessagingEvents(
  events: MessagingEvent[],
): Promise<ProcessEventsResult> {
  let processed = 0;
  let unmatched = 0;
  const errors: string[] = [];

  for (const event of events) {
    try {
      const result = await processMessagingEvent(event);
      if (result.updated) processed++;
      if (!result.matched && event.direction !== "inbound") unmatched++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { received: events.length, processed, unmatched, errors };
}
