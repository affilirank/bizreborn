import { callAi, parseAiJson } from "@/lib/ai-router";
import { canReceiveEmail, normalizeEmail } from "@/lib/services/email-validate";
import { lookupPlaceLive, apifyConfigured, type ApifyPlace } from "@/lib/services/apify-maps";

/** Block SSRF: private IPs, metadata endpoints, localhost. */
function isSafeUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") return false;
    if (host === "169.254.169.254" || host.endsWith(".169.254.169.254")) return false;
    if (/^10\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^192\.168\./.test(host)) return false;
    if (host.endsWith(".internal") || host.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

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
  /** Canonical Google Maps link for the verified listing (direct re-lookups). */
  google_maps_link?: string | null;
}

export interface ScrapeInput {
  business_name: string;
  city: string;
  website?: string | null;
  google_maps_link?: string | null;
  /** An email already on the prospect (e.g. from a CSV upload). Verified first; never clobbered by a scrape miss. */
  existing_email?: string | null;
}

function toHttpUrl(value: string | null | undefined): string | null {
  const url = String(value ?? "").trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;  return url;
}

/** Additional paths where small-business sites typically publish contact emails. */
const CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us", "/privacy-policy", "/privacy"];

/**
 * Fetches a page (with a short timeout) and extracts any valid `mailto:` or regex email addresses.
 * `reachable` is true whenever the host answered at all (even 403/404), which proves the domain is
 * real and can be used for a derived contact email.
 */
async function fetchPageAndFindEmail(pageUrl: string): Promise<{ email: string | null; reachable: boolean }> {
  const url = toHttpUrl(pageUrl);
  if (!url) return { email: null, reachable: false };
  if (!isSafeUrl(url)) return { email: null, reachable: false };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timeoutId);
    if (!res) return { email: null, reachable: false };
    if (res.status === 404 || res.status >= 500) return { email: null, reachable: true };
    const html = await res.text();

    // Collect all candidate emails, then check MX in parallel (not sequentially).
    const candidates: string[] = [];

    // 1. mailto: links (highest trust)
    const mailtoRegex = /href=["']mailto:([^"'?#]+)["']/gi;
    let match;
    while ((match = mailtoRegex.exec(html)) !== null) {
      const email = normalizeEmail(match[1]);
      if (email) candidates.push(email);
    }

    // 2. Obfuscated "name [at] domain [dot] com"
    const obfuscated = html
      .replace(/<\/?[a-z][^>]*>/gi, " ")
      .matchAll(/([a-zA-Z0-9._%+-]+)\s*\[?at\]?\s*([a-zA-Z0-9.-]+)\s*\[?dot\]?\s*([a-zA-Z]{2,})/gi);
    for (const m of obfuscated) {
      const local = m[1]?.toLowerCase();
      const domain = m[2]?.toLowerCase();
      const tld = m[3]?.toLowerCase();
      if (local && domain && tld && local.length >= 2) {
        candidates.push(`${local}@${domain}.${tld}`);
      }
    }

    // 3. General email patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    for (const raw of html.match(emailRegex) || []) {
      if (/\.(png|jpe?g|svg|webp|gif)$/i.test(raw)) continue;
      const email = normalizeEmail(raw.split(" ")[0]);
      if (email && email.includes("@")) candidates.push(email);
    }

    // Deduplicate and check MX in parallel (max 5 candidates to bound time)
    const unique = [...new Set(candidates)].slice(0, 5);
    const results = await Promise.all(unique.map(async (email) => {
      const ok = await canReceiveEmail(email);
      return ok ? email : null;
    }));
    const valid = results.find(Boolean);
    if (valid) return { email: valid, reachable: true };

    return { email: null, reachable: true };
  } catch {
    return { email: null, reachable: false };
  }
}

/**
 * Derives the standard contact inbox (`info@`, `contact@`, `sales@`) from a real, reachable domain.
 * Only called once a live fetch proved the host exists — never constructed from a business name,
 * so it cannot produce fabricated `<name>fl.com` addresses. MX-checked before returning.
 */
async function deriveContactEmailFromDomain(domain: string): Promise<string | null> {
  const host = domain.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".")) return null;
  for (const prefix of ["info", "contact", "sales"]) {
    const email = `${prefix}@${host}`;
    if (await canReceiveEmail(email)) return email;
  }
  return null;
}

/**
 * Platform/directory domains that never host a business's own real inbox. Emails
 * scoped to these are junk picked up from result chrome, not the business's contact.
 */
const SEARCH_BLOCKED_DOMAINS = new Set([
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "yelp.com",
  "yellowpages.com",
  "yp.com",
  "bbb.org",
  "tripadvisor.com",
  "foursquare.com",
  "trustpilot.com",
  "manta.com",
  "google.com",
  "googleusercontent.com",
  "bing.com",
  "microsoft.com",
  "whois.com",
]);

/** Fetches one search-engine HTML results page and returns any email addresses it shows. */
async function fetchSearchEngineEmails(query: string, deadline?: number): Promise<string[]> {
  const engines = [
    { name: "duckduckgo", url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}` },
    { name: "bing", url: `https://www.bing.com/search?q=${encodeURIComponent(query)}` },
  ];
  const emails: string[] = [];
  for (const engine of engines) {
    if (deadline && Date.now() > deadline) break;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(engine.url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeoutId);
      if (!res || !res.ok) continue;
      const html = await res.text();
      // Standard email pattern
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      for (const raw of html.match(emailRegex) || []) {
        if (/\.(png|jpe?g|svg|webp|gif)$/i.test(raw)) continue;
        const norm = raw.split(" ")[0];
        if (norm && norm.includes("@")) emails.push(norm);
      }
      // Deobfuscate "name [at] domain [dot] com" patterns
      const obfuscated = html
        .replace(/<\/?[a-z][^>]*>/gi, " ")
        .match(/([a-zA-Z0-9._%+-]+)\s*\[?at\]?\s*([a-zA-Z0-9.-]+)\s*\[?dot\]?\s*([a-zA-Z]{2,})/gi);
      if (obfuscated) {
        for (const token of obfuscated) {
          const email = normalizeEmail(token.replace(/\s*\[?at\]?\s*/gi, "@").replace(/\s*\[?dot\]?\s*/gi, "."));
          if (email && email.includes("@") && !email.endsWith(".png") && !email.endsWith(".jpg")) {
            emails.push(email);
          }
        }
      }
    } catch {
      // engine blocked or hung — try the next one
    }
  }
  return emails;
}

/**
 * Searches public web results (Facebook pages, directory listings, etc.) for the
 * business's published contact email. Time-bounded; returns the first MX-verified
 * inbox, preferring one hosted on the business's own domain.
 */
async function searchWebForEmail(input: {
  business_name: string;
  city: string;
  website?: string | null;
}): Promise<string | null> {
  let hostname: string | null = null;
  try {
    const url = toHttpUrl(input.website);
    if (url) hostname = new URL(url).hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    // ignore
  }

  const base = `"${input.business_name}" ${input.city}`;
  const queries = hostname
    ? [
        `${base} email ${hostname}`,
        `${base} contact email`,
        `${base} email address`,
        `${base} appointment`,
      ]
    : [
        `${base} contact email`,
        `${base} email address`,
        `${base} appointment`,
      ];

  const deadline = Date.now() + 8000;
  const candidates = new Map<string, boolean>();
  for (const q of queries) {
    if (Date.now() > deadline) break;
    const found = await fetchSearchEngineEmails(q, deadline);
    for (const raw of found) {
      const email = normalizeEmail(raw);
      if (!email || email.split("@")[0].length < 2) continue;
      const domain = email.split("@")[1]?.toLowerCase() ?? "";
      if (SEARCH_BLOCKED_DOMAINS.has(domain)) continue;
      if (email.split("@")[1]?.length > 80) continue;
      const onOwnDomain = hostname ? domain === hostname || domain.endsWith(`.${hostname}`) : false;
      if (!candidates.has(email)) candidates.set(email, onOwnDomain);
    }
  }

  // Own-domain emails first (highest confidence), everything else after.
  const sorted = Array.from(candidates.entries()).sort((a, b) => Number(b[1]) - Number(a[1]));
  for (const [email] of sorted) {
    if (await canReceiveEmail(email)) return email;
  }
  return null;
}

/**
 * Explicit email discovery and enrichment step using direct website scraping and web search grounding.
 * Pass `{ skipAiGrounding: true }` for bulk calls to avoid one grounded AI lookup per business.
 * Pass `excludeEmails` (e.g. a just-bounced address) so the bad address is never re-selected.
 */
export async function discoverEmailForBusiness(
  input: {
    business_name: string;
    city: string;
    website?: string | null;
    google_maps_link?: string | null;
    initial_email?: string | null;
  },
  opts?: { skipAiGrounding?: boolean; webSearch?: boolean; excludeEmails?: string[] },
): Promise<string | null> {
  const excluded = new Set(
    (opts?.excludeEmails ?? []).map((e) => normalizeEmail(e)).filter((e): e is string => Boolean(e)),
  );
  const result = await discoverEmailCandidate(input, opts);
  if (result && excluded.has(result)) return null; // only the bad address was findable
  return result;
}

async function discoverEmailCandidate(
  input: {
    business_name: string;
    city: string;
    website?: string | null;
    google_maps_link?: string | null;
    initial_email?: string | null;
  },
  opts?: { skipAiGrounding?: boolean; webSearch?: boolean },
): Promise<string | null> {
  const normalizedInitial = normalizeEmail(input.initial_email);
  if (normalizedInitial && (await canReceiveEmail(normalizedInitial))) {
    return normalizedInitial;
  }

  // 1. Try scraping the official website (homepage, then common contact paths)
  const websiteUrl = toHttpUrl(input.website);
  if (websiteUrl) {
    const pages = [websiteUrl];
    try {
      const base = new URL(websiteUrl);
      for (const path of CONTACT_PATHS) {
        pages.push(new URL(path, base).toString());
      }
    } catch {
      // keep homepage only
    }

    const deadline = Date.now() + 15000;
    let reachableHost: string | null = null;
    for (const page of pages) {
      if (Date.now() > deadline) break;
      const result = await fetchPageAndFindEmail(page);
      if (result.email) return result.email;
      if (result.reachable && !reachableHost) {
        try {
          reachableHost = new URL(websiteUrl).hostname;
        } catch {
          // ignore
        }
      }
    }

    // 2. Derive the standard contact inbox from a provably-reachable real domain
    if (reachableHost) {
      const derived = await deriveContactEmailFromDomain(reachableHost);
      if (derived) return derived;
    }
  }

  const queryParts = [
    input.business_name,
    input.city,
    input.website ? `website: ${input.website}` : "",
    input.google_maps_link ? `maps: ${input.google_maps_link}` : "",
    "contact email address info",
  ].filter(Boolean);

  const useAi = opts?.skipAiGrounding !== true;
  const useSearch = useAi || opts?.webSearch === true;

  if (useAi) {
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
  }

  if (useSearch) {
    const searched = await searchWebForEmail({
      business_name: input.business_name,
      city: input.city,
      website: input.website,
    });
    if (searched) return searched;
  }

  return null;
}

export async function scrapeReputation(input: ScrapeInput): Promise<ScrapeResult> {
  const queryText = input.google_maps_link ? `${input.business_name} ${input.city} [Maps Link: ${input.google_maps_link}]` : `${input.business_name} ${input.city}`;

  // 1) PRIMARY — live Google Maps data via Apify (exact rating/review counts,
  //    real competitors, unanswered reviews). AI search-grounding (below) is
  //    only a fallback: it returns stale or wrong-business numbers surprisingly
  //    often (e.g. 4.8★/181 instead of 4.9★/451).
  if (apifyConfigured()) {
    // A Google Maps link (stored on the prospect, or pasted into the website
    // field) pins the exact place — no search-ranking dependence.
    const mapsLink =
      (input.google_maps_link && /google\.[a-z.]+\/maps/i.test(input.google_maps_link) ? input.google_maps_link : null) ||
      (input.website && /google\.[a-z.]+\/maps/i.test(input.website) ? input.website : null);
    const place = await lookupPlaceLive(input.business_name, input.city || "", 35000, mapsLink);
    if (place && (place.totalScore != null || place.reviewsCount != null)) {
      return mapApifyPlace(place, input, Boolean(mapsLink));
    }
  }

  // 2) FALLBACK — AI-grounded lookup.
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
          initial_email: input.existing_email || parsed.email,
        });

        // The audit/pitch always benchmarks against a market leader. When the
        // grounded lookup cannot verify a specific competitor, fall back to the
        // generic area leader label + a realistic estimated review count (same
        // derivation buildBrandAudit uses) instead of leaving the pitch without
        // a competitor.
        const reviews = parsed.review_count != null && !isNaN(Number(parsed.review_count)) ? Number(parsed.review_count) : null;
        const leaderLabel = input.city?.trim() ? `${input.city.trim()} Market Leader` : "Local Market Leader";
        let competitorName = parsed.competitor_name ? String(parsed.competitor_name).trim() : null;
        let competitorReviews = parsed.competitor_reviews != null && !isNaN(Number(parsed.competitor_reviews)) ? Number(parsed.competitor_reviews) : null;
        if (!competitorName) competitorName = leaderLabel;
        if (competitorReviews == null || competitorReviews <= (reviews ?? 0)) {
          competitorReviews = Math.max((reviews ?? 0) + 50, Math.round((reviews ?? 0) * 1.35));
        }

        return {
          google_rating: parsed.google_rating != null && !isNaN(Number(parsed.google_rating)) ? Number(parsed.google_rating) : null,
          review_count: reviews,
          unanswered_reviews: parsed.unanswered_reviews != null && !isNaN(Number(parsed.unanswered_reviews)) ? Number(parsed.unanswered_reviews) : null,
          competitor_name: competitorName,
          competitor_reviews: competitorReviews,
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

/** Map a live Apify place result into the ScrapeResult shape. When the place
 *  came from a direct Maps URL the target is unambiguous, so name matching is
 *  skipped. */
async function mapApifyPlace(place: ApifyPlace, input: ScrapeInput, direct = false): Promise<ScrapeResult> {
  const reviews = place.reviewsCount != null ? Number(place.reviewsCount) : null;

  // Unanswered reviews: count owner-unresponded within the newest-15 window
  // scraped (same window the Maps-search imports use, so numbers stay
  // comparable across the pipeline).
  const window = (place.reviews ?? []).filter((r) => r.stars != null);
  const unanswered =
    window.length > 0 ? window.filter((r) => !r.responseFromOwnerText).length : null;

  // Real local competitor from the "People also search" panel — the shop with
  // the most reviews that isn't the target itself.
  let competitorName: string | null = null;
  let competitorReviews: number | null = null;
  const others = (place.peopleAlsoSearch ?? []).filter(
    (c) => c.title && c.title.toLowerCase() !== String(place.title || "").toLowerCase(),
  );
  for (const c of others) {
    const n = c.reviewsCount != null ? Number(c.reviewsCount) : 0;
    if (n > (competitorReviews ?? 0)) {
      competitorReviews = n;
      competitorName = String(c.title);
    }
  }
  if (!competitorName || competitorReviews == null || competitorReviews <= (reviews ?? 0)) {
    const leaderLabel = input.city?.trim() ? `${input.city.trim()} Market Leader` : "Local Market Leader";
    competitorName = competitorName || leaderLabel;
    competitorReviews = Math.max((reviews ?? 0) + 50, Math.round((reviews ?? 0) * 1.35));
  }

  // A maps link in the website field was only a lookup pin — the real
  // website comes from the listing itself.
  const isMapsPin = (u?: string | null) => Boolean(u && /google\.[a-z.]+\/maps/i.test(u));
  const websiteUrl =
    place.website
      ? toHttpUrl(place.website)
      : isMapsPin(input.website)
        ? null
        : input.website
          ? toHttpUrl(input.website)
          : null;
  const verifiedEmail = await discoverEmailForBusiness({
    business_name: input.business_name,
    city: input.city,
    website: websiteUrl,
    google_maps_link: place.url || input.google_maps_link,
    initial_email: input.existing_email,
  });

  return {
    google_rating: place.totalScore != null ? Number(place.totalScore) : null,
    review_count: reviews,
    unanswered_reviews: unanswered,
    competitor_name: competitorName,
    competitor_reviews: competitorReviews,
    instagram: (place.instagrams ?? [])[0] || null,
    facebook: (place.facebooks ?? [])[0] || null,
    website: websiteUrl,
    phone: place.phone || null,
    email: verifiedEmail,
    audit_screenshot_url: "",
    website_preview_url: "",
    google_maps_link: place.url && /^https:\/\/(www\.)?google\.[a-z.]+\/maps/i.test(place.url) ? place.url : null,
  };
}