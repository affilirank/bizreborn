import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BlogArticle } from "../src/data/blog";

async function main() {
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY;

const mod = await import(join(process.cwd(), "src/data/vertical-blogs.ts"));

const rows = mod.VERTICAL_ARTICLES.map((a: BlogArticle) => ({
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

const res = await fetch(`${url}/rest/v1/blog_posts?on_conflict=slug`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify(rows),
});

const body = await res.text();
console.log(`HTTP ${res.status}`);
if (res.ok) {
  const data = JSON.parse(body);
  console.log(`Upserted ${data.length} vertical posts:`);
  for (const d of data) console.log("-", d.slug);
} else {
  console.log(body.slice(0, 500));
}
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
