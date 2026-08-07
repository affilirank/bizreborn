import { SITE } from "@/lib/config";

export default function DemoBanner() {
  return (
    <div className="relative z-50 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600/20 via-ink-900 to-glow-600/20 px-4 py-2">
      <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-brand-400 uppercase">
        Demo
      </span>
      <span className="text-xs text-ink-400">
        {SITE.name} — AI-Powered Local Marketing Platform
      </span>
    </div>
  );
}
