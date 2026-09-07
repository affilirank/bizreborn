"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, BarChart3 } from "lucide-react";
import { Container } from "@/components/ui/section";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/12 blur-[140px]" />
        <div className="grid-lines absolute inset-0" />
      </div>
      <Container className="relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="card-obsidian relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] p-10 text-center sm:p-16"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-glow-400/70 to-transparent" />
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-glow-500/30 bg-glow-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-glow-400">
            <Zap className="h-3.5 w-3.5" /> Your move
          </span>
          <h2 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            Your Competitor Is 60 Seconds Away From{" "}
            <span className="text-gradient-brand">Doing This First.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-fog sm:text-lg">
            Run the free AI audit. See your Brand Health Score. Then pick your
            modules and start dominating your local market — all before your
            next coffee.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/audit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-8 py-4 text-base font-semibold text-white shadow-[0_12px_40px_-8px_rgba(99,102,241,0.9)] transition hover:bg-brand-400 sm:w-auto"
            >
              Run Free AI Brand Audit <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/services"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-8 py-4 text-base font-semibold text-mist transition hover:border-brand-400/60 hover:text-white sm:w-auto"
            >
              Browse the Service Menu
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-mute">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-glow-400" /> No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-brand-300" /> 60-second scan
            </span>
            <span className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-amber-300" /> No agency lock-in
            </span>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
