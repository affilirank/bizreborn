import { NextResponse } from "next/server";
import { listProspects, updateProspect } from "@/lib/prospects";
import { discoverEmailForBusiness } from "@/lib/services/scraper";
import { isAdminOrDemo } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONCURRENCY = 6;
const DEADLINE_MS = 50000;
const PER_LEAD_TIMEOUT_MS = 12000;

export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  let limit = 40;
  try {
    const body = await req.json();
    if (body && Number.isFinite(body.limit)) {
      limit = Math.min(60, Math.max(1, Math.floor(body.limit)));
    }
  } catch {
    // no body — use default
  }

  const missing = (await listProspects()).filter((p) => !p.email || !p.email.trim());
  const targets = missing.slice(0, limit);
  const errors: string[] = [];

  const deadline = Date.now() + DEADLINE_MS;
  let idx = 0;
  let foundCount = 0;

  async function worker() {
    while (true) {
      if (Date.now() > deadline) return;
      const i = idx++;
      if (i >= targets.length) return;
      const p = targets[i];
      try {
        const email = await Promise.race([
          discoverEmailForBusiness(
            {
              business_name: p.business_name,
              city: p.city ?? "",
              website: p.website,
              google_maps_link: p.google_maps_link,
            },
            { skipAiGrounding: true, webSearch: true },
          ),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), PER_LEAD_TIMEOUT_MS)),
        ]);
        if (email) {
          await updateProspect(p.id, { email });
          foundCount++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${p.business_name}: ${msg}`);
        console.error("[backfill] error for", p.business_name, err);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  return NextResponse.json({
    scanned: Math.min(idx, targets.length),
    found: foundCount,
    stillMissing: Math.max(0, targets.length - foundCount),
    totalMissing: missing.length,
    errors: errors.slice(0, 5),
  });
}
