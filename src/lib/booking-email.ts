import { renderProfessionalEmailHtml } from "@/lib/email-template";
import type { BookingRow } from "@/lib/booking-store";
import { BOOKING } from "@/lib/config";

const FROM = () => process.env.EMAIL_FROM || `Biz Reborn Marketing <hello@bizreborn.com>`;
const REPLY_TO = () => process.env.REPLY_TO_EMAIL || "bizrebornmarketing@gmail.com";
const OPERATOR = () => process.env.REPLY_TO_EMAIL || "bizrebornmarketing@gmail.com";

export interface EmailResult {
  ok: boolean;
  simulated: boolean;
  error?: string;
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, simulated: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: FROM(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        reply_to: REPLY_TO(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, simulated: false };
    return { ok: false, simulated: false, error: data?.message ?? "Resend failed." };
  } catch (err) {
    return { ok: false, simulated: false, error: err instanceof Error ? err.message : "Resend exception" };
  }
}

function formatCallTime(iso: string, tz?: string | null): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz || BOOKING.timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

/** Client-facing confirmation for a newly scheduled call. */
export function confirmationEmail(booking: BookingRow): { subject: string; html: string } {
  const when = formatCallTime(booking.scheduled_at, booking.timezone);
  const duration = booking.duration_min || 60;
  const subject = `Your ${booking.call_type} is booked — ${booking.business_name} × Biz Reborn`;
  const body = `Hi ${booking.name},

Great — your ${booking.call_type} is confirmed:

  When: ${when}
  Duration: ${duration} minutes
  With: Daniel Brown, Lead Growth Specialist — Biz Reborn Marketing

We'll cover the results of your local growth audit, the gaps we found for ${booking.business_name}, and the exact services we recommend — plus a quick live look at how they run.

A short heads-up: we may offer to set a follow-up Microsoft Teams call where we share our screen and demo the services live against your business. That's completely optional — but it's the fastest way for you to see the results before deciding anything.

Need to reschedule or cancel? Just reply to this email and we'll take care of it.

Talk soon,
Daniel Brown
Biz Reborn Marketing`;
  return {
    subject,
    html: renderProfessionalEmailHtml({ prospect: null, subject, body, stepNumber: 1 }),
  };
}

/** Operator notification so the call never slips through unseen. */
export function operatorNotification(booking: BookingRow): { subject: string; html: string } {
  const when = formatCallTime(booking.scheduled_at, booking.timezone);
  const subject = `New booking: ${booking.name} · ${booking.business_name} — ${when}`;
  const body = [
    `A new ${booking.call_type} was scheduled.`,
    ``,
    `  Name: ${booking.name}`,
    `  Business: ${booking.business_name || "—"}`,
    `  Email: ${booking.email}`,
    `  Phone: ${booking.phone || "—"}`,
    `  When: ${when}`,
    `  Duration: ${booking.duration_min || 60} minutes`,
    `  Notes: ${booking.notes || "n/a"}`,
    ``,
    `Manage it here: https://www.bizreborn.com/admin/bookings`,
  ].join("\n");
  return { subject, html: renderProfessionalEmailHtml({ prospect: null, subject, body, stepNumber: 1 }) };
}

/** Sends confirmation + operator notification. Never throws (best-effort). */
export async function sendBookingEmails(booking: BookingRow): Promise<{ client: EmailResult; operator: EmailResult }> {
  const client = confirmationEmail(booking);
  const operator = operatorNotification(booking);
  const [c, o] = await Promise.all([
    sendEmail({ to: booking.email, subject: client.subject, html: client.html }),
    sendEmail({ to: OPERATOR(), subject: operator.subject, html: operator.html }),
  ]);
  return { client: c, operator: o };
}

/** Notifies the client when their booking is cancelled by the operator. */
export async function sendCancellationEmail(booking: BookingRow): Promise<EmailResult> {
  const when = formatCallTime(booking.scheduled_at, booking.timezone);
  const subject = `Update: your ${booking.call_type} was cancelled`;
  const body = `Hi ${booking.name},

Your ${booking.call_type} on ${when} has been cancelled. No need to do anything — if a new time works better for you, just reply to this email and we'll get you back on the calendar.

Sorry for any inconvenience,
Daniel Brown
Biz Reborn Marketing`;
  return sendEmail({
    to: booking.email,
    subject,
    html: renderProfessionalEmailHtml({ prospect: null, subject, body, stepNumber: 1 }),
  });
}

/** Notifies the client when the operator reschedules their call. */
export async function sendRescheduleEmail(booking: BookingRow): Promise<EmailResult> {
  const when = formatCallTime(booking.scheduled_at, booking.timezone);
  const subject = `Updated time: your ${booking.call_type} is now ${when}`;
  const body = `Hi ${booking.name},

Quick update — your ${booking.call_type} moved. New time:

  When: ${when}

This replaces the previous time. If it no longer works, just reply and we'll find something better.

Talk soon,
Daniel Brown
Biz Reborn Marketing`;
  return sendEmail({
    to: booking.email,
    subject,
    html: renderProfessionalEmailHtml({ prospect: null, subject, body, stepNumber: 1 }),
  });
}