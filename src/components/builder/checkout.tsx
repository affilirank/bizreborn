"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Lock,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/components/builder/cart-store";
import { SUBSCRIPTION_TIERS, SERVICE_MAP } from "@/data/services";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { createOrder } from "@/lib/data";
import type { SubscriptionTier } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "details" | "processing" | "success";

export function Checkout() {
  const { totals, selections, vertical, tier, setTier, monthlyBilling, setMonthlyBilling, acv, leadIncrease } =
    useCart();

  const [step, setStep] = React.useState<Step>("details");
  const [form, setForm] = React.useState({ businessName: "", email: "", phone: "" });
  const [error, setError] = React.useState("");
  const [orderId, setOrderId] = React.useState("");
  const [card, setCard] = React.useState({ number: "", name: "", expiry: "", cvc: "" });

  const enableMonthly = totals.monthly > 0;
  const grandTotal =
    totals.oneTime + (monthlyBilling ? totals.monthly + SUBSCRIPTION_TIERS[tier].monthly : 0);

  const formatCard = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, "$1 ");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      setError("Enter your business name and a valid email to receive the invoice.");
      return;
    }
    setError("");
    setStep("processing");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          email: form.email,
          services: selections,
          tier: monthlyBilling ? tier : undefined,
          monthlyBilling,
          vertical: vertical ?? "professional",
        }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Demo mode — simulate payment
      await new Promise((r) => setTimeout(r, 2200));
      const order = await createOrder({
        businessName: form.businessName,
        email: form.email,
        phone: form.phone,
        vertical: vertical ?? "professional",
        services: selections,
        monthly: monthlyBilling,
        acv,
        leadIncrease,
      });
      setOrderId(order.id);
      setStep("success");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Payment processing failed. Please try again.",
      );
      setStep("details");
    }
  };

  if (step === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-obsidian relative overflow-hidden rounded-3xl p-8 text-center sm:p-14"
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-glow-500/20 blur-[80px]" />
        <div className="relative flex flex-col items-center gap-5">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.2 }}
            className="flex h-20 w-20 items-center justify-center rounded-full border border-glow-500/40 bg-glow-500/15"
          >
            <CheckCircle2 className="h-10 w-10 text-glow-400" />
          </motion.span>
          <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Your Marketing Machine Is Officially Under Construction.
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-fog">
            Order <span className="font-mono font-bold text-brand-300">{orderId}</span>{" "}
            is confirmed. Your fulfillment team has been assigned — a strategist will
            email you within 24 hours with your kickoff checklist.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href="/dashboard">Track fulfillment →</a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="/services">Add more modules</a>
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (step === "processing") {
    return (
      <div className="card-obsidian flex flex-col items-center gap-6 rounded-3xl p-14 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-brand-400" />
        <div>
          <h3 className="font-display text-xl font-bold text-white">
            Securing your payment…
          </h3>
          <p className="mt-1 text-sm text-fog">
            Processing {formatCurrency(grandTotal)} with 256-bit encryption.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="checkout" className="grid scroll-mt-24 gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* Payment form */}
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="card-obsidian rounded-3xl p-6 sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-display text-xl font-bold text-white">
              <Lock className="h-5 w-5 text-brand-300" /> Step 4 — Secure Checkout
            </h3>
            <p className="mt-1 text-sm text-fog">
              One-click setup. Cancel any module anytime.
            </p>
          </div>
          <Badge variant="emerald">
            <ShieldCheck className="h-3.5 w-3.5" /> Stripe encrypted
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-fog">
              Business name
            </label>
            <input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="Ace Plumbing & Heating"
              className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-4 py-3 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-fog">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@business.com"
              className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-4 py-3 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-fog">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(512) 555-0148"
              className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-4 py-3 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-fog">
                Billing mode
              </label>
              {enableMonthly && (
                <span className="text-[11px] text-brand-300">
                  {formatCurrency(totals.monthly)}/mo in ongoing modules
                </span>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMonthlyBilling(false)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  !monthlyBilling
                    ? "border-brand-400/60 bg-brand-500/12"
                    : "border-white/10 hover:border-white/25",
                )}
              >
                <p className="text-sm font-semibold text-white">One-time build</p>
                <p className="text-xs text-fog">
                  Pay {formatCurrency(totals.oneTime)} now, no recurring fee.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMonthlyBilling(true)}
                disabled={!enableMonthly}
                className={cn(
                  "rounded-xl border p-3 text-left transition disabled:opacity-40",
                  monthlyBilling
                    ? "border-brand-400/60 bg-brand-500/12"
                    : "border-white/10 hover:border-white/25",
                )}
              >
                <p className="text-sm font-semibold text-white">Full retainer</p>
                <p className="text-xs text-fog">
                  {formatCurrency(totals.monthly)}/mo keeps everything running.
                </p>
              </button>
            </div>
          </div>

          {monthlyBilling && (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-fog">
                Retainer tier
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(SUBSCRIPTION_TIERS) as SubscriptionTier[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition",
                      tier === t
                        ? "border-brand-400/60 bg-brand-500/12"
                        : "border-white/10 hover:border-white/25",
                    )}
                  >
                    <p className="text-sm font-semibold text-white">
                      {SUBSCRIPTION_TIERS[t].name}
                    </p>
                    <p className="font-display text-base font-bold text-brand-300">
                      {formatCurrency(SUBSCRIPTION_TIERS[t].monthly)}/mo
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stripe-Elements-style card fields */}
          <div className="sm:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-brand-300" />
                <span className="text-xs font-semibold uppercase tracking-wider text-fog">
                  Card details
                </span>
                <span className="ml-auto flex items-center gap-2 text-[10px] text-mute">
                  <ShieldCheck className="h-3.5 w-3.5 text-glow-400" /> PCI-DSS compliant
                </span>
              </div>
              <div className="space-y-3">
                <input
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })}
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-white/10 bg-ink-900/80 px-4 py-3 font-mono text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    placeholder="Cardholder name"
                    className="w-full rounded-xl border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={card.expiry}
                      onChange={(e) =>
                        setCard({
                          ...card,
                          expiry: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4)
                            .replace(/(\d{2})(?=\d)/, "$1/"),
                        })
                      }
                      placeholder="MM/YY"
                      className="w-full rounded-xl border border-white/10 bg-ink-900/80 px-4 py-3 font-mono text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60"
                    />
                    <input
                      value={card.cvc}
                      onChange={(e) =>
                        setCard({
                          ...card,
                          cvc: e.target.value.replace(/\D/g, "").slice(0, 4),
                        })
                      }
                      placeholder="CVC"
                      className="w-full rounded-xl border border-white/10 bg-ink-900/80 px-4 py-3 font-mono text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="mt-6 w-full"
          leftIcon={<Lock className="h-4 w-4" />}
        >
          Pay {formatCurrency(grandTotal)} securely
        </Button>
        <p className="mt-3 text-center text-[11px] text-mute">
          Demo environment: any card number works. In production, payments run
          through Stripe Elements with 3D Secure.
        </p>
      </motion.form>

      {/* Order summary */}
      <div className="flex flex-col gap-4">
        <div className="card-obsidian rounded-3xl p-6">
          <h4 className="mb-4 font-display text-lg font-bold text-white">
            Order summary
          </h4>
          {selections.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-fog">
              No modules selected yet. Add services from the menu to build your order.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {selections.map((id) => {
                const s = SERVICE_MAP[id];
                if (!s) return null;
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-ink-850/60 px-3.5 py-2.5"
                  >
                    <span className="text-xs font-medium text-mist">
                      <span className="font-mono text-[10px] text-mute">{s.id}.</span>{" "}
                      {s.title}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-white">
                      {s.oneTime > 0 ? formatCurrency(s.oneTime) : `${formatCurrency(s.monthly)}/mo`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card-obsidian rounded-3xl p-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-fog">
              <span>One-time setup</span>
              <span className="font-semibold text-white">{formatCurrency(totals.oneTime)}</span>
            </div>
            <div className="flex justify-between text-fog">
              <span>Monthly retainer</span>
              <span className="font-semibold text-brand-300">{formatCurrency(totals.monthly)}</span>
            </div>
            {monthlyBilling && (
              <div className="flex justify-between text-fog">
                <span>{SUBSCRIPTION_TIERS[tier].name} tier</span>
                <span className="font-semibold text-white">
                  {formatCurrency(SUBSCRIPTION_TIERS[tier].monthly)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-white/10 pt-3">
              <span className="font-semibold text-white">
                {monthlyBilling ? "Due today" : "Total due today"}
              </span>
              <span className="font-display text-lg font-extrabold text-white">
                {formatCurrency(totals.oneTime)}
              </span>
            </div>
            {monthlyBilling && (
              <div className="flex justify-between">
                <span className="font-semibold text-white">Monthly after setup</span>
                <span className="font-display text-lg font-extrabold text-glow-400">
                  {formatCurrency(totals.monthly + SUBSCRIPTION_TIERS[tier].monthly)}
                </span>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-glow-500/20 bg-glow-500/8 px-4 py-3">
            <Sparkles className="h-4 w-4 shrink-0 text-glow-400" />
            <p className="text-xs leading-relaxed text-fog">
              Projected impact of this build:{" "}
              <span className="font-bold text-glow-400">
                {formatCurrency(totals.projectedRevenue)}/mo
              </span>{" "}
              at a {totals.roas}x projected ROAS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
