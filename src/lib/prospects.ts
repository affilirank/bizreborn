import { getSupabase } from "@/lib/supabase";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Prospect, ProspectStatus } from "@/lib/supabase-types";
import { slugify } from "@/lib/utils";

/**
 * Prospects store.
 *
 * When Supabase credentials are configured this persists to the `prospects`
 * table (service-role client for the admin back-office). Otherwise it falls back
 * to an in-memory store so the module can be exercised in demo mode without a
 * live backend. All mutations are async so the two backends share a single
 * interface.
 */

// Server-side admin reads/writes use the service-role client so RLS (which
// keeps anonymous visitors limited to public 'ready' rows on the pitch page)
// does not block the admin back-office CRUD. Falls back to the anon client when
// no service key, and the in-memory store when no Supabase is configured at all.
function serviceDb() {
  return createServiceClient() ?? getSupabase();
}

// Public reads use the anon client so RLS can restrict what is exposed, e.g.
// only returning prospects whose status is 'ready' on the public pitch page.
function anonDb() {
  return getSupabase();
}

const memoryStore = new Map<string, Prospect>();
let memorySeq = 0;

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
    id: input.id || `local-${now.replace(/\D/g, "").slice(0, 14)}-${memorySeq}`,
    business_name: input.business_name,
    city: input.city ?? null,
    website: input.website ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
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
      slugify(`${input.business_name}${input.city ? `-${input.city}` : ""}`),
    status: input.status ?? "pending",
    error: input.error ?? null,
    created_at: input.created_at ?? now,
    updated_at: input.updated_at ?? now,
  };
}

export async function listProspects(): Promise<Prospect[]> {
  const sb = serviceDb();
  if (sb) {
    const { data } = await sb
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as Prospect[]) ?? [];
  }
  return Array.from(memoryStore.values()).sort(
    (a, b) => b.created_at.localeCompare(a.created_at),
  );
}

export async function getProspectById(id: string): Promise<Prospect | null> {
  const sb = serviceDb();
  if (sb) {
    const { data } = await sb.from("prospects").select("*").eq("id", id).single();
    return (data as Prospect) ?? null;
  }
  return memoryStore.get(id) ?? null;
}

export async function getProspectBySlug(
  slug: string,
): Promise<Prospect | null> {
  const sb = anonDb();
  if (sb) {
    const { data } = await sb
      .from("prospects")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return (data as Prospect) ?? null;
  }
  for (const p of memoryStore.values()) {
    if (p.slug === slug) return p;
  }
  return null;
}

export async function insertProspects(
  inputs: Array<Partial<Prospect> & { business_name: string }>,
): Promise<Prospect[]> {
  const rows = inputs.map(toMemoryRow);
  const sb = serviceDb();
  if (sb) {
    const { data } = await sb
      .from("prospects")
      .insert(rows.map(({ ...r }) => ({ ...r })))
      .select();
    return (data as Prospect[]) ?? [];
  }
  return memoryUpsertRows(rows);
}

export async function updateProspect(
  id: string,
  patch: Partial<Prospect>,
): Promise<Prospect | null> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _created_at, ...clean } = patch;
  const sb = serviceDb();
  if (sb) {
    const { data } = await sb
      .from("prospects")
      .update({ ...clean, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    return (data as Prospect) ?? null;
  }
  const existing = memoryStore.get(id);
  if (!existing) return null;
  const updated: Prospect = {
    ...existing,
    ...clean,
    id,
    updated_at: new Date().toISOString(),
  };
  memoryStore.set(id, updated);
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
  const sb = serviceDb();
  if (sb) {
    const { error } = await sb.from("prospects").delete().eq("id", id);
    return !error;
  }
  return memoryStore.delete(id);
}