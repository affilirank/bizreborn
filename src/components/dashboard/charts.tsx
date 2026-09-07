"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";

export const LEAD_CHART = [
  { month: "Jan", leads: 32, calls: 21 },
  { month: "Feb", leads: 41, calls: 27 },
  { month: "Mar", leads: 38, calls: 24 },
  { month: "Apr", leads: 55, calls: 36 },
  { month: "May", leads: 68, calls: 44 },
  { month: "Jun", leads: 74, calls: 51 },
  { month: "Jul", leads: 96, calls: 67 },
];

export const PILLAR_SPEND = [
  { name: "Local SEO", value: 28 },
  { name: "Short-Form", value: 22 },
  { name: "Reviews/SMS", value: 18 },
  { name: "Paid Ads", value: 14 },
  { name: "Web/Funnels", value: 12 },
  { name: "Other", value: 6 },
];

const TOOLTIP_STYLE = {
  background: "#0F1624",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "#F8FAFC",
};

export function PerformanceChart() {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h4 className="font-display text-base font-bold text-white">Lead &amp; Call Growth</h4>
          <p className="text-xs text-fog">Trailing 7 months · all tracked channels</p>
        </div>
        <span className="rounded-lg border border-glow-500/25 bg-glow-500/10 px-3 py-1 text-xs font-bold text-glow-400">
          +63% leads
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={LEAD_CHART} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="leads" stroke="#6366F1" strokeWidth={2} fill="url(#leadGrad)" />
            <Area type="monotone" dataKey="calls" stroke="#10B981" strokeWidth={2} fill="url(#callGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function SpendChart() {
  const colors = ["#6366F1", "#F472B6", "#10B981", "#F59E0B", "#A78BFA", "#64748B"];
  return (
    <Card className="p-6">
      <h4 className="font-display text-base font-bold text-white">Budget Allocation</h4>
      <p className="text-xs text-fog">Where your marketing dollars go</p>
      <div className="mt-5 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={PILLAR_SPEND} layout="vertical" margin={{ top: 0, right: 8, left: -18, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={70}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={14}>
              {PILLAR_SPEND.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
