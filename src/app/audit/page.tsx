import { AuditWidget } from "@/components/audit/audit-widget";
import { Container } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Radar, Gauge, ScrollText, ArrowRight } from "lucide-react";

const CHECKLIST = [
  "Brand Health Score out of 100",
  "4 breakdown scores: Local SEO, Content Velocity, Conversion, Reputation",
  "Specific pain-point identifiers with exact fixes",
  "Local keyword intelligence with volume & difficulty",
];

export default function AuditPage() {
  return (
    <div className="relative pt-32 pb-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand-500/12 blur-[160px]" />
      </div>

      <Container className="relative">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <Badge variant="brand" className="mb-4">
            <Radar className="h-3.5 w-3.5" /> Engine One · Free · 60 Seconds
          </Badge>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            The AI Brand Audit Your{" "}
            <span className="text-gradient-brand">Competitor Won&apos;t Run.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-fog sm:text-lg">
            Submit your website and social handles. Our engine simulates a
            multi-point technical &amp; visual audit and hands you a Brand Health
            Score with the exact leaks costing you customers.
          </p>
        </div>

        <div className="mx-auto mb-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {CHECKLIST.map((c) => (
            <span key={c} className="flex items-center gap-1.5 text-xs text-fog">
              <ArrowRight className="h-3 w-3 text-brand-300" /> {c}
            </span>
          ))}
        </div>

        <AuditWidget />

        <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-3">
          {[
            { icon: Gauge, title: "Scored, not guessed", body: "Every metric computed from your actual inputs." },
            { icon: ScrollText, title: "Actionable report", body: "Pain points mapped to specific service fixes." },
            { icon: Radar, title: "Competitive lens", body: "Your numbers benchmarked against local rivals." },
          ].map((f) => (
            <div key={f.title} className="card-obsidian flex flex-col gap-2 rounded-2xl p-5">
              <f.icon className="h-5 w-5 text-brand-300" />
              <p className="text-sm font-semibold text-white">{f.title}</p>
              <p className="text-xs text-fog">{f.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
