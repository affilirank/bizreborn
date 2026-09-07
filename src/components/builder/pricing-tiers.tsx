"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, Crown } from "lucide-react";
import { SUBSCRIPTION_TIERS } from "@/data/services";
import { Container, SectionHeading } from "@/components/ui/section";
import type { SubscriptionTier } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function PricingTiers() {
  const order: SubscriptionTier[] = ["solo", "growth", "dominance"];

  return (
    <section id="pricing" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-80 w-[700px] -translate-x-1/2 rounded-full bg-brand-500/8 blur-[140px]" />
      </div>
      <Container className="relative">
        <SectionHeading
          eyebrow="Zero agency lock-in"
          title={
            <>
              Transparent Pricing.{" "}
              <span className="text-gradient-brand">No Hidden Retainers.</span>
            </>
          }
          description="Or pick a retainer tier and get the full machine managed for you — with a cancel-anytime, module-by-module menu."
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {order.map((t, i) => {
            const cfg = SUBSCRIPTION_TIERS[t];
            const featured = t === "growth";
            return (
              <motion.div
                key={t}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                className={cn("relative", featured && "lg:-translate-y-3")}
              >
                <div
                  className={cn(
                    "flex h-full flex-col rounded-3xl p-7",
                    featured
                      ? "border border-brand-400/50 bg-gradient-to-b from-brand-500/12 to-ink-850 shadow-[0_30px_80px_-30px_rgba(99,102,241,0.6)]"
                      : "card-obsidian",
                  )}
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
                      <Crown className="h-3.5 w-3.5" /> Most popular
                    </span>
                  )}
                  <h3 className="font-display text-lg font-bold text-white">
                    {cfg.name}
                  </h3>
                  <p className="mt-1 text-sm text-fog">{cfg.headline}</p>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-extrabold text-white">
                      {formatCurrency(cfg.monthly)}
                    </span>
                    <span className="text-sm text-fog">/month</span>
                  </div>
                  <ul className="mt-6 flex-1 space-y-3">
                    {cfg.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm text-mist">
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                            featured ? "bg-brand-500/20" : "bg-white/8",
                          )}
                        >
                          <Check
                            className={cn(
                              "h-3 w-3",
                              featured ? "text-brand-300" : "text-glow-400",
                            )}
                          />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/services?tier=${t}`}
                    className={cn(
                      "mt-7 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition",
                      featured
                        ? "bg-brand-500 text-white shadow-[0_8px_30px_-8px_rgba(99,102,241,0.8)] hover:bg-brand-400"
                        : "border border-white/15 text-mist hover:border-brand-400/60 hover:text-white",
                    )}
                  >
                    Start with {cfg.name} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
