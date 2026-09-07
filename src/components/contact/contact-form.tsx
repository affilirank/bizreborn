"use client";

import * as React from "react";
import {
  Send,
  CheckCircle2,
  Mail,
  Phone,
  Clock,
  ShieldCheck,
  MailCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createLead } from "@/lib/data";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "sending" | "done" | "error";

export function ContactForm() {
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    businessName: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState("");
  const [mailerlite, setMailerlite] = React.useState<null | boolean>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      setError("Name and message are required.");
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError("A valid email address is required so we can reply.");
      return;
    }
    setError("");
    setStatus("sending");

    await createLead({
      name: form.name.trim(),
      businessName: form.businessName.trim() || form.name.trim(),
      phone: "",
      email: form.email.trim(),
      source: "contact",
      message: form.message.trim(),
    });

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          businessName: form.businessName.trim(),
          phone: "",
          email: form.email.trim(),
          source: "contact",
          message: form.message.trim(),
          subject: form.subject.trim(),
        }),
      });
      const data = await res.json();
      setMailerlite(data?.mode === "live" ? true : null);
      setStatus("done");
    } catch {
      setStatus("done");
    }
  };

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-ink-800/70 px-4 py-3 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20";

  if (status === "done") {
    return (
      <div className="card-obsidian flex flex-col items-center gap-4 rounded-3xl p-10 text-center sm:p-14">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-glow-500/15">
          <CheckCircle2 className="h-8 w-8 text-glow-400" />
        </div>
        <h3 className="font-display text-2xl font-bold text-white">
          Message received.
        </h3>
        <p className="max-w-md text-sm text-fog">
          A growth strategist will reply to{" "}
          <span className="font-semibold text-white">{form.email}</span> within
          one business day.
        </p>
        {mailerlite && (
          <p className="flex items-center gap-2 rounded-full border border-glow-500/30 bg-glow-500/10 px-4 py-1.5 text-xs text-glow-300">
            <MailCheck className="h-4 w-4" /> You&apos;re subscribed — watch for
            your welcome sequence.
          </p>
        )}
        <Button variant="ghost" size="md" onClick={() => setStatus("idle")}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="card-obsidian rounded-3xl p-6 sm:p-10"
    >
      <div className="mb-8">
        <Badge variant="brand">
          <Mail className="h-3.5 w-3.5" /> Contact Us
        </Badge>
        <h3 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
          Tell us about your business
        </h3>
        <p className="mt-2 text-sm text-fog">
          Email is required — a real strategist replies within one business day.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-fog">
            Your Name *
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Alex Carter"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fog">
            Email Address * <span className="text-brand-300">(required)</span>
          </label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@business.com"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-fog">
            Business Name
          </label>
          <input
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            placeholder="e.g. Ace Roofing Co."
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-fog">
            Subject
          </label>
          <select
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className={inputCls}
          >
            <option value="" className="bg-ink-800">
              General inquiry
            </option>
            <option value="audit" className="bg-ink-800">
              My audit report
            </option>
            <option value="sales" className="bg-ink-800">
              Ready to buy / pricing
            </option>
            <option value="client" className="bg-ink-800">
              Existing client support
            </option>
            <option value="partnership" className="bg-ink-800">
              Partnership / white-label
            </option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-fog">
            Message *
          </label>
          <textarea
            required
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Tell us what you're trying to grow and what's been holding you back…"
            className={inputCls}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-rose-300">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-mute">
          We reply fast and never share your info.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={status === "sending"}
          rightIcon={<Send className="h-4 w-4" />}
        >
          {status === "sending" ? "Sending…" : "Send Message"}
        </Button>
      </div>
    </form>
  );
}

const PERKS = [
  { icon: Clock, title: "1-day response", body: "A strategist, not a bot, replies within one business day." },
  { icon: Phone, title: "Prefer a call?", body: "Mention it in your message and we'll send availability." },
  { icon: ShieldCheck, title: "No spam, ever", body: "Your details stay private. Unsubscribe anytime." },
];

export function ContactPerks() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {PERKS.map((p) => (
        <div key={p.title} className="card-obsidian flex flex-col gap-2 rounded-2xl p-5">
          <p.icon className="h-5 w-5 text-brand-300" />
          <p className="text-sm font-semibold text-white">{p.title}</p>
          <p className="text-xs text-fog">{p.body}</p>
        </div>
      ))}
    </div>
  );
}
