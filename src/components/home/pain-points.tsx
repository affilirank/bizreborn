"use client";

import { motion } from "framer-motion";
import {
  MonitorX,
  TrendingDown,
  Hourglass,
  Lock,
  ArrowRight,
  Siren,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PAINS = [
  {
    icon: MonitorX,
    title: "The Ghost Town Website",
    body: "You spent thousands on a beautiful site that brings zero phone calls. Your customers can't find you, and when they do, they bounce.",
    stat: "0 calls/week",
    statColor: "text-rose-300",
  },
  {
    icon: TrendingDown,
    title: "The Review Deficit",
    body: "You watch inferior local competitors steal your clients — because they have 200 more Google reviews and your star rating tells strangers you're a gamble.",
    stat: "-200 reviews",
    statColor: "text-rose-300",
  },
  {
    icon: Hourglass,
    title: "The Content Grind",
    body: "You're burning 15 hours a week shooting random videos that get 47 views and generate zero actual revenue. Your feed feels like a chore, not an asset.",
    stat: "15 hrs/week wasted",
    statColor: "text-amber-300",
  },
  {
    icon: Lock,
    title: "Agency Lock-In",
    body: "You're paying $3,000/month retainers to legacy agencies that hide behind 'brand awareness' — no trackable leads, no transparency, no exit ramp.",
    stat: "-$3,000/mo",
    statColor: "text-rose-300",
  },
];

export function PainPoints() {
  return (
    <section className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow={
            <>
              <Siren className="h-3.5 w-3.5" /> Sound Familiar?
            </>
          }
          title={
            <>
              Every Local Owner Is{" "}
              <span className="text-gradient-white">Bleeding Revenue</span>{" "}
              Into One of These Traps
            </>
          }
          description="You didn't fail at marketing. The systems around you were built to keep you stuck, paying, and invisible. Here's the trap you're in right now:"
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PAINS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
            >
              <Card className="group relative h-full overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-rose-500/40">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/10">
                  <p.icon className="h-6 w-6 text-rose-300" />
                </div>
                <h3 className="font-display text-lg font-bold text-white">{p.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-fog">{p.body}</p>
                <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
                  <span
                    className={cn(
                      "font-mono text-sm font-bold tabular-nums",
                      p.statColor,
                    )}
                  >
                    {p.stat}
                  </span>
                  <ArrowRight className="h-4 w-4 text-mute transition-transform group-hover:translate-x-1 group-hover:text-white" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
