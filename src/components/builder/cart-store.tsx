"use client";

import * as React from "react";
import { SERVICE_MAP, BUSINESS_VERTICALS } from "@/data/services";
import type { CartTotals, VerticalId, SubscriptionTier } from "@/lib/types";

interface CartState {
  vertical: VerticalId | null;
  setVertical: (v: VerticalId | null) => void;
  selections: number[];
  toggle: (id: number) => void;
  clear: () => void;
  acv: number;
  setAcv: (n: number) => void;
  leadIncrease: number;
  setLeadIncrease: (n: number) => void;
  tier: SubscriptionTier;
  setTier: (t: SubscriptionTier) => void;
  monthlyBilling: boolean;
  setMonthlyBilling: (b: boolean) => void;
  totals: CartTotals;
  selectedCount: number;
  selectionRelevant: (id: number) => boolean;
}

const CartContext = React.createContext<CartState | null>(null);

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

function computeTotals(
  selections: number[],
  acv: number,
  leadIncrease: number,
): CartTotals {
  const services = selections.map((id) => SERVICE_MAP[id]).filter(Boolean);
  const oneTime = services.reduce((s, x) => s + x.oneTime, 0);
  const monthly = services.reduce((s, x) => s + x.monthly, 0);
  const baseLeads = 8 + Math.round(monthly / 40);
  const estimatedLeads = Math.round(baseLeads * (1 + leadIncrease / 100));
  const projectedRevenue = Math.round(estimatedLeads * acv * 0.35);
  const roas = monthly > 0 ? Math.round(projectedRevenue / Math.max(monthly, 1)) : 0;
  return { oneTime, monthly, estimatedLeads, projectedRevenue, roas };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Read ?preselect=1,2,31 (from the audit report CTA) and ?vertical=…
  // once, during initial state — no effect-driven setState needed.
  const [vertical, setVertical] = React.useState<VerticalId | null>(() => {
    if (typeof window === "undefined") return null;
    const v = new URLSearchParams(window.location.search).get("vertical");
    return (BUSINESS_VERTICALS.some((b) => b.id === v) ? v : null) as VerticalId | null;
  });
  const [selections, setSelections] = React.useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    const params = new URLSearchParams(window.location.search);
    const preselect = params.get("preselect");
    if (!preselect) return [];
    return preselect
      .split(",")
      .map((n) => parseInt(n, 10))
      .filter((n) => !Number.isNaN(n) && SERVICE_MAP[n]);
  });
  const [acv, setAcv] = React.useState(600);
  const [leadIncrease, setLeadIncrease] = React.useState(50);
  const [tier, setTier] = React.useState<SubscriptionTier>(() => {
    if (typeof window === "undefined") return "growth";
    const t = new URLSearchParams(window.location.search).get("tier");
    return t === "solo" || t === "growth" || t === "dominance" ? t : "growth";
  });
  const [monthlyBilling, setMonthlyBilling] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const preselect = params.get("preselect");
    const ids = (preselect ?? "")
      .split(",")
      .map((n) => parseInt(n, 10))
      .filter((n) => !Number.isNaN(n));
    return (
      ids.some((id) => SERVICE_MAP[id]?.monthly > 0) ||
      Boolean(params.get("tier"))
    );
  });

  const toggle = React.useCallback((id: number) => {
    setSelections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const totals = React.useMemo(
    () => computeTotals(selections, acv, leadIncrease),
    [selections, acv, leadIncrease],
  );

  const selectionRelevant = React.useCallback(
    (id: number) => {
      if (!vertical) return false;
      const svc = SERVICE_MAP[id];
      if (!svc) return false;
      const verticalCfg = BUSINESS_VERTICALS.find((v) => v.id === vertical);
      if (!verticalCfg) return false;
      return (
        svc.recommended?.includes(vertical) ||
        verticalCfg.recommended.includes(svc.pillar)
      );
    },
    [vertical],
  );

  const value: CartState = {
    vertical,
    setVertical,
    selections,
    toggle,
    clear: () => setSelections([]),
    acv,
    setAcv,
    leadIncrease,
    setLeadIncrease,
    tier,
    setTier,
    monthlyBilling,
    setMonthlyBilling,
    totals,
    selectedCount: selections.length,
    selectionRelevant,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
