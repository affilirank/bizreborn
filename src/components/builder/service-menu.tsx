"use client";

import * as React from "react";
import {
  Search,
  Check,
  Star,
  Sparkles,
  ChevronDown,
  Layers,
} from "lucide-react";
import { PILLARS } from "@/data/services";
import { useCart } from "@/components/builder/cart-store";
import { PILLAR_ICONS, FALLBACK_ICON } from "@/components/builder/pillar-icons";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ServiceMenu() {
  const { selections, toggle, vertical, selectionRelevant } = useCart();
  const [query, setQuery] = React.useState("");
  const [onlyRecommended, setOnlyRecommended] = React.useState(false);
  const [openPillar, setOpenPillar] = React.useState<string | null>(
    PILLARS[0].id,
  );

  const filteredPillars = PILLARS.map((p) => {
    const services = p.services.filter((s) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.blurb.toLowerCase().includes(q);
      const matchesRec = !onlyRecommended || selectionRelevant(s.id);
      return matchesQuery && matchesRec;
    });
    return { ...p, services };
  }).filter((p) => p.services.length > 0);

  const allVisibleIds = filteredPillars.flatMap((p) =>
    p.services.map((s) => s.id),
  );
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selections.includes(id));

  const toggleAllVisible = () => {
    if (allSelected) {
      // remove all visible
      selections
        .filter((id) => allVisibleIds.includes(id))
        .forEach((id) => toggle(id));
    } else {
      allVisibleIds.forEach((id) => {
        if (!selections.includes(id)) toggle(id);
      });
    }
  };

  return (
    <div className="card-obsidian rounded-3xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold text-white">
              Step 2 — The 100-Module Menu
            </h3>
            <p className="mt-1 text-sm text-fog">
              Toggle the exact services you need across 10 strategic pillars.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-850/60 px-4 py-2">
            <Layers className="h-4 w-4 text-brand-300" />
            <span className="text-sm font-semibold text-white">{selections.length}</span>
            <span className="text-xs text-fog">selected</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 100 services — e.g. 'reviews', 'schema', 'geo-fence'…"
              className="w-full rounded-xl border border-white/10 bg-ink-800/70 py-3 pl-10 pr-4 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20"
            />
          </div>
          <div className="flex items-center gap-2">
            {vertical && (
              <button
                onClick={() => setOnlyRecommended((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-semibold transition",
                  onlyRecommended
                    ? "border-glow-500/50 bg-glow-500/10 text-glow-400"
                    : "border-white/10 text-fog hover:border-white/25",
                )}
              >
                <Star className="h-3.5 w-3.5" />
                Recommended for {vertical.replace(/-/g, " ")}
              </button>
            )}
            <button
              onClick={toggleAllVisible}
              className="flex items-center gap-1.5 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-xs font-semibold text-brand-300 transition hover:bg-brand-500/20"
            >
              {allSelected ? "Deselect shown" : "Select shown"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredPillars.map((p) => {
          const Icon = PILLAR_ICONS[p.id] ?? FALLBACK_ICON;
          const pillarSelected = p.services.filter((s) =>
            selections.includes(s.id),
          ).length;
          const isOpen = openPillar === p.id;
          return (
            <div
              key={p.id}
              id={p.id}
              className={cn(
                "scroll-mt-32 overflow-hidden rounded-2xl border transition-colors duration-300",
                isOpen
                  ? "border-brand-500/30 bg-ink-800/60"
                  : "border-white/8 bg-ink-850/50",
              )}
            >
              <button
                onClick={() => setOpenPillar(isOpen ? null : p.id)}
                className="flex w-full cursor-pointer items-center gap-4 px-5 py-5 text-left"
              >
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
                    p.accent,
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-bold text-white sm:text-lg">
                      Pillar {p.number}: {p.name}
                    </span>
                    {pillarSelected > 0 && (
                      <Badge variant="emerald" className="px-2 py-0.5 text-[10px]">
                        {pillarSelected} selected
                      </Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-fog sm:text-sm">
                    {p.tagline}
                  </span>
                </span>
                <span className="hidden text-xs font-semibold text-mute sm:block">
                  {p.services.length} modules
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-fog transition-transform duration-300",
                    isOpen && "rotate-180 text-brand-300",
                  )}
                />
              </button>

              {isOpen && (
                <div className="border-t border-white/5">
                  <ul className="divide-y divide-white/5">
                    {p.services.map((s) => {
                      const selected = selections.includes(s.id);
                      const recommended = selectionRelevant(s.id);
                      return (
                        <li key={s.id}>
                          <button
                            onClick={() => toggle(s.id)}
                            className={cn(
                              "group flex w-full cursor-pointer items-start gap-3 px-5 py-4 text-left transition-colors sm:gap-4 sm:px-6",
                              selected
                                ? "bg-brand-500/8"
                                : "hover:bg-white/3",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all duration-200",
                                selected
                                  ? "border-brand-400 bg-brand-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                                  : "border-white/20 bg-ink-800 group-hover:border-brand-400/50",
                              )}
                            >
                              {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                            </span>
                            <span className="flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "text-sm font-semibold sm:text-[15px]",
                                    selected ? "text-white" : "text-mist",
                                  )}
                                >
                                  {s.id}. {s.title}
                                </span>
                                {recommended && (
                                  <Badge
                                    variant="brand"
                                    className="px-1.5 py-0 text-[9px]"
                                  >
                                    <Star className="h-2.5 w-2.5" /> For{" "}
                                    {vertical?.replace(/-/g, " ")}
                                  </Badge>
                                )}
                                {s.popular && (
                                  <Badge
                                    variant="emerald"
                                    className="px-1.5 py-0 text-[9px]"
                                  >
                                    <Sparkles className="h-2.5 w-2.5" /> Popular
                                  </Badge>
                                )}
                              </span>
                              <span className="mt-1 block max-w-xl text-xs leading-relaxed text-fog">
                                {s.blurb}
                              </span>
                              <span className="mt-2 flex flex-wrap gap-1.5">
                                {s.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-mute"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              {s.oneTime > 0 && (
                                <span className="block text-sm font-bold text-white">
                                  {formatCurrency(s.oneTime)}
                                </span>
                              )}
                              <span
                                className={cn(
                                  "block text-[11px] font-semibold",
                                  s.monthly > 0 ? "text-brand-300" : "text-mute",
                                )}
                              >
                                {s.monthly > 0
                                  ? `${formatCurrency(s.monthly)}/mo`
                                  : "one-time"}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {filteredPillars.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <p className="text-sm text-fog">
              No services match your search. Try a different keyword.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
