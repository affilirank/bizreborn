"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, X, Sparkles, Clock, Phone } from "lucide-react";

const AI_RESPONSES = [
  "Thanks for reaching out, {name}. What's the best time to call you back? We can book a free roof inspection today.",
  "I can help with that. Do you need emergency repair or a full replacement quote? Our AI just scheduled 3 new estimates for {city} this hour.",
  "Absolutely. Your address in {city} puts you in our priority zone. We offer same-day estimates and 24/7 emergency response.",
  "Great question. Our pricing is transparent — no hidden fees. Would you like a ballpark over text or a full on-site estimate?",
  "We're open 7am–7pm Mon–Sat, with 24/7 emergency line. Would you like me to text you a booking link?",
];

export default function AIChatAgent({ businessName, city, niche }: { businessName: string; city: string; niche: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: `Hi — I'm the AI assistant for ${businessName}. How can I help you with ${niche} in ${city}?` },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages((m) => [...m, { role: "user", text: userText }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const template = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
      const reply = template.replace(/{name}/g, businessName).replace(/{city}/g, city);
      setMessages((m) => [...m, { role: "ai", text: reply }]);
      setTyping(false);
    }, 1200);
  };

  return (
    <>
      {/* Floating toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_0_30px_-5px_rgba(214,165,54,0.6)] flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open AI Chat"
      >
        <Sparkles size={24} strokeWidth={2.5} />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-cyan rounded-full border-2 border-ink-900 animate-pulse" />
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-[92vw] max-w-md h-[70vh] bg-ink-950 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-brand-900/60 to-brand-500/10 border-b border-white/10">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400">
              <Bot size={18} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{businessName} AI</div>
              <div className="flex items-center gap-1 text-[10px] text-brand-cyan font-medium">
                <span className="w-1 h-1 rounded-full bg-brand-cyan animate-pulse" /> Online now
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-ink-950/60">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0 text-brand-400"><Bot size={12} /></div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-brand-500/10 text-white border border-brand-500/20 rounded-br-md" : "bg-white/5 text-gray-200 border border-white/10 rounded-bl-md"}`}>
                  {m.text}
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-brand-500/30 flex items-center justify-center flex-shrink-0 text-brand-400"><User size={12} /></div>
                )}
              </div>
            ))}
            {typing && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0 text-brand-400"><Bot size={12} /></div>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm text-gray-400 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-ink-950 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about services, pricing, or booking..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500/40 transition-colors"
            />
            <button onClick={send} className="px-3 py-2.5 bg-brand-500 text-white rounded-xl hover:brightness-110 transition-all"><Send size={18} /></button>
          </div>

          {/* Footer actions */}
          <div className="px-4 py-2.5 bg-ink-950 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
            <div className="flex items-center gap-3">
              <a href={`tel:${businessName}`} className="hover:text-brand-400 flex items-center gap-1"><Phone size={10} /> Call now</a>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock size={10} /> 7am–7pm Mon–Sat</span>
            </div>
            <a href="/book" className="text-brand-400 hover:text-brand-300 font-medium">Book online →</a>
          </div>
        </div>
      )}
    </>
  );
}
