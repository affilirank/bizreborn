"use client";

import * as React from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Users,
  Video,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BOOKING, LEADGEN } from "@/lib/config";
import { cn } from "@/lib/utils";

interface Slot {
  start: string;
  end: string;
  timeLabel: string;
  dayKey: string;
  dayLabel: string;
  tz: string;
}

interface DayGroup {
  dayKey: string;
  dayLabel: string;
  slots: Slot[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:text-mute/50 focus:border-brand-400/60";

type Status = "idle" | "loading" | "submitting" | "done" | "error";

export function BookingWidget() {
  const [days, setDays] = React.useState<DayGroup[]>([]);
  const [status, setStatus] = React.useState<Status>("loading");
  const [tzLabel, setTzLabel] = React.useState<string>(BOOKING.timezone);
  const [selectedDay, setSelectedDay] = React.useState<string>("");
  const [selectedSlot, setSelectedSlot] = React.useState<string>("");
  const [callType, setCallType] = React.useState<string>(BOOKING.callTypes[0]);

  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    notes: "",
  });
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState<{ name: string; when: string } | null>(null);

  const load = React.useCallback(async () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || BOOKING.timezone;
      const res = await fetch(`/api/bookings/slots?days=${BOOKING.daysAhead}&tz=${encodeURIComponent(tz)}`);
      if (!res.ok) throw new Error("Failed to load availability");
      const data = await res.json();
      const grouped: DayGroup[] = data.daysGrouped ?? [];
      setDays(grouped);
      if (grouped.length > 0) {
        setSelectedDay((prev) => (grouped.some((g) => g.dayKey === prev) ? prev : grouped[0].dayKey));
      }
      setTzLabel(data.timezone ?? tz);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load available times.");
    } finally {
      setStatus("idle");
    }
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeDay = days.find((d) => d.dayKey === selectedDay);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedSlot) {
      setError("Pick a time from the calendar first.");
      return;
    }
    if (!form.name.trim()) return setError("Your name is required.");
    if (!EMAIL_RE.test(form.email.trim())) return setError("A valid email is required so we can confirm your slot.");
    if (!form.businessName.trim()) return setError("Your business name is required.");

    setStatus("submitting");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          business_name: form.businessName.trim(),
          notes: form.notes.trim() || null,
          call_type: callType,
          scheduled_at: selectedSlot,
          duration_min: BOOKING.durationMinutes,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || BOOKING.timezone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not book that time — it may have just been taken. Pick another.");
        setStatus("idle");
        return;
      }
      const when = new Intl.DateTimeFormat("en-US", {
        timeZone: tzLabel,
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(selectedSlot));
      setDone({ name: form.name.trim(), when });
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "loading" && days.length === 0) {
    return (
      <div className="card-obsidian mx-auto flex max-w-xl items-center justify-center gap-3 rounded-3xl p-12 text-sm text-fog">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking the calendar…
      </div>
    );
  }

  if (status === "done" && done) {
    return (
      <div className="card-obsidian mx-auto max-w-xl rounded-3xl p-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-glow-500/15 text-glow-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white">
          You&apos;re booked, {done.name.split(" ")[0] || "friend"}!
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-fog">
          Your {callType} is confirmed for <span className="font-semibold text-white">{done.when}</span>
          {" "}({BOOKING.durationMinutes} minutes). A confirmation email is on its way, and we&apos;ll call
          the number you gave us.
        </p>
        <p className="mx-auto mt-4 max-w-md text-xs text-mute">
          Heads up: during the call we may offer a follow-up Microsoft Teams session where we share our
          screen and demo the services live against your business — totally optional.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card-obsidian mx-auto max-w-5xl rounded-3xl p-6 sm:p-10">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        {/* Left — pick a slot */}
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <CalendarCheck className="h-5 w-5 text-brand-300" /> Pick a time
            </h2>
            <Badge variant="emerald">
              <Clock className="h-3 w-3" /> All times {tzLabel}
            </Badge>
          </div>

          {days.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-fog">
              No open slots right now — drop your details in and email us at{" "}
              <a href={`mailto:${LEADGEN.email}`} className="text-brand-300 underline">
                {LEADGEN.email}
              </a>{" "}
              and we&apos;ll find a time.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {days.map((d) => (
                  <button
                    key={d.dayKey}
                    type="button"
                    onClick={() => {
                      setSelectedDay(d.dayKey);
                      setSelectedSlot("");
                    }}
                    className={cn(
                      "rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                      selectedDay === d.dayKey
                        ? "border-brand-400/60 bg-brand-500/15 text-white"
                        : "border-white/10 text-fog hover:border-white/25 hover:text-white",
                    )}
                  >
                    {d.dayLabel}
                    <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-mute">
                      {d.slots.length}
                    </span>
                  </button>
                ))}
              </div>

              {activeDay && (
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {activeDay.slots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => setSelectedSlot(s.start)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-sm font-semibold transition",
                        selectedSlot === s.start
                          ? "border-glow-400/70 bg-glow-500/15 text-glow-300"
                          : "border-white/10 bg-ink-900/60 text-mist hover:border-white/25 hover:text-white",
                      )}
                    >
                      {s.timeLabel}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right — details */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
            <Users className="h-5 w-5 text-brand-300" /> Your details
          </h2>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-mute">Call type</label>
              <select
                value={callType}
                onChange={(e) => setCallType(e.target.value)}
                className={inputCls}
              >
                {BOOKING.callTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-mute">Full name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Cooper"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-mute">Business name *</label>
              <input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="Cooper Roofing LLC"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-mute">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@cooperroofing.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-mute">Phone (for the call)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 000-0000"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-mute">Anything we should know?</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Goals, competitors, things you've tried…"
                className={cn(inputCls, "resize-none")}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            loading={status === "submitting"}
            disabled={!selectedSlot}
            className="mt-5 w-full"
          >
            <Video className="h-4 w-4" /> Confirm my {callType}
          </Button>
          <p className="mt-3 text-center text-[11px] text-mute">
            Free. No obligations. Reschedule or cancel anytime by replying to the confirmation email.
          </p>
        </div>
      </div>
    </form>
  );
}