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

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

export async function DELETE(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "id or ids required" }, { status: 400 });
  }
  for (const id of ids) {
    await deleteProspect(id);
  }
  return NextResponse.json({ ok: true });
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
    batchQueue.enqueue(ids);
    // Keep the serverless function alive until the pipeline drains.
    after(() => batchQueue.whenIdle());
    return NextResponse.json({ enqueued: ids.length });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
