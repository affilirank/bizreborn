import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "brand" | "emerald" | "outline" | "muted" | "amber" | "rose";

const variants: Record<BadgeVariant, string> = {
  brand: "bg-brand-500/15 text-brand-300 border-brand-500/30",
  emerald: "bg-glow-500/15 text-glow-400 border-glow-500/30",
  outline: "bg-white/5 text-fog border-white/15",
  muted: "bg-ink-700/60 text-fog border-white/10",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function Badge({
  className,
  variant = "brand",
  children,
}: {
  className?: string;
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
