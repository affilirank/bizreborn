"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AccordionItem({
  id,
  title,
  subtitle,
  icon,
  accent,
  badge,
  defaultOpen = false,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: (id: string) => void;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  const toggle = () => {
    if (onToggle) onToggle(id);
    else setInternalOpen((v) => !v);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-colors duration-300",
        isOpen ? "border-brand-500/40 bg-ink-800/80" : "border-white/8 bg-ink-850/60 hover:border-white/20",
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left sm:px-6"
      >
        {icon ? (
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg",
              accent ?? "from-brand-500 to-violet-600",
            )}
          >
            {icon}
          </span>
        ) : null}
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="font-display text-[15px] font-semibold text-mist">{title}</span>
          {subtitle ? <span className="text-xs text-fog">{subtitle}</span> : null}
        </span>
        {badge}
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-fog transition-transform duration-300",
            isOpen && "rotate-180 text-brand-300",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="border-t border-white/5 px-5 py-4 sm:px-6">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
