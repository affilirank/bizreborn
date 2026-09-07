"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function OfferDecline({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const decline = async () => {
    setBusy(true);
    try {
      await fetch(`/api/offers/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });
    } finally {
      setBusy(false);
      router.refresh();
    }
  };

  return (
    <button
      onClick={decline}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-fog transition hover:border-white/25 hover:text-white disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" /> {busy ? "Updating…" : "Decline this offer"}
    </button>
  );
}
