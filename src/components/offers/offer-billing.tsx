"use client";

import * as React from "react";
import { BadgePercent, ArrowRight, Loader2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SERVICE_MAP } from "@/data/services";
import type { Offer } from "@/lib/types";
import { cn } from "@/lib/utils";

const TERMS = [6, 12, 24] as const;

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * Client-side term chooser for a recurring retainer proposal. Each commitment
 * term (6/12/24 months) carries its own discounted monthly rate; choosing one
 * spins up a fresh Stripe subscription checkout (setup + discounted retainer).
 */
export function OfferBilling({ offer }: { offer: Offer }) {
  const [busy, setBusy] = React.useState<number | null>(null);
  const [error, setError] = React.useState("");

  const setupTotal = offer.services
    .map((id) => SERVICE_MAP[id])
    .filter(Boolean)
    .reduce((s, x) => s + x.oneTime, 0);
  const regularMonthly = offer.monthlyListPrice;

  const pay = async (term: number) => {
    setBusy(term);
    setError("");
    try {
      const res = await fetch(`/api/offers/${offer.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkout", term }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data?.error ?? "Could not open checkout.");
      }
      window.location.href = data.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open checkout.");
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-mute">
            Monthly retainer
          </p>
          <p className="mt-1 text-2xl font-bold text-mute line-through">
            {money(regularMonthly)}/mo
          </p>
        </div>
        <Badge variant="emerald" className="px-3 py-1.5">
          <Zap className="h-3.5 w-3.5" /> Recurring · choose your commitment
        </Badge>
      </div>

      {setupTotal > 0 && (
        <p className="mt-3 text-xs text-fog">
          One-time initiation/setup:{" "}
          <span className="font-semibold text-white">{money(setupTotal)}</span>{" "}
          due at signup with your first month. No long-term lock-in — discount
          pricing for committing.
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {TERMS.map((term) => {
          const rate = offer.monthlyTermPrices[term] ?? regularMonthly;
          const savePct =
            regularMonthly > rate
              ? Math.round(((regularMonthly - rate) / regularMonthly) * 100)
              : 0;
          const highlighted = term === 12;
          return (
            <div
              key={term}
              className={cn(
                "flex flex-col rounded-2xl border p-5 transition",
                highlighted
                  ? "border-brand-400/50 bg-brand-500/10"
                  : "border-white/10 bg-ink-900/60",
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fog">
                {term}-month plan
              </p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "font-display text-2xl font-extrabold",
                    highlighted ? "text-glow-400" : "text-white",
                  )}
                >
                  {money(rate)}
                </span>
                <span className="text-[11px] text-mute">/mo</span>
              </div>
              {savePct > 0 ? (
                <p className="mt-1 text-[11px] text-mute">
                  <span className="line-through">{money(regularMonthly)}/mo</span>{" "}
                  · <span className="inline-flex items-center gap-0.5 font-semibold text-glow-400"><BadgePercent className="h-3 w-3" /> save {savePct}%</span>
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-mute">list rate</p>
              )}
              <p className="mt-2 text-[11px] text-mute">
                {money(setupTotal + rate)} first month incl. setup
              </p>
              {highlighted && (
                <Badge variant="brand" className="mt-2 w-fit">
                  Most popular
                </Badge>
              )}
              <button
                onClick={() => void pay(term)}
                disabled={busy !== null}
                className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
              >
                {busy === term ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                Choose {term}-month &amp; pay
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}