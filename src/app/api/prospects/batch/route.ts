import { NextResponse } from "next/server";
import { insertProspects } from "@/lib/prospects";
import { isAdminOrDemo } from "@/lib/supabase/server";

/**
 * Create one or many prospects.
 *
 * Body: { prospects: Array<{ business_name, city?, website?, email?, phone? }> }
 * Used by both the manual form and the CSV batch importer.
 */
export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const body = await req.json();
  const rows = Array.isArray(body.prospects)
    ? body.prospects
    : Array.isArray(body.rows)
      ? body.rows
      : [];

  if (rows.length === 0 || rows.length > 500) {
    return NextResponse.json(
      { error: "Provide between 1 and 500 prospects" },
      { status: 400 },
    );
  }

  const valid: Array<{
    business_name: string;
    city?: string;
    website?: string;
    email?: string;
    phone?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    google_rating?: number;
    review_count?: number;
    unanswered_reviews?: number;
    competitor_name?: string;
    competitor_reviews?: number;
  }> = [];

  const str = (v: unknown) => {
    const s = String(v ?? "").trim();
    return s || undefined;
  };

  for (const row of rows) {
    const name = String(row.business_name || row.name || row.business || "").trim();
    if (!name) continue;
    valid.push({
      business_name: name,
      city: str(row.city),
      website: str(row.website || row.url),
      email: str(row.email),
      phone: str(row.phone),
      instagram: str(row.instagram || row.ig),
      facebook: str(row.facebook || row.fb),
      tiktok: str(row.tiktok),
      google_rating: row.google_rating !== undefined && row.google_rating !== "" ? Number(row.google_rating) : undefined,
      review_count: row.review_count !== undefined && row.review_count !== "" ? Number(row.review_count) : undefined,
      unanswered_reviews: row.unanswered_reviews !== undefined && row.unanswered_reviews !== "" ? Number(row.unanswered_reviews) : undefined,
      competitor_name: str(row.competitor_name),
      competitor_reviews: row.competitor_reviews !== undefined && row.competitor_reviews !== "" ? Number(row.competitor_reviews) : undefined,
    });
  }

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "No valid rows (missing business_name)" },
      { status: 400 },
    );
  }

  const inserted = await insertProspects(valid);
  return NextResponse.json({ prospects: inserted }, { status: 201 });
}