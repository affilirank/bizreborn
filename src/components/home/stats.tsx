"use client";

import { MARKETING_STATS } from "@/data/services";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Container } from "@/components/ui/section";
import { motion } from "framer-motion";

export function Stats() {
  return (
    <section className="relative border-y border-white/5 bg-ink-950/60 py-16 sm:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
          {MARKETING_STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className="relative flex flex-col gap-3 border-l border-white/10 pl-6"
            >
              <span className="pointer-events-none absolute -left-px top-2 h-12 w-px bg-gradient-to-b from-brand-400 to-transparent" />
              <p className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                <AnimatedNumber value={s.value} suffix={s.suffix} className="text-gradient-brand" />
              </p>
              <p className="max-w-sm text-sm leading-relaxed text-mist sm:text-base">
                {s.label}
              </p>
              <p className="text-xs uppercase tracking-wider text-mute">{s.source}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
