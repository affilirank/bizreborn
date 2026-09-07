"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Globe,
  Store,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Search,
  TrendingUp,
  RotateCcw,
  Sparkles,
  UserRound,
  Phone,
  Mail,
  Lock,
  MailCheck,
  Star,
} from "lucide-react";
import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
} from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import { Gauge } from "@/components/ui/gauge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AUDIT_STEPS, runAudit, type AuditInput } from "@/lib/audit";
import { createAudit, createLead } from "@/lib/data";
import type { AuditReport } from "@/lib/types";
import { cn } from "@/lib/utils";

type Phase = "form" | "scanning" | "report";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuditWidget() {
  const [phase, setPhase] = React.useState<Phase>("form");
  const [leadCaptured, setLeadCaptured] = React.useState(false);
  const [lead, setLead] = React.useState({
    name: "",
    businessName: "",
    phone: "",
    email: "",
  });
  const [input, setInput] = React.useState<AuditInput>({
    url: "",
    businessName: "",
    gbp: "",
    instagram: "",
    facebook: "",
    tiktok: "",
  });
  const [step, setStep] = React.useState(0);
  const [report, setReport] = React.useState<AuditReport | null>(null);
  const [error, setError] = React.useState("");

  const captureLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !lead.name.trim() ||
      !lead.businessName.trim() ||
      !lead.phone.trim() ||
      !lead.email.trim()
    ) {
      setError("Please fill in every field to unlock your free audit.");
      return;
    }
    if (!EMAIL_RE.test(lead.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    void createLead({ ...lead, source: "audit" }).catch(() => {});
    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, source: "audit" }),
    }).catch(() => {});
    setInput((prev) => ({ ...prev, businessName: lead.businessName.trim() }));
    setLeadCaptured(true);
  };

  const run = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.url.trim()) {
      setError("Enter your website URL to start the scan.");
      return;
    }
    setError("");
    setPhase("scanning");
    setStep(0);
    AUDIT_STEPS.forEach((_, i) => {
      window.setTimeout(() => setStep(i), i * 560);
    });
    window.setTimeout(() => {
      const result = runAudit({
        ...input,
        url: input.url.includes("://") ? input.url : `https://${input.url}`,
      });
      void createAudit(result, {
        contact: {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
        },
        form: input,
      }).catch(() => {});
      setReport(result);
      setPhase("report");
      requestAnimationFrame(() => {
        document
          .getElementById("audit-widget")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }, AUDIT_STEPS.length * 560 + 400);
  };

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-ink-800/70 px-4 py-3 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20";

  return (
    <div className="relative" id="audit-widget">
      <AnimatePresence mode="wait">
        {phase === "form" && !leadCaptured && (
          <motion.form
            key="lead"
            onSubmit={captureLead}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="card-obsidian relative overflow-hidden rounded-3xl p-6 sm:p-10"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/20 blur-[100px]" />
            <div className="relative mb-8 flex flex-col items-start gap-3">
              <Badge variant="brand">
                <Lock className="h-3.5 w-3.5" /> Free Audit · Unlock Step
              </Badge>
              <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Get Your Free AI Brand Audit
              </h3>
              <p className="text-sm text-fog sm:text-base">
                Tell us who to send your full audit report to. It includes a Brand
                Health Score, your local search intelligence, and the exact gaps
                competitors exploit — plus our weekly growth tips.
              </p>
            </div>

            <div className="relative grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <UserRound className="h-3.5 w-3.5 text-brand-300" /> Your Name *
                </label>
                <input
                  required
                  value={lead.name}
                  onChange={(e) => setLead({ ...lead, name: e.target.value })}
                  placeholder="e.g. Sarah Mitchell"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <Store className="h-3.5 w-3.5 text-brand-300" /> Business Name *
                </label>
                <input
                  required
                  value={lead.businessName}
                  onChange={(e) =>
                    setLead({ ...lead, businessName: e.target.value })
                  }
                  placeholder="e.g. Ace Plumbing & Heating"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <Phone className="h-3.5 w-3.5 text-brand-300" /> Phone Number *
                </label>
                <input
                  required
                  type="tel"
                  value={lead.phone}
                  onChange={(e) => setLead({ ...lead, phone: e.target.value })}
                  placeholder="(555) 000-1234"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <Mail className="h-3.5 w-3.5 text-brand-300" /> Email Address *
                </label>
                <input
                  required
                  type="email"
                  value={lead.email}
                  onChange={(e) => setLead({ ...lead, email: e.target.value })}
                  placeholder="you@business.com"
                  className={inputCls}
                />
              </div>
            </div>

            {error && (
              <p className="relative mt-4 flex items-center gap-2 text-sm text-rose-300">
                <AlertTriangle className="h-4 w-4" /> {error}
              </p>
            )}

            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-mute">
                <MailCheck className="h-4 w-4 text-glow-400" /> Your report lands
                in your inbox. No credit card, no sales call.
              </p>
              <Button
                type="submit"
                size="lg"
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                Unlock My Audit
              </Button>
            </div>
          </motion.form>
        )}

        {phase === "form" && leadCaptured && (
          <motion.form
            key="form"
            onSubmit={run}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="card-obsidian rounded-3xl p-6 sm:p-10"
          >
            <div className="mb-8 flex items-center gap-3 rounded-2xl border border-glow-500/20 bg-glow-500/5 px-4 py-3">
              <MailCheck className="h-5 w-5 shrink-0 text-glow-400" />
              <p className="text-xs text-fog sm:text-sm">
                Audit unlocked for <span className="font-semibold text-white">{lead.businessName}</span>{" "}
                — your report is being prepared for{" "}
                <span className="font-semibold text-white">{lead.email}</span>.
              </p>
            </div>
            <div className="mb-8 flex flex-col items-start gap-3">
              <Badge variant="brand">
                <Sparkles className="h-3.5 w-3.5" /> Engine One · 60-Second Scan
              </Badge>
              <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Run Your Free AI Brand Audit
              </h3>
              <p className="text-sm text-fog sm:text-base">
                We build an estimate from the details you provide — your
                website URL, Google Business Profile, socials, reviews, posting
                cadence, and how you capture customers — then score Local SEO,
                social velocity, conversion, and reputation out of 100.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <Globe className="h-3.5 w-3.5 text-brand-300" /> Website URL *
                </label>
                <input
                  type="url"
                  required
                  value={input.url}
                  onChange={(e) => setInput({ ...input, url: e.target.value })}
                  placeholder="https://yourbusiness.com"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <Store className="h-3.5 w-3.5 text-brand-300" /> Business Name
                </label>
                <input
                  value={input.businessName}
                  onChange={(e) => setInput({ ...input, businessName: e.target.value })}
                  placeholder="e.g. Ace Plumbing & Heating"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <Store className="h-3.5 w-3.5 text-brand-300" /> Google Business Profile
                </label>
                <input
                  value={input.gbp}
                  onChange={(e) => setInput({ ...input, gbp: e.target.value })}
                  placeholder="Profile name (if you have one)"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <InstagramIcon className="h-3.5 w-3.5 text-brand-300" /> Instagram
                </label>
                <input
                  value={input.instagram}
                  onChange={(e) => setInput({ ...input, instagram: e.target.value })}
                  placeholder="@yourhandle"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <FacebookIcon className="h-3.5 w-3.5 text-brand-300" /> Facebook
                </label>
                <input
                  value={input.facebook}
                  onChange={(e) => setInput({ ...input, facebook: e.target.value })}
                  placeholder="facebook.com/yourpage"
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <TikTokIcon className="h-3.5 w-3.5 text-brand-300" /> TikTok
                </label>
                <input
                  value={input.tiktok}
                  onChange={(e) => setInput({ ...input, tiktok: e.target.value })}
                  placeholder="@yourtiktok"
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2 mt-1">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">
                  Four quick questions so the estimate matches your reality
                </p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <Star className="h-3.5 w-3.5 text-brand-300" /> How many Google reviews?
                </label>
                <select
                  value={input.reviews ?? ""}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      reviews: (e.target.value || undefined) as AuditInput["reviews"],
                    })
                  }
                  className={inputCls}
                >
                  <option value="">Not sure</option>
                  <option value="none">None or under 10</option>
                  <option value="few">10 – 50</option>
                  <option value="some">50 – 200</option>
                  <option value="many">200+</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <TrendingUp className="h-3.5 w-3.5 text-brand-300" /> How often do you post?
                </label>
                <select
                  value={input.postingFreq ?? ""}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      postingFreq: (e.target.value ||
                        undefined) as AuditInput["postingFreq"],
                    })
                  }
                  className={inputCls}
                >
                  <option value="">Not sure</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">A few times a week</option>
                  <option value="monthly">A few times a month</option>
                  <option value="never">Almost never</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <Search className="h-3.5 w-3.5 text-brand-300" /> How do customers find you?
                </label>
                <select
                  value={input.leadSource ?? ""}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      leadSource: (e.target.value ||
                        undefined) as AuditInput["leadSource"],
                    })
                  }
                  className={inputCls}
                >
                  <option value="">Not sure</option>
                  <option value="google">Google / Map Pack</option>
                  <option value="social">Social media</option>
                  <option value="referrals">Referrals</option>
                  <option value="walkin">Walk-ins</option>
                  <option value="ads">Paid ads</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
                  <MailCheck className="h-3.5 w-3.5 text-brand-300" /> Capture visitor contacts?
                </label>
                <select
                  value={input.crmCapture ?? ""}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      crmCapture: (e.target.value ||
                        undefined) as AuditInput["crmCapture"],
                    })
                  }
                  className={inputCls}
                >
                  <option value="">Not sure</option>
                  <option value="yes">Yes — email/SMS list</option>
                  <option value="no">No — not really</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="mt-4 flex items-center gap-2 text-sm text-rose-300">
                <AlertTriangle className="h-4 w-4" /> {error}
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-mute">
                  Free forever. No credit card. No sales call required.
                </p>
                <p className="text-[11px] text-mute/70">
                  This is an estimate built from your answers + on-page signals — not a live crawl of your site.
                </p>
              </div>
              <Button
                type="submit"
                size="lg"
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                Scan My Brand Now
              </Button>
            </div>
          </motion.form>
        )}

        {phase === "scanning" && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="card-obsidian relative overflow-hidden rounded-3xl p-8 sm:p-12"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/20 blur-[100px]" />
            <div className="relative flex flex-col items-center gap-8">
              <div className="flex h-20 w-20 items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                  className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-400/30 border-t-brand-400"
                >
                  <Search className="h-6 w-6 text-brand-300" />
                </motion.div>
              </div>

              <div className="w-full max-w-lg space-y-3">
                {AUDIT_STEPS.map((s, i) => (
                  <div
                    key={s.label}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border px-4 py-3 transition-all duration-300",
                      i < step
                        ? "border-glow-500/30 bg-glow-500/5"
                        : i === step
                          ? "border-brand-400/40 bg-brand-500/10"
                          : "border-white/5 opacity-40",
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                      {i < step ? (
                        <CheckCircle2 className="h-5 w-5 text-glow-400" />
                      ) : i === step ? (
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="h-2.5 w-2.5 rounded-full bg-brand-400"
                        />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{s.label}</p>
                      <p className="text-xs text-fog">{s.detail}</p>
                    </div>
                    {i === step && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-300">
                        Scanning…
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {phase === "report" && report && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <AuditReportView report={report} onReset={() => setPhase("form")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AuditReportView({
  report,
  onReset,
}: {
  report: AuditReport;
  onReset?: () => void;
}) {
  const fixIds = React.useMemo(() => {
    const ids: number[] = [];
    for (const f of report.fixes) {
      const m = f.match(/service #(\d+)/i);
      if (m) ids.push(parseInt(m[1], 10));
    }
    return ids;
  }, [report.fixes]);

  const builderHref = `/services${fixIds.length ? `?preselect=${fixIds.join(",")}` : ""}`;

  return (
    <>
      {/* Hero score */}
      <div className="card-obsidian relative overflow-hidden rounded-3xl p-8 sm:p-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-500/15 blur-[100px]" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[auto_1fr]">
          <Gauge score={report.healthScore} label="Brand Health Score" size={168} strokeWidth={12} />
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Badge variant={report.healthScore >= 60 ? "emerald" : "rose"}>
                {report.healthScore >= 60 ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                Grade {report.grade}
              </Badge>
              <Badge variant="muted">{report.id}</Badge>
              <Badge variant="muted">
                {new Date(report.createdAt).toLocaleString()}
              </Badge>
            </div>
            <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {report.healthScore >= 60
                ? `${report.businessName || "Your brand"} has a foundation — but it's leaking leads.`
                : `We found why ${report.businessName || "your brand"} is invisible.`}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fog sm:text-base">
              {report.painPoints[0]}{" "}
              {report.painPoints.length > 1
                ? `Plus ${report.painPoints.length - 1} more gaps your competitors exploit every day.`
                : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {report.breakdowns.map((b, i) => (
          <motion.div
            key={b.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
          >
            <Card className="h-full p-5">
              <Gauge score={b.score} label={b.label} size={96} strokeWidth={7} />
              <p className="mt-3 text-center text-xs text-fog">{b.description}</p>
              {b.issues[0] ? (
                <p
                  className={cn(
                    "mt-2 rounded-lg px-2.5 py-1.5 text-center text-[11px] font-medium",
                    b.score < 40
                      ? "bg-rose-500/10 text-rose-300"
                      : b.score < 65
                        ? "bg-amber-500/10 text-amber-300"
                        : "bg-glow-500/10 text-glow-400",
                  )}
                >
                  {b.issues[0]}
                </p>
              ) : null}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pain points */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 sm:p-7">
          <h4 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <AlertTriangle className="h-5 w-5 text-rose-400" /> Specific Pain Points Found
          </h4>
          <ul className="space-y-3">
            {report.painPoints.map((p, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex gap-3 rounded-xl border border-white/5 bg-ink-850/60 px-4 py-3"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-[10px] font-bold text-rose-300">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-fog">{p}</p>
              </motion.li>
            ))}
          </ul>
        </Card>

        <Card className="p-6 sm:p-7">
          <h4 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <TrendingUp className="h-5 w-5 text-glow-400" /> Local Search Intelligence
          </h4>
          <div className="space-y-3">
            {report.keywordSearches.map((k) => (
              <div
                key={k.term}
                className="rounded-xl border border-white/5 bg-ink-850/60 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-mist">{k.term}</p>
                  <span className="text-xs font-semibold text-glow-400">
                    {k.volume.toLocaleString()} / mo
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-400 to-glow-400"
                      style={{ width: `${Math.min(100, k.volume / 40)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-mute">
                    Difficulty {k.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* CTA to builder */}
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-glow-500/15 blur-[80px]" />
        <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h4 className="font-display text-xl font-bold text-white sm:text-2xl">
              Fix These Gaps Automatically.
            </h4>
            <p className="mt-1 max-w-xl text-sm text-fog">
              {fixIds.length
                ? `${fixIds.length} specific modules from your audit have been pre-loaded into the service builder.`
                : "Your recommended modules are one click away — pick them, price them, launch them."}
            </p>
            <p className="mt-3 max-w-xl text-[11px] text-mute/80">
              This report is an estimate built from your answers and on-page
              signals — not a live crawl of your site. Your strategist
              re-verifies every gap during onboarding.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            {onReset ? (
              <Button variant="ghost" size="md" onClick={onReset} leftIcon={<RotateCcw className="h-4 w-4" />}>
                Re-scan
              </Button>
            ) : null}
            <Button asChild size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
              <Link href={builderHref}>Fix These Gaps</Link>
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
