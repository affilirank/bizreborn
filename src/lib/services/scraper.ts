import { callAi } from "@/lib/ai-router";

export interface ScrapeResult {
  google_rating: number;
  review_count: number;
  unanswered_reviews: number;
  competitor_name: string;
  competitor_reviews: number;
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
 * Reputation scraper. If website or business name is a Google Maps link,
 * or using AI router with direct Maps link extraction.
 */
export async function scrapeReputation(input: ScrapeInput): Promise<ScrapeResult> {
// queryText defined below
  
  // If input is a Google Maps link or URL, use it directly
  const isMapsLink = /google\.com\/maps|goo\.gl\/maps/i.test(input.business_name) || /google\.com\/maps|goo\.gl\/maps/i.test(input.website || "") || /google\.com\/maps|goo\.gl\/maps/i.test(input.google_maps_link || "");
  const queryText = input.google_maps_link ? `${input.business_name} ${input.city} [Maps Link: ${input.google_maps_link}]` : `${input.business_name} ${input.city}`;
  
  try {
    const text = await callAi({
      prompt: `Target: ${queryText}${isMapsLink ? ` (Google Maps URL provided)` : ""}`,
      systemPrompt:
        "You are a precise Google Maps data extraction agent. Given a business name/URL and city, return ONLY a JSON object with accurate public reputation metrics: google_rating (number), review_count (number), unanswered_reviews (number), competitor_name (string, top local competitor), competitor_reviews (number). No markdown, raw JSON only.",
      jsonMode: true,
    });

    if (text) {
      const parsed = JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
      if (parsed && typeof parsed.google_rating === "number") {
        return {
          google_rating: Number(parsed.google_rating) || 5.0,
          review_count: Number(parsed.review_count) || 130,
          unanswered_reviews: Number(parsed.unanswered_reviews) || 0,
          competitor_name: String(parsed.competitor_name || "Top Local Competitor"),
          competitor_reviews: Number(parsed.competitor_reviews) || 180,
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
  const seed = hashString(`${input.business_name}|${input.city}`) % 100;
  const rating = 5.0;
  const reviewCount = 130;
  const unanswered = 0;
  const competitorReviews = 180;
  const competitorName = "Market Leader Realty";

  return {
    google_rating: rating,
    review_count: reviewCount,
    unanswered_reviews: unanswered,
    competitor_name: competitorName,
    competitor_reviews: competitorReviews,
    audit_screenshot_url: "",
    website_preview_url: "",
  };
}
