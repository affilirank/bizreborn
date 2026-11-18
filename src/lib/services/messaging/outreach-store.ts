import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import type {
  OutreachChannel,
  OutreachDeliveryMode,
  OutreachDirection,
  OutreachLog,
  OutreachStatus,
} from "@/lib/supabase-types";

/**
 * Persistence for `public.outreach_logs`.
 *
 * Mirrors the prospects store: Supabase service role when configured, with an
 * in-memory fallback so a missing migration never crashes the admin UI or
 * prevents local dispatch testing. Migration:
 * `supabase/migrations/003_outreach_logs.sql`.
 */

const TABLE = "outreach_logs";

interface StoreState {
  tableMissing: boolean;
  lastError: string | null;
}

const state: StoreState = { tableMissing: false, lastError: null };
const memory = new Map<string, OutreachLog>();

function noteError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  state.lastError = error.message ?? error.code ?? "unknown";
  if (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42501" ||
    /Could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "") ||
    /policy violation/i.test(error.message ?? "")
  ) {
    state.tableMissing = true;
  }
  return true;
}

function db() {
  if (state.tableMissing) return null;
  return createServiceClient();
}

function newId(): string {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return uuid;
  } catch {
    // fall through
  }
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  const s = (n: number) => Array.from({ length: n }, hex).join("");
  return `${s(8)}-${s(4)}-4${s(3)}-${["8", "9", "a", "b"][Math.floor(Math.random() * 4)]}${s(3)}-${s(12)}`;
}

export interface NewOutreachLog {
  prospect_id?: string | null;
  channel: OutreachChannel;
  direction?: OutreachDirection;
  delivery_mode?: OutreachDeliveryMode;
  recipient: string;
  recipient_name?: string | null;
  page_id?: string | null;
  message?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  status?: OutreachStatus;
  attempt?: number;
  max_attempts?: number;
  provider_message_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  next_attempt_at?: string | null;
  payload?: Record<string, unknown> | null;
  response?: Record<string, unknown> | null;
}

export interface OutreachLogFilters {
  prospectId?: string | null;
  channel?: OutreachChannel | null;
  deliveryMode?: OutreachDeliveryMode | null;
  status?: OutreachStatus | null;
  limit?: number;
}

export interface OutreachStoreStatus {
  backend: "supabase" | "memory";
  supabaseConfigured: boolean;
  tableMissing: boolean;
  lastError: string | null;
}

export function getOutreachStoreStatus(
  configured = Boolean(createServiceClient()),
): OutreachStoreStatus {
  return {
    backend: configured && !state.tableMissing ? "supabase" : "memory",
    supabaseConfigured: configured,
    tableMissing: state.tableMissing,
    lastError: state.lastError,
  };
}

function memoryInsert(row: OutreachLog): OutreachLog {
  memory.set(row.id, row);
  return row;
}

export async function insertOutreachLog(
  input: NewOutreachLog,
): Promise<OutreachLog> {
  const now = new Date().toISOString();
  const row: OutreachLog = {
    id: newId(),
    prospect_id: input.prospect_id ?? null,
    channel: input.channel,
    direction: input.direction ?? "outbound",
    delivery_mode: input.delivery_mode ?? "api",
    recipient: input.recipient,
    recipient_name: input.recipient_name ?? null,
    page_id: input.page_id ?? null,
    message: input.message ?? null,
    video_url: input.video_url ?? null,
    thumbnail_url: input.thumbnail_url ?? null,
    status: input.status ?? "queued",
    attempt: input.attempt ?? 0,
    max_attempts: input.max_attempts ?? 3,
    provider_message_id: input.provider_message_id ?? null,
    error_code: input.error_code ?? null,
    error_message: input.error_message ?? null,
    next_attempt_at: input.next_attempt_at ?? null,
    payload: input.payload ?? null,
    response: input.response ?? null,
    ghl_synced_at: null,
    ghl_error: null,
    sent_at: null,
    delivered_at: null,
    replied_at: null,
    created_at: now,
    updated_at: now,
  };

  const client = db();
  if (client) {
    const { data, error } = await client.from(TABLE).insert(row).select().single();
    if (error) {
      noteError(error);
    } else if (data) {
      const saved = data as OutreachLog;
      memoryInsert(saved);
      return saved;
    }
  }
  return memoryInsert(row);
}

export async function updateOutreachLog(
  id: string,
  patch: Partial<OutreachLog>,
): Promise<OutreachLog | null> {
  const updatedAt = new Date().toISOString();
  const cleanPatch: Record<string, unknown> = { ...patch, updated_at: updatedAt };
  delete cleanPatch.id;
  delete cleanPatch.created_at;

  const client = db();
  if (client) {
    const { data, error } = await client
      .from(TABLE)
      .update(cleanPatch)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) {
      noteError(error);
    } else if (data) {
      const saved = data as OutreachLog;
      memoryInsert(saved);
      return saved;
    }
  }

  const existing = memory.get(id);
  if (!existing) return null;
  const merged = { ...existing, ...cleanPatch, id, updated_at: updatedAt } as OutreachLog;
  memory.set(id, merged);
  return merged;
}

export async function getOutreachLog(id: string): Promise<OutreachLog | null> {
  const client = db();
  if (client) {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) noteError(error);
    else if (data) return data as OutreachLog;
  }
  return memory.get(id) ?? null;
}

export async function listOutreachLogs(
  filters: OutreachLogFilters = {},
): Promise<OutreachLog[]> {
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
  const client = db();
  if (client) {
    let query = client.from(TABLE).select("*");
    if (filters.prospectId) query = query.eq("prospect_id", filters.prospectId);
    if (filters.channel) query = query.eq("channel", filters.channel);
    if (filters.deliveryMode) query = query.eq("delivery_mode", filters.deliveryMode);
    if (filters.status) query = query.eq("status", filters.status);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) noteError(error);
    else if (data) return data as OutreachLog[];
  }

  let rows = [...memory.values()];
  if (filters.prospectId) rows = rows.filter((r) => r.prospect_id === filters.prospectId);
  if (filters.channel) rows = rows.filter((r) => r.channel === filters.channel);
  if (filters.deliveryMode) {
    rows = rows.filter((r) => (r.delivery_mode ?? "api") === filters.deliveryMode);
  }
  if (filters.status) rows = rows.filter((r) => r.status === filters.status);
  return rows
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export async function findOutreachLogByProviderMessageId(
  channel: OutreachChannel,
  providerMessageId: string,
): Promise<OutreachLog | null> {
  const client = db();
  if (client) {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("channel", channel)
      .eq("provider_message_id", providerMessageId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) noteError(error);
    else if (data) return data as OutreachLog;
  }
  for (const row of memory.values()) {
    if (row.channel === channel && row.provider_message_id === providerMessageId) {
      return row;
    }
  }
  return null;
}

/**
 * Finds the newest outbound message to a recipient. Used for read receipts
 * (which carry no message id) and inbound replies (which carry a *new* id),
 * so the original outbound row can advance to read/replied.
 */
export async function findLatestOutboundForRecipient(
  channel: OutreachChannel,
  recipient: string,
  statuses: OutreachStatus[] = ["sent", "delivered"],
): Promise<OutreachLog | null> {
  if (statuses.length === 0) return null;
  const client = db();
  if (client) {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("channel", channel)
      .eq("direction", "outbound")
      .eq("recipient", recipient)
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) noteError(error);
    else if (data) return data as OutreachLog;
  }
  const rows = [...memory.values()]
    .filter(
      (r) =>
        r.channel === channel &&
        r.direction === "outbound" &&
        r.recipient === recipient &&
        statuses.includes(r.status),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return rows[0] ?? null;
}

/** Failed API rows whose next_attempt_at is due and that still have attempts left. */
export async function dueRetryLogs(limit = 25): Promise<OutreachLog[]> {
  const now = new Date().toISOString();
  const client = db();
  if (client) {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("status", "failed")
      .eq("delivery_mode", "api")
      .lte("next_attempt_at", now)
      .order("next_attempt_at", { ascending: true })
      .limit(Math.min(Math.max(limit, 1), 100));
    if (error) noteError(error);
    else if (data) {
      return (data as OutreachLog[]).filter((r) => r.attempt < r.max_attempts);
    }
  }
  return [...memory.values()]
    .filter(
      (r) =>
        r.status === "failed" &&
        (r.delivery_mode ?? "api") === "api" &&
        r.next_attempt_at != null &&
        r.next_attempt_at <= now &&
        r.attempt < r.max_attempts,
    )
    .sort((a, b) => (a.next_attempt_at ?? "").localeCompare(b.next_attempt_at ?? ""))
    .slice(0, limit);
}

/**
 * Dedupe guard for scraper batches: a handle already waiting for a manual send
 * should not be queued twice on the next scrape run.
 */
export async function findPendingManualOutreach(
  channel: OutreachChannel,
  recipient: string,
): Promise<OutreachLog | null> {
  const client = db();
  if (client) {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("channel", channel)
      .eq("recipient", recipient)
      .eq("delivery_mode", "manual")
      .eq("status", "queued")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) noteError(error);
    else if (data) return data as OutreachLog;
  }
  for (const row of memory.values()) {
    if (
      row.channel === channel &&
      row.recipient === recipient &&
      (row.delivery_mode ?? "api") === "manual" &&
      row.status === "queued"
    ) {
      return row;
    }
  }
  return null;
}
