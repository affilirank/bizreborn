import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui/section";
import { BlogListing } from "@/components/blog/blog-listing";
import { fetchPublishedPosts } from "@/lib/blog-db";

export const metadata: Metadata = {
  title: "The 112-Guide Marketing Library",
  description:
    "100 full-length, SEO-optimized service guides plus 12 category playbooks — one for every business vertical. Local SEO, video, funnels, reviews, SMS, ads, branding, and automation.",
  openGraph: {
    title: "Biz Reborn Guide Library — 112 SEO Marketing Guides",
    description:
      "Full-length marketing guides for every service module and business vertical: pricing, ROI, stats, pain points, and solutions for local businesses.",
    type: "website",
  },
};

export const revalidate = 300;

export default async function BlogIndexPage() {
  const articles = await fetchPublishedPosts();
  return (
    <div className="relative pt-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute -top-20 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[160px]" />
      </div>

      <Container className="relative">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <Eyebrow className="mb-4">The Guide Library</Eyebrow>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            112 Marketing Guides.{" "}
            <span className="text-gradient-brand">For Every Business.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-fog sm:text-lg">
            A full-length guide for every service in the Biz Reborn menu plus a
            category playbook for each business vertical — stats, pain points,
            and the exact fixes that move your number.
          </p>
        </div>

        <BlogListing articles={articles} />
      </Container>
    </div>
  );
}
