"use client";

import Link from "next/link";
import { FlaskConical, X } from "lucide-react";
import { useState } from "react";
import { demoEnabled } from "@/lib/db";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!demoEnabled()) return null;

  if (dismissed) return null;

  return (
    <div className="fixed left-1/2 top-3 z-[100] -translate-x-1/2">
      <div className="glass-strong flex items-center gap-3 rounded-full py-2 pl-4 pr-2 text-xs font-medium text-mist shadow-xl">
        <FlaskConical className="h-4 w-4 text-brand-300" />
        <span className="hidden sm:inline">
          Demo mode — add Supabase &amp; Stripe keys to go live.
        </span>
        <span className="sm:hidden">Demo mode</span>
        <Link
          href="/admin"
          className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
        >
          View demo admin
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-fog transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
