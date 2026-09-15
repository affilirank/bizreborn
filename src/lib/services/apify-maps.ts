/**
 * Apify Google Maps Scraper integration (free tier: $5 platform credit per
 * month). Uses the FULL `compass/crawler-google-places` actor (602k users),
 * which — unlike the lighter Extractor — also scrapes recent reviews with
 * owner-response data (→ real unanswered-review counts) and the
 * "People also search" panel (→ real local competitors with review counts).
 * Verified website emails come via the scrapeContacts enrichment. This
 * replaces AI-guessed listings on the admin lead-discovery path and
 * eliminates most email-discovery failures.
 *
 * Runs take 1-8 minutes, far beyond the 60s serverless budget, so this module
 * is async-job shaped: startMapsScrape() starts the run and returns its id;
 * pollMapsScrape() reports progress; fetchMapsResults() normalises the dataset
 * once the run succeeds.
 */

const ACTOR_ID = "compass~crawler-google-places";
const API_BASE = "https://api.apify.com/v2";

export interface ApifyPlace {
  title?: string;
  city?: string;
  state?: string;
  address?: string;
  website?: string;
  phone?: string;
  phoneUnformatted?: string;
  totalScore?: number;
  reviewsCount?: number;
  placeId?: string;
  url?: string;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
  // scrapeContacts enrichment output (emails/socials from the business website)
  emails?: string[];
  instagrams?: string[];
  facebooks?: string[];
  tiktoks?: string[];
  linkedIns?: string[];
  twitters?: string[];
  // Recent reviews (maxReviews window) with owner-response data
  reviews?: Array<{ responseFromOwnerText?: string | null; stars?: number | null }>;
  // "People also search" panel — real local competitors with review counts
  peopleAlsoSearch?: Array<{ title?: string; reviewsCount?: number; totalScore?: number }>;
}

export interface MapsBusiness {
  qualifying_score: number;
  missing_gbp_apple: boolean;
  business_name: string;
  city: string;
  google_maps_link: string;
  website: string | null;
  email: string;
  phone: string;
  instagram: string;
  facebook: string;
  google_rating: number | null;
  review_count: number | null;
  unanswered_reviews: number | null;
  competitor_name: string | null;
  competitor_reviews: number | null;
}

function apifyToken(): string | null {
  return process.env.APIFY_TOKEN?.trim() || null;
}

export function apifyConfigured(): boolean {
  return apifyToken() !== null;
}

interface ApifyRunRef {
  runId: string;
  datasetId: string | null;
}

/** Start an async Apify run. Returns immediately with the run reference. */
export async function startMapsScrape(
  keyword: string,
  city: string,
  count: number,
): Promise<ApifyRunRef> {
  const token = apifyToken();
  if (!token) throw new Error("APIFY_TOKEN not configured");

  const input = {
    searchStringsArray: [keyword],
    locationQuery: city,
    maxCrawledPlacesPerSearch: Math.min(200, Math.max(5, count)),
    language: "en",
    skipClosedPlaces: false,
    // Detail page enables reviewsCount, reviewsDistribution and peopleAlsoSearch;
    // the qualifying score, audit and competitor benchmark all depend on them.
    scrapePlaceDetailPage: true,
    // Real emails + socials scraped from each business's website.
    scrapeContacts: true,
    // Recent reviews with owner-response data → real unanswered-review counts.
    // Capped to keep credit burn low (~15 reviews/place, newest first).
    maxReviews: 15,
    reviewsSort: "newest",
    reviewsStartDate: "6 months",
  };

  const res = await fetch(`${API_BASE}/acts/${ACTOR_ID}/runs?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.data?.id) {
    throw new Error(`Apify run start failed (HTTP ${res.status}): ${JSON.stringify(json?.error ?? json).slice(0, 200)}`);
  }

  const runRef: ApifyRunRef = { runId: json.data.id as string, datasetId: (json.data.defaultDatasetId as string) || null };

  return runRef;
}

/**
 * SAFETY NET: import every recent completed Maps scan that nobody processed
 * (admin closed the tab before the poll, webhook didn't fire, etc.).
 *
 * Runs from the last 24h are listed, their INPUT (keyword/city) is read from
 * the run's own key-value store, and results go through processMapsResults —
 * DB dedupe makes reprocessing harmless. A PROCESSED marker is written into
 * the run's key-value store so finished runs are only fetched once.
 *
 * Called from the hourly campaign cron — zero extra infrastructure.
 */
export async function reconcileRecentRuns(): Promise<{
  processed: Array<{ runId: string; saved: number; keyword: string; city: string }>;
  skipped: number;
}> {
  const token = apifyToken();
  if (!token) return { processed: [], skipped: 0 };

  const startedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const res = await fetch(
    `${API_BASE}/acts/${ACTOR_ID}/runs?token=${encodeURIComponent(token)}&limit=10&startedAfter=${startedAfter}&status=SUCCEEDED`,
  );
  const json = await res.json().catch(() => ({}));
  const runs: Array<{ id: string; defaultDatasetId: string; defaultKeyValueStoreId: string }> =
    json?.data?.items ?? [];

  const processed: Array<{ runId: string; saved: number; keyword: string; city: string }> = [];
  let skipped = 0;

  for (const run of runs.slice(0, 5)) {
    const kvsId = run.defaultKeyValueStoreId;
    if (!kvsId || !run.defaultDatasetId) continue;

    // Already imported? (marker written after the first successful import)
    try {
      const marker = await fetch(
        `${API_BASE}/key-value-stores/${kvsId}/records/PROCESSED_BY_BIZREBORN?token=${encodeURIComponent(token)}`,
      );
      if (marker.ok) {
        skipped++;
        continue;
      }
    } catch {
      // marker check failure → reprocess (safe, deduped)
    }

    let keyword = "local businesses";
    let city = "";
    try {
      const inputRes = await fetch(
        `${API_BASE}/key-value-stores/${kvsId}/records/INPUT?token=${encodeURIComponent(token)}`,
      );
      if (inputRes.ok) {
        const input = await inputRes.json();
        keyword = (input?.searchStringsArray ?? [])[0] || keyword;
        city = String(input?.locationQuery ?? "");
      }
    } catch {
      // fall back to generic labels
    }

    try {
      const result = await processMapsResults(run.defaultDatasetId, keyword, city);
      processed.push({ runId: run.id, saved: result.saved, keyword, city });
      await fetch(`${API_BASE}/key-value-stores/${kvsId}/records/PROCESSED_BY_BIZREBORN?token=${encodeURIComponent(token)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processedAt: new Date().toISOString(), saved: result.saved }),
      }).catch(() => {});
    } catch (err) {
      console.warn("[apify] reconcile failed for run", run.id, err);
    }
  }

  return { processed, skipped };
}

/** Webhook auth: the payload URL carries the CRON_SECRET as ?key=. */
export function isAdminWebhookKey(req: Request, url: URL): boolean {
  const secret = process.env.CRON_SECRET || "";
  return secret.length > 0 && url.searchParams.get("key") === secret;
}

/**
 * Turn a finished run's dataset into saved leads. COMBINED pipeline: Apify
 * provides the real place data (rating, reviews, unanswered, competitor,
 * website emails), then our own email discovery backfills the rest (website
 * scrape + MX-verified info@/contact@/sales@ derivations). Only leads that
 * end up with a deliverable email are saved — the campaign is email-driven.
 * Both the webhook and the client poll path go through here — the DB dedupe
 * makes double-processing harmless.
 */
export async function processMapsResults(
  datasetId: string,
  keyword: string,
  city: string,
): Promise<{ saved: number; businesses: MapsBusiness[]; emailed: boolean }> {
  const { insertProspects, listProspects } = await import("@/lib/prospects");
  const { discoverEmailForBusiness } = await import("@/lib/services/scraper");

  const businesses = await fetchMapsResults(datasetId);

  // Email backfill for places where Apify's website enrichment found nothing:
  // 5 workers × 10s per-lead timeout keeps even a 50-lead batch inside the
  // 60s serverless budget.
  const needEmail = businesses.filter((b) => !b.email && b.website);
  if (needEmail.length > 0) {
    const PER_LEAD_TIMEOUT_MS = 10000;
    const queue = [...needEmail];
    const worker = async () => {
      while (queue.length > 0) {
        const b = queue.shift()!;
        try {
          const discovered = await Promise.race([
            discoverEmailForBusiness(
              {
                business_name: b.business_name,
                city: b.city || city,
                website: b.website,
                google_maps_link: b.google_maps_link || null,
              },
              { skipAiGrounding: true, webSearch: false },
            ),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), PER_LEAD_TIMEOUT_MS)),
          ]);
          if (discovered) b.email = discovered;
        } catch {
          // leave email empty — lead is dropped below
        }
      }
    };
    await Promise.all(Array.from({ length: 5 }, () => worker()));
  }

  // Keep only leads with a deliverable email — the campaign engine is
  // email-driven and the operator asked to produce email-ready leads only.
  const emailReady = businesses.filter((b) => b.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email));

  const existing = await listProspects();
  const existingKeys = new Set(
    existing.map((p) => `${(p.business_name || "").toLowerCase()}|${(p.city || "").toLowerCase()}`),
  );
  const fresh = emailReady.filter(
    (b) => !existingKeys.has(`${b.business_name.toLowerCase()}|${b.city.toLowerCase()}`),
  );

  if (fresh.length > 0) {
    await insertProspects(
      fresh.map((b) => ({
        business_name: b.business_name,
        city: b.city || city || null,
        website: b.website,
        email: b.email,
        phone: b.phone || null,
        google_maps_link: b.google_maps_link || null,
        instagram: b.instagram || null,
        facebook: b.facebook || null,
        google_rating: b.google_rating,
        review_count: b.review_count,
        unanswered_reviews: b.unanswered_reviews,
        competitor_name: b.competitor_name,
        competitor_reviews: b.competitor_reviews,
        qualifying_score: b.qualifying_score,
        missing_gbp_apple: b.missing_gbp_apple,
        status: "saved" as const,
      })),
    );
  }

  const emailed = await emailScanSummary(
    keyword,
    city,
    fresh.length,
    fresh.length,
    businesses.length,
  );

  return { saved: fresh.length, businesses: emailReady, emailed };
}

/** Email the admin a scan-completion summary (best-effort, never throws). */
async function emailScanSummary(
  keyword: string,
  city: string,
  found: number,
  withEmail: number,
  totalScraped: number,
): Promise<boolean> {
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) return false;
    const to = process.env.REPLY_TO_EMAIL || "bizrebornmarketing@gmail.com";
    const from = process.env.EMAIL_FROM || "Biz Reborn Marketing <hello@bizreborn.com>";
    const dash = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com"}/admin/prospects`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Maps scan complete: ${found} new leads for "${keyword}" in ${city} (${withEmail} with emails)`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <h2 style="margin:0 0 8px;">Google Maps scan finished</h2>
            <p style="color:#475569;margin:0 0 20px;">Keyword <strong>${keyword}</strong> · Market <strong>${city}</strong></p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              <tr>
                <td style="padding:12px;border:1px solid #e2e8f0;border-radius:8px 0 0 8px;background:#f8fafc;text-align:center;"><span style="font-size:24px;font-weight:bold;">${found}</span><br><span style="font-size:12px;color:#64748b;">new leads saved</span></td>
                <td style="padding:12px;border:1px solid #e2e8f0;background:#f8fafc;text-align:center;"><span style="font-size:24px;font-weight:bold;">${withEmail}</span><br><span style="font-size:12px;color:#64748b;">with emails</span></td>
                <td style="padding:12px;border:1px solid #e2e8f0;border-radius:0 8px 8px 0;background:#f8fafc;text-align:center;"><span style="font-size:24px;font-weight:bold;">${totalScraped}</span><br><span style="font-size:12px;color:#64748b;">total scraped</span></td>
              </tr>
            </table>
            <p style="color:#475569;">The leads are in your library (Saved tab) ready for audit &amp; pitch generation.</p>
            <p style="margin:24px 0;">
              <a href="${dash}" style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold;display:inline-block;">Open Lead Library →</a>
            </p>
          </div>`,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn("[apify] summary email failed:", err);
    return false;
  }
}

export type ApifyRunState = "RUNNING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";

export async function pollMapsScrape(ref: ApifyRunRef): Promise<{ state: ApifyRunState; datasetId: string | null }> {
  const token = apifyToken();
  if (!token) throw new Error("APIFY_TOKEN not configured");

  const res = await fetch(`${API_BASE}/acts/${ACTOR_ID}/runs/${encodeURIComponent(ref.runId)}?token=${encodeURIComponent(token)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.data) {
    // Transient polling errors shouldn't kill the job — report UNKNOWN and let
    // the poller retry.
    return { state: "UNKNOWN", datasetId: ref.datasetId };
  }
  const status = String(json.data.status || "");
  const datasetId = (json.data.defaultDatasetId as string) || ref.datasetId;
  if (status === "SUCCEEDED") return { state: "SUCCEEDED", datasetId };
  if (["FAILED", "ABORTED", "TIMED-OUT", "ABORTING"].includes(status)) return { state: "FAILED", datasetId };
  return { state: "RUNNING", datasetId };
}

/** Fetch + normalise the dataset of a finished run into lead rows. */
export async function fetchMapsResults(datasetId: string): Promise<MapsBusiness[]> {
  const token = apifyToken();
  if (!token) throw new Error("APIFY_TOKEN not configured");

  const res = await fetch(`${API_BASE}/datasets/${encodeURIComponent(datasetId)}/items?clean=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Apify dataset fetch failed (HTTP ${res.status})`);
  const items = (await res.json()) as ApifyPlace[];
  if (!Array.isArray(items)) return [];

  const out: MapsBusiness[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const name = String(item.title || "").trim();
    if (!name) continue;
    if (item.permanentlyClosed || item.temporarilyClosed) continue;

    const placeKey = item.placeId || name.toLowerCase();
    if (seen.has(placeKey)) continue;
    seen.add(placeKey);

    const email = (item.emails || []).map((e) => String(e).trim()).find((e) => e.includes("@")) || "";
    const instagram = (item.instagrams || [])[0] || "";
    const facebook = (item.facebooks || [])[0] || "";
    const mapsLink = item.url && /^https:\/\/(www\.)?google\.com\/maps/i.test(item.url) ? item.url : "";

    // Real unanswered-review count from the recent-review sample (owner never
    // responded). Falls back to null when no reviews were scraped.
    const reviews = Array.isArray(item.reviews) ? item.reviews : [];
    const unanswered =
      reviews.length > 0
        ? reviews.filter((r) => !r.responseFromOwnerText || !String(r.responseFromOwnerText).trim()).length
        : null;

    // Real competitor from the "People also search" panel: the local
    // alternative with the most reviews (must exceed this place's reviews to
    // represent an actual threat).
    const alsoSearch = (item.peopleAlsoSearch || []).filter((p) => p.title && p.reviewsCount != null);
    const threat = alsoSearch.length > 0
      ? alsoSearch.reduce((a, b) => ((b.reviewsCount ?? 0) > (a.reviewsCount ?? 0) ? b : a))
      : null;
    const totalReviews = item.reviewsCount != null ? Number(item.reviewsCount) : null;
    const competitor =
      threat && (threat.reviewsCount ?? 0) > (totalReviews ?? 0)
        ? { name: String(threat.title).trim(), reviews: Number(threat.reviewsCount) }
        : null;

    out.push({
      qualifying_score: 0, // recomputed below
      missing_gbp_apple: false,
      business_name: name,
      city: String(item.city || "").trim(),
      google_maps_link: mapsLink,
      website: item.website?.trim() || null,
      email,
      phone: String(item.phoneUnformatted || item.phone || "").trim(),
      instagram,
      facebook,
      google_rating: item.totalScore != null && !isNaN(Number(item.totalScore)) ? Number(item.totalScore) : null,
      review_count: totalReviews,
      unanswered_reviews: unanswered,
      competitor_name: competitor?.name ?? null,
      competitor_reviews: competitor?.reviews ?? null,
    });
  }

  // Qualifying score from the same formula used across the pipeline.
  const { calculateQualifyingScore } = await import("@/lib/services/brand-audit");
  for (const b of out) {
    const { score, missingGbpApple } = calculateQualifyingScore({
      google_rating: b.google_rating,
      review_count: b.review_count,
      unanswered_reviews: b.unanswered_reviews,
      google_maps_link: b.google_maps_link || null,
      website: b.website,
      missing_gbp_apple: false,
    });
    b.qualifying_score = score;
    b.missing_gbp_apple = missingGbpApple;
  }

  return out;
}
