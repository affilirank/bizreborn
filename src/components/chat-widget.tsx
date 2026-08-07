"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-4 w-72 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl shadow-brand-500/10">
          <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-glow-600 px-4 py-3">
            <span className="text-sm font-semibold text-white">AI Assistant</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="p-4">
            <p className="text-xs leading-relaxed text-ink-400">
              Hi! I&apos;m Biz Reborn&apos;s AI assistant. Ask me about our
              services, brand audits, or anything else.
            </p>
          </div>
          <div className="border-t border-ink-800/60 p-3">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-xs text-white placeholder-ink-500 outline-none focus:border-brand-500/50"
            />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-brand-600 to-glow-600 text-white shadow-lg shadow-brand-500/30 transition-all hover:from-brand-500 hover:to-glow-500 hover:shadow-brand-500/40"
      >
        <MessageCircle size={22} />
      </button>
    </div>
  );
}
