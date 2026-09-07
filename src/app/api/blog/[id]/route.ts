import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getServerSession } from "@/lib/auth/session";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function requireAdmin() {
  const session = await getServerSession();
  return session?.user.role === "admin";
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = createServiceClient();
  if (!admin)
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const patch: Record<string, unknown> = {};

  const stringFields = [
    "slug",
    "title",
    "meta_title",
    "meta_description",
    "intro",
    "cta_headline",
    "cta_body",
    "pillar",
    "service_title",
  ] as const;
  for (const key of stringFields) {
    if (typeof body[key] === "string") patch[key] = body[key].trim();
  }
  if (Array.isArray(body.keywords)) patch.keywords = body.keywords;
  if (Array.isArray(body.sections)) patch.sections = body.sections;
  if (Array.isArray(body.faq)) patch.faq = body.faq;
  if (body.read_time != null) patch.read_time = Number(body.read_time) || 5;
  if (body.pillar_number != null) patch.pillar_number = Number(body.pillar_number);
  if (body.service_id != null) patch.service_id = Number(body.service_id);
  if (body.status === "published" || body.status === "draft") {
    patch.status = body.status;
    if (body.status === "published" && patch.status === "published") {
      const { data: existing } = await admin
        .from("blog_posts")
        .select("published")
        .eq("id", id)
        .maybeSingle();
      if (!existing?.published) patch.published = new Date().toISOString();
    }
  }

  const { data, error } = await admin
    .from("blog_posts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = createServiceClient();
  if (!admin)
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { error } = await admin.from("blog_posts").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
