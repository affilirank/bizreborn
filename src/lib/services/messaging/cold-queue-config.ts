import "server-only";

import type { OutreachChannel } from "@/lib/supabase-types";
import { OUTREACH_CHANNELS } from "@/lib/services/messaging/types";

/**
 * Environment-driven config for automatic cold-queue intake.
 *
 * Kept in its own module (no adapter/dispatcher imports) so the scraper can
 * read the flags without pulling the whole messaging stack into its bundle.
 */

export const DEFAULT_COLD_CHANNELS: OutreachChannel[] = [
  "instagram",
  "facebook",
  "tiktok",
];

/** Auto-queue leads after their pitch video renders. Default on; `0` disables. */
export function coldQueueEnabled(): boolean {
  const raw = (process.env.OUTREACH_QUEUE_ON_READY ?? "1").trim().toLowerCase();
  return !["0", "false", "off", "no"].includes(raw);
}

/**
 * Channels eligible for manual cold outreach. WhatsApp is intentionally not a
 * default: cold WhatsApp still needs an approved template, so it should only be
 * enabled after the template is approved.
 */
export function configuredColdChannels(): OutreachChannel[] {
  const raw = process.env.OUTREACH_QUEUE_CHANNELS?.trim();
  const list = (raw ? raw.split(",") : DEFAULT_COLD_CHANNELS).map((item) =>
    item.trim().toLowerCase(),
  );
  return [
    ...new Set(
      list.filter((item): item is OutreachChannel =>
        (OUTREACH_CHANNELS as string[]).includes(item),
      ),
    ),
  ];
}

/**
 * Optional city allow-list, e.g.
 * `OUTREACH_QUEUE_CITIES=Vero Beach,Indian River,Sebastian,Stuart`.
 * Empty/unset means every scraped city is eligible.
 */
export function cityMatchesColdQueue(city: string | null | undefined): boolean {
  const raw = process.env.OUTREACH_QUEUE_CITIES?.trim();
  if (!raw) return true;
  const haystack = String(city ?? "").trim().toLowerCase();
  if (!haystack) return false;
  return raw
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .some((token) => haystack.includes(token));
}
