import "server-only";

import type { OutreachChannel, Prospect } from "@/lib/supabase-types";
import { OUTREACH_CHANNELS } from "@/lib/services/messaging/types";

/**
 * Small parsing helpers shared by the dispatch and manual-queue API routes.
 * Kept dependency-free so they stay easy to unit test.
 */

export function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function absoluteUrl(value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}${value.startsWith("/") ? value : `/${value}`}`;
}

/** Safely turns a stored social URL into a handle / numeric id. */
export function socialHandle(value: string | null): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!/^https?:\/\//i.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    if (/^\d{5,}$/.test(last)) return last;
    const first = parts[0]?.replace(/^@/, "") ?? "";
    return first ? `@${first}` : null;
  } catch {
    return raw;
  }
}

export function normalizeChannels(value: unknown): OutreachChannel[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => String(item).trim().toLowerCase())
        .filter((item): item is OutreachChannel =>
          (OUTREACH_CHANNELS as string[]).includes(item),
        ),
    ),
  ];
}

/** Accepts either `channels: ["instagram"]` or a single `channel: "instagram"`. */
export function channelsFromInput(channels: unknown, channel: unknown): OutreachChannel[] {
  const list = normalizeChannels(channels);
  if (list.length) return list;
  const single = typeof channel === "string" ? channel.trim().toLowerCase() : "";
  return (OUTREACH_CHANNELS as string[]).includes(single)
    ? [single as OutreachChannel]
    : [];
}

/** Channels a stored prospect can receive on, based on saved handles/phone. */
export function channelsForProspect(p: Prospect): OutreachChannel[] {
  const channels: OutreachChannel[] = [];
  if (p.instagram) channels.push("instagram");
  if (p.facebook) channels.push("facebook");
  if (p.tiktok) channels.push("tiktok");
  if (p.phone) channels.push("whatsapp");
  return channels;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
