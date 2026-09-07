import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Clock, BookOpen } from "lucide-react";
import { Container, Eyebrow } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import {
  fetchAllSlugs,
  fetchPostBySlug,
  fetchPublishedPosts,
} from "@/lib/blog-db";
import {
  BlogCard,
  BlogBadge,
  pillarShort,
  formatDate,
} from "@/components/blog/blog-card";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await fetchAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchPostBySlug(slug);
  if (!article) return {};
  const url = `/blog/${article.slug}`;
  return {
    title: article.metaTitle,
    description: article.metaDescription,
    keywords: article.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.metaDescription,
      url,
      type: "article",
      publishedTime: article.published,
      modifiedTime: article.updated,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await fetchPostBySlug(slug);
  if (!article) notFound();

  const all = await fetchPublishedPosts();
  const related = all
    .filter((a) => a.pillar === article.pillar && a.slug !== article.slug)
    .slice(0, 3);

  const toc = article.sections.map((s) => s.heading);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.published,
    dateModified: article.updated,
    keywords: article.keywords,
    publisher: { "@type": "Organization", name: "Biz Reborn Marketing" },
    mainEntityOfPage: `https://www.bizreborn.com/blog/${article.slug}`,
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="relative pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute -top-20 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[160px]" />
      </div>

      <Container className="relative">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs text-mute" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors hover:text-white">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href="/blog" className="transition-colors hover:text-white">
            Blog
          </Link>
          <span aria-hidden>/</span>
          <span className="text-fog">{article.serviceTitle}</span>
        </nav>

        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main column */}
          <article className="min-w-0">
            <BlogBadge article={article} className="mb-5" />
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
              {article.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-mute">
              <span>{formatDate(article.published)}</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {article.readTime} min read
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> 100-module service library
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {article.keywords.slice(0, 5).map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-fog"
                >
                  {k}
                </span>
              ))}
            </div>

            <p className="mt-10 text-lg leading-relaxed text-fog">
              {article.intro}
            </p>

            {article.sections.map((section, i) => (
              <section key={i} id={`sec-${i + 1}`} className="mt-10">
                <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                  {section.heading}
                </h2>
                {section.paragraphs.map((p, j) => (
                  <p
                    key={j}
                    className="mt-4 text-base leading-relaxed text-fog"
                  >
                    {p}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-5 space-y-3">
                    {section.bullets.map((b, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-3 rounded-xl border border-white/8 bg-ink-850/60 px-4 py-3 text-[15px] leading-relaxed text-fog"
                      >
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: "var(--color-brand-400)" }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            {/* FAQ */}
            <section className="mt-12">
              <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                Frequently Asked Questions
              </h2>
              <div className="mt-6 space-y-3">
                {article.faq.map((f, i) => (
                  <details
                    key={i}
                    className="group rounded-2xl border border-white/10 bg-ink-850/60 transition-colors open:border-brand-500/40"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
                      {f.q}
                      <span className="text-brand-300 transition-transform duration-200 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="px-5 pb-5 text-[15px] leading-relaxed text-fog">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            {/* CTA */}
            <div className="mt-12 overflow-hidden rounded-3xl border border-brand-500/25 bg-gradient-to-br from-brand-500/15 via-ink-850 to-ink-850 p-8 sm:p-10">
              <h3 className="font-display text-2xl font-bold text-white">
                {article.ctaHeadline}
              </h3>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-fog">
                {article.ctaBody}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="md">
                  <Link href="/services">
                    See Pricing & Launch <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="md">
                  <Link href="/audit">Run the Free AI Audit</Link>
                </Button>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="top-24 space-y-8 lg:sticky">
            <nav
              className="rounded-2xl border border-white/10 bg-ink-850/60 p-6"
              aria-label="Table of contents"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                On this page
              </p>
              <ol className="mt-4 space-y-2.5">
                {toc.map((h, i) => (
                  <li key={i}>
                    <a
                      href={`#sec-${i + 1}`}
                      className="text-sm text-fog transition-colors hover:text-white"
                    >
                      {h}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="rounded-2xl border border-white/10 bg-ink-850/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                Related guides
              </p>
              <div className="mt-4 space-y-4">
                {related.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/blog/${a.slug}`}
                    className="group block"
                  >
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-white transition-colors group-hover:text-brand-200">
                      {a.title}
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      {a.readTime} min read
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-glow-500/25 bg-glow-500/10 p-6">
              <p className="font-display text-lg font-bold text-white">
                Not sure where to start?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-fog">
                The free AI brand audit scores your local visibility in 60
                seconds and tells you exactly which modules to launch first.
              </p>
              <Button asChild size="sm" className="mt-4 w-full">
                <Link href="/audit">Run Free Audit</Link>
              </Button>
            </div>
          </aside>
        </div>

        {/* More from the library */}
        <section className="mt-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <Eyebrow className="mb-3">Keep reading</Eyebrow>
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                {article.serviceId === 0
                  ? `More for ${article.serviceTitle}`
                  : `More from Pillar ${article.pillarNumber}: ${pillarShort(article.pillar)}`}
              </h2>
            </div>
            <Link
              href="/blog"
              className="hidden shrink-0 text-sm font-medium text-brand-300 transition-colors hover:text-brand-200 sm:block"
            >
              All 112 guides →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <BlogCard key={a.slug} article={a} className="h-full" />
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}
