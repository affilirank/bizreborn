import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabase();
  if (!supabase) return {};

  const { data: post } = await supabase
    .from("blog_posts")
    .select("meta_title, meta_description")
    .eq("slug", slug)
    .single();

  if (!post) return {};

  return {
    title: post.meta_title || "Blog Post",
    description: post.meta_description || "",
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const supabase = getSupabase();

  if (!supabase) notFound();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!post) notFound();

  const sections = post.sections as Record<string, any>[] | null;
  const faq = post.faq as { question: string; answer: string }[] | null;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950/20 via-ink-950 to-ink-950" />
      <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 transition-colors hover:text-brand-400"
        >
          <ArrowLeft size={14} />
          Back to Blog
        </Link>

        {post.pillar && (
          <span className="mb-4 inline-flex items-center rounded-full border border-brand-500/20 bg-brand-500/5 px-3 py-0.5 text-[11px] font-medium text-brand-400">
            {post.pillar}
          </span>
        )}

        <h1 className="font-sora text-2xl font-bold text-white sm:text-3xl">
          {post.title}
        </h1>

        <div className="mt-4 flex items-center gap-4 text-xs text-ink-500">
          {post.read_time && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {post.read_time}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {new Date(post.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        {post.intro && (
          <p className="mt-6 text-sm leading-relaxed text-ink-300">
            {post.intro}
          </p>
        )}

        <div className="mt-10 space-y-8">
          {sections?.map((section: any, i: number) => (
            <div key={i}>
              {section.heading && (
                <h2 className="font-sora text-lg font-bold text-white">
                  {section.heading}
                </h2>
              )}
              {section.body && (
                <p className="mt-2 text-sm leading-relaxed text-ink-400">
                  {section.body}
                </p>
              )}
              {section.items && (
                <ul className="mt-3 space-y-2">
                  {section.items.map((item: string, j: number) => (
                    <li
                      key={j}
                      className="flex items-start gap-2 text-sm text-ink-400"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {faq && faq.length > 0 && (
          <div className="mt-12">
            <h2 className="font-sora text-lg font-bold text-white">
              Frequently Asked Questions
            </h2>
            <div className="mt-4 space-y-4">
              {faq.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-ink-800/60 bg-ink-900/50 p-4"
                >
                  <h3 className="text-sm font-semibold text-white">
                    {item.question}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-400">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(post.cta_headline || post.cta_body) && (
          <div className="mt-12 rounded-xl border border-brand-500/20 bg-gradient-to-r from-brand-500/10 to-glow-500/5 p-6 text-center">
            <h3 className="font-sora text-base font-bold text-white">
              {post.cta_headline || "Run Your Free AI Brand Audit"}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-400">
              {post.cta_body ||
                "See exactly where your brand stands against local competitors."}
            </p>
            <Link
              href="/audit"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-glow-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:from-brand-500 hover:to-glow-500"
            >
              Run Free Audit
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
