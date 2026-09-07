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
  }> = [];

  for (const row of rows) {
    const name = String(row.business_name || row.name || row.business || "").trim();
    if (!name) continue;
    valid.push({
      business_name: name,
      city: row.city,
      website: row.website,
      email: row.email,
      phone: row.phone,
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