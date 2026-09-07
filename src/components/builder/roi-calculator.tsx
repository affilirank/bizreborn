"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Wallet,
  RefreshCw,
  PhoneCall,
  Users,
  Calculator,
  ArrowRight,
} from "lucide-react";
import { useCart } from "@/components/builder/cart-store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PRESETS = [
  { label: "$150 avg job", value: 150 },
  { label: "$500 avg", value: 500 },
  { label: "$2,500 high-ticket", value: 2500 },
  { label: "$10k+ enterprise", value: 10000 },
];

export function RoiCalculator() {
  const { acv, setAcv, leadIncrease, setLeadIncrease, totals, selectedCount } = useCart();

  const stepSizes: Record<number, number> = { 0: 50, 1: 500, 2: 2500, 3: 10000 };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-brand-300" />
          <h3 className="font-display text-lg font-bold text-white">Live ROI Projection</h3>
        </div>
        <p className="text-xs text-fog">
          Drag to estimate the revenue impact of your selected modules.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-obsidian rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">One-time setup</p>
          <p className="mt-1 font-display text-xl font-bold text-white">
            {formatCurrency(totals.oneTime)}
          </p>
        </div>
        <div className="card-obsidian rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">Monthly retainer</p>
          <p className="mt-1 font-display text-xl font-bold text-brand-300">
            {formatCurrency(totals.monthly)}
          </p>
        </div>
      </div>

      {/* Lead increase slider */}
      <div className="card-obsidian rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
            <TrendingUp className="h-3.5 w-3.5 text-glow-400" /> Est. lead increase
          </p>
          <span className="font-display text-lg font-bold text-glow-400">+{leadIncrease}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={200}
          step={5}
          value={leadIncrease}
          onChange={(e) => setLeadIncrease(parseInt(e.target.value, 10))}
          className="w-full accent-emerald-500"
          aria-label="Estimated lead increase percentage"
        />
        <div className="mt-1 flex justify-between text-[10px] text-mute">
          <span>0%</span>
          <span>100%</span>
          <span>200%</span>
        </div>
      </div>

      {/* ACV */}
      <div className="card-obsidian rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
            <Wallet className="h-3.5 w-3.5 text-brand-300" /> Avg. customer value
          </p>
          <span className="font-display text-lg font-bold text-white">{formatCurrency(acv)}</span>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setAcv(p.value)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                acv === p.value
                  ? "border-brand-400/60 bg-brand-500/15 text-white"
                  : "border-white/10 text-fog hover:border-white/25"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={100}
          max={15000}
          step={stepSizes[Math.floor(Math.log10(Math.max(acv, 1)))] ?? 50}
          value={acv}
          onChange={(e) => setAcv(parseInt(e.target.value, 10))}
          className="w-full accent-indigo-500"
          aria-label="Average customer value"
        />
      </div>

      {/* Projected impact */}
      <div className="relative overflow-hidden rounded-2xl border border-glow-500/25 bg-gradient-to-br from-glow-500/10 to-transparent p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-glow-500/20 blur-3xl" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-glow-400">
          Projected net revenue / mo
        </p>
        <p className="mt-1 font-display text-3xl font-extrabold text-glow-400">
          {formatCurrency(totals.projectedRevenue)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="flex items-center gap-1 text-[10px] text-mute">
              <PhoneCall className="h-3 w-3" /> Est. leads / mo
            </p>
            <p className="font-display text-lg font-bold text-white">
              {totals.estimatedLeads}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[10px] text-mute">
              <RefreshCw className="h-3 w-3" /> Projected ROAS
            </p>
            <p className="font-display text-lg font-bold text-white">
              {totals.roas}x
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-ink-850/60 px-4 py-3">
        <Users className="h-4 w-4 shrink-0 text-brand-300" />
        <p className="text-xs leading-relaxed text-fog">
          Projection model: estimated leads × avg customer value × 35% close rate.
        </p>
      </div>

      <motion.div
        key={selectedCount}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          asChild
          size="lg"
          className="w-full"
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          <a href="#checkout">Proceed to Checkout</a>
        </Button>
      </motion.div>
    </div>
  );
}
