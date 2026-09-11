import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { getCallRecord, getLatestCallRecord } from "@/lib/call-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const url = new URL(req.url);
  const callSid = String(url.searchParams.get("callSid") ?? "").trim();
  const prospectId = String(url.searchParams.get("prospectId") ?? "").trim();

  let rec = null;
  if (callSid) {
    rec = await getCallRecord(callSid);
  } else if (prospectId) {
    rec = await getLatestCallRecord(prospectId);
  }

  if (!rec) {
    return NextResponse.json({ ok: false, error: "Call not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, call: rec });
}