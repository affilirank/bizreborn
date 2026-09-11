import { NextResponse } from "next/server";
import { deleteBooking, getBooking, updateBooking } from "@/lib/booking-store";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { sendCancellationEmail, sendRescheduleEmail } from "@/lib/booking-email";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Admin: confirm/reschedule/mark completed or no-show a booking. */
export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const booking = await getBooking(id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const patch: Parameters<typeof updateBooking>[1] = {};
  const allowedStatuses = ["confirmed", "rescheduled", "completed", "no-show", "cancelled"];
  if (body.status) {
    if (!allowedStatuses.includes(String(body.status))) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    patch.status = String(body.status) as never;
  }
  if (body.scheduled_at) {
    const t = new Date(String(body.scheduled_at));
    if (Number.isNaN(t.getTime())) {
      return NextResponse.json({ error: "scheduled_at is not a valid date." }, { status: 400 });
    }
    patch.scheduled_at = t.toISOString();
  }
  if (body.duration_min) patch.duration_min = Math.max(1, Number(body.duration_min));
  if (body.call_type) patch.call_type = String(body.call_type).trim();
  if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes).trim() : null;
  if (body.timezone) patch.timezone = String(body.timezone).trim();

  const updated = await updateBooking(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  let email: { ok: boolean; simulated: boolean; error?: string } | null = null;
  if (patch.scheduled_at && patch.scheduled_at !== booking.scheduled_at) {
    email = await sendRescheduleEmail(updated).catch((e) => ({
      ok: false,
      simulated: false,
      error: e instanceof Error ? e.message : "email error",
    }));
  } else if (patch.status === "cancelled" && booking.status !== "cancelled") {
    email = await sendCancellationEmail(updated).catch((e) => ({
      ok: false,
      simulated: false,
      error: e instanceof Error ? e.message : "email error",
    }));
  }

  return NextResponse.json({ success: true, booking: updated, emailNotified: email ?? null });
}

/** Admin: hard-delete a booking. */
export async function DELETE(_req: Request, ctx: Ctx) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existed = Boolean(await getBooking(id));
  await deleteBooking(id);
  return NextResponse.json({ success: true, existed });
}