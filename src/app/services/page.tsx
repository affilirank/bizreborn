import type { Metadata } from "next";
import {
  Shield,
  Star,
  TrendingUp,
  BarChart3,
  Search,
  Globe,
  ArrowRight,
  Check,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Service Menu — Biz Reborn Marketing",
  description:
    "Explore our full range of AI-driven marketing services: brand audits, reputation management, SEO, social media, paid ads, and web design.",
};

const services = [
  {
    icon: Shield,
    title: "Reputation Shield",
    subtitle: "Online Reputation Management",
    desc: "Comprehensive reputation monitoring, review generation, and response automation. We protect and grow your brand's credibility across every platform.",
    features: [
      "Automated review generation campaigns",
      "Multi-platform monitoring (Google, Yelp, Facebook)",
      "Smart response templates + AI drafting",
      "Reputation score tracking dashboard",
      "Competitive reputation analysis",
    ],
    price: "$497/mo",
    popular: true,
  },
  {
    icon: Star,
    title: "Review Growth",
    subtitle: "Review Generation System",
    desc: "Turn every happy customer into a 5-star review with our automated system. No more awkwardly asking in person.",
    features: [
      "QR-code + SMS review campaigns",
      "Auto-follow-up sequences",
      "Review funnel optimization",
      "Negative review alerts",
      "Monthly review growth reports",
    ],
    price: "$297/mo",
    popular: false,
  },
  {
    icon: TrendingUp,
    title: "Local Dominance",
    subtitle: "Local SEO & Maps Optimization",
    desc: "Dominate Google Maps and local search results. We optimize your GBP, build local citations, and earn authoritative backlinks.",
    features: [
      "Google Business Profile optimization",
      "Local citation building & cleanup",
      "Maps rank tracking & reporting",
      "Local link earning campaigns",
      "Service-area page development",
    ],
    price: "$697/mo",
    popular: true,
  },
  {
    icon: BarChart3,
    title: "Brand Analytics",
    subtitle: "Audits & Performance Tracking",
    desc: "Deep analytics and reporting that shows you exactly where your brand stands and what needs to improve.",
    features: [
      "Monthly brand health audits",
      "Competitor benchmarking",
      "Custom KPI dashboards",
      "Conversion funnel analysis",
      "ROI attribution reporting",
    ],
    price: "$397/mo",
    popular: false,
  },
  {
    icon: Search,
    title: "Content Authority",
    subtitle: "SEO Content & Blog Strategy",
    desc: "Authority-building content that ranks. We create pillar pages, service guides, and local content that positions you as the expert.",
    features: [
      "Keyword research & strategy",
      "Pillar page & cluster content",
      "Weekly blog publishing",
      "Local landing pages",
      "Content performance tracking",
    ],
    price: "$597/mo",
    popular: false,
  },
  {
    icon: Globe,
    title: "Conversion Web",
    subtitle: "Website Design & Optimization",
    desc: "High-performance websites built to convert. Fast, mobile-optimized, and designed to turn visitors into leads.",
    features: [
      "Custom web design & development",
      "Conversion rate optimization",
      "Speed & performance tuning",
      "Lead capture system integration",
      "Analytics & heatmap setup",
    ],
    price: "$997/mo",
    popular: true,
  },
];

export default function ServicesPage() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950/20 via-ink-950 to-ink-950" />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-sora text-3xl font-bold text-white sm:text-4xl">
            Service Menu
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Six integrated services designed to work together and dominate your
            local market. Pick the ones you need, or let us build a custom
            stack.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative flex flex-col rounded-xl border border-ink-800/60 bg-ink-900/50 p-6 transition-all hover:border-brand-500/30"
            >
              {service.popular && (
                <div className="absolute -top-2.5 left-4 inline-flex items-center rounded-full bg-gradient-to-r from-brand-600 to-glow-600 px-3 py-0.5 text-[10px] font-semibold text-white">
                  Popular
                </div>
              )}

              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                <service.icon size={20} />
              </div>

              <h3 className="font-sora text-base font-bold text-white">
                {service.title}
              </h3>
              <p className="mt-0.5 text-xs text-ink-500">{service.subtitle}</p>
              <p className="mt-3 text-xs leading-relaxed text-ink-400">
                {service.desc}
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {service.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={14} className="mt-0.5 shrink-0 text-glow-400" />
                    <span className="text-xs text-ink-400">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-ink-800/40 pt-4">
                <div className="font-sora text-xl font-bold text-white">
                  {service.price}
                </div>
                <Link
                  href="/contact"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink-700 bg-ink-800/50 px-4 py-2.5 text-xs font-semibold text-ink-200 transition-all hover:border-brand-500/30 hover:bg-brand-500/10 hover:text-brand-300"
                >
                  Get Started
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
