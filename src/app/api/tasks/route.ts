import { NextResponse } from "next/server";
import { listTasks, createTask } from "@/lib/data";
import { isAdminOrDemo } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const tasks = await listTasks();
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const body = await req.json();
  const created = await createTask({
    client: body.client || "",
    service: body.service || "",
    due: body.due,
    priority: body.priority || "medium",
    estimatedHours: Number(body.estimatedHours) || 0,
  });
  return NextResponse.json({ task: created });
}
