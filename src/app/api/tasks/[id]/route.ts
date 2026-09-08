import { NextResponse } from "next/server";
import { updateTask, deleteTask, markTaskDone } from "@/lib/data";
import { isAdminOrDemo } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();

  if (body.action === "complete") {
    await markTaskDone(id, Number(body.hours) || 0);
  } else {
    await updateTask(id, {
      assignee: body.assignee !== undefined ? body.assignee : undefined,
      status: body.status !== undefined ? body.status : undefined,
      estimatedHours: body.estimatedHours !== undefined ? Number(body.estimatedHours) : undefined,
      completedAt: body.completedAt !== undefined ? body.completedAt : undefined,
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const { id } = await params;
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
