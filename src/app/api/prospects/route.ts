import { NextResponse } from "next/server";
import {
  listProspects,
  deleteProspect,
  getProspectById,
} from "@/lib/prospects";
import { batchQueue } from "@/lib/services/queue";
import { isAdminOrDemo } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const prospects = await listProspects();
  return NextResponse.json({ prospects });
}

export async function DELETE(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const ok = await deleteProspect(id);
  return NextResponse.json({ ok });
}

export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const body = await req.json();
  const action = body.action;

  if (action === "generate") {
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "no ids" }, { status: 400 });
    }
    // Confirm all ids exist before enqueueing.
    for (const id of ids) {
      if (!(await getProspectById(id))) {
        return NextResponse.json(
          { error: `prospect not found: ${id}` },
          { status: 404 },
        );
      }
    }
    batchQueue.enqueue(ids);
    return NextResponse.json({ enqueued: ids.length });
  }

  if (action === "retry") {
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const p = await getProspectById(id);
    if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
    batchQueue.enqueue([id]);
    return NextResponse.json({ enqueued: 1 });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}