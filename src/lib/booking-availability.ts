import { BOOKING } from "@/lib/config";
import type { BookingRow } from "@/lib/booking-store";

export interface BookingSlot {
  /** UTC ISO string. */
  start: string;
  /** UTC ISO string. */
  end: string;
  /** Local display time, e.g. "9:00 AM". */
  timeLabel: string;
  /** Local day key, e.g. "2026-09-15". */
  dayKey: string;
  /** e.g. "Tue, Sep 15". */
  dayLabel: string;
  tz: string;
}

/**
 * Number of minutes the business timezone is east of UTC at the given instant
 * (e.g. America/New_York summer → -240). Uses wall-clock arithmetic against
 * UTC so DST is handled implicitly.
 */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const num = (type: string): number => {
    const p = parts.find((x) => x.type === type);
    return p ? Number(p.value) : 0;
  };
  let hour = num("hour");
  if (hour === 24) hour = 0;
  const asUTC = Date.UTC(num("year"), num("month") - 1, num("day"), hour, num("minute"), num("second"));
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** Convert a wall-clock time in `timeZone` to a UTC Date. */
export function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = tzOffsetMinutes(wall, timeZone);
  return new Date(wall.getTime() - offset * 60000);
}

/** Formats a UTC instant as "2026-09-15" in the business timezone. */
export function dayKeyUtc(date: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const num = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${num("year")}-${num("month")}-${num("day")}`;
}

function dayLabelUtc(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function timeLabelUtc(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function isSlotOpen(
  start: Date,
  end: Date,
  bookings: BookingRow[],
): boolean {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return !bookings.some((b) => {
    if (b.status === "cancelled") return false;
    const bStart = new Date(b.scheduled_at).getTime();
    const bEnd = bStart + (b.duration_min || 60) * 60000;
    return startMs < bEnd && endMs > bStart;
  });
}

export interface SlotQuery {
  days?: number;
  tz?: string;
}

/**
 * Generates bookable slots for the next `days` calendar days (business days
 * only, within the configured working window, honoring lead time and existing
 * bookings). Each slot starts on a full duration boundary.
 */
export function generateSlots(bookings: BookingRow[], query: SlotQuery = {}): BookingSlot[] {
  const tz = query.tz || BOOKING.timezone;
  const days = Math.max(1, Math.min(30, Math.floor(query.days ?? BOOKING.daysAhead)));
  const { startHour, endHour, durationMinutes, workingDays } = BOOKING;

  const minStart = Date.now() + BOOKING.minLeadHours * 3600000;
  const slots: BookingSlot[] = [];
  const today = new Date();

  for (let d = 0; d <= days; d++) {
    const day = new Date(today);
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() + d);

    // Determine which calendar day this instant falls on in the business zone,
    // then read the weekday from that calendar date (dates are timezone-free).
    const dayKey = dayKeyUtc(day, tz);
    const [y, m, dd] = dayKey.split("-").map(Number);
    const weekdayNum = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();

    if (!(workingDays as readonly number[]).includes(weekdayNum)) continue;

    for (let h = startHour; h + durationMinutes / 60 <= endHour; h++) {
      for (const minute of [0]) {
        const start = zonedTimeToUtc(tz, y, m, dd, h, minute);
        const end = new Date(start.getTime() + durationMinutes * 60000);
        if (start.getTime() < minStart) continue;
        if (!isSlotOpen(start, end, bookings)) continue;
        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          timeLabel: timeLabelUtc(start, tz),
          dayKey: dayKeyUtc(start, tz),
          dayLabel: dayLabelUtc(start, tz),
          tz,
        });
      }
    }
  }

  return slots;
}

/** Groups slots by calendar day for the picker UI. */
export function groupSlotsByDay(slots: BookingSlot[]): Array<{ dayKey: string; dayLabel: string; slots: BookingSlot[] }> {
  const map = new Map<string, { dayKey: string; dayLabel: string; slots: BookingSlot[] }>();
  for (const s of slots) {
    const bucket = map.get(s.dayKey) ?? { dayKey: s.dayKey, dayLabel: s.dayLabel, slots: [] };
    bucket.slots.push(s);
    map.set(s.dayKey, bucket);
  }
  return [...map.values()];
}