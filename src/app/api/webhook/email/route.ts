import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { suppressEmails } from "@/lib/suppressions";
import { createHmac, timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * Verify the request came from Resend using the Svix signing scheme:
 * `v1,<base64(hmac-sha256(`${id}.${timestamp}.${rawBody}`, secret))>`.
 * Only enforced when RESEND_WEBHOOK_SECRET is configured.
 */
function verifyResendSignature(req: Request, rawBody: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return true; // unconfigured → accept (legacy behavior)

  const id = req.headers.get("svix-id") || "";
  const timestamp = req.headers.get("svix-timestamp") || "";
  const signatureHeader = req.headers.get("svix-signature") || "";
  if (!id || !timestamp || !signatureHeader) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");

  return signatureHeader.split(" ").some((sig) => {
    const [version, hash] = sig.split(",");
    if (version !== "v1" || !hash) return false;
    try {
      return timingSafeEqual(Buffer.from(hash, "base64"), Buffer.from(expected, "base64"));
    } catch {
      return false;
    }
  });
}

/**
 * Diagnose a bounce: is the address salvageable (soft/temporary failure) or
 * permanently undeliverable (hard bounce)?
 *
 * Resend's `email.bounced` payload carries `bounce_type` ("HardBounce" /
 * "SoftBounce"). When it's absent we fall back to scanning the bounce message
 * for hard-failure indicators (unknown user / no mailbox / domain rejects).
 * Salvageable bounces stay in the pipeline and get logged for review.
 */
function diagnoseBounce(data: Record<string, unknown>): { salvageable: boolean; reason: string } {
  const rawType = String(data?.bounce_type ?? data?.bounceType ?? "").toLowerCase();
  if (rawType.includes("soft")) return { salvageable: true, reason: `soft bounce (${rawType})` };
  if (rawType.includes("hard")) return { salvageable: false, reason: "hard bounce" };

  // No explicit type — inspect the bounce message/description.
  const message = [
    data?.bounce_message,
    data?.message,
    data?.description,
    (data as Record<string, unknown>)?.smtpResponse,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hardSignatures = [
    "5.1.1", // bad destination mailbox
    "5.1.10", // recipient address rejected
    "5.2.1", // mailbox disabled
    "5.4.1", // relay access denied
    "no such user",
    "user unknown",
    "unknown user",
    "mailbox not found",
    "does not exist",
    "doesn't exist",
    "invalid recipient",
    "address rejected",
    "disabled mailbox",
  ];
  const softSignatures = ["mailbox full", "quota", "temporarily", "try again", "deferred", "4.2.", "greylist", "greylisted"];

  if (softSignatures.some((s) => message.includes(s))) {
    return { salvageable: true, reason: "soft bounce (temporary failure)" };
  }
  if (hardSignatures.some((s) => message.includes(s))) {
    return { salvageable: false, reason: `hard bounce (${message.slice(0, 120)})` };
  }
  // Undiagnosable — treat as salvageable and surface it for manual review
  // rather than silently deleting a lead off a guess.
  return { salvageable: true, reason: message ? `undiagnosed bounce: ${message.slice(0, 120)}` : "undiagnosed bounce (no bounce message)" };
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!verifyResendSignature(req, rawBody)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const body = (() => {
    try {
      return JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();

  const eventType = String(body?.type ?? body?.event ?? "");
  const data = (body?.data ?? body) as Record<string, unknown>;
  const toEmail = String(
    (data?.to as string[] | undefined)?.[0] || data?.email || data?.recipient || "",
  ).toLowerCase();

  if (!toEmail) {
    return NextResponse.json({ received: true, note: "No recipient found in webhook" });
  }

  const admin = createServiceClient();

  // Bounce: diagnose first. Hard bounces (and spam complaints) can never
  // receive mail — delete the business. Soft bounces stay for a retry.
  if (admin && eventType === "email.bounced") {
    const diagnosis = diagnoseBounce(data);

    if (diagnosis.salvageable) {
      const { data: prospects } = await admin
        .from("prospects")
        .select("id, communication_logs")
        .eq("email", toEmail);
      for (const p of prospects ?? []) {
        const logs = ((p as { communication_logs?: unknown[] }).communication_logs) || [];
        const note = `Bounce diagnosed — SALVAGEABLE (${diagnosis.reason}) at ${new Date().toISOString()}. Kept for retry.`;
        await admin
          .from("prospects")
          .update({
            communication_logs: [
              { date: new Date().toISOString(), type: "email_bounce_soft", notes: note, admin: "Resend Webhook" },
              ...logs,
            ],
          })
          .eq("id", (p as { id: string }).id);
      }
      return NextResponse.json({ received: true, action: "kept", reason: diagnosis.reason, toEmail });
    }

    const { data: deleted } = await admin
      .from("prospects")
      .delete()
      .eq("email", toEmail)
      .select("business_name");
    await suppressEmails([toEmail], `hard bounce: ${diagnosis.reason}`).catch(() => {});
    console.warn(
      `[resend webhook] deleted ${(deleted?.length ?? 0)} lead(s) for ${toEmail}: ${diagnosis.reason}`,
    );
    return NextResponse.json({ received: true, action: "deleted", reason: diagnosis.reason, toEmail });
  }

  // Spam complaint → never send again, regardless of anything else.
  if (admin && eventType === "email.complained") {
    await admin.from("prospects").delete().eq("email", toEmail);
    await suppressEmails([toEmail], "spam complaint").catch(() => {});
    console.warn(`[resend webhook] deleted lead(s) for ${toEmail} after spam complaint`);
    return NextResponse.json({ received: true, action: "deleted", reason: "spam complaint", toEmail });
  }

  // All other events (delivered / opened / clicked) → append to the audit log.
  if (admin) {
    const { data: prospects } = await admin
      .from("prospects")
      .select("*")
      .eq("email", toEmail);

    if (prospects && prospects.length > 0) {
      for (const p of prospects) {
        const logs = (p as { communication_logs?: unknown[] }).communication_logs || [];
        const note = `Email event: ${eventType} at ${new Date().toISOString()}`;
        const newLogs = [
          {
            date: new Date().toISOString(),
            type: `email_${eventType.replace("email.", "")}`,
            notes: note,
            admin: "Resend Webhook",
          },
          ...logs,
        ];
        await admin
          .from("prospects")
          .update({ communication_logs: newLogs, last_contacted_at: new Date().toISOString() })
          .eq("id", (p as { id: string }).id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
