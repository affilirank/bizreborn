"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X, CornerDownLeft } from "lucide-react";
import type { ChatSuggestion } from "@/lib/chat";
import { AiAvatar } from "@/components/chat/ai-avatar";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  text: string;
  suggestions?: ChatSuggestion[];
}

const QUICK_PROMPTS = [
  "What do you do for a restaurant?",
  "How much is the Growth tier?",
  "What is the AI Brand Audit?",
  "Show me video services",
];

const INTRO: Msg = {
  role: "assistant",
  text: "Hey, I'm the Biz Reborn growth assistant — trained on the full playbook. Ask me about our 100 service modules, pricing, the free audit, or what stack fits your business.",
  suggestions: [
    { label: "Run the free audit", href: "/audit" },
    { label: "Build my menu", href: "/services" },
  ],
};

export function ChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([INTRO]);
  const [draft, setDraft] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [mode, setMode] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing, open]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || typing) return;
    setMessages((prev) => [...prev, { role: "user", text: clean }]);
    setDraft("");
    setTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean }),
      });
      const data = await res.json();
      if (data?.mode) setMode(data.mode);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data?.reply ?? "I couldn't reach my brain — try again in a sec.",
          suggestions: data?.suggestions ?? [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something hiccuped. Try again?" },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-24 right-4 z-[90] flex h-[540px] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-800/95 shadow-2xl shadow-black/50 backdrop-blur-xl sm:right-6"
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-brand-600/30 to-glow-600/20 px-5 py-4">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-glow-500">
                <AiAvatar size={36} />
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-glow-400" />
                </span>
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-bold text-white">
                  Biz Reborn AI
                </p>
                <p className="text-[11px] text-fog">
                  {mode === "live"
                    ? "Live AI · any marketing question"
                    : mode === "demo"
                      ? "Instant playbook engine (free)"
                      : "Trained on the growth playbook"}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-fog transition hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      m.role === "user"
                        ? "rounded-br-md bg-gradient-to-br from-brand-500 to-brand-600 text-white"
                        : "rounded-bl-md border border-white/10 bg-white/5 text-mist",
                    )}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        {m.suggestions.map((s) => (
                          <a
                            key={s.href + s.label}
                            href={s.href}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-400/30 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-200 transition hover:bg-brand-500/20"
                          >
                            <CornerDownLeft className="h-3 w-3" />
                            {s.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-4 py-3">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                        className="h-1.5 w-1.5 rounded-full bg-brand-300"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick prompts */}
            <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-fog transition hover:border-brand-400/40 hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
              className="flex items-center gap-2 border-t border-white/10 bg-ink-900/60 px-4 py-3"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about services, pricing, the audit…"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20"
              />
              <button
                type="submit"
                disabled={!draft.trim() || typing}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-glow-500 text-white transition hover:opacity-90 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-4 z-[90] flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-glow-500 text-white shadow-xl shadow-brand-500/30 sm:right-6"
        aria-label="Open AI assistant"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <AiAvatar size={34} />
            <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow-300 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-glow-300" />
            </span>
          </div>
        )}
      </motion.button>
    </>
  );
}
