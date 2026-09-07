import { NextResponse } from "next/server";
import { z } from "zod";
import { runAudit } from "@/lib/audit";

const AuditSchema = z.object({
  url: z.string().url().or(z.string().min(4)),
  businessName: z.string().max(120).optional().default(""),
  gbp: z.string().max(120).optional().default(""),
  instagram: z.string().max(120).optional().default(""),
  facebook: z.string().max(120).optional().default(""),
  tiktok: z.string().max(120).optional().default(""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = AuditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid audit input.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const normalizedUrl = input.url.includes("://")
      ? input.url
      : `https://${input.url}`;
    const report = runAudit({ ...input, url: normalizedUrl });
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "Audit failed." }, { status: 500 });
  }
}
