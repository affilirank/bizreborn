import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import type { PillarId } from "@/lib/types";
import type { BlogArticle } from "@/data/blog";
import { BLOG_ARTICLES, BLOG_BY_SLUG } from "@/data/blog";
import { VERTICAL_ARTICLES, VERTICAL_BY_SLUG } from "@/data/vertical-blogs";

const STATIC_ARTICLES: BlogArticle[] = [...BLOG_ARTICLES, ...VERTICAL_ARTICLES];

const STATIC_BY_SLUG: Record<string, BlogArticle> = {
  ...BLOG_BY_SLUG,
  ...VERTICAL_BY_SLUG,
};

interface BlogRow {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  intro: string | null;
  sections: unknown;
  faq: unknown;
  cta_headline: string | null;
  cta_body: string | null;
  read_time: number | null;
  pillar: string | null;
  pillar_number: number | null;
  service_id: number | null;
  service_title: string | null;
  status: "draft" | "published";
  published: string | null;
  updated_at: string | null;
}

export function rowToArticle(row: BlogRow): BlogArticle {
  const published = (row.published ?? row.updated_at ?? "").slice(0, 10);
  return {
    slug: row.slug,
    serviceId: row.service_id ?? 0,
    pillar: (row.pillar as PillarId) ?? "local-seo",
    pillarName: row.pillar ?? "Local Marketing",
    pillarNumber: row.pillar_number ?? 1,
    serviceTitle: row.service_title ?? row.title,
    title: row.title,
    metaTitle: row.meta_title ?? row.title,
    metaDescription: row.meta_description ?? "",
    keywords: row.keywords ?? [],
    readTime: row.read_time ?? 5,
    published,
    updated: (row.updated_at ?? row.published ?? "").slice(0, 10),
    intro: row.intro ?? "",
    sections: Array.isArray(row.sections) ? (row.sections as BlogArticle["sections"]) : [],
    faq: Array.isArray(row.faq) ? (row.faq as BlogArticle["faq"]) : [],
    ctaHeadline: row.cta_headline ?? "Ready to make your marketing work for your business?",
    ctaBody:
      row.cta_body ??
      "Pick the modules you need on the service menu and launch in one click — or run the free AI brand audit first to see exactly where you're leaking customers.",
  };
}

/**
 * Fetch published posts from Supabase. Falls back to the static 100-guide
 * library when Supabase isn't configured (demo mode).
 */
export async function fetchPublishedPosts(): Promise<BlogArticle[]> {
  const admin = createServiceClient();
  if (!admin) return STATIC_ARTICLES;

  const { data, error } = await admin
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published", { ascending: false });

  if (error) {
    console.error("[blog-db] fetchPublishedPosts", error.message);
    return STATIC_ARTICLES;
  }

  const rows = data as BlogRow[];
  if (rows.length === 0) return STATIC_ARTICLES;
  return rows.map(rowToArticle);
}

export async function fetchPostBySlug(
  slug: string,
): Promise<BlogArticle | null> {
  const admin = createServiceClient();
  if (!admin) return STATIC_BY_SLUG[slug] ?? null;

  const { data, error } = await admin
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[blog-db] fetchPostBySlug", error.message);
    return STATIC_BY_SLUG[slug] ?? null;
  }
  if (!data) return STATIC_BY_SLUG[slug] ?? null;
  return rowToArticle(data as BlogRow);
}

export async function fetchAllSlugs(): Promise<string[]> {
  const admin = createServiceClient();
  if (!admin) return STATIC_ARTICLES.map((a) => a.slug);

  const { data, error } = await admin
    .from("blog_posts")
    .select("slug")
    .eq("status", "published");
  if (error || !data) return STATIC_ARTICLES.map((a) => a.slug);
  const slugs = (data as { slug: string }[]).map((r) => r.slug);
  return slugs.length > 0 ? slugs : STATIC_ARTICLES.map((a) => a.slug);
}
