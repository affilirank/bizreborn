import Link from "next/link";
import { SITE } from "@/lib/config";

const links = [
  { href: "/audit", label: "AI Brand Audit" },
  { href: "/services", label: "Service Menu" },
  { href: "/book", label: "Book a Call" },
  { href: "/blog", label: "Blog & Guides" },
  { href: "/contact", label: "Contact Us" },
  { href: "/dashboard", label: "Client Portal" },
  { href: "/admin", label: "Admin Portal" },
  { href: "/login", label: "Sign In" },
];

const pillars = [
  "Brand Audits",
  "Reputation Management",
  "SEO & Local Search",
  "Social Media",
  "Paid Ads",
  "Website Design",
];

export default function Footer() {
  return (
    <footer className="border-t border-ink-800/60 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-glow-500">
                <span className="text-sm font-bold text-white">BR</span>
              </div>
              <span className="text-sm font-bold text-white">Biz Reborn</span>
            </Link>
            <p className="text-xs leading-relaxed text-ink-400">
              AI-driven local audit systems that help service businesses eliminate
              blind spots, dominate their market, and grow predictably.
            </p>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-glow-500" />
              </span>
              <span className="text-[11px] font-medium text-glow-400">
                Systems online
              </span>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold tracking-wider text-mist uppercase">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-ink-400 transition-colors hover:text-brand-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold tracking-wider text-mist uppercase">
              Service Pillars
            </h4>
            <ul className="space-y-2.5">
              {pillars.map((p) => (
                <li key={p}>
                  <span className="text-xs text-ink-400">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start gap-4">
            <h4 className="text-xs font-semibold tracking-wider text-mist uppercase">
              Ready to grow?
            </h4>
            <p className="text-xs leading-relaxed text-ink-400">
              Run a free AI brand audit and see exactly where your business
              stands against local competitors.
            </p>
            <Link
              href="/audit"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-glow-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:from-brand-500 hover:to-glow-500"
            >
              Start Now
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-800/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-[11px] text-ink-500">
            &copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="text-[11px] text-ink-600">
            Built with purpose in Vero Beach, FL
          </p>
        </div>
      </div>
    </footer>
  );
}
