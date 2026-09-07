import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Container } from "@/components/ui/section";
import { ArrowRight } from "lucide-react";

const PILLAR_LINKS = [
  { label: "Local SEO & Maps Dominance", href: "/services#local-seo" },
  { label: "Short-Form Video Production", href: "/services#short-form-video" },
  { label: "Websites, Funnels & Landing Pages", href: "/services#websites-funnels" },
  { label: "Reputation & Review Automation", href: "/services#reputation-reviews" },
  { label: "SMS & Lead Retention", href: "/services#sms-retention" },
  { label: "Paid Ads & Geo-Fencing", href: "/services#paid-ads" },
];

const COMPANY = [
  { label: "AI Brand Audit", href: "/audit" },
  { label: "Service Menu", href: "/services" },
  { label: "Blog & Guides", href: "/blog" },
  { label: "Contact Us", href: "/contact" },
  { label: "Client Portal", href: "/dashboard" },
  { label: "Admin Portal", href: "/admin" },
  { label: "Sign In", href: "/login" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/8 bg-ink-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="flex flex-col gap-5">
            <Logo />
            <p className="max-w-sm text-sm leading-relaxed text-fog">
              AI-driven local audit systems, high-converting content infrastructure,
              and modular marketing pipelines engineered to dominate your local
              market — without agency lock-in.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-glow-500/25 bg-glow-500/10 px-4 py-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-glow-400" />
              <p className="text-xs font-medium text-glow-400">
                Systems online · New client slots opening monthly
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">
              Engines
            </h4>
            {COMPANY.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group inline-flex w-fit items-center gap-1.5 text-sm text-fog transition-colors hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 text-brand-400 opacity-0 transition-opacity group-hover:opacity-100" />
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">
              Service Pillars
            </h4>
            {PILLAR_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-fog transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">
              Start Now
            </h4>
            <p className="text-sm text-fog">
              Get your Brand Health Score in 60 seconds. Free, no credit card,
              no call required.
            </p>
            <Link
              href="/audit"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_rgba(99,102,241,0.8)] transition hover:bg-brand-400"
            >
              Run Free AI Brand Audit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-mute sm:flex-row">
          <p>© {new Date().getFullYear()} Biz Reborn Marketing. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <span className="cursor-pointer transition-colors hover:text-fog">Privacy</span>
            <span className="cursor-pointer transition-colors hover:text-fog">Terms</span>
            <span className="cursor-pointer transition-colors hover:text-fog">Careers</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
