import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getServerSession } from "@/lib/auth/session";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET() {
  const admin = createServiceClient();
  if (!admin)
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data, error } = await admin
    .from("blog_posts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = createServiceClient();
  if (!admin)
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const session = await getServerSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const title = String(body.title ?? "").trim();
  if (!title)
    return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const slug =
    typeof body.slug === "string" && body.slug.trim()
      ? slugify(body.slug)
      : slugify(title);

  const { data, error } = await admin
    .from("blog_posts")
    .insert({
      slug,
      title,
      meta_title: body.meta_title ? String(body.meta_title).trim() : title,
      meta_description: body.meta_description
        ? String(body.meta_description).trim()
        : null,
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      intro: body.intro ? String(body.intro).trim() : "",
      sections: Array.isArray(body.sections) ? body.sections : [],
      faq: Array.isArray(body.faq) ? body.faq : [],
      cta_headline: body.cta_headline ? String(body.cta_headline).trim() : null,
      cta_body: body.cta_body ? String(body.cta_body).trim() : null,
      read_time: Number(body.read_time) || 5,
      pillar: body.pillar ? String(body.pillar) : null,
      pillar_number: body.pillar_number ? Number(body.pillar_number) : null,
      service_id: body.service_id ? Number(body.service_id) : null,
      service_title: body.service_title ? String(body.service_title).trim() : null,
      status: body.status === "published" ? "published" : "draft",
      published: body.status === "published" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data }, { status: 201 });
}
