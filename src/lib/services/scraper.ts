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
  /** An email already on the prospect (e.g. from a CSV upload). Verified first; never clobbered by a scrape miss. */
  existing_email?: string | null;
}

function toHttpUrl(value: string | null | undefined): string | null {
  const url = String(value ?? "").trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
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

    // 1. Extract mailto: links
    const mailtoRegex = /href=["']mailto:([^"'?#]+)["']/gi;
    let match;
    while ((match = mailtoRegex.exec(html)) !== null) {
      const email = normalizeEmail(match[1]);
      if (email && (await canReceiveEmail(email))) {
        return { email, reachable: true };
      }
    }

    // 2. Extract general email patterns in text (also catches obfuscated
    //    "name at domain dot com" patterns small businesses love to use)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const found = (html.match(emailRegex) || []).filter((e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".svg") && !e.endsWith(".jpeg") && !e.endsWith(".webp"));
    const obfuscated = html
      .replace(/<\/?[a-z][^>]*>/gi, " ")
      .match(/([a-zA-Z0-9._%+-]+)\s*\[?at\]?\s*([a-zA-Z0-9.-]+)\s*\[?dot\]?\s*([a-zA-Z]{2,})/gi);
    if (obfuscated) {
      for (const token of obfuscated) {
        const email = normalizeEmail(token.replace(/\s*\[?at\]?\s*/gi, "@").replace(/\s*\[?dot\]?\s*/gi, "."));
        if (email && (await canReceiveEmail(email))) {
          return { email, reachable: true };
        }
      }
    }

    for (const raw of found) {
      const email = normalizeEmail(raw);
      if (email && (await canReceiveEmail(email))) {
        return { email, reachable: true };
      }
    }
    return { email: null, reachable: true };
  } catch {
    // fetch/timeout errors mean the host did not answer — not a safe source to derive from
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
  "gmail.google.com",
  "bing.com",
  "microsoft.com",
  "whois.com",
]);

/** Fetches one search-engine HTML results page and returns any email addresses it shows. */
async function fetchSearchEngineEmails(query: string): Promise<string[]> {
  const engines = [
    { name: "duckduckgo", url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}` },
    { name: "bing", url: `https://www.bing.com/search?q=${encodeURIComponent(query)}` },
  ];
  const emails: string[] = [];
  for (const engine of engines) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
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
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      for (const raw of html.match(emailRegex) || []) {
        if (/\.(png|jpe?g|svg|webp|gif)$/i.test(raw)) continue;
        const norm = raw.split(" ")[0];
        if (norm && norm.includes("@")) emails.push(norm);
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
    ? [`${base} email ${hostname}`, `${base} contact email`, `${base} email`]
    : [`${base} contact email`, `${base} email`];

  const deadline = Date.now() + 15000;
  const candidates = new Map<string, boolean>();
  for (const q of queries) {
    if (Date.now() > deadline) break;
    const found = await fetchSearchEngineEmails(q);
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
 */
export async function discoverEmailForBusiness(
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

    const deadline = Date.now() + 22000;
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

  // Bulk enrichment / fast-track: skip AI grounding unless explicitly requested or webSearch enabled
  if (opts?.skipAiGrounding === true && opts?.webSearch !== true) {
    return null;
  }

  if (opts?.skipAiGrounding !== true) {
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

  // 3. Last resort: hunt public search-engine results (Facebook, directory
  //    listings, PDFs, etc.) for the email.
  const searched = await searchWebForEmail({
    business_name: input.business_name,
    city: input.city,
    website: input.website,
  });
  if (searched) return searched;

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
          initial_email: input.existing_email || parsed.email,
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