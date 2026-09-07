"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { initials } from "@/lib/utils";

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    role: "Owner, Twin Peaks Barbershop · Austin, TX",
    quote:
      "We went from 14 reviews to 311 in four months. The missed-call text-back alone books 12 appointments a week. I finally know exactly what my marketing does.",
    score: 96,
  },
  {
    name: "Dana K.",
    role: "Broker, Harbor Realty Group · San Diego, CA",
    quote:
      "The AI audit found our page was loading in 6 seconds on mobile. Fixed it, added schema, and our local calls doubled in the first month. Worth every dollar.",
    score: 92,
  },
  {
    name: "Vince R.",
    role: "Owner, Rapid Air HVAC · Phoenix, AZ",
    quote:
      "I fired my $3,000/month agency. Biz Reborn rebuilt my whole machine for less, and the dashboard shows me exactly which lead came from which ad. Unreal.",
    score: 98,
  },
];

export function Testimonials() {
  return (
    <section className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Proof Over Promises"
          title={
            <>
              Local Businesses That{" "}
              <span className="text-gradient-brand">Stopped Guessing</span>
            </>
          }
        />
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
            >
              <Card className="relative flex h-full flex-col gap-4 overflow-hidden p-6">
                <Quote className="absolute -right-2 -top-2 h-20 w-20 text-white/4" />
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-2 rounded-md bg-glow-500/10 px-1.5 py-0.5 font-mono text-xs font-bold text-glow-400">
                    {t.score}/100
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-mist">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-auto flex items-center gap-3 border-t border-white/5 pt-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-glow-500 text-xs font-bold text-white">
                    {initials(t.name)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-fog">{t.role}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
