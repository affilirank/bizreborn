import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check, CheckCircle2, FileText, Sparkles, TrendingUp } from "lucide-react";
import { Container } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { getReportByToken } from "@/lib/portal";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const report = await getReportByToken(token);
  return report
    ? {
        title: `${report.month ? report.month + " " : ""}Monthly Report — ${report.clientName}`,
      }
    : { title: "Monthly Report" };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await getReportByToken(token);
  if (!report) notFound();

  return (
    <div className="relative min-h-screen pb-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute left-1/2 top-0 h-96 w-[700px] -translate-x-1/2 rounded-full bg-glow-500/10 blur-[140px]" />
      </div>

      <header className="relative border-b border-white/5">
        <Container className="flex items-center justify-between py-5">
          <Logo />
          <Badge variant="emerald" className="px-3 py-1.5">
            <FileText className="h-3 w-3" /> Monthly report
          </Badge>
        </Container>
      </header>

      <Container className="relative mt-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-glow-400">
          {report.month ? `${report.month} ` : ""}Performance report
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-white sm:text-4xl">
          {report.clientName}
        </h1>
        {report.headline && (
          <p className="mt-3 max-w-2xl text-base text-fog">{report.headline}</p>
        )}

        {/* Metrics */}
        {report.metrics.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {report.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-white/8 bg-ink-850/60 p-4"
              >
                <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-mute">
                  {m.label}
                </p>
                <p className="mt-1 truncate font-display text-2xl font-extrabold text-glow-400">
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Highlights */}
        {report.highlights.length > 0 && (
          <section className="mt-8 rounded-3xl border border-white/8 bg-ink-850/60 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <TrendingUp className="h-5 w-5 text-glow-400" /> What moved the needle
            </h2>
            <ul className="mt-4 space-y-3">
              {report.highlights.map((h) => (
                <li key={h} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-glow-400" />
                  <span className="text-sm text-mist">{h}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Deliverables */}
        {report.deliverables.length > 0 && (
          <section className="mt-6 rounded-3xl border border-white/8 bg-ink-850/60 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <Sparkles className="h-5 w-5 text-brand-300" /> Delivered this month
            </h2>
            <ul className="mt-4 space-y-2.5">
              {report.deliverables.map((d) => (
                <li
                  key={d}
                  className="flex items-start gap-3 rounded-xl border border-white/5 bg-ink-800/40 px-4 py-3"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-glow-400" />
                  <span className="text-sm text-mist">{d}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Next steps */}
        {report.nextSteps.length > 0 && (
          <section className="mt-6 rounded-3xl border border-brand-500/20 bg-brand-500/5 p-6 sm:p-8">
            <h2 className="font-display text-lg font-bold text-white">
              Up next
            </h2>
            <ul className="mt-4 space-y-2.5">
              {report.nextSteps.map((n) => (
                <li key={n} className="flex items-start gap-3 text-sm text-fog">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                  {n}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 flex flex-col items-center gap-1 border-t border-white/5 pt-6 text-center">
          <p className="text-sm font-semibold text-mist">
            Prepared with care by the Biz Reborn team
          </p>
          <p className="text-xs text-mute">
            Questions? Reply to the email that sent this, or ask your dedicated
            manager.
          </p>
        </div>
      </Container>
    </div>
  );
}
