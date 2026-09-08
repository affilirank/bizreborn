import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { getProspectById } from "@/lib/prospects";
import { LEADGEN } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Direct Email Sender API using Resend (or configured email API).
 * Falls back to simulation success when RESEND_API_KEY is absent.
 */
export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const prospectId = String(body?.id ?? "").trim();
  const customSubject = String(body?.subject ?? "").trim();
  const customHtml = String(body?.html ?? "").trim();

  if (!prospectId) {
    return NextResponse.json({ error: "Prospect id required." }, { status: 400 });
  }

  const p = await getProspectById(prospectId);
  if (!p) {
    return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  }

  if (!p.email) {
    return NextResponse.json({ error: "Prospect has no email address." }, { status: 400 });
  }

  const base =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";
  const pitchUrl = `${base}/pitch/${p.slug ?? ""}`;

  const subject =
    customSubject || `Your Custom Brand Growth Audit: ${p.business_name} × Biz Reborn`;
  
  const html =
    customHtml ||
    [
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;background:#fafafa;border-radius:16px;">`,
      `<h2 style="color:#6366F1;margin-bottom:8px;">Custom Growth Audit for ${p.business_name}</h2>`,
      `<p>Hi there,</p>`,
      `<p>We ran a deep multi-point brand audit on <strong>${p.business_name}</strong> across Google Maps, website speed, and local social velocity.</p>`,
      `<p>Your current Google listing sits at <strong>${p.google_rating ?? "—"} stars</strong> with <strong>${p.review_count ?? 0} reviews</strong>. Meanwhile, your top local competitor is pulling significantly more search traffic and calls.</p>`,
      `<p style="text-align:center;margin:28px 0;"><a href="${pitchUrl}" style="display:inline-block;background:#6366F1;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:bold;font-size:15px;">Watch Your 45-Second Video Audit →</a></p>`,
      `<p>We mapped out the exact fixes needed to lock in your Top 3 spot in the local map pack. Want to grab 10 minutes this week to walk through it?</p>`,
      `<p>Simply reply to this email or reach out directly at <a href="mailto:${LEADGEN.email}" style="color:#6366F1;">${LEADGEN.email}</a>.</p>`,
      `<p style="color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px;">— Biz Reborn Marketing · <a href="https://www.bizreborn.com" style="color:#6366F1;">www.bizreborn.com</a></p>`,
      `</div>`,
    ].join("");

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || `Biz Reborn Marketing <hello@bizreborn.com>`;

  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [p.email],
          subject,
          html,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return NextResponse.json({ success: true, id: data?.id ?? "sent" });
      }
      return NextResponse.json(
        { error: data?.message ?? "Resend failed to deliver email." },
        { status: 400 },
      );
    } catch (err) {
      console.error("[email] Resend exception:", err);
    }
  }

  // Fallback simulation when RESEND_API_KEY is not configured yet
  return NextResponse.json({
    success: true,
    simulated: true,
    message: `Simulated email sent to ${p.email}. Add RESEND_API_KEY in Vercel to send live via domain.`,
  });
}
