import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { getProspectById } from "@/lib/prospects";
import { callAi } from "@/lib/ai-router";
import { renderProfessionalEmailHtml, sanitizeOutreachCopy, OUTREACH_SIGNER } from "@/lib/email-template";
import { deliverEmail } from "@/lib/crm-actions";

export const dynamic = "force-dynamic";

/**
 * Direct Email Sender API using Resend with professional HTML templates and AI-powered custom copy.
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

  const subject = sanitizeOutreachCopy(
    customSubject || `Your Custom Brand Growth Audit: ${p.business_name} × Biz Reborn`,
    p,
  );
  
  let emailBody = customHtml;
  if (!emailBody) {
    const flaws = p.audit_report?.pain_points?.join("; ") || "Review velocity and local SEO gaps";
    const prompt = [
      `Business: ${p.business_name}, City: ${p.city || "Local"}, Rating: ${p.google_rating != null ? `${p.google_rating} stars (${p.review_count ?? 0} reviews)` : "Unverified"}`,
      `Top Flaws: ${flaws}`,
      `Write a high-converting, personalized B2B outreach email pitching our local marketing agency services (Biz Reborn).`,
      `Sign off as ${OUTREACH_SIGNER.name}, ${OUTREACH_SIGNER.title} at Biz Reborn Marketing — do NOT use bracket placeholders like [Your Name], [Company], or [link]; always fill in the actual sender name and agency.`,
      `Return ONLY the email body text (no subject line, no markdown fences, plain text with line breaks). Keep it punchy, professional, and under 150 words.`,
    ].join("\n");

    try {
      const text = await callAi({
        prompt,
        systemPrompt: "You are an expert B2B copywriter specializing in high-converting local marketing outreach. Never emit placeholder brackets.",
        maxTokens: 800,
      });
      if (text) {
        emailBody = sanitizeOutreachCopy(text.replace(/```/g, "").trim(), p);
      }
    } catch (err) {
      console.error("[email] AI generation failed, using fallback:", err);
    }

    if (!emailBody) {
      emailBody = `We ran a deep multi-point brand audit on ${p.business_name} across Google Maps, website speed, and local social velocity.\n\nYour current Google listing sits at ${p.google_rating != null ? `${p.google_rating} stars with ${p.review_count ?? 0} reviews` : "an unverified profile"}.\n\nWe mapped out the exact fixes needed to lock in your Top 3 spot in the local map pack. Want to grab 10 minutes this week to walk through it?`;
    }
  }

  const html = renderProfessionalEmailHtml({
    prospect: p,
    subject,
    body: emailBody,
    stepNumber: 1,
  });

  const result = await deliverEmail({
    prospect: p,
    subject,
    html,
    kind: "email",
    stepLabel: "Proposal pitch email",
    trigger: "proposal",
  });

  return NextResponse.json({
    success: result.ok || result.simulated,
    simulated: result.simulated,
    messageId: result.messageId ?? null,
    trackingUid: result.trackingUid,
    error: result.error ?? null,
    message: result.ok
      ? "Pitch email sent successfully."
      : result.simulated
        ? `Simulated email sent to ${p.email}. Real open tracking + delivery requires RESEND_API_KEY.`
        : `Email failed: ${result.error}`,
    prospect: result.prospect ?? p,
  });
}
