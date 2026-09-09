/**
 * Central registry of optional external credentials.
 *
 * All heavy production integrations (Google Maps scraping, Gemini, edge-tts,
 * Remotion/FFmpeg) are optional. When the corresponding env secret or system
 * binary is absent, services transparently fall back to deterministic mock data
 * so the whole pipeline can be exercised end-to-end without paid infra.
 */

export const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
  },
  scraping: {
    // "playwright" (real) or "mock" (no browser installed)
    mode: (process.env.SCRAPER_MODE || "auto") as "auto" | "playwright" | "mock",
    headless: process.env.SCRAPER_HEADLESS !== "false",
  },
  tts: {
    // "edge-tts" (real, python) or "mock"
    mode: (process.env.TTS_MODE || "auto") as "auto" | "edge-tts" | "mock",
    voice: process.env.TTS_VOICE || "en-US-ChristopherNeural",
  },
  video: {
    // "remotion" (real, spa render) or "mock"
    mode: (process.env.VIDEO_MODE || "auto") as "auto" | "remotion" | "mock",
  },
  storage: {
    publicBaseUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com",
  },
};

export function hasGemini(): boolean {
  return Boolean(config.gemini.apiKey);
}