import { NextResponse } from "next/server";
import { getProspectById, updateProspect } from "@/lib/prospects";
import { logMeta, nextPipelineStatus, prospectTemperature } from "@/lib/crm-actions";

export const dynamic = "force-dynamic";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

/**
 * 1x1 open-tracking pixel embedded in every sent email.
 * uid is "<prospectId>:<random>". Marks the matching communication log entry
 * as opened, records the open time, and advances the pipeline to Hot (this is
 * real evidence a lead engaged with outreach — never demotes).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  try {
    const { uid } = await params;
    const [prospectId, ...rest] = String(uid ?? "").split(":");
    const marker = rest.join(":");
    if (!prospectId || !marker) {
      return new NextResponse(TRANSPARENT_GIF, {
        headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
      });
    }

    const p = await getProspectById(prospectId);
    if (p) {
      const logs = p.communication_logs ?? [];
      let changed = false;
      let wasAlreadyOpened = false;
      const now = new Date().toISOString();
      const nextLogs = logs.map((l) => {
        const m = logMeta(l);
        if (m.email_uid === uid) {
          const opens = Number(m.opens ?? 0) + 1;
          if (opens > 1) wasAlreadyOpened = true;
          changed = true;
          return {
            ...l,
            meta: {
              ...m,
              opened: true,
              opens,
              opened_at: m.opened_at ? m.opened_at : now,
              last_opened_at: now,
            },
          };
        }
        return l;
      });

      if (changed) {
        const patch: Record<string, unknown> = { communication_logs: nextLogs };
        if (!wasAlreadyOpened) {
          const next = nextPipelineStatus(p.temperature ?? p.status, "opened");
          if (next !== prospectTemperature(p)) patch.temperature = next;
        }
        await updateProspect(p.id, patch);
      }
    }
  } catch {
    // a failed pixel must never break the email itself
  }

  return new NextResponse(TRANSPARENT_GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
  });
}