import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { BLOG_ARTICLES } from "../src/data/blog";

async function main() {
  const env = readFileSync(".env.local", "utf8");
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)?.[1];
  const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)?.[1];
  if (!url || !key) throw new Error("missing supabase env");

  const supabase = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows = BLOG_ARTICLES.map((a) => ({
    slug: a.slug,
    title: a.title,
    meta_title: a.metaTitle,
    meta_description: a.metaDescription,
    keywords: a.keywords,
    intro: a.intro,
    sections: a.sections,
    faq: a.faq,
    cta_headline: a.ctaHeadline,
    cta_body: a.ctaBody,
    read_time: a.readTime,
    pillar: a.pillar,
    pillar_number: a.pillarNumber,
    service_id: a.serviceId,
    service_title: a.serviceTitle,
    status: "published",
    published: new Date(`${a.published}T12:00:00Z`).toISOString(),
  }));

  const { data, error } = await supabase
    .from("blog_posts")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug, status");
  if (error) throw new Error(`upsert failed: ${error.message}`);
  console.log(`seeded ${data.length} posts`);
}

main();
