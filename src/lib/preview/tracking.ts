/**
 * Client-side high-intent event tracker for /impressive-site/[id].
 *
 * Fires audio_played / chat_interaction to the protected /api/merit-bridge
 * using a short-lived prospect-scoped token minted by the server page.
 *
 * Deduplicates once per session per (prospect, event) via sessionStorage so
 * replaying audio or sending 10 chat messages only produces ONE GHL sync.
 */

export type ClientTrackEvent = "audio_played" | "chat_interaction";

export interface TrackImpressiveEventInput {
  prospectId: string;
  eventType: ClientTrackEvent;
  token?: string;
  expiresAt?: number;
}

const SESSION_KEY = "impressive-site:tracked-events";

function alreadyFired(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Boolean(parsed[key]);
  } catch {
    return false;
  }
}

function markFired(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    parsed[key] = Date.now();
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
  } catch {
    // Private mode / disabled storage — still attempt the single fire.
  }
}

export function trackImpressiveEvent({
  prospectId,
  eventType,
  token,
  expiresAt,
}: TrackImpressiveEventInput): void {
  if (typeof window === "undefined" || !prospectId) return;
  if (!token || !expiresAt) return; // No scoped token — skip silently.

  const key = `${prospectId}:${eventType}`;
  if (alreadyFired(key)) return;
  markFired(key);

  void fetch("/api/merit-bridge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-merit-bridge-token": token,
    },
    body: JSON.stringify({ prospectId, eventType, expiresAt }),
    keepalive: true,
  }).catch(() => {
    // Non-blocking: a failed GHL sync never breaks the preview UX.
  });
}
