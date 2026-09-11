import { NextResponse } from "next/server";
import { generateSlots, groupSlotsByDay } from "@/lib/booking-availability";
import { listBookings } from "@/lib/booking-store";

export const dynamic = "force-dynamic";

/** Public slot availability — free for anyone booking a call. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get("days") ?? "");
  const tz = String(url.searchParams.get("tz") ?? "");
  const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : undefined;

  const bookings = await listBookings();
  const slots = generateSlots(bookings, { days, tz: tz || undefined });

  return NextResponse.json({
    timezone: slots[0]?.tz ?? null,
    days,
    daysGrouped: groupSlotsByDay(slots),
    slots,
  });
}