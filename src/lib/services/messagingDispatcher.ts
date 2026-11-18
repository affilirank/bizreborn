import "server-only";

import type { OutreachChannel, OutreachLog, OutreachStatus, Prospect } from "@/lib/supabase-types";
import { getProspectById } from "@/lib/prospects";
import { applyContactLog, makeLog } from "@/lib/crm-actions";
import {
  facebookAdapter,
  instagramAdapter,
} from "@/lib/services/messaging/meta";
import { whatsappAdapter } from "@/lib/services/messaging/whatsapp";
import { tiktokAdapter } from "@/lib/services/messaging/tiktok";
import {
  composeVideoMessage,
  MessagingError,
  OUTREACH_CHANNELS,
  channelLabel,
  recipientFor,
  type ChannelAdapter,
  type VideoPitchPayload,
} from "@/lib/services/messaging/types";
import {
  insertOutreachLog,
  updateOutreachLog,
  getOutreachLog,
  dueRetryLogs,
  findPendingManualOutreach,
} from "@/lib/services/messaging/outreach-store";
import { syncOutreachToGhl, type GhlSyncResult } from "@/lib/services/messaging/ghl";

/**
 * Multi-channel video pitch dispatcher.
 *
 * One call fans a generated pitch link out across Instagram DMs, Messenger,
 * WhatsApp, and TikTok. Each channel attempt is persisted to `outreach_logs`
 * (queued → sending → sent/failed), retried with exponential backoff, mirrored
 * into the prospect's communication log, and tagged in GoHighLevel.
 *
 * Cold IG/FB/TikTok handles that the official APIs cannot message go through
 * `queueManualOutreach` instead — queued as `delivery_mode=manual` and completed
 * from /admin/outreach or an optional extension bridge.
 */

const ADAPTERS: Record<OutreachChannel, ChannelAdapter> = {
  instagram: instagramAdapter,
  facebook: facebookAdapter,
  whatsapp: whatsappAdapter,
  tiktok: tiktokAdapter,
};

export interface ChannelDispatchResult {
  channel: OutreachChannel;
  channelLabel: string;
  status: OutreachStatus;
  logId: string;
  recipient: string | null;
  providerMessageId?: string | null;
  error?: string | null;
  errorCode?: string | null;
  retryable?: boolean;
  nextAttemptAt?: string | null;
  ghl?: GhlSyncResult;
}

export interface DispatchSummary {
  results: ChannelDispatchResult[];
  sent: number;
  failed: number;
  channels: OutreachChannel[];
}

export interface DispatchOptions {
  payload: VideoPitchPayload;
  /** Explicit channels. Inferred from channel-specific handles when omitted. */
  channels?: OutreachChannel[];
  /** Already-loaded prospect (saves a DB read when called from a route). */
  prospect?: Prospect | null;
  maxAttempts?: number;
  /** Stored on the log for auditability (e.g. "admin:jane"). */
  requestedBy?: string | null;
  /** Skip GHL sync (used by tests / internal retries). */
  skipGhl?: boolean;
}

export interface RetryOptions {
  force?: boolean;
  maxAttempts?: number;
}

function maxAttemptsFromEnv(override?: number): number {
  if (override && Number.isFinite(override)) return Math.max(1, Math.min(10, override));
  const raw = Number(process.env.MESSAGING_MAX_ATTEMPTS || 3);
  return Number.isFinite(raw) ? Math.max(1, Math.min(10, raw)) : 3;
}

function backoffMs(attempt: number, explicit?: number): number {
  if (explicit != null) return Math.max(1_000, explicit);
  const base = Number(process.env.MESSAGING_RETRY_BASE_MS || 60_000);
  const capped = Math.min(6 * 60 * 60_000, base * 2 ** Math.max(0, attempt - 1));
  return Math.round(capped * (0.85 + Math.random() * 0.3));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Removes undefined/function values so the payload is JSON-safe for jsonb. */
function serializePayload(payload: VideoPitchPayload): Record<string, unknown> {
  return asRecord(payload) ?? {};
}

export function adapterFor(channel: OutreachChannel): ChannelAdapter {
  return ADAPTERS[channel];
}

/**
 * Picks channels from channel-specific handles before falling back to a
 * single `payload.channel` hint. The API route supplies explicit channels for
 * stored prospects, so this mainly serves direct service callers.
 */
export function inferChannels(payload: VideoPitchPayload): OutreachChannel[] {
  if (payload.channels?.length) return dedupeChannels(payload.channels);

  const found: OutreachChannel[] = [];
  const handles = payload.handles ?? {};
  const metadata = payload.metadata ?? {};
  if (handles.instagram || metadata.igsid || metadata.instagramUserId) found.push("instagram");
  if (handles.facebook || metadata.psid) found.push("facebook");
  if (handles.tiktok || metadata.tiktokOpenId || metadata.openId) found.push("tiktok");
  if (handles.whatsapp || payload.phoneNumbers?.whatsapp || payload.phoneNumber) {
    found.push("whatsapp");
  }
  if (found.length === 0 && payload.channel) found.push(payload.channel);
  return dedupeChannels(found);
}

function dedupeChannels(channels: OutreachChannel[]): OutreachChannel[] {
  return [...new Set(channels.filter((c) => OUTREACH_CHANNELS.includes(c)))];
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function prospectLogKind(channel: OutreachChannel): string {
  switch (channel) {
    case "instagram":
      return "instagram_dm";
    case "facebook":
      return "messenger";
    case "whatsapp":
      return "whatsapp";
    case "tiktok":
      return "tiktok_dm";
  }
}

async function appendProspectLog(
  log: OutreachLog,
  payload: VideoPitchPayload,
  outcome: "sent" | "failed" | "replied",
  prospect?: Prospect | null,
): Promise<void> {
  try {
    const target =
      prospect ??
      (log.prospect_id ? await getProspectById(log.prospect_id) : null) ??
      (payload.prospectId ? await getProspectById(payload.prospectId) : null);
    if (!target) return;

    const label = channelLabel(log.channel);
    const statusText =
      outcome === "sent"
        ? "video pitch sent"
        : outcome === "replied"
          ? "replied to video pitch"
          : "video pitch failed";
    const note = [
      `${label} · ${statusText}`,
      log.provider_message_id ? `#${log.provider_message_id.slice(0, 18)}` : "",
      log.error_message ? `— ${log.error_message}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    await applyContactLog(
      target,
      makeLog("message", note, {
        kind: prospectLogKind(log.channel),
        channel: log.channel,
        status: outcome,
        outreach_log_id: log.id,
        video_url: log.video_url ?? undefined,
        thumbnail_url: log.thumbnail_url ?? undefined,
        provider_message_id: log.provider_message_id ?? undefined,
        error_code: log.error_code ?? undefined,
        error_message: log.error_message ?? undefined,
        to: log.recipient,
        sent_at: log.sent_at ?? undefined,
      }),
      outcome === "sent" || outcome === "replied" ? "outreach" : null,
    );
  } catch (err) {
    console.warn("[messaging] failed to append prospect communication log:", err);
  }
}

async function maybeSyncGhl(
  log: OutreachLog,
  event: "sent" | "delivered" | "replied" | "failed",
  options: { skip?: boolean; text?: string | null },
): Promise<GhlSyncResult | undefined> {
  if (options.skip) return undefined;
  try {
    return await syncOutreachToGhl(log, event, { text: options.text });
  } catch (err) {
    console.warn("[messaging] GHL sync exception:", err);
    return undefined;
  }
}

function resultFromLog(
  log: OutreachLog,
  extra: Partial<ChannelDispatchResult> = {},
): ChannelDispatchResult {
  return {
    channel: log.channel,
    channelLabel: channelLabel(log.channel),
    status: log.status,
    logId: log.id,
    recipient: log.recipient || null,
    providerMessageId: log.provider_message_id,
    error: log.error_message,
    errorCode: log.error_code,
    nextAttemptAt: log.next_attempt_at,
    ...extra,
  };
}

async function dispatchChannel(
  channel: OutreachChannel,
  payload: VideoPitchPayload,
  opts: DispatchOptions,
): Promise<ChannelDispatchResult> {
  const adapter = adapterFor(channel);
  const maxAttempts = maxAttemptsFromEnv(opts.maxAttempts);
  const text = (payload.message?.trim() || composeVideoMessage(payload)).trim();
  const serialized = {
    ...serializePayload(payload),
    requestedBy: opts.requestedBy ?? null,
  };
  const preflight = adapter.preflight(payload);

  // Validation/config failures are recorded but never sent to the provider.
  if (preflight.error || !preflight.recipient) {
    const log = await insertOutreachLog({
      prospect_id: payload.prospectId ?? opts.prospect?.id ?? null,
      channel,
      recipient: preflight.recipient ?? recipientFor(payload, channel) ?? "unresolved",
      recipient_name: payload.leadName || null,
      page_id: preflight.pageId ?? null,
      message: text,
      video_url: payload.videoUrl,
      thumbnail_url: payload.thumbnailUrl ?? null,
      status: "failed",
      attempt: 0,
      max_attempts: maxAttempts,
      error_code: preflight.errorCode ?? "preflight_failed",
      error_message: preflight.error ?? "No valid recipient for this channel.",
      payload: serialized,
    });
    await appendProspectLog(log, payload, "failed", opts.prospect);
    return resultFromLog(log, { retryable: false });
  }

  const queued = await insertOutreachLog({
    prospect_id: payload.prospectId ?? opts.prospect?.id ?? null,
    channel,
    recipient: preflight.recipient,
    recipient_name: payload.leadName || null,
    page_id: preflight.pageId ?? null,
    message: text,
    video_url: payload.videoUrl,
    thumbnail_url: payload.thumbnailUrl ?? null,
    status: "queued",
    attempt: 0,
    max_attempts: maxAttempts,
    payload: serialized,
  });

  const attempt = 1;
  const sending = await updateOutreachLog(queued.id, {
    status: "sending",
    attempt,
    next_attempt_at: null,
  });

  try {
    const result = await adapter.send({
      payload,
      recipient: preflight.recipient,
      pageId: preflight.pageId ?? null,
      text,
    });

    const sentAt = new Date().toISOString();
    const sentLog =
      (await updateOutreachLog(queued.id, {
        status: "sent",
        provider_message_id: result.providerMessageId ?? null,
        response: asRecord(result.response),
        sent_at: sentAt,
        error_code: null,
        error_message: null,
        next_attempt_at: null,
      })) ?? sending ?? queued;

    const ghl = await maybeSyncGhl(sentLog, "sent", {
      skip: opts.skipGhl || payload.metadata?.skipGhl,
      text,
    });
    await appendProspectLog(sentLog, payload, "sent", opts.prospect);

    return resultFromLog(sentLog, { ghl, retryable: false, nextAttemptAt: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const messagingError = err instanceof MessagingError ? err : null;
    const retryable = messagingError?.retryable ?? false;
    const nextAttempt =
      retryable && attempt < maxAttempts
        ? new Date(Date.now() + backoffMs(attempt, messagingError?.retryAfterMs)).toISOString()
        : null;

    const failedLog =
      (await updateOutreachLog(queued.id, {
        status: "failed",
        attempt,
        error_code: messagingError?.code ?? "dispatch_error",
        error_message: message,
        next_attempt_at: nextAttempt,
        response: asRecord(messagingError?.response),
      })) ?? sending ?? queued;

    // Only notify the CRM when the failure is terminal — a transient retry
    // shouldn't tag the contact as failed and then succeed minutes later.
    const ghl = !nextAttempt
      ? await maybeSyncGhl(failedLog, "failed", {
          skip: opts.skipGhl || payload.metadata?.skipGhl,
          text,
        })
      : undefined;
    if (!nextAttempt) await appendProspectLog(failedLog, payload, "failed", opts.prospect);

    return resultFromLog(failedLog, {
      ghl,
      retryable: Boolean(nextAttempt),
      nextAttemptAt: nextAttempt,
    });
  }
}

/**
 * Fans one payload out across channels (default concurrency: 3).
 * Never throws for provider errors — inspect `results`.
 */
export async function dispatchVideoPitch(
  opts: DispatchOptions,
): Promise<DispatchSummary> {
  const requested = opts.channels?.length ? dedupeChannels(opts.channels) : [];
  if (opts.channels?.length && requested.length === 0) {
    throw new Error(
      `No valid channels selected. Use: ${OUTREACH_CHANNELS.join(", ")}.`,
    );
  }
  const channels = requested.length ? requested : inferChannels(opts.payload);
  if (channels.length === 0) {
    throw new Error(
      "No messaging channels selected. Pass channels or a channel-specific handle (platformHandle with channels, phoneNumber, handles.*, metadata.igsid/psid).",
    );
  }

  const results = await mapLimit(channels, 3, (channel) =>
    dispatchChannel(channel, opts.payload, opts),
  );

  const sent = results.filter((r) => r.status === "sent").length;
  return {
    results,
    sent,
    failed: results.length - sent,
    channels,
  };
}

/**
 * Re-sends a failed outreach log using the payload snapshot stored in the DB.
 * Used by the retry API/cron and safe to call concurrently (attempt increments
 * atomically enough for provider idempotency; adapters do not dedupe).
 */
export async function retryOutreachLog(
  id: string,
  options: RetryOptions = {},
): Promise<ChannelDispatchResult> {
  const log = await getOutreachLog(id);
  if (!log) throw new Error("Outreach log not found.");
  if (log.direction !== "outbound") {
    throw new Error("Only outbound outreach rows can be retried.");
  }
  if ((log.delivery_mode ?? "api") === "manual") {
    throw new Error(
      "This row is in the manual cold-outreach queue. Open /admin/outreach and mark it sent (or use the bridge action) instead of retrying through the API.",
    );
  }

  const maxAttempts = maxAttemptsFromEnv(options.maxAttempts ?? log.max_attempts);
  if (!options.force && log.status !== "failed") {
    return resultFromLog(log, { retryable: false });
  }
  if (!options.force && log.attempt >= maxAttempts) {
    return resultFromLog(log, { retryable: false });
  }

  const payload = (log.payload ?? {}) as unknown as VideoPitchPayload;
  payload.prospectId = payload.prospectId ?? log.prospect_id ?? null;
  const adapter = adapterFor(log.channel);
  const preflight = adapter.preflight(payload);
  if (preflight.error || !preflight.recipient) {
    const failed = await updateOutreachLog(log.id, {
      status: "failed",
      error_code: preflight.errorCode ?? "preflight_failed",
      error_message: preflight.error ?? "No valid recipient for this channel.",
      next_attempt_at: null,
    });
    return resultFromLog(failed ?? log, { retryable: false });
  }

  const attempt = log.attempt + 1;
  const text = (payload.message?.trim() || composeVideoMessage(payload)).trim();
  await updateOutreachLog(log.id, {
    status: "sending",
    attempt,
    next_attempt_at: null,
  });

  try {
    const result = await adapter.send({
      payload,
      recipient: preflight.recipient,
      pageId: preflight.pageId ?? null,
      text,
    });

    const sentLog =
      (await updateOutreachLog(log.id, {
        status: "sent",
        provider_message_id: result.providerMessageId ?? log.provider_message_id,
        response: asRecord(result.response),
        sent_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
        next_attempt_at: null,
      })) ?? log;

    const ghl = await maybeSyncGhl(sentLog, "sent", {
      skip: payload.metadata?.skipGhl,
      text,
    });
    await appendProspectLog(sentLog, payload, "sent");
    return resultFromLog(sentLog, { ghl, retryable: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const messagingError = err instanceof MessagingError ? err : null;
    const nextAttempt =
      messagingError?.retryable && attempt < maxAttempts
        ? new Date(Date.now() + backoffMs(attempt, messagingError.retryAfterMs)).toISOString()
        : null;

    const failedLog =
      (await updateOutreachLog(log.id, {
        status: "failed",
        attempt,
        error_code: messagingError?.code ?? "dispatch_error",
        error_message: message,
        next_attempt_at: nextAttempt,
        response: asRecord(messagingError?.response),
      })) ?? log;

    const ghl = !nextAttempt
      ? await maybeSyncGhl(failedLog, "failed", {
          skip: payload.metadata?.skipGhl,
          text,
        })
      : undefined;
    if (!nextAttempt) await appendProspectLog(failedLog, payload, "failed");

    return resultFromLog(failedLog, {
      ghl,
      retryable: Boolean(nextAttempt),
      nextAttemptAt: nextAttempt,
    });
  }
}

/** Retries every due failed row (cron/manual). Concurrency capped at 4. */
export async function retryDueOutreach(
  limit = 12,
): Promise<{ attempted: number; sent: number; failed: number; results: ChannelDispatchResult[] }> {
  const due = await dueRetryLogs(limit);
  const results = await mapLimit(due, 4, async (log) => {
    try {
      return await retryOutreachLog(log.id);
    } catch (err) {
      return resultFromLog(log, {
        retryable: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
  return {
    attempted: results.length,
    sent: results.filter((r) => r.status === "sent").length,
    failed: results.filter((r) => r.status !== "sent").length,
    results,
  };
}

/* ------------------------------------------------------------------ */
/* Manual cold-outreach queue                                          */
/* ------------------------------------------------------------------ */

export interface ManualQueueOptions {
  payload: VideoPitchPayload;
  channels?: OutreachChannel[];
  prospect?: Prospect | null;
  requestedBy?: string | null;
  /** Skip recipients that already have a queued manual row (default: true). */
  dedupe?: boolean;
}

export interface ManualQueueSummary {
  results: ChannelDispatchResult[];
  queued: number;
  failed: number;
  channels: OutreachChannel[];
}

export interface MarkManualSentOptions {
  providerMessageId?: string | null;
  note?: string | null;
}

/**
 * Manual recipients are raw handles/phone numbers — no IGSID/PSID needed. This
 * is the compliant path for cold Instagram/TikTok/Facebook leads, where the
 * Graph API cannot open a conversation.
 */
function manualRecipientFor(
  payload: VideoPitchPayload,
  channel: OutreachChannel,
): string | null {
  const direct = payload.handles?.[channel];
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  if (channel === "whatsapp") {
    const value =
      payload.phoneNumbers?.whatsapp ?? payload.phoneNumber ?? payload.platformHandle;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  return typeof payload.platformHandle === "string" && payload.platformHandle.trim()
    ? payload.platformHandle.trim()
    : null;
}

/**
 * Enqueues a video pitch for 1-click manual delivery. Nothing is sent to a
 * provider here: rows land as `queued` with `delivery_mode = "manual"` and are
 * completed from /admin/outreach (deep link + copy + mark sent) or an optional
 * extension/bridge webhook.
 */
export async function queueManualOutreach(
  opts: ManualQueueOptions,
): Promise<ManualQueueSummary> {
  const requested = opts.channels?.length ? dedupeChannels(opts.channels) : [];
  const channels = requested.length ? requested : inferChannels(opts.payload);
  if (channels.length === 0) {
    throw new Error(
      "No channels selected. Pass channels or a platformHandle/phoneNumber for the cold lead.",
    );
  }

  const text = (opts.payload.message?.trim() || composeVideoMessage(opts.payload)).trim();
  const serialized = {
    ...serializePayload(opts.payload),
    requestedBy: opts.requestedBy ?? null,
    deliveryMode: "manual",
  };
  const results: ChannelDispatchResult[] = [];

  for (const channel of channels) {
    const recipient = manualRecipientFor(opts.payload, channel);
    if (!recipient) {
      const log = await insertOutreachLog({
        prospect_id: opts.payload.prospectId ?? opts.prospect?.id ?? null,
        channel,
        delivery_mode: "manual",
        recipient: "unresolved",
        recipient_name: opts.payload.leadName || null,
        message: text,
        video_url: opts.payload.videoUrl,
        thumbnail_url: opts.payload.thumbnailUrl ?? null,
        status: "failed",
        attempt: 0,
        max_attempts: 1,
        error_code: "missing_handle",
        error_message: `No ${channel} handle on this lead — add one before queueing a manual send.`,
        payload: serialized,
      });
      results.push(resultFromLog(log, { retryable: false }));
      continue;
    }

    if (opts.dedupe !== false) {
      const existing = await findPendingManualOutreach(channel, recipient);
      if (existing) {
        results.push(
          resultFromLog(existing, {
            retryable: false,
            errorCode: "duplicate",
            error: "Already waiting in the manual queue.",
          }),
        );
        continue;
      }
    }

    const log = await insertOutreachLog({
      prospect_id: opts.payload.prospectId ?? opts.prospect?.id ?? null,
      channel,
      delivery_mode: "manual",
      recipient,
      recipient_name: opts.payload.leadName || null,
      page_id: opts.payload.pageIds?.[channel] ?? opts.payload.pageId ?? null,
      message: text,
      video_url: opts.payload.videoUrl,
      thumbnail_url: opts.payload.thumbnailUrl ?? null,
      status: "queued",
      attempt: 0,
      max_attempts: 1,
      payload: serialized,
    });
    results.push(resultFromLog(log, { retryable: false, nextAttemptAt: null }));
  }

  return {
    results,
    queued: results.filter((r) => r.status === "queued").length,
    failed: results.filter((r) => r.status !== "queued").length,
    channels,
  };
}

/**
 * Marks a manual row as sent after a human (or bridge) actually delivered it.
 * This is the point where the CRM sees `video_sent_<channel>`.
 */
export async function markManualOutreachSent(
  id: string,
  options: MarkManualSentOptions = {},
): Promise<ChannelDispatchResult> {
  const log = await getOutreachLog(id);
  if (!log) throw new Error("Outreach log not found.");
  if (log.direction !== "outbound") {
    throw new Error("Only outbound outreach rows can be marked sent.");
  }
  if ((log.delivery_mode ?? "api") !== "manual") {
    throw new Error("Only manual cold-outreach rows can be marked sent this way.");
  }
  if (log.status === "cancelled") {
    throw new Error("This queued message was cancelled. Re-queue the lead to send it.");
  }
  if (["sent", "delivered", "read", "replied"].includes(log.status)) {
    return resultFromLog(log, { retryable: false });
  }

  const markedAt = new Date().toISOString();
  const sentLog =
    (await updateOutreachLog(id, {
      status: "sent",
      attempt: Math.max(1, log.attempt),
      sent_at: log.sent_at ?? markedAt,
      next_attempt_at: null,
      error_code: null,
      error_message: null,
      provider_message_id: options.providerMessageId ?? log.provider_message_id,
      response: {
        ...(log.response ?? {}),
        manual: true,
        markedAt,
        note: options.note ?? null,
      },
    })) ?? log;

  const payload = (sentLog.payload ?? {}) as unknown as VideoPitchPayload;
  const ghl = await maybeSyncGhl(sentLog, "sent", {
    skip: payload.metadata?.skipGhl,
    text: sentLog.message,
  });
  await appendProspectLog(sentLog, payload, "sent");

  return resultFromLog(sentLog, { ghl, retryable: false, nextAttemptAt: null });
}

/** Dismisses a manual queue row that will not be sent. */
export async function cancelManualOutreach(id: string): Promise<ChannelDispatchResult> {
  const log = await getOutreachLog(id);
  if (!log) throw new Error("Outreach log not found.");
  if ((log.delivery_mode ?? "api") !== "manual") {
    throw new Error("Only manual cold-outreach rows can be cancelled here.");
  }
  if (["sent", "delivered", "read", "replied"].includes(log.status)) {
    throw new Error("This message was already sent and cannot be cancelled.");
  }

  const cancelled =
    (await updateOutreachLog(id, { status: "cancelled", next_attempt_at: null })) ?? log;
  return resultFromLog(cancelled, { retryable: false });
}

/**
 * Hands a manual row to an optional browser-extension / automation bridge.
 * `MANUAL_DM_BRIDGE_URL` receives the message and should POST back/return
 * `{ "id": "<provider message id>" }`; success marks the row sent.
 */
export async function bridgeManualOutreach(id: string): Promise<ChannelDispatchResult> {
  const url = process.env.MANUAL_DM_BRIDGE_URL;
  if (!url) {
    throw new Error(
      "MANUAL_DM_BRIDGE_URL is not configured. Add the extension/automation bridge URL or use the copy + mark-sent workflow.",
    );
  }

  const log = await getOutreachLog(id);
  if (!log) throw new Error("Outreach log not found.");
  if ((log.delivery_mode ?? "api") !== "manual") {
    throw new Error("Only manual cold-outreach rows can be sent through the bridge.");
  }
  if (!["queued", "failed"].includes(log.status)) {
    return resultFromLog(log, { retryable: false });
  }

  const payload = (log.payload ?? {}) as unknown as VideoPitchPayload;
  const secret = process.env.MANUAL_DM_BRIDGE_SECRET;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) {
    headers["x-bizreborn-secret"] = secret;
    headers.Authorization = `Bearer ${secret}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        outreachLogId: log.id,
        channel: log.channel,
        recipient: log.recipient,
        message: log.message,
        videoUrl: log.video_url,
        thumbnailUrl: log.thumbnail_url,
        leadName: payload.leadName ?? log.recipient_name,
        businessName: payload.businessName,
        pageId: log.page_id,
        prospectId: log.prospect_id,
      }),
      signal: AbortSignal.timeout(Number(process.env.MANUAL_DM_BRIDGE_TIMEOUT_MS || 15_000)),
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bridge request failed.";
    await updateOutreachLog(id, { error_code: "bridge_unreachable", error_message: message });
    throw new MessagingError(message, { code: "bridge_unreachable", retryable: true });
  }

  const bodyText = await response.text().catch(() => "");
  if (!response.ok) {
    const message = `Manual bridge failed (HTTP ${response.status})${bodyText ? `: ${bodyText.slice(0, 300)}` : ""}`;
    await updateOutreachLog(id, { error_code: "bridge_failed", error_message: message });
    throw new MessagingError(message, { code: "bridge_failed", retryable: true });
  }

  let messageId: string | null = null;
  try {
    const json = JSON.parse(bodyText) as Record<string, unknown>;
    const candidate = json.id ?? json.messageId ?? json.providerMessageId;
    if (typeof candidate === "string" && candidate.trim()) messageId = candidate.trim();
  } catch {
    // Bridge may return plain text/empty 200; the manual row still succeeds.
  }

  return markManualOutreachSent(id, {
    providerMessageId: messageId,
    note: "manual bridge",
  });
}

