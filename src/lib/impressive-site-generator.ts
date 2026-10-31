/**
 * Impressive AI Site Generator — separate from the plain teaser preview at
 * /ai-site/[id]. Produces high-converting, niche-specific landing pages with
 * a futuristic AI receptionist demo, packed SEO, and sales tools.
 *
 * Stores output in `prospects.generated_site_data` (richer schema) so it
 * only runs once per lead. Receptionist audio is written to
 * `receptionist_audio_url`.
 */

import { callAi, parseAiJson } from "@/lib/ai-router";
import { createServiceClient } from "@/lib/supabase/admin";

export interface ImpressiveSitePayload {
  niche: string;
  business_name: string;
  city: string | null;
  // Hero
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    badge: string;
    cta_primary: string;
    cta_secondary: string;
    trust_stat: string;
  };
  // Hero trust stats
  stats: Array<{ label: string; value: string; sub: string }>;
  // Services (rich, benefit-focused)
  services: Array<{
    id: string;
    title: string;
    blurb: string;
    icon: string;
    features: string[];
    cta: string;
  }>;
  // Trust / social proof
  trust: {
    rating: number | null;
    review_count: number | null;
    years_in_business: string;
    guarantee: string;
    licenses: string[];
    insurance: boolean;
  };
  // Testimonials
  testimonials: Array<{
    id: string;
    quote: string;
    name: string;
    stars: number;
    location: string;
    service: string;
    date: string;
  }>;
  // Before/After gallery
  gallery: Array<{
    id: string;
    title: string;
    description: string;
    before_prompt: string;
    after_prompt: string;
  }>;
  // FAQ
  faq: Array<{ id: string; q: string; a: string }>;
  // SEO
  seo: {
    title: string;
    description: string;
    keywords: string[];
    schema_type: string;
    local_keywords: string[];
  };
  // Receptionist
  receptionist: {
    script: string;
    tools: string[];
    greeting: string;
  };
  // Contact
  contact: {
    phone: string;
    phone_href: string;
    email: string;
    address: string;
    hours: string;
    city: string | null;
  };
  // Bottom CTA
  cta: {
    headline: string;
    subheadline: string;
    button_text: string;
    urgency: string;
  };
}

function esc(s: string | null): string {
  return String(s ?? "").replace(/["']/g, (c) => (c === '"' ? "&quot;" : "&#39;"));
}

/**
 * Builds a niche-aware generation prompt. The AI fills the design-neutral
 * content; the page component renders a consistent futuristic design.
 */
function buildPrompt(
  businessName: string,
  city: string | null,
  niche: string,
  rating: number | null,
  reviewCount: number | null,
): string {
  const ratingText = rating != null ? `${rating.toFixed(1)} stars` : "not yet rated";
  const reviewText = reviewCount != null ? `${reviewCount} Google reviews` : "reviews";
  return `
You are an elite conversion copywriter and local SEO strategist. Build a
high-converting, impressive landing page for a local service business.

Business: ${businessName}
City / Area: ${city ?? "local market"}
Niche: ${niche}
Google Rating: ${ratingText}
Review Count: ${reviewText}

You must return ONLY structured JSON (no markdown, no commentary) with these
exact keys:

1. niche: "${niche}"
2. business_name: "${esc(businessName)}"
3. city: "${esc(city ?? "")}"
4. hero: {
   eyebrow: short trust tag (e.g. "Licensed & Insured · 24/7 Emergency"),
   headline: punchy localized headline including business name + city + niche,
   subheadline: 2-3 sentence value prop with urgency and benefit,
   badge: short trust tag (e.g. "4.8 Stars · 75 Reviews · Free Estimate"),
   cta_primary: button text (e.g. "Get Your Free Estimate"),
   cta_secondary: secondary button text (e.g. "Book 24/7 AI Receptionist"),
   trust_stat: combined stat (e.g. "4.8★ · 75 Reviews · 15+ Years")
 }
5. stats: array of 4 trust stat objects { label, value, sub }:
   - Rating, Reviews, Response Time, Years in Business
6. services: array of 5 service objects:
   { id, title, blurb (under 40 words, benefit-focused), icon (lucide name like "shield", "zap", "wrench", "calendar", "roof", "droplet"), features (3 short benefit strings), cta (button text) }
7. trust: {
   rating (number or null),
   review_count (number or null),
   years_in_business (string like "15+"),
   guarantee (string, e.g. "Satisfaction Guaranteed"),
   licenses (array of 2-3 license strings),
   insurance (boolean)
 }
8. testimonials: array of 4 objects:
   { id, quote (40-80 words, polished), name (first + last initial), stars (number 4-5), location (city), service (string), date (relative like "2 weeks ago") }
9. gallery: array of 3 before/after objects:
   { id, title, description, before_prompt (image gen prompt), after_prompt (image gen prompt) }
10. faq: array of 5 objects { id, q, a (under 60 words, address booking, pricing, response time, guarantees, licensing) }
11. seo: {
    title (under 60 chars, business name + city + niche),
    description (under 160 chars),
    keywords (array of 8-10 local SEO keywords),
    schema_type (e.g. "LocalBusiness", "HomeAndConstructionBusiness", "Plumber", "RoofingContractor"),
    local_keywords (array of 5-6 city + niche combos)
  }
12. receptionist: {
    script: 60-90 word futuristic AI receptionist greeting including business name, city, niche, and tool capabilities (booking, lead capture, pricing, FAQ, SMS callback),
    tools: array of tool names (e.g. ["appointment_booking", "lead_capture", "faq_knowledge_base", "service_pricing", "sms_callback", "map_directions"]),
    greeting: short 15-word opener
  }
13. contact: {
    phone (string),
    phone_href (tel: link),
    email (string),
    address (string),
    hours (string),
    city (string or null)
  }
14. cta: {
    headline: urgency-driven headline,
    subheadline: supporting text,
    button_text: primary CTA,
    urgency: scarcity/urgency phrase
  }

Style rules: punchy, direct, urgency-building, no placeholder brackets.
Include city and business name naturally. Do NOT invent ratings or review
counts — only reference the rating (${rating ?? "unknown"}) and review count
(${reviewCount ?? "unknown"}) provided.
`;
}

export async function generateImpressiveSitePayload(
  businessName: string,
  city: string | null,
  niche: string,
  rating: number | null,
  reviewCount: number | null,
): Promise<ImpressiveSitePayload | null> {
  const prompt = buildPrompt(businessName, city, niche, rating, reviewCount);
  const result = await callAi({
    prompt,
    systemPrompt:
      "You are an elite conversion copywriter and local SEO strategist. You return ONLY structured JSON matching the exact schema requested. No markdown, no commentary.",
    maxTokens: 3000,
    thinkingLevel: "low",
  });
  const parsed = parseAiJson(result) as ImpressiveSitePayload | null;
  if (
    !parsed ||
    !parsed.hero ||
    !Array.isArray(parsed.services) ||
    !Array.isArray(parsed.testimonials) ||
    !Array.isArray(parsed.faq)
  ) {
    console.warn("[impressive-site] failed to parse generation result");
    return null;
  }
  return parsed;
}

/**
 * One-shot: generate impressive site + receptionist audio, store once per lead.
 */
export async function buildImpressiveSiteForProspect(
  prospectId: string,
): Promise<{
  url: string;
  payload: ImpressiveSitePayload;
  receptionist_audio_url: string | null;
} | null> {
  const admin = createServiceClient();
  if (!admin) return null;

  const { data: prospect, error } = await admin
    .from("prospects")
    .select(
      "id,business_name,city,phone,google_rating,review_count,recommended_services,impressive_site_data,audit_report,slug,status",
    )
    .eq("id", prospectId)
    .maybeSingle();

  if (error || !prospect) {
    console.warn("[impressive-site] prospect not found:", prospectId);
    return null;
  }

  const niche = String(prospect.recommended_services?.[0] ?? "roofing");
  const rating = prospect.google_rating ?? null;
  const reviewCount = prospect.review_count ?? null;

  // If already generated, return cached (ensure receptionist audio exists)
  if (prospect.impressive_site_data) {
    const url = `/impressive-site/${prospect.id}`;
    let receptionistUrl: string | null = null;
    try {
      const { data: existing } = await admin
        .from("prospects")
        .select("receptionist_audio_url")
        .eq("id", prospectId)
        .maybeSingle();
      if (existing?.receptionist_audio_url) {
        receptionistUrl = existing.receptionist_audio_url;
      } else {
        const voiceRes = await generateReceptionistAudio(
          prospectId,
          prospect.business_name,
          prospect.city,
          niche,
        );
        if (voiceRes?.receptionist_audio_url) {
          receptionistUrl = voiceRes.receptionist_audio_url;
          await admin
            .from("prospects")
            .update({ receptionist_audio_url: receptionistUrl })
            .eq("id", prospectId);
        }
      }
    } catch {
      // best-effort
    }
    return {
      url,
      payload: prospect.impressive_site_data as ImpressiveSitePayload,
      receptionist_audio_url: receptionistUrl,
    };
  }

  // Generate fresh
  const payload = await generateImpressiveSitePayload(
    prospect.business_name,
    prospect.city,
    niche,
    rating,
    reviewCount,
  );
  if (!payload) return null;

  // Generate receptionist audio
  let receptionistUrl: string | null = null;
  try {
    const voiceRes = await generateReceptionistAudio(
      prospectId,
      prospect.business_name,
      prospect.city,
      niche,
    );
    if (voiceRes?.receptionist_audio_url) {
      receptionistUrl = voiceRes.receptionist_audio_url;
    }
  } catch {
    // Silent fallback
  }

  const previewUrl = `/impressive-site/${prospect.id}`;

  const { error: updateErr } = await admin
    .from("prospects")
    .update({
      impressive_site_data: payload,
      impressive_preview_url: previewUrl,
      receptionist_audio_url: receptionistUrl,
    })
    .eq("id", prospectId);

  if (updateErr) {
    console.warn("[impressive-site] failed to save payload:", updateErr);
  }

  return { url: previewUrl, payload, receptionist_audio_url: receptionistUrl };
}
