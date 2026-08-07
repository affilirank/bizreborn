"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-t border-ink-800/60 bg-ink-950">
      <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 via-transparent to-glow-500/5" />
      <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-brand-500/5 blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-glow-500/20 shadow-lg shadow-brand-500/10">
              <Zap size={28} className="text-brand-400" />
            </div>
          </div>

          <h2 className="font-sora text-2xl font-bold leading-[1.15] text-white sm:text-3xl lg:text-4xl">
            Your Competitor Is 60 Seconds Away
            <br />
            <span className="bg-gradient-to-r from-brand-300 to-glow-400 bg-clip-text text-transparent">
              From Doing This First
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-400">
            While you&apos;re reading this, a competitor is about to discover
            exactly where their brand is leaking customers. Don&apos;t let them
            get there first.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/audit"
              className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-glow-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:from-brand-500 hover:to-glow-500"
            >
              Run Free AI Brand Audit
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-800/50 px-7 py-3.5 text-sm font-semibold text-ink-200 transition-all hover:border-ink-600 hover:bg-ink-700/50"
            >
              Talk to Our Team
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
