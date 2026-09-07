import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  compact = false,
}: {
  className?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-glow-500 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.7)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none">
          <path
            d="M4 12h4l3 8 4-16 3 8h4"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="absolute inset-0 bg-gradient-to-t from-transparent to-white/25 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-bold tracking-tight text-white">
            Biz<span className="text-gradient-brand">Reborn</span>
          </span>
          <span className="text-[9px] font-medium uppercase tracking-[0.32em] text-fog">
            Marketing
          </span>
        </span>
      ) : null}
    </Link>
  );
}
