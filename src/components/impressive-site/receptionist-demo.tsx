"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Phone,
  Clock,
  MapPin,
  MessageCircle,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Header,
  Link,
} from "lucide-react";

interface ReceptionistDemoProps {
  businessName: string;
  city: string | null;
  niche: string;
  script: string;
  audioUrl: string | null;
  tools: string[];
  greeting: string;
}

const TOOL_LABELS: Record<string, { label: string; icon: any }> = {
  appointment_booking: { label: "Appointment Booking", icon: Calendar },
  lead_capture: { label: "Lead Capture", icon: User },
  faq_knowledge_base: { label: "FAQ Knowledge Base", icon: BookOpen },
  service_pricing: { label: "Service Pricing", icon: DollarSign },
  sms_callback: { label: "SMS Callback", icon: Smartphone },
  map_directions: { label: "Map & Directions", icon: MapPin },
};

function Calendar() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="3" y1="14" y2="22" />
    </svg>
  );
}
function User() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function BookOpen() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
function DollarSign() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="1" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function Smartphone() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="12" x="5" y="2" rx="2" ry="2" />
      <line x1="12" x2="12" y1="2" y2="22" />
    </svg>
  );
}

const WAVEFORM_BARS = 24;

export default function ReceptionistDemo({
  businessName,
  city,
  niche,
  script,
  audioUrl,
  tools,
  greeting,
}: ReceptionistDemoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [demoStep, setDemoStep] = useState<"idle" | "greeting" | "listening" | "responding" | "complete">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<number[]>(Array(WAVEFORM_BARS).fill(0));
  const animationFrameRef = useRef<number | null>(null);

  const playAudio = useCallback(() => {
    if (!audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const a = new Audio(audioUrl);
    audioRef.current = a;
    a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    a.onended = () => setIsPlaying(false);
  }, [audioUrl]);

  // Simulate voice waveform from audio playback
  useEffect(() => {
    if (!isPlaying || !audioRef.current) return;
    const update = () => {
      if (audioRef.current && !audioRef.current.paused) {
        // Generate mock waveform data based on time
        const time = audioRef.current.currentTime;
        const bars = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
          const seed = Math.sin(time * 3 + i) * 0.5 + 0.5;
          return Math.max(0.1, Math.min(1, seed + (Math.random() * 0.3)));
        });
        waveformRef.current = bars;
        animationFrameRef.current = requestAnimationFrame(update);
      }
    };
    animationFrameRef.current = requestAnimationFrame(update);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  // Simulate conversation flow
  useEffect(() => {
    if (demoStep === "idle") {
      const t = setTimeout(() => setDemoStep("greeting"), 400);
      return () => clearTimeout(t);
    }
    if (demoStep === "greeting") {
      const t = setTimeout(() => setDemoStep("listening"), 2200);
      return () => clearTimeout(t);
    }
    if (demoStep === "listening") {
      setIsListening(true);
      const t = setTimeout(() => {
        setIsListening(false);
        setDemoStep("responding");
        setTranscript([
          { speaker: "user", text: "Hi, I need a roof inspection after last night's storm." },
        ]);
      }, 1500);
      return () => clearTimeout(t);
    }
    if (demoStep === "responding") {
      const tool = tools[Math.floor(Math.random() * tools.length)];
      setActiveTool(tool);
      const t = setTimeout(() => {
        setTranscript((prev) => [
          ...prev,
          { speaker: "ai", text: greeting },
        ]);
        setDemoStep("complete");
        setActiveTool(null);
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [demoStep, tools, greeting]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-navy via-brand-obsidian to-ink-950 border border-brand-cyan/30 shadow-[0_0_60px_-10px_rgba(0,240,255,0.15)]">
      {/* Decorative grid */}
      <div className="absolute inset-0 grid-lines opacity-30 pointer-events-none" />
      <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-tr from-brand-cyan/5 to-transparent pointer-events-none" />
      <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-bl from-brand-gold/5 to-transparent pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-8 md:p-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                <Sparkles size={18} strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-brand-cyan/70 tracking-wider uppercase">AI Receptionist</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white font-display tracking-tight">
              24/7 AI Front Desk for {businessName}
            </h2>
            <p className="text-gray-300 mt-2">
              Your futuristic AI front desk — books jobs, captures leads, answers FAQs, and texts callbacks instantly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-brand-cyan/10 text-brand-cyan text-xs font-bold border border-brand-cyan/20">
              Live Demo · {niche.charAt(0).toUpperCase() + niche.slice(1)}
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 text-xs text-gray-300 border border-white/10">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPlaying ? "bg-brand-cyan" : "bg-gray-500"}`} />
              {isPlaying ? "Voice Active" : "Standby"}
            </span>
          </div>
        </div>

        {/* Status bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[greeting, city, tools.length, "Instant"].map((item, i) => (
            <div key={i} className="glass p-3 rounded-xl border border-white/5">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">
                {["Greeting", "Area", "Tools", "Speed"][i]}
              </div>
              <div className="text-sm font-bold text-white">{item}</div>
            </div>
          ))}
        </div>

        {/* Voice interface */}
        <div className="relative mb-8">
          {/* Waveform */}
          <div className="flex items-end justify-center gap-1 h-24 px-4 mb-4">
            {waveformRef.current.map((level, i) => (
              <motion.div
                key={i}
                className="w-full bg-gradient-to-t from-brand-cyan to-brand-blue rounded-t-sm transition-all duration-100"
                animate={{ height: `${Math.max(8, level * 60)}%` }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-center">
            <button
              onClick={playAudio}
              disabled={isPlaying}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                isPlaying
                  ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                  : "bg-brand-cyan text-brand-obsidian shadow-[0_0_30px_-10px_rgba(0,240,255,0.6)] hover:brightness-110"
              }`}
            >
              {isPlaying ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Playing
                </>
              ) : (
                <>
                  <Mic size={20} strokeWidth={2.5} /> Play AI Greeting
                </>
              )}
            </button>
            <button
              onClick={() => setDemoStep("listening")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-lg text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <Phone size={20} strokeWidth={2.5} /> Simulate Call
            </button>
          </div>

          {audioUrl && (
            <audio ref={audioRef} src={audioUrl} preload="none" className="hidden" />
          )}

          {/* Transcript */}
          <AnimatePresence>
            {transcript.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-px h-4 bg-brand-cyan" />
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan/60">Live Transcript</span>
                </div>
                <div className="space-y-2">
                  {transcript.map((item, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 p-3 rounded-xl glass border border-white/5 animate-${item.speaker === "ai" ? "pp-rise" : "pp-pop"}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        item.speaker === "ai"
                          ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30"
                          : "bg-white/10 text-white border border-white/10"
                      }`}>
                        {item.speaker === "ai" ? <Header size={14} strokeWidth={2} /> : <User size={14} strokeWidth={2} />}
                      </div>
                      <div className="flex-1">
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          item.speaker === "ai" ? "text-brand-cyan" : "text-gray-400"
                        } mb-0.5 block`}>
                          {item.speaker === "ai" ? businessName : "You"}
                        </span>
                        <p className="text-sm text-gray-200 leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Active tool indicator */}
          {activeTool && (
            <div className="mt-5 flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-gold/10 border border-brand-gold/20">
              <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
              <span className="text-xs font-bold text-brand-gold/90 uppercase tracking-wider">
                AI Tool Active: {TOOL_LABELS[activeTool]?.label ?? activeTool}
              </span>
            </div>
          )}
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-8">
          {tools.map((tool) => {
            const info = TOOL_LABELS[tool];
            const Icon = info?.icon || Sparkles;
            return (
              <button
                key={tool}
                onClick={() => setActiveTool(tool)}
                className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-all border ${
                  activeTool === tool
                    ? "bg-brand-gold/20 border-brand-gold/30 text-brand-gold"
                    : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{info?.label ?? tool}</span>
              </button>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-300">
            Ready to capture every lead? The AI receptionist never sleeps.
          </div>
          <button
            onClick={() => {}}
            className="px-5 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue text-brand-obsidian font-bold rounded-xl text-sm hover:brightness-110 shadow-lg transition-all"
          >
            Claim Your AI Receptionist
          </button>
        </div>
      </div>
    </section>
  );
}
