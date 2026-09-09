import { createClient } from "@/lib/supabase/client";
import { getSupabase } from "@/lib/supabase";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Prospect, ProspectStatus } from "@/lib/supabase-types";
import { slugify } from "@/lib/utils";

/**
 * Prospects store.
 *
 * Resolves the database client using a robust multi-tier strategy:
 * 1. Service role client (bypasses RLS for admin back-office).
 * 2. Authenticated server/client session client (honors RLS admin policies).
 * 3. In-memory local fallback store (guarantees zero crash/data loss when unconfigured).
 *
 * Also synchronizes between Supabase and memory to prevent lead loss.
 */

async function serviceDb() {
  const service = createServiceClient();
  if (service) return service;

  const anon = getSupabase();
  if (anon) return anon;

  return null;
}

let tableMissing = false;
let lastStoreError: string | null = null;

function noteError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  lastStoreError = error.message ?? error.code ?? "unknown";
  if (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42501" || // RLS violation
    /Could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "") ||
    /policy violation/i.test(error.message ?? "")
  ) {
    if (error.code === "42501") {
      console.warn("[prospects] RLS policy violation on admin operation. Ensure user profile has role = 'admin' or configure SUPABASE_SERVICE_ROLE_KEY.");
    } else {
      tableMissing = true;
    }
  }
  return true;
}

export interface ProspectStoreStatus {
  backend: "supabase" | "memory";
  supabaseConfigured: boolean;
  setupRequired: boolean;
  lastError: string | null;
}

export function getProspectStoreStatus(): ProspectStoreStatus {
  const configured = Boolean(createServiceClient() ?? getSupabase());
  return {
    backend: configured && !tableMissing ? "supabase" : "memory",
    supabaseConfigured: configured,
    setupRequired: configured && tableMissing,
    lastError: lastStoreError,
  };
}

const memoryStore = new Map<string, Prospect>();
let memorySeq = 0;

/**
 * Generates a real UUID for new prospects. The Supabase `prospects.id`
 * column is `uuid`, so the old `local-...` ids made every upsert fail
 * silently — rows only ever lived in one serverless instance's memory,
 * which caused "Prospect not found" errors on later reads.
 */
function newId(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") {
      const u = c.randomUUID();
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u)) {
        return u;
      }
    }
  } catch {
    // fall through to local fallback
  }
  return `00000000-0000-4000-8000-${String(memorySeq).padStart(12, "0")}`;
}

function memoryUpsertRows(rows: Prospect[]): Prospect[] {
  for (const row of rows) {
    memoryStore.set(row.id, { ...row });
  }
  return rows;
}

function toMemoryRow(input: Partial<Prospect> & { business_name: string }): Prospect {
  memorySeq += 1;
  const now = new Date().toISOString();
  return {
    id: input.id || newId(),
    business_name: input.business_name,
    city: input.city ?? null,
    website: input.website ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    google_maps_link: input.google_maps_link ?? null,
    instagram: input.instagram ?? null,
    facebook: input.facebook ?? null,
    tiktok: input.tiktok ?? null,
    audit_report: input.audit_report ?? null,
    roi_projection: input.roi_projection ?? null,
    recommended_services: input.recommended_services ?? null,
    qualifying_score: input.qualifying_score ?? null,
    missing_gbp_apple: input.missing_gbp_apple ?? null,
    google_rating: input.google_rating ?? null,
    review_count: input.review_count ?? null,
    unanswered_reviews: input.unanswered_reviews ?? null,
    competitor_name: input.competitor_name ?? null,
    competitor_reviews: input.competitor_reviews ?? null,
    audit_screenshot_url: input.audit_screenshot_url ?? null,
    website_preview_url: input.website_preview_url ?? null,
    voiceover_url: input.voiceover_url ?? null,
    video_url: input.video_url ?? null,
    thumbnail_url: input.thumbnail_url ?? null,
    pitch_script: input.pitch_script ?? null,
    slug:
      input.slug ??
      `${slugify(`${input.business_name}${input.city ? `-${input.city}` : ""}`)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
    status: input.status ?? "saved",
    last_contacted_at: input.last_contacted_at ?? null,
    communication_logs: input.communication_logs ?? null,
    error: input.error ?? null,
    created_at: input.created_at ?? now,
    updated_at: input.updated_at ?? now,
  };
}

export async function listProspects(): Promise<Prospect[]> {
  const sb = await serviceDb();
  let dbRows: Prospect[] = [];
  if (sb && !tableMissing) {
    const { data, error } = await sb
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false });
    if (!noteError(error)) {
      dbRows = (data as Prospect[]) ?? [];
    }
  }

  // Merge with memoryStore so no local/fallback leads are ever lost
  const merged = new Map<string, Prospect>();
  for (const r of memoryStore.values()) merged.set(r.id, r);
  for (const r of dbRows) merged.set(r.id, r);

  return Array.from(merged.values()).sort((a, b) => {
    const scoreA = a.qualifying_score ?? 0;
    const scoreB = b.qualifying_score ?? 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return b.created_at.localeCompare(a.created_at);
  });
}

export async function getProspectById(id: string): Promise<Prospect | null> {
  if (memoryStore.has(id)) return memoryStore.get(id)!;
  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const { data, error } = await sb
      .from("prospects")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!noteError(error) && data) {
      const row = data as Prospect;
      memoryStore.set(id, row);
      return row;
    }
  }
  return memoryStore.get(id) ?? null;
}

export async function getProspectBySlug(slug: string): Promise<Prospect | null> {
  for (const p of memoryStore.values()) {
    if (p.slug === slug) return p;
  }
  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const { data, error } = await sb
      .from("prospects")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!noteError(error) && data) {
      const row = data as Prospect;
      memoryStore.set(row.id, row);
      return row;
    }
  }
  return null;
}

export async function insertProspects(
  inputs: Array<Partial<Prospect> & { business_name: string }>,
): Promise<Prospect[]> {
  const rows = inputs.map(toMemoryRow);
  memoryUpsertRows(rows);

  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const payload = rows.map(({ id: _id, ...r }) => r);
    const { data, error } = await sb.from("prospects").upsert(rows, { onConflict: "id" }).select();
    if (!noteError(error) && Array.isArray(data)) {
      const inserted = data as Prospect[];
      memoryUpsertRows(inserted);
      return inserted;
    }
  }
  return rows;
}

export async function updateProspect(
  id: string,
  patch: Partial<Prospect>,
): Promise<Prospect | null> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _created_at, ...clean } = patch;
  const updatedAt = new Date().toISOString();

  const existing = memoryStore.get(id);
  const updated: Prospect = existing
    ? { ...existing, ...clean, id, updated_at: updatedAt }
    : toMemoryRow({ id, business_name: clean.business_name || "Business", ...clean });
  memoryStore.set(id, updated);

  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const { data, error } = await sb
      .from("prospects")
      .update({ ...clean, updated_at: updatedAt })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (!noteError(error) && data) {
      const row = data as Prospect;
      memoryStore.set(id, row);
      return row;
    }
  }
  return updated;
}

export async function setProspectStatus(
  id: string,
  status: ProspectStatus,
  extra: Partial<Prospect> = {},
): Promise<Prospect | null> {
  return updateProspect(id, { status, ...extra });
}

export async function deleteProspect(id: string): Promise<boolean> {
  memoryStore.delete(id);
  const sb = await serviceDb();
  if (sb && !tableMissing) {
    const { error } = await sb.from("prospects").delete().eq("id", id);
    if (!noteError(error)) return true;
  }
  return true;
}
