/**
 * AI Site Generator — consumes scraped Supabase business data to produce
 * high-converting landing-page copy. Uses Gemini (via the project's ai-router).
 * Stores output in `prospects.generated_site_data` so it only runs once.
 */

import { callAi, parseAiJson } from "@/lib/ai-router";
import { createServiceClient } from "@/lib/supabase/admin";

export interface SiteGenerationPayload {
  hero: { headline: string; subheadline: string; badge: string; cta_text: string };
  services: Array<{ title: string; blurb: string; icon: string }>;
  testimonials: Array<{ quote: string; name: string; stars: number }>; // polished from reviews
  faq: Array<{ q: string; a: string }>;
  meta: { title: string; description: string };
  raw_review_highlights: string[]; // top positive snippets before polishing
}

function esc(s: string | null): string {
  return String(s ?? "").replace(/["']/g, (c) => (c === '"' ? "&quot;" : "&#39;"));
}

function buildPrompt(businessName: string, city: string | null, category: string | null, reviews: string[] | null, rating: number | null): string {
  const revText = (reviews ?? [])
    .slice(0, 5)
    .map((r, i) => `  ${i + 1}. "${esc(r.slice(0, 300))}"`)
    .join("\n");
  return `
You are a high-converting local marketing copywriter building a landing page for:
- Business: ${businessName}
- City / Area: ${city ?? "local market"}
- Vertical / Category: ${category ?? "professional services"}
- Google Rating: ${rating != null ? rating.toFixed(1) + " stars" : "unknown"}
- Recent positive reviews (polish into testimonials):
${revText || "  (No review text available — write believable positive testimonials)"}

Generate a structured JSON landing-page copy payload with these exact keys:
- hero: { headline: short localized headline (e.g. "#1 Rated Contractor in Vero Beach"), subheadline: 1-2 sentence value prop, badge: short trust tag (e.g. "Free Same-Day Quote"), cta_text: button text (e.g. "Get a Free Estimate") }
- services: array of 4 objects { title, blurb (under 50 words, benefit-focused), icon (simple keyword like "shield", "zap", "wrench", "calendar") } matching the vertical
- testimonials: array of 3 objects { quote (40-80 words, polished from review snippets), name (first name only, derived naturally), stars (5) }
- faq: array of 4 objects { q, a (under 60 words, address booking urgency, pricing transparency, response time, guarantees) }
- meta: { title (under 60 chars, includes business name + city + vertical), description (under 160 chars, value-driven) }
- raw_review_highlights: array of 3-4 short strings (under 50 chars each) pulled from the reviews above

Style rules: punchy, direct, urgency-building, no placeholder brackets. Include the city and business name naturally. Do NOT invent ratings or review counts — only reference the rating provided (${rating ?? "unknown"}).
`;
}

export async function generateSitePayload(businessName: string, city: string | null, category: string | null, reviews: string[] | null, rating: number | null): Promise<SiteGenerationPayload | null> {
  const prompt = buildPrompt(businessName, city, category, reviews, rating);
  const result = await callAi({
    prompt,
    systemPrompt: "You write high-converting local service landing-page copy. You return ONLY structured JSON matching the exact schema requested. No markdown, no commentary.",
    maxTokens: 2200,
  });
  const parsed = parseAiJson(result) as SiteGenerationPayload;
  if (!parsed || !parsed.hero || !Array.isArray(parsed.services)) {
    console.warn("[ai-site] failed to parse generation result");
    return null;
  }
  return parsed;
}

/**
 * One-shot: generate + store in Supabase (only once per lead).
 * Returns the payload plus a preview URL.
 */
export async function buildPreviewForProspect(prospectId: string, slug?: string): Promise<{ url: string; payload: SiteGenerationPayload; receptionist_audio_url?: string | null } | null> {
  const admin = createServiceClient();
  if (!admin) return null;

  const { data: prospect, error } = await admin
    .from("prospects")
    .select("id,business_name,city,google_rating,google_maps_link,recommended_services,generated_site_data,audit_report")
    .eq("id", prospectId)
    .single();

  if (error || !prospect) {
    console.warn("[ai-site] prospect not found:", prospectId);
    return null;
  }

  // If already generated, return cached URL
  if (prospect.generated_site_data) {
    const url = `/ai-site/${prospect.id}${slug ? `/${slug}` : ""}`;
    return { url, payload: prospect.generated_site_data as SiteGenerationPayload };
  }

  // Derive vertical from recommended_services / audit context if available; else default
  const vertical = (prospect.recommended_services?.[0] ? String(prospect.recommended_services[0]) : "professional") as string;

  // Pull recent reviews from audit report (if any) — simplified; real pipeline passes review array
  const reviewSnippets: string[] = (prospect.audit_report?.pain_points ?? []).map((p: unknown) => String(p)).slice(0, 4);

  const payload = await generateSitePayload(prospect.business_name, prospect.city, vertical, reviewSnippets, prospect.google_rating ?? null);
  if (!payload) return null;

  // Generate voice receptionist audio if not present
  let receptionistUrl: string | null = null;
  try {
    const admin = createServiceClient();
    if (admin) {
      const { data: existing } = await admin.from("prospects").select("receptionist_audio_url").eq("id", prospectId).single();
      if (!existing?.receptionist_audio_url) {
        const voiceRes = await import("@/lib/voice-receptionist-generator").then(m => m.generateReceptionistAudio(prospectId, prospect.business_name, prospect.city, vertical));
        if (voiceRes?.receptionist_audio_url) {
          receptionistUrl = voiceRes.receptionist_audio_url;
          await admin.from("prospects").update({ receptionist_audio_url: receptionistUrl }).eq("id", prospectId);
        }
      } else {
        receptionistUrl = existing.receptionist_audio_url;
      }
    }
  } catch {
    // Silent fallback: audio generation is best-effort
  }

  const previewUrl = `/ai-site/${prospect.id}`;

  const { error: updateErr } = await admin
    .from("prospects")
    .update({
      generated_site_data: payload,
      site_preview_url: `/ai-site/${prospect.id}`,
    })
    .eq("id", prospectId);

  if (updateErr) {
    console.warn("[ai-site] failed to save payload:", updateErr);
  }

  return { url: previewUrl, payload, receptionist_audio_url: receptionistUrl };
}
