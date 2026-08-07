"use client";

import { Star, TrendingUp, Shield, Clock, Zap, Users } from "lucide-react";

const stats = [
  { icon: Star, value: "311", label: "Reviews Managed" },
  { icon: TrendingUp, value: "96/100", label: "Avg. Brand Health" },
  { icon: Shield, value: "100%", label: "Satisfaction" },
  { icon: Clock, value: "4 mo", label: "Avg. Timeline" },
  { icon: Zap, value: "15+", label: "Industries Served" },
  { icon: Users, value: "50+", label: "Active Clients" },
];

export default function Stats() {
  return (
    <section className="relative border-t border-ink-800/60 bg-ink-900/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sora text-2xl font-bold text-white sm:text-3xl">
            By the Numbers
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Results speak louder than promises.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group rounded-xl border border-ink-800/60 bg-ink-900/50 p-5 text-center transition-all hover:border-brand-500/30"
            >
              <div className="mb-2 flex justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                  <stat.icon size={17} />
                </div>
              </div>
              <div className="font-sora text-xl font-bold text-white">
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
