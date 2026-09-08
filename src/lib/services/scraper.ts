import { config } from "@/lib/integrations/config";
import { uploadFile } from "@/lib/storage";

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
}

/**
 * Reputation scraper.
 *
 * When OpenAI key is present, uses GPT to research or estimate realistic public
 * business metrics. Otherwise falls back to deterministic mock.
 * Admins can also instantly override any stat via the "Edit Stats" modal in /admin/prospects.
 */
export async function scrapeReputation(input: ScrapeInput): Promise<ScrapeResult> {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an expert local SEO analyst. Given a business name and city, return ONLY a JSON object with keys: google_rating (number, e.g. 4.8), review_count (number), unanswered_reviews (number), competitor_name (string, realistic local competitor), competitor_reviews (number). No markdown, no explanation.",
            },
            {
              role: "user",
              content: `Business: ${input.business_name}, City: ${input.city}`,
            },
          ],
          temperature: 0.3,
        }),
      });
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content.replace(/```json/gi, "").replace(/```/g, "").trim());
        if (parsed && typeof parsed.google_rating === "number") {
          return {
            google_rating: Number(parsed.google_rating) || 4.5,
            review_count: Number(parsed.review_count) || 45,
            unanswered_reviews: Number(parsed.unanswered_reviews) || 3,
            competitor_name: String(parsed.competitor_name || `${input.business_name} Competitor`),
            competitor_reviews: Number(parsed.competitor_reviews) || 95,
            audit_screenshot_url: "",
            website_preview_url: "",
          };
        }
      }
    } catch (err) {
      console.warn("[scraper] AI intelligence lookup failed, using mock:", err);
    }
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
  const rating = Math.round((4.2 + (seed % 8) / 10) * 10) / 10;
  const reviewCount = 25 + (seed % 75);
  const unanswered = Math.max(0, Math.round(reviewCount * 0.15));
  const competitorReviews = reviewCount * 2;
  const competitorName = `${input.business_name.split(" ")[0] || input.business_name} Leader`;

  return {
    google_rating: rating,
    review_count: reviewCount,
    unanswered_reviews: unanswered,
    competitor_name: competitorName,
    competitor_reviews: Math.round(competitorReviews),
    audit_screenshot_url: "",
    website_preview_url: "",
  };
}
