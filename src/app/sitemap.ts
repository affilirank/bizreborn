import type { MetadataRoute } from "next";
import { fetchAllSlugs } from "@/lib/blog-db";
import { BLOG_BY_SLUG } from "@/data/blog";

const BASE = "https://www.bizreborn.com";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/audit`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/services`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/blog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];

  const slugs = await fetchAllSlugs();
  const today = new Date();

  const posts: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: BLOG_BY_SLUG[slug]?.updated
      ? new Date(`${BLOG_BY_SLUG[slug].updated}T12:00:00Z`)
      : today,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...pages, ...posts];
}
