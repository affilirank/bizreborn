import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { getProspectById } from "@/lib/prospects";
import { callAi } from "@/lib/ai-router";

export const dynamic = "force-dynamic";

/**
 * Generates a tailored 3-part AI newsletter / email drip sequence for a prospect's specific brand.
 */
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
    `Return ONLY a valid JSON object with keys: email1_subject, email1_body, email2_subject, email2_body, email3_subject, email3_body. No markdown fences, raw JSON only.`,
  ].join("\n");

  try {
    const text = await callAi({
      prompt,
      systemPrompt: "You are an expert B2B agency copywriter specializing in high-converting local marketing email drips.",
      jsonMode: true,
    });

    if (text) {
      const parsed = JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
      if (parsed && parsed.email1_subject) {
        return NextResponse.json({ sequence: parsed });
      }
    }
  } catch (err) {
    console.error("[newsletter] generation failed:", err);
  }

  // Fallback sequence
  return NextResponse.json({
    sequence: {
      email1_subject: `Quick question about ${p.business_name}'s Google ranking`,
      email1_body: `Hi ${p.business_name} team,\n\nWe ran a brand audit for ${p.business_name} in ${p.city || "your area"} and noticed some immediate opportunities in your map pack visibility.\n\nCheck out your custom video audit here: https://www.bizreborn.com/pitch/${p.slug}\n\nWorth 10 minutes this week?`,
      email2_subject: `Local SEO Playbook for ${p.business_name} in 2026`,
      email2_body: `Hi team,\n\nHere is a quick local authority brief on why review velocity and instant text-back infrastructure are driving 80% of new customer calls in ${p.city || "your market"}.\n\nLet's connect on how to implement this for ${p.business_name}.`,
      email3_subject: `Closing your review gap (Estimated ROI for ${p.business_name})`,
      email3_body: `Hi ${p.business_name},\n\nLeaving reviews unanswered quietly drops your map pack ranking. Our automated review boost system locks in your Top 3 spot.\n\nReady to get started? Reply to schedule your call.`,
    },
  });
}
