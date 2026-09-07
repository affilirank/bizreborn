"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import type { BlogArticle } from "@/data/blog";
import type { PillarId } from "@/lib/types";
import { BlogCard, pillarShort } from "@/components/blog/blog-card";
import { cn } from "@/lib/utils";

const PILLAR_IDS: PillarId[] = [
  "local-seo",
  "short-form-video",
  "websites-funnels",
  "reputation-reviews",
  "sms-retention",
  "paid-ads",
  "social-branding",
  "digital-products",
  "commercial-real-estate",
  "automation-metrics",
];

export function BlogListing({ articles }: { articles: BlogArticle[] }) {
  const [query, setQuery] = React.useState("");
  const [pillar, setPillar] = React.useState<PillarId | "all">("all");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (pillar !== "all" && a.pillar !== pillar) return false;
      if (!q) return true;
      const hay = `${a.title} ${a.serviceTitle} ${a.metaDescription} ${a.keywords.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [articles, query, pillar]);

  return (
    <div>
      {/* Controls */}
      <div className="mb-10 flex flex-col gap-5">
        <div className="relative mx-auto w-full max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 100 service guides…"
            aria-label="Search articles"
            className="w-full rounded-full border border-white/10 bg-ink-850/80 py-3 pl-11 pr-4 text-sm text-white placeholder:text-mute focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <FilterChip
            active={pillar === "all"}
            onClick={() => setPillar("all")}
            label="All pillars"
          />
          {PILLAR_IDS.map((id) => (
            <FilterChip
              key={id}
              active={pillar === id}
              onClick={() => setPillar(id)}
              label={pillarShort(id)}
            />
          ))}
        </div>
      </div>

      <p className="mb-6 text-center text-sm text-mute">
        {filtered.length} guide{filtered.length === 1 ? "" : "s"}
      </p>

      <AnimatePresence mode="popLayout">
        {filtered.length > 0 ? (
          <motion.div
            layout
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((a) => (
              <motion.div
                key={a.slug}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                <BlogCard article={a} className="h-full" />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <p className="py-16 text-center text-sm text-fog">
            No guides match that search — try a different term or pillar.
          </p>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-brand-500/60 bg-brand-500/20 text-brand-200"
          : "border-white/10 bg-ink-850/60 text-fog hover:border-white/25 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}
