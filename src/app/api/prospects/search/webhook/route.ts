import { NextResponse } from "next/server";
import { isAdminWebhookKey } from "@/lib/services/apify-maps";
import { processMapsResults } from "@/lib/services/apify-maps";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Apify RUN.SUCCEEDED webhook receiver. Fires when a Google Maps scan
 * completes — even with the admin tab closed. Saves fresh leads to the
 * library and emails the admin a completion summary.
 * Authenticated via the ?key= secret baked into the payload URL.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAdminWebhookKey(req, url)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const keyword = url.searchParams.get("keyword") || "local businesses";
  const city = url.searchParams.get("city") || "";

  // Apify sends { runId, defaultDatasetId, ... } in the payload.
  const body = await req.json().catch(() => ({}));
  const datasetId = String(body?.defaultDatasetId || "") || undefined;
  const runId = String(body?.runId || body?.resource?.id || "");

  if (!datasetId && !runId) {
    console.warn("[maps webhook] no datasetId/runId in payload:", JSON.stringify(body).slice(0, 300));
    return NextResponse.json({ ok: false, error: "missing dataset id" }, { status: 400 });
  }

  try {
    let id = datasetId;
    if (!id) {
      // Look up the run's dataset id.
      const res = await fetch(`https://api.apify.com/v2/acts/compass~google-maps-extractor/runs/${encodeURIComponent(runId)}`, {
        headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}` },
      });
      const json = await res.json().catch(() => ({}));
      id = json?.data?.defaultDatasetId;
    }
    if (!id) {
      return NextResponse.json({ ok: false, error: "dataset id not resolvable" }, { status: 400 });
    }

    const result = await processMapsResults(id, keyword, city);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[maps webhook] processing failed:", err);
    return NextResponse.json({ ok: false, error: "processing failed" }, { status: 500 });
  }
}

// Apify pings with POST; respond 200 to GET too so plain health checks pass.
export async function GET() {
  return NextResponse.json({ ok: true });
}
