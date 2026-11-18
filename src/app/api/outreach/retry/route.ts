import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import {
  retryDueOutreach,
  retryOutreachLog,
} from "@/lib/services/messagingDispatcher";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cron auth: Vercel sends Authorization: Bearer <CRON_SECRET>. */
function isCronAuth(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && auth === `Bearer ${secret}`;
}

/**
 * POST /api/outreach/retry — retry one log or every due failure.
 *   { "id": "uuid", "force": false }
 *   { "due": true, "limit": 12 }
 */
export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";

  try {
    if (id) {
      const result = await retryOutreachLog(id, { force: body.force === true });
      return NextResponse.json({
        success: result.status === "sent",
        result,
        message:
          result.status === "sent"
            ? "Retry delivered."
            : `Retry failed: ${result.error ?? "unknown error"}`,
      });
    }

    if (body.due === true || body.all === true) {
      const limitRaw = Number(body.limit ?? 12);
      const summary = await retryDueOutreach(
        Number.isFinite(limitRaw) ? limitRaw : 12,
      );
      return NextResponse.json({ success: summary.failed === 0, ...summary });
    }

    return NextResponse.json(
      { error: "Pass an outreach log id, or { due: true } to retry every due failure." },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Retry failed." },
      { status: 400 },
    );
  }
}

/** Vercel Cron: retry due failures. */
export async function GET(req: Request) {
  if (!isCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const limitRaw = Number(new URL(req.url).searchParams.get("limit") || 12);
  const summary = await retryDueOutreach(Number.isFinite(limitRaw) ? limitRaw : 12);
  return NextResponse.json({ success: summary.failed === 0, ...summary });
}
