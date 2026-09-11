import { createServiceClient } from "@/lib/supabase/admin";
import { getSupabase } from "@/lib/supabase";

export type BookingStatus =
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "no-show"
  | "cancelled";

export interface BookingRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string;
  notes: string | null;
  call_type: string;
  scheduled_at: string;
  duration_min: number;
  timezone: string | null;
  status: BookingStatus;
  prospect_id: string | null;
  created_at: string;
  updated_at: string;
}

export type BookingInput = Omit<
  BookingRow,
  "id" | "created_at" | "updated_at" | "status"
> & { status?: BookingStatus };

/**
 * Strategy-call bookings store.
 *
 * Persists to the `bookings` table through the service-role client with an
 * in-memory fallback so public scheduling and admin management still work when
 * the table/client isn't configured. Mirrors the call-store pattern.
 */
let tableMissing = false;

async function serviceDb() {
  const service = createServiceClient();
  if (service) return service;
  return getSupabase();
}

const memoryBookings = new Map<string, BookingRow>();

function toRow(row: Record<string, unknown>): BookingRow {
  const str = (v: unknown): string => (v == null ? "" : String(v));
  const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));
  return {
    id: str(row.id),
    name: str(row.name ?? "Guest"),
    email: str(row.email),
    phone: strOrNull(row.phone),
    business_name: str(row.business_name),
    notes: strOrNull(row.notes),
    call_type: str(row.call_type ?? "Strategy Call"),
    scheduled_at: str(row.scheduled_at ?? new Date().toISOString()),
    duration_min: Number(row.duration_min ?? 60),
    timezone: strOrNull(row.timezone),
    status: (row.status as BookingStatus) ?? "confirmed",
    prospect_id: strOrNull(row.prospect_id),
    created_at: str(row.created_at ?? new Date().toISOString()),
    updated_at: str(row.updated_at ?? new Date().toISOString()),
  };
}

function memoryId(): string {
  try {
    const u = globalThis.crypto?.randomUUID?.();
    if (u) return u;
  } catch {
    // fall through
  }
  return `mem-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function createBooking(input: BookingInput): Promise<BookingRow> {
  const now = new Date().toISOString();
  const row: BookingRow = {
    id: memoryId(),
    created_at: now,
    updated_at: now,
    status: "confirmed",
    ...input,
    scheduled_at: new Date(input.scheduled_at).toISOString(),
  };
  memoryBookings.set(row.id, row);

  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const { data, error } = await sb
      .from("bookings")
      .insert({
        name: row.name,
        email: row.email,
        phone: row.phone,
        business_name: row.business_name,
        notes: row.notes,
        call_type: row.call_type,
        scheduled_at: row.scheduled_at,
        duration_min: row.duration_min,
        timezone: row.timezone,
        status: row.status,
        prospect_id: row.prospect_id,
      })
      .select("*")
      .single();
    if (!error && data) {
      const saved = toRow(data);
      memoryBookings.set(saved.id, saved);
      return saved;
    }
    const msg = error?.message ?? error?.code ?? "";
    if (/Could not find the table|relation .* does not exist|PGRST205|PGRST204/i.test(msg)) {
      tableMissing = true;
    }
  }
  return row;
}

export async function getBooking(id: string): Promise<BookingRow | null> {
  if (memoryBookings.has(id)) return memoryBookings.get(id)!;
  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const { data, error } = await sb
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) {
      const row = toRow(data);
      memoryBookings.set(id, row);
      return row;
    }
  }
  return null;
}

export async function listBookings(opts?: {
  status?: BookingStatus | "all";
  from?: string;
  to?: string;
}): Promise<BookingRow[]> {
  const sb = await serviceDb();
  if (sb && !tableMissing) {
    let query = sb.from("bookings").select("*");
    if (opts?.status && opts.status !== "all") {
      query = query.eq("status", opts.status);
    }
    if (opts?.from) {
      query = query.gte("scheduled_at", new Date(opts.from).toISOString());
    }
    if (opts?.to) {
      query = query.lte("scheduled_at", new Date(opts.to).toISOString());
    }
    const { data, error } = await query.order("scheduled_at", { ascending: true });
    if (!error && data) {
      const rows = data.map(toRow);
      rows.forEach((r) => memoryBookings.set(r.id, r));
      return rows;
    }
    const msg = error?.message ?? error?.code ?? "";
    if (/Could not find the table|relation .* does not exist|PGRST205|PGRST204/i.test(msg)) {
      tableMissing = true;
    }
  }
  let rows = [...memoryBookings.values()].sort((a, b) =>
    a.scheduled_at.localeCompare(b.scheduled_at),
  );
  if (opts?.status && opts.status !== "all") {
    rows = rows.filter((r) => r.status === opts.status);
  }
  if (opts?.from) rows = rows.filter((r) => r.scheduled_at >= opts.from!);
  if (opts?.to) rows = rows.filter((r) => r.scheduled_at <= opts.to!);
  return rows;
}

export async function updateBooking(
  id: string,
  patch: Partial<Pick<BookingRow, "status" | "scheduled_at" | "duration_min" | "call_type" | "notes" | "timezone">>,
): Promise<BookingRow | null> {
  const existing = await getBooking(id);
  if (!existing) return null;
  const updated: BookingRow = {
    ...existing,
    ...patch,
    id: existing.id,
    updated_at: new Date().toISOString(),
  };
  if (patch.scheduled_at) updated.scheduled_at = new Date(patch.scheduled_at).toISOString();
  memoryBookings.set(id, updated);

  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const { data, error } = await sb
      .from("bookings")
      .update({
        status: updated.status,
        scheduled_at: updated.scheduled_at,
        duration_min: updated.duration_min,
        call_type: updated.call_type,
        notes: updated.notes,
        timezone: updated.timezone,
        updated_at: updated.updated_at,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (!error && data) {
      const saved = toRow(data);
      memoryBookings.set(id, saved);
      return saved;
    }
    const msg = error?.message ?? error?.code ?? "";
    if (/Could not find the table|relation .* does not exist|PGRST205|PGRST204/i.test(msg)) {
      tableMissing = true;
    }
  }
  return updated;
}

export async function deleteBooking(id: string): Promise<boolean> {
  memoryBookings.delete(id);
  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const { error } = await sb.from("bookings").delete().eq("id", id);
    if (!error) return true;
    const msg = error?.message ?? error?.code ?? "";
    if (/Could not find the table|relation .* does not exist|PGRST205|PGRST204/i.test(msg)) {
      tableMissing = true;
    }
  }
  return true;
}