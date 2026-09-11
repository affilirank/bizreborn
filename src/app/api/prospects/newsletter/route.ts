import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { getProspectById } from "@/lib/prospects";
import { callAi } from "@/lib/ai-router";
import { renderProfessionalEmailHtml, sanitizeOutreachCopy, OUTREACH_SIGNER } from "@/lib/email-template";
import { deliverEmail } from "@/lib/crm-actions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const prospectId = String(body?.id ?? "").trim();
  if (!prospectId) {
    return NextResponse.json({ error: "Prospect id required." }, { status: 400 });
  }

  const p = await getProspectById(prospectId);
  if (!p) {
    return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  }

  const flaws = p.audit_report?.pain_points?.join("; ") || "Review velocity and local SEO gaps";
  const grade = p.audit_report?.grade || "C";

  const prompt = [
    `Business: ${p.business_name}, City: ${p.city || "Local"}, Grade: ${grade}`,
    `Top Flaws: ${flaws}`,
    `Write a 3-part email nurture sequence (Email 1: The Hook & Video Audit, Email 2: Niche Local Authority Newsletter/Strategy, Email 3: The Financial Close & ROI).`,
    `Never use bracket placeholders like [Your Name], [Company], [Email], or [link] — always fill in the actual sender name (${OUTREACH_SIGNER.name}, ${OUTREACH_SIGNER.title} at Biz Reborn Marketing) and real details.`,
    `Return ONLY a valid JSON object with keys: email1_subject, email1_body, email2_subject, email2_body, email3_subject, email3_body. No markdown fences, raw JSON only.`,
  ].join("\n");

  let parsed: any = null;

  try {
    const text = await callAi({
      prompt,
      systemPrompt: "You are an expert B2B agency copywriter specializing in high-converting local marketing email drips. Never emit bracket placeholders.",
      jsonMode: true,
      maxTokens: 2500,
    });

    if (text) {
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : cleaned;
      parsed = JSON.parse(jsonString);
    }
  } catch (err) {
    console.error("[newsletter] generation failed:", err);
  }

  const sequence = parsed && parsed.email1_subject ? parsed : {
    email1_subject: `Quick question about ${p.business_name}'s Google ranking`,
    email1_body: `Hi ${p.business_name} team,\n\nWe ran a brand audit for ${p.business_name} in ${p.city || "your area"} and noticed some immediate opportunities in your map pack visibility.\n\nCheck out your custom video audit here! We mapped out the exact fixes needed to lock in your Top 3 spot.\n\nWorth 10 minutes this week to walk through it?`,
    email2_subject: `Local SEO Playbook for ${p.business_name} in 2026`,
    email2_body: `Hi team,\n\nHere is a quick local authority brief on why review velocity and instant text-back infrastructure are driving 80% of new customer calls in ${p.city || "your market"}.\n\nLet's connect on how to implement this for ${p.business_name}.`,
    email3_subject: `Closing your review gap (Estimated ROI for ${p.business_name})`,
    email3_body: `Hi ${p.business_name},\n\nLeaving reviews unanswered quietly drops your map pack ranking. Our automated review boost system locks in your Top 3 spot.\n\nReady to get started? Reply to schedule your call.`,
  };

  // Render professional HTML versions for each email (sanitized against placeholders)
  const s1 = sanitizeOutreachCopy(sequence.email1_subject, p);
  const b1 = sanitizeOutreachCopy(sequence.email1_body, p);
  const s2 = sanitizeOutreachCopy(sequence.email2_subject, p);
  const b2 = sanitizeOutreachCopy(sequence.email2_body, p);
  const s3 = sanitizeOutreachCopy(sequence.email3_subject, p);
  const b3 = sanitizeOutreachCopy(sequence.email3_body, p);

  const wrapped = {
    email1_subject: s1,
    email1_body: b1,
    email1_html: renderProfessionalEmailHtml({ prospect: p, subject: s1, body: b1, stepNumber: 1 }),

    email2_subject: s2,
    email2_body: b2,
    email2_html: renderProfessionalEmailHtml({ prospect: p, subject: s2, body: b2, stepNumber: 2 }),

    email3_subject: s3,
    email3_body: b3,
    email3_html: renderProfessionalEmailHtml({ prospect: p, subject: s3, body: b3, stepNumber: 3 }),
  };

  // Live send of a single drip step via Resend (with real tracking + proof log).
  const action = String(body?.action ?? "").trim();
  const step = Number(body?.step ?? 0);
  if (action === "send" && step >= 1 && step <= 3) {
    const label = step === 1 ? "The Hook · Video Audit" : step === 2 ? "Local Authority Nurture" : "The Financial Close & ROI";
    const subject =
      step === 1 ? wrapped.email1_subject : step === 2 ? wrapped.email2_subject : wrapped.email3_subject;
    const html =
      step === 1 ? wrapped.email1_html : step === 2 ? wrapped.email2_html : wrapped.email3_html;
    const result = await deliverEmail({
      prospect: p,
      // Every drip subject announces which step of the 3-step campaign it is,
      // so recipients (and the operator) always know where they are.
      subject: `[Step ${step} of 3] ${subject}`,
      html,
      kind: "drip",
      stepLabel: `Drip email ${step} · ${label}`,
      trigger: "outreach",
    });
    return NextResponse.json({
      sent: result.ok || result.simulated,
      simulated: result.simulated,
      messageId: result.messageId ?? null,
      trackingUid: result.trackingUid,
      error: result.error ?? null,
      prospect: result.prospect ?? p,
    });
  }

  return NextResponse.json({ sequence: wrapped });
}
