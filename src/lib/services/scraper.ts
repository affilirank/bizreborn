import { callAi, parseAiJson } from "@/lib/ai-router";

export interface ScrapeResult {
  google_rating: number | null;
  review_count: number | null;
  unanswered_reviews: number | null;
  competitor_name: string | null;
  competitor_reviews: number | null;
  instagram?: string | null;
  facebook?: string | null;
  audit_screenshot_url: string;
  website_preview_url: string;
}

export interface ScrapeInput {
  business_name: string;
  city: string;
  website?: string | null;
  google_maps_link?: string | null;
}

/**
 * Reputation & social handle scraper using the smart AI router.
 * If no explicit public rating/reviews are found, returns null without synthesizing arbitrary fake numbers.
 */
export async function scrapeReputation(input: ScrapeInput): Promise<ScrapeResult> {
  const queryText = input.google_maps_link ? `${input.business_name} ${input.city} [Maps Link: ${input.google_maps_link}]` : `${input.business_name} ${input.city}`;
  
  try {
    const text = await callAi({
      prompt: `Target: ${queryText}`,
      systemPrompt:
        "You are a precise business data extraction agent. Given a business name and city, return ONLY a valid JSON object with keys: google_rating (number or null), review_count (number or null), unanswered_reviews (number or null), competitor_name (string or null), competitor_reviews (number or null), instagram (string handle or empty), facebook (string name/url or empty). If exact public metrics are unknown or unverified, return null for numbers. Example format: {\"google_rating\": null, \"review_count\": null, ...}. Raw JSON object only, no markdown code fences, no conversational filler.",
      jsonMode: true,
    });

    if (text) {
      const parsed = parseAiJson<{
        google_rating?: number | null;
        review_count?: number | null;
        unanswered_reviews?: number | null;
        competitor_name?: string | null;
        competitor_reviews?: number | null;
        instagram?: string | null;
        facebook?: string | null;
      }>(text);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
          google_rating: parsed.google_rating != null && !isNaN(Number(parsed.google_rating)) ? Number(parsed.google_rating) : null,
          review_count: parsed.review_count != null && !isNaN(Number(parsed.review_count)) ? Number(parsed.review_count) : null,
          unanswered_reviews: parsed.unanswered_reviews != null && !isNaN(Number(parsed.unanswered_reviews)) ? Number(parsed.unanswered_reviews) : null,
          competitor_name: parsed.competitor_name ? String(parsed.competitor_name).trim() : null,
          competitor_reviews: parsed.competitor_reviews != null && !isNaN(Number(parsed.competitor_reviews)) ? Number(parsed.competitor_reviews) : null,
          instagram: String(parsed.instagram || "").trim() || null,
          facebook: String(parsed.facebook || "").trim() || null,
          audit_screenshot_url: "",
          website_preview_url: "",
        };
      }
    }
  } catch (err) {
    console.warn("[scraper] lookup failed, using fallback:", err);
  }

  return mockScrape(input);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function mockScrape(input: ScrapeInput): ScrapeResult {
  const cleanName = input.business_name.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Do NOT synthesize arbitrary fake ratings or review counts silently without indication.
  // Return null when unverified so metrics are never falsely presented.
  return {
    google_rating: null,
    review_count: null,
    unanswered_reviews: null,
    competitor_name: null,
    competitor_reviews: null,
    instagram: `@${cleanName}`,
    facebook: `${cleanName}official`,
    audit_screenshot_url: "",
    website_preview_url: "",
  };
}
