import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import type { OutreachChannel, OutreachStatus } from "@/lib/supabase-types";
import {
  getOutreachStoreStatus,
  listOutreachLogs,
} from "@/lib/services/messaging/outreach-store";
import { OUTREACH_CHANNELS } from "@/lib/services/messaging/types";

export const dynamic = "force-dynamic";

const STATUSES: OutreachStatus[] = [
  "queued",
  "sending",
  "sent",
  "delivered",
  "read",
  "replied",
  "failed",
  "cancelled",
];

/**
 * GET /api/outreach/logs?status=sent&channel=whatsapp&prospectId=…&limit=100
 *
 * Delivery queue/status feed for the admin dashboard.
 */
export async function GET(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawChannel = url.searchParams.get("channel")?.trim().toLowerCase();
  const rawStatus = url.searchParams.get("status")?.trim().toLowerCase();
  const prospectId = url.searchParams.get("prospectId")?.trim() || null;
  const limitRaw = Number(url.searchParams.get("limit") || 100);

  const channel =
    rawChannel && (OUTREACH_CHANNELS as string[]).includes(rawChannel)
      ? (rawChannel as OutreachChannel)
      : null;
  const status =
    rawStatus && (STATUSES as string[]).includes(rawStatus)
      ? (rawStatus as OutreachStatus)
      : null;

  const logs = await listOutreachLogs({
    prospectId,
    channel,
    status,
    limit: Number.isFinite(limitRaw) ? limitRaw : 100,
  });

  const counts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.status] = (acc[log.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    logs,
    counts,
    store: getOutreachStoreStatus(),
  });
}
