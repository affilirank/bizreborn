import Link from "next/link";
import { PILLARS } from "@/data/services";
import type { PillarId } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { BlogArticle } from "@/data/blog";

export const PILLAR_SHORT: Record<PillarId, string> = {
  "local-seo": "Local SEO",
  "short-form-video": "Video",
  "websites-funnels": "Websites & Funnels",
  "reputation-reviews": "Reputation",
  "sms-retention": "SMS & Retention",
  "paid-ads": "Paid Ads",
  "social-branding": "Social & Branding",
  "digital-products": "Digital Products",
  "commercial-real-estate": "CRE & Trade",
  "automation-metrics": "Automation",
};

export const PILLAR_ACCENT: Record<PillarId, string> = Object.fromEntries(
  PILLARS.map((p) => [p.id, p.accent]),
) as Record<PillarId, string>;

export function pillarShort(id: PillarId): string {
  return PILLAR_SHORT[id] ?? id;
}

export function pillarAccent(id: PillarId): string {
  return PILLAR_ACCENT[id] ?? "from-brand-500 to-violet-600";
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BlogBadge({
  article,
  className,
}: {
  article: BlogArticle;
  className?: string;
}) {
  const isCategory = article.serviceId === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-gradient-to-r px-3 py-1 text-[11px] font-semibold text-white",
        isCategory ? "from-fuchsia-500 to-brand-500" : pillarAccent(article.pillar),
        className,
      )}
    >
      {isCategory
        ? `${article.serviceTitle} Guide`
        : `Pillar ${article.pillarNumber} · ${pillarShort(article.pillar)}`}
    </span>
  );
}

export function BlogCard({
  article,
  className,
}: {
  article: BlogArticle;
  className?: string;
}) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className={cn(
        "group flex flex-col rounded-2xl border border-white/10 bg-ink-850/80 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-[0_20px_60px_-20px_rgba(99,102,241,0.35)]",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <BlogBadge article={article} />
        <span className="text-xs tabular-nums text-mute">
          {article.readTime} min read
        </span>
      </div>

      <h3 className="font-display text-lg font-bold leading-snug text-white transition-colors group-hover:text-brand-200">
        {article.title}
      </h3>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-fog">
        {article.metaDescription}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4 text-xs text-mute">
        <span>{formatDate(article.published)}</span>
        <span className="inline-flex items-center gap-1 font-medium text-brand-300 transition-colors group-hover:text-brand-200">
          Read guide
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
