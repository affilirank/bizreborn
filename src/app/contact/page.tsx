"use client";

import type { Metadata } from "next";
import { useState } from "react";
import { Send, Mail, Phone, MapPin, Loader2, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    business: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate sending
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/20 via-ink-950 to-ink-950" />
        <div className="relative mx-auto flex max-w-lg flex-col items-center px-4 py-32 text-center">
          <CheckCircle size={48} className="mb-4 text-glow-400" />
          <h1 className="font-sora text-2xl font-bold text-white">
            Message Sent!
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            We&apos;ll get back to you within 24 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950/20 via-ink-950 to-ink-950" />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-sora text-3xl font-bold text-white sm:text-4xl">
            Contact Us
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Ready to dominate your local market? Tell us about your business and
            we&apos;ll build a custom strategy.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-8 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-start gap-3">
              <Mail size={18} className="mt-0.5 shrink-0 text-brand-400" />
              <div>
                <p className="text-xs font-medium text-white">Email</p>
                <p className="text-xs text-ink-400">hello@bizreborn.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone size={18} className="mt-0.5 shrink-0 text-brand-400" />
              <div>
                <p className="text-xs font-medium text-white">Phone</p>
                <p className="text-xs text-ink-400">772-290-1756</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-brand-400" />
              <div>
                <p className="text-xs font-medium text-white">Location</p>
                <p className="text-xs text-ink-400">Vero Beach, FL</p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 lg:col-span-3"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Your Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-white placeholder-ink-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-white placeholder-ink-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="tel"
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-white placeholder-ink-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
              />
              <input
                type="text"
                placeholder="Business Name"
                value={form.business}
                onChange={(e) => setForm({ ...form, business: e.target.value })}
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-white placeholder-ink-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
            <textarea
              placeholder="Tell us about your business and what you're looking for..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              rows={5}
              className="w-full resize-none rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-white placeholder-ink-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-glow-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:from-brand-500 hover:to-glow-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Send Message
                  <Send size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
