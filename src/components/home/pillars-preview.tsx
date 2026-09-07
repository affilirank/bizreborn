"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ComponentType } from "react";
import {
  MapPin,
  Clapperboard,
  LayoutTemplate,
  Star,
  MessageSquareText,
  Target,
  Palette,
  GraduationCap,
  Building2,
  LineChart,
  ArrowRight,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/section";
import { PILLARS } from "@/data/services";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  MapPin,
  Clapperboard,
  LayoutTemplate,
  Star,
  MessageSquareText,
  Target,
  Palette,
  GraduationCap,
  Building2,
  LineChart,
};

export function PillarsPreview() {
  return (
    <section className="relative border-y border-white/5 bg-ink-950/40 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="The 100-Module Menu"
          title={
            <>
              10 Strategic Pillars.{" "}
              <span className="text-gradient-brand">100 Revenue Modules.</span>
            </>
          }
          description="Everything we do is modular — a menu, not a maze. Stack the modules you need, skip the ones you don't."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PILLARS.map((p, i) => {
            const Icon = ICONS[p.icon] ?? Target;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 5) * 0.08 }}
              >
                <Link
                  href={`/services#${p.id}`}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-white/8 bg-ink-850/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:bg-ink-800/80"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${p.accent}`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </span>
                    <span className="font-mono text-[11px] font-bold text-mute">
                      Pillar {p.number}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold leading-snug text-white group-hover:text-brand-300">
                      {p.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs text-fog">{p.tagline}</p>
                  </div>
                  <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-semibold text-brand-300 opacity-0 transition-opacity group-hover:opacity-100">
                    {p.services.length} modules <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
