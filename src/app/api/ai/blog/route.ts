import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { blogAssistant, type BlogDraft } from "@/lib/blog-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanDraft(raw: unknown): BlogDraft {
  const r = (raw ?? {}) as Partial<BlogDraft>;
  const str = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);
  return {
    title: str(r.title),
    slug: str(r.slug),
    meta_title: str(r.meta_title),
    meta_description: str(r.meta_description),
    keywords: str(r.keywords),
    intro: str(r.intro),
    read_time: str(r.read_time, "5"),
    status: str(r.status, "draft"),
    sections: Array.isArray(r.sections)
      ? r.sections.map((s) => ({
          heading: str((s as Record<string, unknown>)?.heading),
          paragraphs: str((s as Record<string, unknown>)?.paragraphs),
          bullets: str((s as Record<string, unknown>)?.bullets),
        }))
      : [],
    faq: Array.isArray(r.faq)
      ? r.faq.map((f) => ({
          q: str((f as Record<string, unknown>)?.q),
          a: str((f as Record<string, unknown>)?.a),
        }))
      : [],
    cta_headline: str(r.cta_headline),
    cta_body: str(r.cta_body),
  };
}

export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  try {
    const body = await req.json();
    const instruction = String(body?.instruction ?? "").trim().slice(0, 500);
    if (!instruction) {
      return NextResponse.json({ error: "instruction required" }, { status: 400 });
    }
    const draft = cleanDraft(body?.current);
    const result = await blogAssistant(draft, instruction);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Assistant failed." }, { status: 500 });
  }
}