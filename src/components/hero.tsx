"use client";

import Link from "next/link";
import { ArrowRight, Play, Star, TrendingUp, Shield, Clock } from "lucide-react";

const stats = [
  { icon: Star, value: "311", label: "Reviews Managed" },
  { icon: TrendingUp, value: "96/100", label: "Avg. Brand Health" },
  { icon: Shield, value: "100%", label: "Satisfaction" },
  { icon: Clock, value: "4 mo", label: "Avg. Timeline" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-brand-950/30 to-ink-950" />
      <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/5 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-glow-500" />
            </span>
            <span className="text-[11px] font-medium tracking-wider text-glow-400 uppercase">
              Built for Local Business Owners
            </span>
          </div>

          <h1 className="font-sora text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Dominate Your
            <br />
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-glow-400 bg-clip-text text-transparent">
              Local Market
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-ink-400 sm:text-base">
            Stop guessing. Start dominating. Our AI-powered brand audits reveal
            exactly what&apos;s holding your business back and give you a
            battle-tested roadmap to crush local competitors.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/audit"
              className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-glow-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:from-brand-500 hover:to-glow-500"
            >
              Run Free AI Brand Audit
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="#demo"
              className="group inline-flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-800/50 px-6 py-3 text-sm font-semibold text-ink-200 transition-all hover:border-ink-600 hover:bg-ink-700/50"
            >
              <Play size={16} />
              Watch the Demo
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group rounded-xl border border-ink-800/60 bg-ink-900/50 p-4 text-center transition-all hover:border-brand-500/30 hover:bg-ink-900/80 sm:p-6"
            >
              <stat.icon className="mx-auto mb-2 h-5 w-5 text-brand-400" />
              <div className="font-sora text-xl font-bold text-white sm:text-2xl">
                {stat.value}
              </div>
              <div className="mt-0.5 text-[11px] text-ink-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
