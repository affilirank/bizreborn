import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { Calendar, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog & Guides — Biz Reborn Marketing",
  description:
    "Actionable marketing guides, local SEO tips, and strategies to help your business dominate the local market.",
};

export default async function BlogPage() {
  const supabase = getSupabase();
  const { data: posts } = supabase
    ? await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950/20 via-ink-950 to-ink-950" />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-sora text-3xl font-bold text-white sm:text-4xl">
            Blog & Guides
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Actionable marketing insights, local SEO strategies, and growth
            guides built for local business owners.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {!posts || posts.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-sm text-ink-500">No posts published yet.</p>
            </div>
          ) : (
            posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group rounded-xl border border-ink-800/60 bg-ink-900/50 p-6 transition-all hover:border-brand-500/30"
              >
                {post.pillar && (
                  <span className="mb-3 inline-flex items-center rounded-full border border-brand-500/20 bg-brand-500/5 px-2.5 py-0.5 text-[10px] font-medium text-brand-400">
                    {post.pillar}
                  </span>
                )}
                <h3 className="font-sora text-sm font-bold leading-snug text-white group-hover:text-brand-300">
                  {post.title}
                </h3>
                {post.intro && (
                  <p className="mt-2 text-xs leading-relaxed text-ink-400 line-clamp-2">
                    {post.intro}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-3 text-[11px] text-ink-500">
                  {post.read_time && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {post.read_time}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
