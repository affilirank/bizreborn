import { NextResponse } from "next/server";
import { getProspectById } from "@/lib/prospects";
import { isAdminOrDemo } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const { id } = await params;
  const prospect = await getProspectById(id);
  if (!prospect) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ prospect });
}