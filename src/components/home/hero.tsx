"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, Zap, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/section";
import { VSLPlayer } from "@/components/home/vsl-player";
import { Badge } from "@/components/ui/badge";

const scrollToAudit = () => {
  document.getElementById("audit-widget")?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
};

export function Hero() {
  return (
    <section id="vsl-hero" className="relative overflow-hidden pb-20 pt-32 sm:pb-28 sm:pt-40">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/12 blur-[160px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-glow-500/8 blur-[120px]" />
      </div>

      <Container className="relative">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex justify-center"
          >
            <Badge variant="emerald" className="px-4 py-2">
              <Zap className="h-3.5 w-3.5" /> AI-driven local marketing systems — now booking
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[4.25rem]"
          >
            Stop Burning Cash on{" "}
            <span className="text-gradient-brand">Invisible Marketing.</span>{" "}
            Reborn Your Business into a{" "}
            <span className="shimmer-text">Local Category Leader.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-fog sm:text-xl"
          >
            AI-driven local audit systems, high-converting content infrastructure,
            and modular marketing pipelines designed to dominate your local market.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              onClick={scrollToAudit}
              rightIcon={<ArrowRight className="h-5 w-5" />}
              className="w-full sm:w-auto"
            >
              Run Free AI Brand Audit
            </Button>
            <Button
              size="lg"
              variant="outline"
              leftIcon={<Play className="h-5 w-5" />}
              className="w-full sm:w-auto"
              onClick={() =>
                document.getElementById("vsl")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Watch the 76-Second Breakdown
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-xs text-mute"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-glow-400" /> Free — no credit card
            </span>
            <span className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-brand-300" /> 60-second scan
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-300" /> Live ROI tracking
            </span>
          </motion.div>
        </div>

        <motion.div
          id="vsl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mx-auto mt-14 max-w-4xl"
        >
          <VSLPlayer />
        </motion.div>
      </Container>
    </section>
  );
}
