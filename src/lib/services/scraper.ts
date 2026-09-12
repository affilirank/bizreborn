import { callAi, parseAiJson } from "@/lib/ai-router";
import { canReceiveEmail, normalizeEmail } from "@/lib/services/email-validate";

export interface ScrapeResult {
  google_rating: number | null;
  review_count: number | null;
  unanswered_reviews: number | null;
  competitor_name: string | null;
  competitor_reviews: number | null;
  instagram?: string | null;
  facebook?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  audit_screenshot_url: string;
  website_preview_url: string;
}

export interface ScrapeInput {
  business_name: string;
  city: string;
  website?: string | null;
  google_maps_link?: string | null;
}

function toHttpUrl(value: string | null | undefined): string | null {
  const url = String(value ?? "").trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

export async function scrapeReputation(input: ScrapeInput): Promise<ScrapeResult> {
  const queryText = input.google_maps_link ? `${input.business_name} ${input.city} [Maps Link: ${input.google_maps_link}]` : `${input.business_name} ${input.city}`;

  try {
    const text = await callAi({
      prompt: `Target: ${queryText}`,
      systemPrompt:
        "You are a precise business data extraction agent. Given a business name and city, return ONLY a valid JSON object with keys: google_rating (number or null), review_count (number or null), unanswered_reviews (number or null), competitor_name (string or null), competitor_reviews (number or null), instagram (string handle or empty), facebook (string name/url or empty), website (string or empty), phone (string or empty), email (string or empty). If exact public metrics are unknown or unverified, return null for numbers. NEVER fabricate a website, phone, or email — if you cannot verify the exact real value, return an empty string for that key. Raw JSON object only, no markdown code fences, no conversational filler.",
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
        website?: string | null;
        phone?: string | null;
        email?: string | null;
      }>(text);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const email = normalizeEmail(parsed.email);
        const verifiedEmail = (email && (await canReceiveEmail(email))) ? email : null;
        return {
          google_rating: parsed.google_rating != null && !isNaN(Number(parsed.google_rating)) ? Number(parsed.google_rating) : null,
          review_count: parsed.review_count != null && !isNaN(Number(parsed.review_count)) ? Number(parsed.review_count) : null,
          unanswered_reviews: parsed.unanswered_reviews != null && !isNaN(Number(parsed.unanswered_reviews)) ? Number(parsed.unanswered_reviews) : null,
          competitor_name: parsed.competitor_name ? String(parsed.competitor_name).trim() : null,
          competitor_reviews: parsed.competitor_reviews != null && !isNaN(Number(parsed.competitor_reviews)) ? Number(parsed.competitor_reviews) : null,
          instagram: String(parsed.instagram || "").trim() || null,
          facebook: String(parsed.facebook || "").trim() || null,
          website: toHttpUrl(parsed.website),
          phone: String(parsed.phone || "").trim() || null,
          email: verifiedEmail,
          audit_screenshot_url: "",
          website_preview_url: "",
        };
      }
    }
  } catch (err) {
    console.warn("[scraper] lookup failed:", err);
  }

  // Unverified only — never invent a website, email, or review stats.
  return {
    google_rating: null,
    review_count: null,
    unanswered_reviews: null,
    competitor_name: null,
    competitor_reviews: null,
    instagram: null,
    facebook: null,
    website: null,
    phone: null,
    email: null,
    audit_screenshot_url: "",
    website_preview_url: "",
  };
}