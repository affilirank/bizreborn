import { config, hasGemini } from "@/lib/integrations/config";
import { LEADGEN } from "@/lib/config";

export interface ScriptInput {
  business_name: string;
  city?: string | null;
  google_rating?: number | null;
  review_count?: number | null;
  unanswered_reviews?: number | null;
  competitor_name?: string | null;
  competitor_reviews?: number | null;
}

function buildPrompt(input: ScriptInput): string {
  const target = `${input.business_name}${input.city ? `, ${input.city}` : ""}`;
  return (
    "Write a 45-second high-urgency marketing pitch from Biz Reborn Marketing to " +
    `${target}. State their rating of ${input.google_rating ?? "4.0"} with ` +
    `${input.review_count ?? 0} reviews while ${input.competitor_name ?? "a local competitor"} ` +
    `has ${input.competitor_reviews ?? 0}. Explain how unanswered reviews hurt local Google ` +
    "rankings. Offer our automated review boost system. Direct them to email " +
    `${LEADGEN.email}. Keep it under 85 words. Write only the spoken script, ` +
    "no preamble, no headings."
  );
}

/**
 * Free Google Gemini 1.5 Flash text synthesis for the pitch script.
 *
 * Falls back to a deterministic template when GEMINI_API_KEY is absent so the
 * batch pipeline still produces a pitch_script.
 */
export async function generatePitchScript(
  input: ScriptInput,
): Promise<string> {
  if (hasGemini()) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildPrompt(input) }] }],
          }),
        },
      );
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
      console.warn("[gemini] no text in response, using fallback");
    } catch (err) {
      console.warn("[gemini] request failed, using fallback:", err);
    }
  }
  return fallbackScript(input);
}

function fallbackScript(input: ScriptInput): string {
  const rating = input.google_rating ?? 4.0;
  const reviews = input.review_count ?? 0;
  const unanswered = input.unanswered_reviews ?? Math.max(1, Math.round(reviews * 0.7));
  const competitor = input.competitor_name ?? "your top local competitor";
  const compReviews = input.competitor_reviews ?? 0;

  return (
    `Hi ${input.business_name}, this is Biz Reborn Marketing. Right now your ` +
    `Google listing holds a solid ${rating} rating with ${reviews} reviews — but ` +
    `${unanswered} of those are left unanswered. Meanwhile, ${competitor} already has ` +
    `${compReviews} reviews and is pulling the calls you should be getting, because ` +
    `unanswered reviews quietly crush your local ranking and visibility in the map pack. ` +
    `Our automated review-boost system turns that around fast and locks in your spot in the ` +
    `Top 3. Email ${LEADGEN.email} today. Your competitors aren't waiting.`
  );
}