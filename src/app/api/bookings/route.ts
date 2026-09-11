import { NextResponse } from "next/server";
import { createBooking, listBookings, type BookingInput } from "@/lib/booking-store";
import { sendBookingEmails } from "@/lib/booking-email";
import { BOOKING } from "@/lib/config";
import { createServiceClient } from "@/lib/supabase/admin";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { isSlotOpen } from "@/lib/booking-availability";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Public booking API — creates a strategy-call booking, guards against
 * double-booking/past slots, and fires client + operator emails.
 * GET is admin/demo-gated and attaches the matched prospect for the call script.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const businessName = String(body.business_name ?? "").trim();
  const scheduledAt = String(body.scheduled_at ?? "").trim();
  const phone = body.phone ? String(body.phone).trim() : null;
  const callType = String(body.call_type ?? BOOKING.callTypes[0]).trim();
  const timezone = body.timezone ? String(body.timezone).trim() : BOOKING.timezone;
  const notes = body.notes ? String(body.notes).trim() : null;
  const durationMin = Number(body.duration_min ?? BOOKING.durationMinutes) || BOOKING.durationMinutes;

  if (!name || !email || !businessName || !scheduledAt) {
    return NextResponse.json({ error: "name, email, business_name and scheduled_at are required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (durationMin <= 0) {
    return NextResponse.json({ error: "duration_min must be positive." }, { status: 400 });
  }

  const start = new Date(scheduledAt);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "scheduled_at is not a valid date." }, { status: 400 });
  }
  const end = new Date(start.getTime() + durationMin * 60000);
  const minStart = Date.now() + BOOKING.minLeadHours * 3600000;
  const maxStart = Date.now() + BOOKING.daysAhead * 86400000;
  if (start.getTime() < minStart || start.getTime() > maxStart) {
    return NextResponse.json({ error: "That time isn't available. Pick a slot from the calendar." }, { status: 400 });
  }

  const existing = await listBookings();
  if (!isSlotOpen(start, end, existing)) {
    return NextResponse.json({ error: "That slot was just taken — please pick another." }, { status: 409 });
  }

  let prospectId: string | null = null;
  const service = createServiceClient();
  if (service) {
    const { data } = await service
      .from("prospects")
      .select("id")
      .or(`email.eq.${email},business_name.ilike.${businessName.replace(/'/g, "''")}`)
      .limit(1)
      .maybeSingle();
    if (data) prospectId = String(data.id);
  }

  const input: BookingInput = {
    name,
    email,
    phone,
    business_name: businessName,
    notes,
    call_type: callType,
    scheduled_at: start.toISOString(),
    duration_min: durationMin,
    timezone,
    prospect_id: prospectId,
  };

  const booking = await createBooking(input);
  const mail = await sendBookingEmails(booking).catch((err) => ({
    client: { ok: false, simulated: false, error: err instanceof Error ? err.message : "email error" },
    operator: { ok: false, simulated: false, error: err instanceof Error ? err.message : "email error" },
  }));

  return NextResponse.json(
    {
      success: true,
      booking,
      emails: {
        client: mail.client.ok || mail.client.simulated,
        operator: mail.operator.ok || mail.operator.simulated,
        simulated: mail.client.simulated || mail.operator.simulated,
        error: mail.client.error ?? mail.operator.error ?? null,
      },
    },
    { status: 201 },
  );
}

export async function GET(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const url = new URL(req.url);
  const status = String(url.searchParams.get("status") ?? "all");
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;

  const bookings = await listBookings({ status: status as never, from, to });

  // Attach the matching prospect so the admin call script renders with real
  // business intelligence (audit grade, ROI, recommended services).
  const service = createServiceClient();
  let prospects: Record<string, unknown>[] = [];
  if (service) {
    const emails = bookings.map((b) => b.email).filter(Boolean);
    const { data } = await service
      .from("prospects")
      .select("*")
      .in("email", emails.length ? emails : [""])
      .limit(500);
    prospects = data ?? [];
  }
  const byEmail = new Map<string, unknown>();
  for (const p of prospects) {
    const key = String(p.email ?? "").toLowerCase();
    if (key && !byEmail.has(key)) byEmail.set(key, p);
  }

  return NextResponse.json({
    bookings: bookings.map((b) => ({ ...b, prospect: byEmail.get(b.email.toLowerCase()) ?? null })),
  });
}