/**
 * Small fetch helpers shared by the messaging adapters.
 *
 * All outbound provider calls go through here so a hung Graph/TikTok request
 * can never pin a serverless function for its full 60s lifetime.
 */

export const MESSAGING_TIMEOUT_MS = Number(
  process.env.MESSAGING_SEND_TIMEOUT_MS || 15_000,
);

export function parseRetryAfterMs(headers: Headers): number | undefined {
  const retryAfter = headers.get("retry-after");
  if (!retryAfter) return undefined;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(retryAfter);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

/** 429/5xx and Graph's transient 1/2/4/17/32/613/1200 codes deserve a retry. */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text.slice(0, 2_000) };
  }
}

export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
  timeoutMs = MESSAGING_TIMEOUT_MS,
): Promise<{ res: Response; data: Record<string, unknown> }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  return { res, data: await readJsonSafe(res) };
}

/** Truncate without splitting surrogate pairs (emoji-safe). */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
