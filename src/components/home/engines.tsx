"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Radar,
  LayoutGrid,
  LineChart,
  ArrowRight,
  Cpu,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ENGINES = [
  {
    num: "01",
    icon: Radar,
    title: "AI Brand Audit Engine",
    body: "A 60-second multi-point scan that scores your SEO, map-pack presence, page speed, review velocity, and short-form video — and hands you the exact leaks.",
    bullets: ["Brand Health Score / 100", "Pain point identifiers", "Local keyword intelligence"],
    cta: "Run the audit",
    href: "/audit",
    accent: "from-brand-500 to-violet-600",
    chip: "Free",
  },
  {
    num: "02",
    icon: LayoutGrid,
    title: "100-Module Service Menu",
    body: "A modular 'menu-style' customizer across 10 strategic pillars. Pick exactly what you need, priced transparently — no $3,000/mo agency lock-in.",
    bullets: ["10 pillars · 100 modules", "Vertical-matched recommendations", "Live ROI calculator"],
    cta: "Build your menu",
    href: "/services",
    accent: "from-glow-500 to-teal-600",
    chip: "Custom",
  },
  {
    num: "03",
    icon: LineChart,
    title: "Client & Admin Command Centers",
    body: "Real-time dashboards for both sides. Track fulfillment, upload raw assets, and watch campaign performance — with Stripe billing on autopilot.",
    bullets: ["Fulfillment tracking", "Asset delivery vault", "Stripe subscription management"],
    cta: "See the portal",
    href: "/dashboard",
    accent: "from-amber-500 to-orange-600",
    chip: "Live",
  },
];

export function Engines() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-72 w-[600px] -translate-x-1/2 rounded-full bg-brand-500/6 blur-[120px]" />
      </div>
      <Container className="relative">
        <SectionHeading
          eyebrow={
            <>
              <Cpu className="h-3.5 w-3.5" /> Three Engines. One Mission.
            </>
          }
          title={
            <>
              A System Built to Take You From{" "}
              <span className="text-gradient-brand">Invisible → Dominant</span>
            </>
          }
          description="No retainers. No hidden fees. No 'brand awareness' excuses. Just a machine that audits, builds, and reports — engineered for local revenue."
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {ENGINES.map((e, i) => (
            <motion.div
              key={e.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
            >
              <div className="group card-obsidian relative flex h-full flex-col overflow-hidden rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/40">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-brand-500/10 to-transparent blur-2xl" />
                <div className="mb-6 flex items-center justify-between">
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${e.accent} shadow-lg`}
                  >
                    <e.icon className="h-7 w-7 text-white" />
                  </span>
                  <span className="font-display text-5xl font-black text-white/5">
                    {e.num}
                  </span>
                </div>
                <div className="mb-3">
                  <Badge variant="brand">{e.chip}</Badge>
                </div>
                <h3 className="font-display text-xl font-bold text-white">{e.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-fog">{e.body}</p>
                <ul className="mt-4 space-y-1.5">
                  {e.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs font-medium text-mist">
                      <span className="h-1 w-1 rounded-full bg-brand-400" /> {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  <Button asChild variant="outline" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    <Link href={e.href}>{e.cta}</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
