"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  X,
  Sparkles,
} from "lucide-react";

const VSL_SRC = process.env.NEXT_PUBLIC_VSL_SRC ?? "/vsl.mp4";
const DEMO_LINES: { at: number; text: string }[] = [
  { at: 0, text: "Most local businesses are burning cash on marketing that never gets seen." },
  { at: 7, text: "While a competitor with more Google reviews quietly takes your customers." },
  { at: 14, text: "In this video, I'll show you the exact system we use to make local businesses the only name in town." },
  { at: 22, text: "Three engines. One mission: turn invisible businesses into local category leaders." },
  { at: 30, text: "Engine One — the AI Brand Audit. We find every leak in your marketing in seconds." },
  { at: 38, text: "Engine Two — a 100-module service menu. Pick exactly what you need. No agency lock-in." },
  { at: 46, text: "Engine Three — automated reviews, SMS, and content that work while you sleep." },
  { at: 54, text: "Every dollar tracked. Every lead attributed. Every result reported." },
  { at: 62, text: "If you're ready to stop guessing and start dominating — run your free AI audit now." },
];

export function VSLPlayer({ compact = false }: { compact?: boolean }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  // Demo mode (no VSL source) autoplays the cinematic preview.
  const demoAutoPlays = !VSL_SRC && !compact;
  const [playing, setPlaying] = React.useState(demoAutoPlays);
  const [muted, setMuted] = React.useState(true);
  const [duration, setDuration] = React.useState(76);
  const [current, setCurrent] = React.useState(0);
  const [videoFailed, setVideoFailed] = React.useState(false);
  const [started, setStarted] = React.useState(demoAutoPlays);
  const [isSticky, setIsSticky] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const playerRef = React.useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const caption =
    DEMO_LINES.reduce((acc, line) => (current >= line.at ? line : acc), DEMO_LINES[0]).text;

  const useVideo = Boolean(VSL_SRC) && !videoFailed;

  React.useEffect(() => {
    const onScroll = () => {
      if (compact) return;
      const hero = document.getElementById("vsl-hero");
      const trigger = hero ? hero.getBoundingClientRect().bottom : 0;
      setIsSticky(!dismissed && trigger < -40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [compact, dismissed]);

  const toggle = () => {
    const v = videoRef.current;
    if (useVideo && v) {
      if (playing) v.pause();
      else void v.play();
    } else {
      if (!started) {
        setCurrent(0);
        setStarted(true);
      }
      setPlaying((p) => !p);
    }
  };

  React.useEffect(() => {
    if (!playing || useVideo || !started) return;
    const t0 = Date.now() - current * 1000;
    const timer = window.setInterval(() => {
      const c = (Date.now() - t0) / 1000;
      setCurrent(c);
      if (c >= duration) {
        setPlaying(false);
        setCurrent(0);
        setDismissed(true);
        setIsSticky(false);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing, useVideo, started, duration, current]);

  const timeFmt = (s: number) =>
    [Math.floor(s / 60), Math.floor(s % 60)]
      .map((n) => String(n).padStart(2, "0"))
      .join(":");

  return (
    <div ref={playerRef} className="w-full">
      <AnimatePresence>
        {isSticky && !compact ? (
          <motion.div
            key="mini"
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.9 }}
            className="glass-strong fixed bottom-5 right-5 z-[90] w-80 overflow-hidden rounded-2xl shadow-2xl"
          >
            <div className="relative h-40 w-full cursor-pointer" onClick={toggle}>
              <MiniScene current={current} />
              {!playing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/90 text-white shadow-lg">
                    <Play className="ml-0.5 h-6 w-6" />
                  </span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 px-2 pb-3">
                <p className="rounded-lg bg-black/65 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-white backdrop-blur">
                  {caption}
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/20">
                <div
                  className="h-full bg-gradient-to-r from-brand-400 to-glow-400 transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                {timeFmt(current)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissed(true);
                  setIsSticky(false);
                }}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white/80 transition hover:bg-black/80 hover:text-white"
                aria-label="Close mini player"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Full player */}
      <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-ink-950 shadow-[0_30px_80px_-30px_rgba(99,102,241,0.5)]">
        <div className="relative aspect-video w-full overflow-hidden">
          {useVideo ? (
            <video
              ref={videoRef}
              src={VSL_SRC}
              className="h-full w-full object-cover"
              muted={muted}
              onError={() => setVideoFailed(true)}
              onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                setDismissed(true);
                setIsSticky(false);
              }}
              playsInline
            />
          ) : (
            <Scene current={current} playing={playing} started={started} />
          )}

          {/* Overlay gradient */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />

          {/* Center play button */}
          {!playing && (
            <button
              onClick={toggle}
              className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-brand-500/95 text-white shadow-[0_0_60px_-5px_rgba(99,102,241,0.9)] ring-glow transition-transform duration-300 hover:scale-110 sm:h-24 sm:w-24"
              aria-label="Play video"
            >
              <Play className="ml-1 h-9 w-9 sm:h-11 sm:w-11" fill="currentColor" />
            </button>
          )}

          {/* Bottom control bar */}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-3 pt-8 sm:px-6">
            <button
              onClick={toggle}
              className="text-white/90 transition hover:text-white"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="h-5 w-5" fill="currentColor" />
              )}
            </button>
            <div className="relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-glow-400"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-white/80">
              {timeFmt(current)} / {timeFmt(duration)}
            </span>
            <button
              onClick={() => setMuted((m) => !m)}
              className="text-white/90 transition hover:text-white"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <button
              onClick={toggle}
              className="hidden text-white/90 transition hover:text-white sm:block"
              aria-label="Fullscreen"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Caption strip — full width, below the video so it never covers the visuals */}
        <div className="w-full border-t border-white/5 bg-ink-950/80 px-4 py-4 sm:px-6 sm:py-5">
          <p className="mx-auto max-w-3xl text-center text-base font-semibold leading-snug text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.9)] sm:text-xl">
            {caption}
          </p>
        </div>
      </div>

      {!useVideo && !compact && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-fog">
          <Sparkles className="h-3.5 w-3.5 text-brand-300" />
          Demo VSL preview — drop your MP4 at <code className="text-brand-300">/public/vsl.mp4</code> to load your real video.
        </p>
      )}
    </div>
  );
}

function Scene({
  current,
  playing,
  started,
}: {
  current: number;
  playing: boolean;
  started: boolean;
}) {
  const glowX = 20 + (current % 40) * 1.6;
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink-950">
      <div className="grid-lines absolute inset-0 opacity-70" />
      <motion.div
        className="absolute h-[420px] w-[420px] rounded-full bg-brand-500/25 blur-[120px]"
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-[320px] w-[320px] rounded-full bg-glow-500/15 blur-[100px]"
        animate={{ x: [0, -70, 50, 0], y: [0, 50, -40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Fake progress scanline when playing */}
      {playing && started && (
        <motion.div
          className="absolute left-0 h-px w-full bg-gradient-to-r from-transparent via-brand-300 to-transparent"
          initial={{ top: "10%" }}
          animate={{ top: ["10%", "90%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <motion.span
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-glow-500 text-white shadow-2xl"
          animate={{ rotate: playing ? [0, 8, -8, 0] : 0 }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
            <path
              d="M4 12h4l3 8 4-16 3 8h4"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.span>
        <p className="font-display text-xl font-bold text-white sm:text-2xl">
          Reborn In 76 Seconds
        </p>
        <p className="max-w-md text-sm text-fog">
          The exact system that turns invisible local businesses into category leaders.
        </p>
        <div className="mt-1 flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs text-fog backdrop-blur">
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: glowX > 60 ? "#10B981" : "#6366F1" }}
          />
          Live demo render · {Math.floor(current)}s
        </div>
      </div>
    </div>
  );
}

function MiniScene({ current }: { current: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink-950">
      <div className="grid-lines absolute inset-0 opacity-60" />
      <div
        className="absolute h-40 w-40 rounded-full bg-brand-500/30 blur-[60px]"
        style={{ left: `${20 + (current % 30) * 1.5}%`, top: "30%" }}
      />
    </div>
  );
}
