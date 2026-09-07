"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const colorFor = (score: number) => {
  if (score >= 80) return { stroke: "#10B981", text: "text-glow-400", track: "rgba(16,185,129,0.12)" };
  if (score >= 60) return { stroke: "#6366F1", text: "text-brand-300", track: "rgba(99,102,241,0.12)" };
  if (score >= 40) return { stroke: "#F59E0B", text: "text-amber-300", track: "rgba(245,158,11,0.12)" };
  return { stroke: "#F43F5E", text: "text-rose-300", track: "rgba(244,63,94,0.12)" };
};

export function Gauge({
  score,
  label,
  size = 132,
  strokeWidth = 9,
  sublabel,
  className,
}: {
  score: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  sublabel?: string;
  className?: string;
}) {
  const { stroke, text, track } = colorFor(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const t = setTimeout(() => setProgress(score), 250);
    const raf = requestAnimationFrame(() => setProgress(score));
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [score]);

  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={track}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)",
              filter: `drop-shadow(0 0 10px ${stroke}66)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-display text-3xl font-bold tabular-nums", text)}>
            {Math.round(progress)}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-mute">
            / 100
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-mist">{label}</p>
        {sublabel ? <p className="mt-0.5 text-xs text-fog">{sublabel}</p> : null}
      </div>
    </div>
  );
}
