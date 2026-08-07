"use client";

import { useState } from "react";
import { ArrowRight, Search, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AuditStatus = "idle" | "loading" | "success" | "error";

export default function AuditWidget() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<AuditStatus>("idle");
  const [score, setScore] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setStatus("loading");

    // Simulate audit processing
    await new Promise((r) => setTimeout(r, 2000));
    const simulatedScore = Math.floor(Math.random() * 40) + 40;
    setScore(simulatedScore);
    setStatus("success");
  };

  const getGrade = (s: number) => {
    if (s >= 90) return { letter: "A", color: "text-glow-400" };
    if (s >= 80) return { letter: "B", color: "text-brand-400" };
    if (s >= 70) return { letter: "C", color: "text-amber-400" };
    return { letter: "D", color: "text-rose-400" };
  };

  return (
    <section className="relative border-t border-ink-800/60 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sora text-2xl font-bold text-white sm:text-3xl">
            Run Your Free AI Brand Audit
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Enter your business URL and get a comprehensive brand health score
            in seconds.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-lg">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourbusiness.com"
                className="w-full rounded-lg border border-ink-700 bg-ink-900 py-3 pl-9 pr-3 text-sm text-white placeholder-ink-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                required
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading" || !url}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-glow-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:from-brand-500 hover:to-glow-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "loading" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Audit
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {status === "error" && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
              <AlertCircle size={16} className="text-rose-400" />
              <span className="text-xs text-rose-300">
                Could not audit this URL. Please check and try again.
              </span>
            </div>
          )}

          {status === "success" && score !== null && (
            <div className="mt-6 overflow-hidden rounded-xl border border-brand-500/20 bg-ink-900/80">
              <div className="border-b border-ink-800/60 bg-ink-900/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-400">
                    Brand Health Score
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-sora text-3xl font-bold text-white">
                      {score}
                    </span>
                    <span
                      className={cn(
                        "font-sora text-xl font-bold",
                        getGrade(score).color
                      )}
                    >
                      {getGrade(score).letter}
                    </span>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-glow-500 transition-all duration-1000"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 p-4">
                <CheckCircle size={14} className="text-glow-400" />
                <span className="text-xs text-ink-400">
                  Full breakdown available in your dashboard
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
