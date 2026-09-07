"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { Prospect } from "@/lib/supabase-types";
import { fmtNumber } from "@/lib/utils";

/**
 * In-browser pitch "video".
 *
 * Plays a 45-second, five-scene animated pitch (hook → flaws → competitor gap
 * → projected ROI → CTA) built from the prospect's audit data, narrated by the
 * generated voiceover when one exists, otherwise by the browser's speech
 * engine. When a real MP4 was rendered we simply play that instead.
 */

export type PitchData = Pick<
  Prospect,
  | "business_name"
  | "city"
  | "google_rating"
  | "review_count"
  | "unanswered_reviews"
  | "competitor_name"
  | "competitor_reviews"
  | "audit_report"
  | "roi_projection"
  | "pitch_script"
  | "voiceover_url"
  | "video_url"
  | "thumbnail_url"
>;

const SCENES = [8, 11, 9, 10, 7]; // seconds — 45s total
const TOTAL = SCENES.reduce((a, b) => a + b, 0);
const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString("en-US")}`;

export function PitchPlayer({
  p,
  contactEmail,
  autoPlay = false,
  className = "",
}: {
  p: PitchData;
  contactEmail: string;
  autoPlay?: boolean;
  className?: string;
}) {
  const isMp4 = Boolean(p.video_url && /\.(mp4|webm|mov)(\?|$)/i.test(p.video_url));
  if (isMp4) {
    return (
      <video
        src={p.video_url ?? undefined}
        poster={p.thumbnail_url || undefined}
        controls
        autoPlay={autoPlay}
        muted={autoPlay}
        playsInline
        className={`aspect-[9/16] w-full rounded-2xl border border-ink-800 bg-black object-contain ${className}`}
      />
    );
  }
  return <ScenePlayer p={p} contactEmail={contactEmail} autoPlay={autoPlay} className={className} />;
}

function ScenePlayer({
  p,
  contactEmail,
  autoPlay,
  className,
}: {
  p: PitchData;
  contactEmail: string;
  autoPlay: boolean;
  className: string;
}) {
  const [t, setT] = useState(0); // elapsed seconds
  const [playing, setPlaying] = useState(autoPlay);
  const [started, setStarted] = useState(autoPlay);
  const [muted, setMuted] = useState(autoPlay);
  const raf = useRef<number | null>(null);
  const startedAt = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechOk = typeof window !== "undefined" && "speechSynthesis" in window;

  const scene = useMemo(() => {
    let acc = 0;
    for (let i = 0; i < SCENES.length; i++) {
      acc += SCENES[i];
      if (t < acc) return i;
    }
    return SCENES.length - 1;
  }, [t]);

  // Timer loop
  useEffect(() => {
    if (!playing) return;
    startedAt.current = performance.now() - t * 1000;
    const tick = () => {
      const next = (performance.now() - startedAt.current) / 1000;
      if (next >= TOTAL) {
        setT(TOTAL);
        setPlaying(false);
        return;
      }
      setT(next);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Narration: voiceover file if present, else Web Speech
  useEffect(() => {
    if (!started) return;
    const audio = audioRef.current;
    if (p.voiceover_url && audio) {
      audio.muted = muted;
      if (playing) void audio.play().catch(() => {});
      else audio.pause();
      return;
    }
    if (!speechOk) return;
    const synth = window.speechSynthesis;
    if (!playing || muted) {
      synth.cancel();
      return;
    }
    if (p.pitch_script && t < 1) {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(p.pitch_script);
      u.rate = 1.02;
      u.pitch = 1;
      const voices = synth.getVoices();
      const pick =
        voices.find((v) => /en-US/i.test(v.lang) && /Google|Microsoft|Samantha|Daniel/i.test(v.name)) ||
        voices.find((v) => /en/i.test(v.lang));
      if (pick) u.voice = pick;
      synth.speak(u);
    } else if (synth.paused) {
      synth.resume();
    }
    return () => {
      if (!playing) synth.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, muted, started]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const start = () => {
    setStarted(true);
    if (t >= TOTAL) setT(0);
    setPlaying(true);
  };
  const replay = () => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setT(0);
    setStarted(true);
    setPlaying(true);
  };

  const flaws = (p.audit_report?.pain_points ?? []).slice(0, 3);
  const roi = p.roi_projection;
  const rating = p.google_rating ?? 0;
  const reviews = p.review_count ?? 0;
  const comp = p.competitor_reviews ?? 0;
  const pct = Math.max(6, Math.min(100, Math.round((reviews / Math.max(comp, 1)) * 100)));

  return (
    <div
      className={`@container relative aspect-[9/16] w-full select-none overflow-hidden rounded-2xl border border-ink-800 bg-[#0B0F17] font-sora text-white ${className}`}
    >
      {p.voiceover_url && <audio ref={audioRef} src={p.voiceover_url} preload="auto" />}

      {/* Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.35),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.2),transparent_60%)]" />
      <div className="absolute inset-0 grid-lines opacity-30" />

      {/* Scenes */}
      <div className="absolute inset-0 flex flex-col justify-center p-[7%]">
        {scene === 0 && (
          <div key="s0">
            <p className="animate-pp-rise text-[3.2cqw] font-semibold uppercase tracking-[0.25em] text-brand-300">
              Biz Reborn Marketing · Growth Audit
            </p>
            <h2 className="animate-pp-rise mt-4 text-[9cqw] font-black leading-[1.05] [animation-delay:200ms]">
              Notice something missing on Google, {p.business_name}?
            </h2>
            <div className="animate-pp-pop mt-8 flex items-end gap-4 [animation-delay:900ms]">
              <span className="text-[22cqw] font-black leading-none">{rating.toFixed(1)}</span>
              <div className="pb-3">
                <p className="text-[5cqw] text-amber-400">★★★★★</p>
                <p className="text-[3.6cqw] text-ink-300">{reviews} reviews</p>
              </div>
            </div>
            {p.audit_report && (
              <div className="animate-pp-pop mt-8 inline-flex items-center gap-3 rounded-full border border-rose-400/40 bg-rose-500/10 px-5 py-2 [animation-delay:1600ms]">
                <span className="text-[6cqw] font-black text-rose-300">{p.audit_report.grade}</span>
                <span className="text-[3.4cqw] text-rose-200">brand grade · {p.audit_report.health_score}/100</span>
              </div>
            )}
          </div>
        )}

        {scene === 1 && (
          <div key="s1">
            <p className="animate-pp-rise text-[3.2cqw] font-semibold uppercase tracking-[0.25em] text-rose-300">
              What&apos;s holding you back
            </p>
            <h2 className="animate-pp-rise mt-3 text-[7.5cqw] font-black leading-tight [animation-delay:150ms]">
              We found {flaws.length || 3} flaws costing you customers
            </h2>
            <ul className="mt-7 space-y-4">
              {(flaws.length ? flaws : ["Unanswered reviews are dragging your ranking down."]).map((f, i) => (
                <li
                  key={i}
                  className="animate-pp-rise flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-[3.7cqw] leading-snug text-ink-100"
                  style={{ animationDelay: `${700 + i * 1800}ms` }}
                >
                  <span className="mt-0.5 flex h-[6cqw] w-[6cqw] shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-[3.4cqw] font-bold text-rose-300">
                    {i + 1}
                  </span>
                  {shorten(f)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {scene === 2 && (
          <div key="s2">
            <p className="animate-pp-rise text-[3.2cqw] font-semibold uppercase tracking-[0.25em] text-amber-300">
              The cost
            </p>
            <h2 className="animate-pp-rise mt-3 text-[7.5cqw] font-black leading-tight [animation-delay:150ms]">
              You&apos;re losing calls to {p.competitor_name ?? "the market leader"} daily.
            </h2>
            <div className="mt-9 space-y-6">
              <Bar label={p.business_name} value={reviews} pct={pct} color="#6366F1" delay={600} />
              <Bar label={p.competitor_name ?? "Market leader"} value={comp} pct={100} color="#F87171" delay={1400} />
            </div>
            {roi && (
              <p className="animate-pp-pop mt-9 text-[4.2cqw] leading-snug text-ink-200 [animation-delay:3200ms]">
                That gap is leaking about{" "}
                <span className="font-black text-rose-300">{money(roi.lost_monthly)}/mo</span> in
                revenue to them.
              </p>
            )}
          </div>
        )}

        {scene === 3 && (
          <div key="s3">
            <p className="animate-pp-rise text-[3.2cqw] font-semibold uppercase tracking-[0.25em] text-glow-400">
              The Biz Reborn fix
            </p>
            <h2 className="animate-pp-rise mt-3 text-[7.5cqw] font-black leading-tight [animation-delay:150ms]">
              Here&apos;s what the fix is projected to return.
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <Stat label="Extra leads / mo" value={`+${fmtNumber(roi?.leads_per_month ?? 0)}`} delay={700} />
              <Stat label="New revenue / mo" value={money(roi?.projected_monthly)} delay={1200} accent />
              <Stat label="Return on spend" value={`${roi?.roas ?? 0}x`} delay={1700} />
              <Stat
                label="Payback"
                value={roi?.payback_months ? `${roi.payback_months} mo` : "Immediate"}
                delay={2200}
              />
            </div>
            <p className="animate-pp-rise mt-6 text-[3.3cqw] text-ink-400 [animation-delay:3000ms]">
              Model: estimated leads × avg. customer value ({money(roi?.acv ?? 500)}) × 35% close rate.
            </p>
          </div>
        )}

        {scene === 4 && (
          <div key="s4" className="text-center">
            <p className="animate-pp-pop text-[5cqw] text-amber-400">★★★★★</p>
            <h2 className="animate-pp-rise mt-4 text-[8cqw] font-black leading-tight [animation-delay:200ms]">
              Claim Your Google Top 3 Spot
            </h2>
            <p className="animate-pp-rise mt-4 text-[4cqw] text-ink-200 [animation-delay:700ms]">
              Free 10-minute strategy call
            </p>
            <div className="animate-pp-pop mx-auto mt-8 rounded-2xl border border-brand-400/40 bg-brand-500/15 px-6 py-4 [animation-delay:1200ms]">
              <p className="text-[4.2cqw] font-bold text-white">{contactEmail}</p>
              <p className="mt-1 text-[3.4cqw] text-brand-200">www.bizreborn.com</p>
            </div>
            <p className="animate-pp-rise mt-8 text-[3cqw] uppercase tracking-[0.25em] text-ink-400 [animation-delay:1800ms]">
              Biz Reborn Marketing
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="absolute inset-x-0 top-0 flex gap-1 p-3">
        {SCENES.map((d, i) => {
          const start = SCENES.slice(0, i).reduce((a, b) => a + b, 0);
          const fill = Math.max(0, Math.min(1, (t - start) / d));
          return (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full bg-white" style={{ width: `${fill * 100}%` }} />
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => (playing ? setPlaying(false) : start())}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={replay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
            aria-label="Replay"
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <button
          onClick={() => setMuted((m) => !m)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Big play overlay */}
      {!playing && (
        <button
          onClick={start}
          className="absolute inset-0 flex items-center justify-center bg-black/35 transition hover:bg-black/25"
          aria-label="Play pitch"
        >
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/90 text-ink-950 shadow-2xl">
            <Play size={40} className="ml-1" />
          </span>
          {!started && (
            <span className="absolute bottom-20 rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white">
              Watch your 45-second audit {muted ? "" : "· with narration"}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function shorten(s: string, max = 120) {
  const clean = s.replace(/\s*\([^)]*service #\d+[^)]*\)/gi, "");
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function Bar({
  label,
  value,
  pct,
  color,
  delay,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
  delay: number;
}) {
  return (
    <div className="animate-pp-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between text-[3.6cqw]">
        <span className="font-semibold">{label}</span>
        <span className="text-ink-300">{fmtNumber(value)} reviews</span>
      </div>
      <div className="mt-2 h-[4cqw] overflow-hidden rounded-lg bg-white/10">
        <div
          className="animate-pp-grow h-full origin-left rounded-lg"
          style={{ width: `${pct}%`, backgroundColor: color, animationDelay: `${delay + 200}ms` }}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  delay,
  accent,
}: {
  label: string;
  value: string;
  delay: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`animate-pp-pop rounded-2xl border p-4 ${
        accent ? "border-glow-400/40 bg-glow-500/15" : "border-white/10 bg-white/5"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className={`text-[6.5cqw] font-black leading-none ${accent ? "text-glow-300" : "text-white"}`}>{value}</p>
      <p className="mt-2 text-[3cqw] uppercase tracking-wider text-ink-300">{label}</p>
    </div>
  );
}
