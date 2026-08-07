"use client";

import { Shield, Star, TrendingUp, BarChart3, Search, Globe } from "lucide-react";

const pillars = [
  {
    icon: Shield,
    title: "Reputation Shield",
    desc: "Monitor, manage, and multiply your online reputation across every platform.",
    number: "01",
  },
  {
    icon: Star,
    title: "Review Growth",
    desc: "Automated review generation campaigns that build social proof on autopilot.",
    number: "02",
  },
  {
    icon: TrendingUp,
    title: "Local Dominance",
    desc: "Command the #1 spot in Google Maps and local pack results.",
    number: "03",
  },
  {
    icon: BarChart3,
    title: "Brand Analytics",
    desc: "Real-time dashboards tracking every metric that matters to your bottom line.",
    number: "04",
  },
  {
    icon: Search,
    title: "Content Authority",
    desc: "SEO-optimized content that positions you as the go-to expert in your niche.",
    number: "05",
  },
  {
    icon: Globe,
    title: "Conversion Web",
    desc: "Sites, funnels, and landing pages engineered for maximum conversion.",
    number: "06",
  },
];

export default function PillarsPreview() {
  return (
    <section className="relative border-t border-ink-800/60 bg-ink-900/30">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sora text-2xl font-bold text-white sm:text-3xl">
            The Service Pillars
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Six foundational pillars that form the backbone of every client
            engagement.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="group relative overflow-hidden rounded-xl border border-ink-800/60 bg-ink-900/50 p-6 transition-all hover:border-brand-500/30"
            >
              <div className="absolute right-4 top-4 font-sora text-3xl font-bold text-ink-800/40">
                {pillar.number}
              </div>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                <pillar.icon size={20} />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-white">
                {pillar.title}
              </h3>
              <p className="text-xs leading-relaxed text-ink-400">
                {pillar.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
