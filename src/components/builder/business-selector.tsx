"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { BUSINESS_VERTICALS } from "@/data/services";
import { useCart } from "@/components/builder/cart-store";
import { cn } from "@/lib/utils";

export function BusinessSelector() {
  const { vertical, setVertical, selections, clear } = useCart();

  return (
    <div className="card-obsidian rounded-3xl p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold text-white">
            Step 1 — What do you run?
          </h3>
          <p className="mt-1 text-sm text-fog">
            Pick your vertical. We&apos;ll highlight the highest-impact modules for
            your industry.
          </p>
        </div>
        {selections.length > 0 ? (
          <button
            onClick={clear}
            className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-fog transition hover:border-white/25 hover:text-white"
          >
            Clear ({selections.length})
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BUSINESS_VERTICALS.map((v, i) => {
          const active = vertical === v.id;
          return (
            <motion.button
              key={v.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              onClick={() => setVertical(active ? null : v.id)}
              className={cn(
                "group relative flex cursor-pointer flex-col gap-2.5 rounded-2xl border p-5 text-left transition-all duration-300",
                active
                  ? "border-brand-400/60 bg-brand-500/12 ring-glow"
                  : "border-white/8 bg-ink-850/60 hover:-translate-y-0.5 hover:border-brand-500/40 hover:bg-ink-800",
              )}
            >
              {active && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="text-3xl">{v.emoji}</span>
              <span>
                <span className="font-display text-base font-bold text-white">
                  {v.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-fog">
                  {v.blurb}
                </span>
              </span>
              <span
                className={cn(
                  "mt-auto text-xs font-semibold transition-colors",
                  active ? "text-brand-300" : "text-mute group-hover:text-brand-300",
                )}
              >
                {v.recommended.length} pillars recommended
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
