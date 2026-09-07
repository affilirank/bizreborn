"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "brand",
  delay = 0,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "brand" | "emerald" | "amber" | "rose";
  delay?: number;
}) {
  const accents = {
    brand: "bg-brand-500/15 text-brand-300 border-brand-500/30",
    emerald: "bg-glow-500/15 text-glow-400 border-glow-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
    >
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-mute">{label}</p>
            <p className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">{value}</p>
            {delta && (
              <p
                className={cn(
                  "mt-1 text-xs font-semibold",
                  delta.startsWith("+") ? "text-glow-400" : "text-fog",
                )}
              >
                {delta}
              </p>
            )}
          </div>
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl border", accents[accent])}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </Card>
    </motion.div>
  );
}
