"use client";

import {
  Search,
  MessageSquare,
  BarChart3,
  Globe,
  Megaphone,
  Palette,
} from "lucide-react";

const engines = [
  {
    icon: Search,
    title: "SEO & Local Search",
    desc: "Dominate Google Maps and organic search in your service area.",
    color: "from-brand-500/20 to-brand-600/10",
    border: "border-brand-500/20",
    iconColor: "text-brand-400",
  },
  {
    icon: MessageSquare,
    title: "Reputation Management",
    desc: "Automated review generation, monitoring, and response systems.",
    color: "from-glow-500/20 to-glow-600/10",
    border: "border-glow-500/20",
    iconColor: "text-glow-400",
  },
  {
    icon: BarChart3,
    title: "Brand Audits & Analytics",
    desc: "Deep AI-powered audits that uncover every blind spot in your brand.",
    color: "from-violet-500/20 to-violet-600/10",
    border: "border-violet-500/20",
    iconColor: "text-violet-400",
  },
  {
    icon: Globe,
    title: "Website & Conversion",
    desc: "High-performance sites built to turn visitors into paying customers.",
    color: "from-cyan-500/20 to-cyan-600/10",
    border: "border-cyan-500/20",
    iconColor: "text-cyan-400",
  },
  {
    icon: Megaphone,
    title: "Paid Ads",
    desc: "Targeted campaigns that maximize ROI across Google and social.",
    color: "from-amber-500/20 to-amber-600/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: Palette,
    title: "Social Media",
    desc: "Content strategies that build authority and drive engagement.",
    color: "from-rose-500/20 to-rose-600/10",
    border: "border-rose-500/20",
    iconColor: "text-rose-400",
  },
];

export default function Engines() {
  return (
    <section className="relative border-t border-ink-800/60 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sora text-2xl font-bold text-white sm:text-3xl">
            Our Service Engines
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Six integrated engines that work together to dominate your local
            market.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {engines.map((engine) => (
            <div
              key={engine.title}
              className={`group rounded-xl border ${engine.border} ${engine.color} p-6 transition-all hover:scale-[1.02]`}
            >
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${engine.iconColor} bg-ink-800/50`}
              >
                <engine.icon size={20} />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-white">
                {engine.title}
              </h3>
              <p className="text-xs leading-relaxed text-ink-400">
                {engine.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
