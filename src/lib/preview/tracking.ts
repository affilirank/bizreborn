/**
 * Client-side high-intent tracker for /impressive-site/[id].
 *
 * Fires each event at most once per browser session per prospect via
 * sessionStorage keys: ghl_synced_${prospectId}_${eventType}
 *
 * POSTs to the public /api/preview/engage route. No credentials, tokens, or
 * secrets are ever referenced in the client bundle.
 */

export type ClientTrackEvent = "audio_played" | "chat_interaction";

export interface TrackImpressiveEventInput {
  prospectId: string;
  eventType: ClientTrackEvent;
}

export function trackImpressiveEvent({
  prospectId,
  eventType,
}: TrackImpressiveEventInput): void {
  if (typeof window === "undefined" || !prospectId) return;

  const key = `ghl_synced_${prospectId}_${eventType}`;

  try {
    if (window.sessionStorage.getItem(key) === "1") return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Storage disabled (private mode) — still attempt the single fire.
  }

  void fetch("/api/preview/engage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prospectId, eventType }),
    keepalive: true,
  }).catch(() => {
    // Non-blocking: a failed sync never breaks the preview UX.
  });
}
