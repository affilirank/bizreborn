"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, KeyRound, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { demoEnabled, getSessionId } from "@/lib/db";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const isLogin = mode === "login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      if (supabase) {
        if (isLogin) {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: "/dashboard" },
          });
          if (error) throw error;
        }
        router.push("/dashboard");
        router.refresh();
      } else {
        // Demo mode
        await new Promise((r) => setTimeout(r, 600));
        const uid = getSessionId();
        localStorage.setItem("biz-reborn-demo-user", JSON.stringify({ email, uid }));
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const uid = getSessionId();
    localStorage.setItem(
      "biz-reborn-demo-user",
      JSON.stringify({ email: "client@bizreborn.io", uid }),
    );
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute left-1/2 top-1/3 h-96 w-[600px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card-obsidian rounded-3xl p-8">
          <h1 className="font-display text-2xl font-bold text-white">
            {isLogin ? "Welcome back." : "Create your account."}
          </h1>
          <p className="mt-1 text-sm text-fog">
            {isLogin
              ? "Sign in to your Biz Reborn command center."
              : "Track audits, fulfillments, and ROI in one place."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fog">
                <Mail className="h-3.5 w-3.5" /> Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-4 py-3 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fog">
                <Lock className="h-3.5 w-3.5" /> Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-4 py-3 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>

          {demoEnabled() && (
            <>
              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-mute">
                <span className="h-px flex-1 bg-white/10" /> demo mode
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <Button
                variant="emerald"
                className="w-full"
                size="lg"
                loading={loading}
                onClick={demoLogin}
                leftIcon={<KeyRound className="h-4 w-4" />}
              >
                Enter demo dashboard
              </Button>
            </>
          )}

          <p className="mt-6 text-center text-sm text-fog">
            {isLogin ? "New to Biz Reborn?" : "Already have an account?"}{" "}
            <Link
              href={isLogin ? "/signup" : "/login"}
              className="inline-flex items-center gap-1 font-semibold text-brand-300 hover:text-white"
            >
              {isLogin ? "Create an account" : "Sign in"} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
