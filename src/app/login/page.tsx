"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail, Lock, LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950/20 via-ink-950 to-ink-950" />
      <div className="relative mx-auto w-full max-w-sm px-4">
        <div className="rounded-xl border border-ink-800/60 bg-ink-900/50 p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-glow-500 shadow-lg shadow-brand-500/20">
              <span className="text-lg font-bold text-white">BR</span>
            </div>
            <h1 className="font-sora text-xl font-bold text-white">
              {isSignUp ? "Create Account" : "Sign In"}
            </h1>
            <p className="mt-1 text-xs text-ink-400">
              {isSignUp
                ? "Join Biz Reborn Marketing"
                : "Welcome back to the portal"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-300">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 py-3 pl-9 pr-3 text-sm text-white placeholder-ink-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-300">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 py-3 pl-9 pr-3 text-sm text-white placeholder-ink-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-glow-500/20 bg-glow-500/5 p-3 text-xs text-glow-300">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-glow-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:from-brand-500 hover:to-glow-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus size={16} />
                  Sign Up
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="text-xs text-ink-400 transition-colors hover:text-brand-400"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
