import { getProspectById, updateProspect } from "@/lib/prospects";
import type { Prospect } from "@/lib/supabase-types";

export type GhlEventType = "audio_played" | "chat_interaction" | "lead_capture";

/**
 * Sync a prospect's high-intent event to GoHighLevel v2.
 *
 * @param prospectId The prospect ID to sync
 * @param eventType One of: "audio_played", "chat_interaction", "lead_capture"
 * @param extraContact Optional contact info (name/email/phone) from lead capture
 */
export async function syncProspectToGhl(
  prospectId: string,
  eventType: GhlEventType,
  extraContact?: { name?: string; email?: string; phone?: string }
): Promise<void> {
  // 1. Get the prospect row from Supabase (includes vertical/niche).
  const prospect = await getProspectById(prospectId);
  if (!prospect) {
    console.warn(`[ghl-bridge] Prospect ${prospectId} not found`);
    return;
  }

  // 2. Resolve contact info: new data overrides DB data when provided.
  let contactEmail = prospect.email;
  let contactPhone = prospect.phone;

  if (extraContact) {
    if (extraContact.email) contactEmail = extraContact.email;
    if (extraContact.phone) contactPhone = extraContact.phone;
  }

  // 3. Skip gracefully if we have nothing to identify the contact with.
  if (!contactEmail && !contactPhone) {
    console.warn(
      `[ghl-bridge] Prospect ${prospectId} has no contact info for GHL sync`,
    );
    return;
  }

  // 4. Skip gracefully if GHL API key is not configured.
  const ghlApiKey = process.env.GHL_API_KEY;
  if (!ghlApiKey) {
    console.warn("[ghl-bridge] GHL_API_KEY not configured - skipping GHL sync");
    return;
  }

  // 5. Single-vertical tagging: only [bizreborn, impressive-site-hot-lead, vertical].
  const vertical: string | null = prospect.vertical ?? null;
  const tags: string[] = ["bizreborn", "impressive-site-hot-lead", vertical].filter(
    Boolean,
  ) as string[];

  // 6. Build the GHL v2 upsert payload.
  const upsertPayload = {
    locationId: "gCaqVjrA1RxKaQVXm7U1",
    name: prospect.business_name,
    companyName: prospect.business_name,
    email: contactEmail ?? undefined,
    phone: contactPhone ?? undefined,
    source: "Merit Marketing Impressive Site",
    tags,
  };

  // 7. GHL v2 upsert endpoint.
  const url = "https://services.leadconnectorhq.com/contacts/upsert";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ghlApiKey}`,
    Version: "2021-07-28",
  };

  let contactId: string | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(upsertPayload),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[ghl-bridge] GHL upsert failed (${res.status}): ${text.slice(0, 300)}`,
      );
      return;
    }

    const data = await res.json();
    contactId = data?.contact?.id ?? null;

    // 8. Ensure tags are applied even if the contact already existed.
    //    POST https://services.leadconnectorhq.com/contacts/<contactId>/tags
    if (contactId && tags.length) {
      await fetch(
        `https://services.leadconnectorhq.com/contacts/${contactId}/tags`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ tags }),
          cache: "no-store",
        },
      );
    }
  } catch (error) {
    console.error(`[ghl-bridge] GHL sync error for ${prospectId}:`, error);
  }

  // 9. Persist the GHL contact ID back to the prospect row.
  if (contactId) {
    try {
      await updateProspect(prospectId, { ghl_contact_id: contactId });
    } catch (err) {
      console.error(
        `[ghl-bridge] Failed to save ghl_contact_id for ${prospectId}:`,
        err,
      );
    }
  }
}
