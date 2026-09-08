import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { getProspectById } from "@/lib/prospects";
import { LEADGEN } from "@/lib/config";
import { renderProfessionalEmailHtml } from "@/lib/email-template";

export const dynamic = "force-dynamic";

/**
 * Direct Email Sender API using Resend with professional HTML templates.
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

  const subject =
    customSubject || `Your Custom Brand Growth Audit: ${p.business_name} × Biz Reborn`;
  
  const html =
    customHtml ||
    renderProfessionalEmailHtml({
      prospect: p,
      subject,
      body: `We ran a deep multi-point brand audit on ${p.business_name} across Google Maps, website speed, and local social velocity.\n\nYour current Google listing sits at ${p.google_rating ?? "—"} stars with ${p.review_count ?? 0} reviews. Meanwhile, your top local competitor is pulling significantly more search traffic and calls.\n\nWe mapped out the exact fixes needed to lock in your Top 3 spot in the local map pack. Want to grab 10 minutes this week to walk through it?`,
      stepNumber: 1,
    });

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
    message: `Simulated professional HTML email sent to ${p.email}. Add RESEND_API_KEY in Vercel to send live via domain.`,
  });
}
