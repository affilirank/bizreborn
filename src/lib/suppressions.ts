import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Email suppression list.
 *
 * "Remove and remember": deleted-as-bad leads are recorded here so a future
 * CSV re-import or campaign can never re-add or re-contact that address.
 * Works with or without the `email_suppressions` table (falls back to an
 * in-memory set when the table is missing, mirroring the prospects store).
 */

const memory = new Set<string>();

function normalize(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

export async function suppressEmails(emails: Array<string | null | undefined>, reason: string): Promise<number> {
  const clean = emails.map(normalize).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (clean.length === 0) return 0;
  for (const e of clean) memory.add(e);
  const admin = createServiceClient();
  if (!admin) return clean.length;
  const { error } = await admin
    .from("email_suppressions")
    .upsert(clean.map((email) => ({ email, reason })), { onConflict: "email" });
  if (error) {
    console.warn("[suppressions] DB unavailable, kept in memory only:", error.message);
  }
  return clean.length;
}

export async function getSuppressedEmails(): Promise<Set<string>> {
  const set = new Set(memory);
  const admin = createServiceClient();
  if (!admin) return set;
  const { data, error } = await admin.from("email_suppressions").select("email");
  if (!error && Array.isArray(data)) {
    for (const row of data as Array<{ email: string }>) set.add(normalize(row.email));
  }
  return set;
}

export function isSuppressed(email: string | null | undefined, suppressed: Set<string>): boolean {
  const e = normalize(email);
  return e !== "" && suppressed.has(e);
}
