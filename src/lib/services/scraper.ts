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

/**
 * Fetches website HTML (with a short timeout) and extracts any valid `mailto:` or regex email addresses.
 */
async function scrapeEmailFromWebsiteUrl(websiteUrl: string): Promise<string | null> {
  const url = toHttpUrl(websiteUrl);
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const html = await res.text();

    // 1. Extract mailto: links
    const mailtoRegex = /href=["']mailto:([^"'?#]+)["']/gi;
    let match;
    while ((match = mailtoRegex.exec(html)) !== null) {
      const email = normalizeEmail(match[1]);
      if (email && (await canReceiveEmail(email))) {
        return email;
      }
    }

    // 2. Extract general email patterns in text
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const found = html.match(emailRegex);
    if (found) {
      for (const raw of found) {
        const email = normalizeEmail(raw);
        if (email && !email.endsWith(".png") && !email.endsWith(".jpg") && !email.endsWith(".svg") && (await canReceiveEmail(email))) {
          return email;
        }
      }
    }
  } catch {
    // ignore fetch/timeout errors
  }
  return null;
}

/**
 * Explicit email discovery and enrichment step using direct website scraping and web search grounding.
 */
export async function discoverEmailForBusiness(input: {
  business_name: string;
  city: string;
  website?: string | null;
  google_maps_link?: string | null;
  initial_email?: string | null;
}): Promise<string | null> {
  const normalizedInitial = normalizeEmail(input.initial_email);
  if (normalizedInitial && (await canReceiveEmail(normalizedInitial))) {
    return normalizedInitial;
  }

  // 1. Try scraping the official website directly if available
  if (input.website) {
    const scraped = await scrapeEmailFromWebsiteUrl(input.website);
    if (scraped) return scraped;
  }

  const queryParts = [
    input.business_name,
    input.city,
    input.website ? `website: ${input.website}` : "",
    input.google_maps_link ? `maps: ${input.google_maps_link}` : "",
    "contact email address info",
  ].filter(Boolean);

  try {
    const text = await callAi({
      prompt: `Target Business: ${queryParts.join(" ")}. Explicitly find the real, published public contact email address for this business from its official website, contact page, or verified business directories (e.g., Yelp, Google Maps, YellowPages, Facebook, BBB).`,
      systemPrompt:
        "You are an expert contact email discovery and verification agent. Given a business name, city, website, and maps link, query web search grounding and extract the real contact email address. Return ONLY a valid JSON object with a single key `email` (string, the real email address, or empty string if none found). STRICT RULES: NEVER fabricate, guess, or construct pattern-based emails (like info@business.com or contact@domain.com) unless explicitly verified as the real published contact email on their official site or directory. If no 100% verified real email is found, return empty string. Raw JSON object only, no markdown code fences, no conversational filler.",
      jsonMode: true,
      useSearchGrounding: true,
      timeoutMs: 20000,
    });

    if (text) {
      const parsed = parseAiJson<{ email?: string | null }>(text);
      const email = normalizeEmail(parsed?.email);
      if (email && (await canReceiveEmail(email))) {
        return email;
      }
    }
  } catch (err) {
    console.warn("[email discovery] failed for", input.business_name, err);
  }

  return null;
}

export async function scrapeReputation(input: ScrapeInput): Promise<ScrapeResult> {
  const queryText = input.google_maps_link ? `${input.business_name} ${input.city} [Maps Link: ${input.google_maps_link}]` : `${input.business_name} ${input.city}`;

  try {
    const text = await callAi({
      prompt: `Target: ${queryText}`,
      systemPrompt:
        "You are a precise business data extraction agent. Given a business name and city, return ONLY a valid JSON object with keys: google_rating (number or null), review_count (number or null), unanswered_reviews (number or null), competitor_name (string or null), competitor_reviews (number or null), instagram (string handle or empty), facebook (string name/url or empty), website (string or empty), phone (string or empty), email (string or empty). If exact public metrics are unknown or unverified, return null for numbers. NEVER fabricate a website, phone, or email — if you cannot verify the exact real value, return an empty string for that key. Raw JSON object only, no markdown code fences, no conversational filler.",
      jsonMode: true,
      useSearchGrounding: true,
      timeoutMs: 25000,
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
        const websiteUrl = toHttpUrl(parsed.website) || input.website;
        const verifiedEmail = await discoverEmailForBusiness({
          business_name: input.business_name,
          city: input.city,
          website: websiteUrl,
          google_maps_link: input.google_maps_link,
          initial_email: parsed.email,
        });

        return {
          google_rating: parsed.google_rating != null && !isNaN(Number(parsed.google_rating)) ? Number(parsed.google_rating) : null,
          review_count: parsed.review_count != null && !isNaN(Number(parsed.review_count)) ? Number(parsed.review_count) : null,
          unanswered_reviews: parsed.unanswered_reviews != null && !isNaN(Number(parsed.unanswered_reviews)) ? Number(parsed.unanswered_reviews) : null,
          competitor_name: parsed.competitor_name ? String(parsed.competitor_name).trim() : null,
          competitor_reviews: parsed.competitor_reviews != null && !isNaN(Number(parsed.competitor_reviews)) ? Number(parsed.competitor_reviews) : null,
          instagram: String(parsed.instagram || "").trim() || null,
          facebook: String(parsed.facebook || "").trim() || null,
          website: websiteUrl,
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