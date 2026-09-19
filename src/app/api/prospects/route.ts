import { NextResponse, after } from "next/server";
import {
  listProspects,
  deleteProspect,
  getProspectById,
  getProspectStoreStatus,
} from "@/lib/prospects";
import { batchQueue } from "@/lib/services/queue";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { LEADGEN_SQL } from "@/lib/leadgen-sql";
import { suppressEmails } from "@/lib/suppressions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const prospects = await listProspects();
  const store = getProspectStoreStatus();
  return NextResponse.json({
    prospects,
    store,
    setupSql: store.setupRequired ? LEADGEN_SQL : undefined,
    queued: batchQueue.size(),
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const rawIds: string[] = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
  const ids = rawIds.filter((id) => typeof id === "string" && UUID_RE.test(id));
  if (ids.length === 0) {
    return NextResponse.json({ error: "valid UUID id or ids required" }, { status: 400 });
  }
  // "Remove and remember": when suppress is set (bad/dead emails), record the
  // addresses first so imports and campaigns never re-add them.
  let suppressed = 0;
  if (body.suppress) {
    const rows = (await Promise.all(ids.map((id) => getProspectById(id)))).filter(Boolean) as Array<{ email?: string | null }>;
    suppressed = await suppressEmails(rows.map((r) => r.email ?? null), body.reason ? String(body.reason).slice(0, 200) : "removed by admin");
  }
  let deleted = 0;
  for (const id of ids) {
    if (await deleteProspect(id)) deleted++;
  }
  return NextResponse.json({ ok: true, deleted, suppressed });
}

export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const body = await req.json();
  const action = body.action;

  if (action === "generate" || action === "retry") {
    const ids: string[] =
      action === "retry"
        ? body.id
          ? [String(body.id)]
          : []
        : Array.isArray(body.ids)
          ? body.ids.map(String)
          : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "no ids" }, { status: 400 });
    }
    for (const id of ids) {
      if (!(await getProspectById(id))) {
        return NextResponse.json({ error: `prospect not found: ${id}` }, { status: 404 });
      }
    }
    // Single-lead requests run the pipeline INLINE within this invocation —
    // the in-memory queue dies with the serverless function after ~60s, which
    // froze multi-lead batches mid-processing.
    if (ids.length === 1) {
      const { processProspectPipeline } = await import("@/lib/services/queue");
      const result = await processProspectPipeline(ids[0]);
      return NextResponse.json(result);
    }
    batchQueue.enqueue(ids);
    // Keep the serverless function alive until the pipeline drains.
    after(() => batchQueue.whenIdle());
    return NextResponse.json({ enqueued: ids.length });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
