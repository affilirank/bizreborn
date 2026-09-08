import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const eventType = String(body?.type ?? body?.event ?? "");
  const data = body?.data ?? body;
  const toEmail = data?.to?.[0] || data?.email || data?.recipient;

  if (!toEmail) {
    return NextResponse.json({ received: true, note: "No recipient found in webhook" });
  }

  const admin = createServiceClient();
  if (admin) {
    const { data: prospects } = await admin
      .from("prospects")
      .select("*")
      .eq("email", toEmail);

    if (prospects && prospects.length > 0) {
      for (const p of prospects) {
        const logs = p.communication_logs || [];
        const note = `Email event: ${eventType} at ${new Date().toISOString()}`;
        const newLogs = [{ date: new Date().toISOString(), type: `email_${eventType.replace("email.", "")}`, notes: note, admin: "Resend Webhook" }, ...logs];
        await admin
          .from("prospects")
          .update({ communication_logs: newLogs, last_contacted_at: new Date().toISOString() })
          .eq("id", p.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
