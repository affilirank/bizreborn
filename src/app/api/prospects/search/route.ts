import { calculateQualifyingScore } from "@/lib/services/brand-audit";
import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { callAi, parseAiJson } from "@/lib/ai-router";
import { normalizeEmail, toRealMapsLink } from "@/lib/services/email-validate";
import { discoverEmailForBusiness } from "@/lib/services/scraper";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DiscoveredBusiness {
  qualifying_score: number;
  missing_gbp_apple: boolean;
  business_name: string;
  city: string;
  google_maps_link: string;
  website: string;
  email: string;
  phone: string;
  instagram: string;
  facebook: string;
  google_rating: number | null;
  review_count: number | null;
  competitor_name: string | null;
  competitor_reviews: number | null;
}

function toHttpUrl(value: unknown): string {
  const url = String(value ?? "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return "";
  return url;
}

/** Address patterns a real small-business site will never use as its public contact inbox. */
const BLOCKED_LOCAL_PART = ["webmaster", "hostmaster", "postmaster", "abuse", "noreply", "no-reply", "unsubscribe", "bounce", "admin@localhost"];

function isProbablyRealContactEmail(email: string): boolean {
  const local = email.split("@")[0].toLowerCase();
  if (local.length < 2) return false;
  return !BLOCKED_LOCAL_PART.includes(local);
}

const SEARCH_SYSTEM_PROMPT =
  "You are an expert local business lead generation assistant that only returns VERIFIED real business listings. Return ONLY a valid JSON object with a single root key businesses containing an array of real, locally-known business listings matching the requested keyword and city. Each object in the array must have keys: business_name (string), city (string), google_maps_link (string — the Google Maps/GBP URL for that exact business, or empty), website (string — the business's real website, or empty; NEVER construct a website from the business name), email (string — a real email found on the business's verified website/GBP listing, or empty; NEVER fabricate info@<name>fl.com-style addresses), phone (string, valid local format or empty), instagram (string handle or empty), facebook (string handle or empty), google_rating (number or null), review_count (number or null), competitor_name (string, name of the local market leader), competitor_reviews (number, higher than review_count). Provide only businesses you are confident really exist in that city — prefer fewer, real results over fabricated counts; you may return an empty businesses array if you cannot verify real matches. If the exact city is small, include real businesses from the nearest metro/county area (same search area). Raw JSON object only, no markdown code fences, no conversational filler.";

/** One grounded search pass. Returns already-filtered, email-verified businesses for the requested target count. */
async function runSearchPass(
  keyword: string,
  city: string,
  targetCount: number,
  passIndex: number,
  excludeNames: Set<string>,
): Promise<DiscoveredBusiness[]> {
  const varietyAddon =
    passIndex > 0
      ? " Provide a DIFFERENT set of distinct real businesses than any previous query — add additional distinct " +
        `${keyword} businesses in or very near ${city}, including smaller local operators you have not already listed.`
      : "";

  const text = await callAi({
    prompt: `Keyword: ${keyword}, City: ${city}, Count: ${targetCount}.${varietyAddon}`,
    systemPrompt: SEARCH_SYSTEM_PROMPT,
    jsonMode: true,
    maxTokens: 6000,
    useSearchGrounding: true,
    timeoutMs: 16000,
  });

  if (!text) return [];

  const parsed = parseAiJson(text);
  let rawList: any[] = [];
  if (parsed) {
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      if (Array.isArray((parsed as any).businesses)) {
        rawList = (parsed as any).businesses;
      } else if (Array.isArray((parsed as any).results)) {
        rawList = (parsed as any).results;
      } else if (Array.isArray((parsed as any).data)) {
        rawList = (parsed as any).data;
      } else {
        const foundArrayVal = Object.values(parsed).find((val) => Array.isArray(val));
        if (Array.isArray(foundArrayVal)) {
          rawList = foundArrayVal;
        }
      }
    }
  }

  if (rawList.length === 0) return [];

  const mapped = await Promise.all(
    rawList.map(async (item: Record<string, unknown>) => {
      const name = String(item.business_name || keyword).trim();
      const gRating = item.google_rating != null && !isNaN(Number(item.google_rating)) ? Number(item.google_rating) : null;
      const rCount = item.review_count != null && !isNaN(Number(item.review_count)) ? Number(item.review_count) : null;
      const mapsLink = toRealMapsLink(item.google_maps_link ?? item.maps_link, name, city);
      const website = toHttpUrl(item.website);
      const aiEmail = normalizeEmail(item.email);
      const initialEmail = aiEmail && isProbablyRealContactEmail(aiEmail) ? aiEmail : null;
      // Enrich the email: keep the AI-provided one if it passes MX, otherwise scrape the
      // real website (+ /contact pages) or derive an MX-verified info@/contact@/sales@
      // from the reachable domain. Bulk mode — no per-business AI call.
      const verifiedEmail =
        (await discoverEmailForBusiness(
          {
            business_name: name,
            city: String(item.city || city).trim(),
            website: website || null,
            google_maps_link: mapsLink || null,
            initial_email: initialEmail,
          },
          { skipAiGrounding: true, webSearch: true },
        )) || "";
      const { score, missingGbpApple } = calculateQualifyingScore({
        google_rating: gRating,
        review_count: rCount,
        unanswered_reviews: item.unanswered_reviews != null ? Number(item.unanswered_reviews) : null,
        google_maps_link: mapsLink,
        website,
        missing_gbp_apple: item.missing_gbp_apple === true,
      });
      return {
        qualifying_score: score,
        missing_gbp_apple: missingGbpApple,
        business_name: name,
        city: String(item.city || city).trim(),
        google_maps_link: mapsLink,
        website,
        email: verifiedEmail,
        phone: String(item.phone || "").trim(),
        instagram: String(item.instagram || "").trim(),
        facebook: String(item.facebook || "").trim(),
        google_rating: gRating,
        review_count: rCount,
        competitor_name: item.competitor_name ? String(item.competitor_name).trim() : `${city} Market Leader`,
        competitor_reviews: item.competitor_reviews != null && !isNaN(Number(item.competitor_reviews)) ? Number(item.competitor_reviews) : null,
      } satisfies DiscoveredBusiness;
    }),
  );

  return mapped.filter((b) => {
    if (!b.business_name) return false;
    const key = b.business_name.toLowerCase();
    if (excludeNames.has(key)) return false;
    excludeNames.add(key);
    return true;
  });
}

export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const keyword = String(body?.keyword ?? "").trim();
  const city = String(body?.city ?? "").trim();
  const count = Math.min(200, Math.max(5, Number(body?.count ?? 50)));

  if (!keyword || !city) {
    return NextResponse.json(
      { error: "Keyword and city are required." },
      { status: 400 },
    );
  }

  const businesses: DiscoveredBusiness[] = [];
  const seen = new Set<string>();

  // Multi-pass: keep grounding until we reach the requested count or run out of
  // passes. Pass 1 finds the core listings; extra passes widen the net with
  // distinct real businesses. Never pads with fabricated entries.
  // Per-pass timeouts are short so sequential passes never exceed the 60s function budget.
  const maxPasses = count >= 100 ? 3 : 2;
  for (let pass = 0; pass < maxPasses; pass++) {
    if (businesses.length >= count) break;
    const remaining = count - businesses.length;
    try {
      const found = await runSearchPass(keyword, city, remaining, pass, seen);
      businesses.push(...found);
    } catch (err) {
      console.error(`[lead discovery] search pass ${pass + 1} failed:`, err);
    }
  }

  // One last retry of the plain query if everything came up empty — covers
  // transient grounding/parse failures without padding fake businesses.
  if (businesses.length === 0) {
    try {
      const found = await runSearchPass(keyword, city, count, 0, seen);
      businesses.push(...found);
    } catch (err) {
      console.error("[lead discovery] final retry failed:", err);
    }
  }

  businesses.sort((a, b) => b.qualifying_score - a.qualifying_score);

  // Never fabricate leads. If nothing verified, return nothing.
  return NextResponse.json({ businesses });
}