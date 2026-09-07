import { NextResponse } from "next/server";
import { z } from "zod";
import { subscribeToMailerLite } from "@/lib/mailerlite";

const LeadSchema = z.object({
  name: z.string().min(1, "Name is required.").max(120),
  businessName: z.string().max(160).optional().default(""),
  phone: z.string().max(40).optional().default(""),
  email: z.string().email("Enter a valid email.").max(160),
  source: z
    .enum(["audit", "contact", "chat"])
    .optional()
    .default("contact"),
  message: z.string().max(2000).optional().default(""),
  vertical: z.string().max(80).optional().default(""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid submission.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const lead = parsed.data;

    // Live mode: push to MailerLite. Adding the subscriber to
    // MAILERLITE_GROUP_ID fires that group's autoresponder sequence.
    const result = await subscribeToMailerLite(lead.email, {
      fullName: lead.name,
      businessName: lead.businessName || undefined,
      phone: lead.phone || undefined,
    });

    if (!result.ok && result.mode !== "unconfigured") {
      return NextResponse.json(
        { error: "Could not subscribe the contact.", mailerlite: false },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      mailerlite: result.ok,
      mode: result.mode,
      subscribed: result.mode === "live",
    });
  } catch {
    return NextResponse.json({ error: "Submission failed." }, { status: 500 });
  }
}
