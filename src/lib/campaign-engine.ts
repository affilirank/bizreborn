import "server-only";
import type { Prospect } from "@/lib/supabase-types";
import { updateProspect, getProspectById } from "@/lib/prospects";
import { deliverEmail } from "@/lib/crm-actions";
import { renderProfessionalEmailHtml } from "@/lib/email-template";
import { fetchPublishedPosts } from "@/lib/blog-db";
import { canReceiveEmail } from "@/lib/services/email-validate";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type CampaignStage =
  | "welcome"
  | "pitch"
  | "drip_1"
  | "drip_2"
  | "drip_3"
  | `blog_${number}`
  | "completed";

export async function advanceProspectCampaign(
  prospect: Prospect,
  force = false,
): Promise<{ ok: boolean; stage: string; message?: string; prospect?: Prospect | null }> {
  if (!prospect.email || !EMAIL_RE.test(prospect.email)) {
    return { ok: false, stage: prospect.campaign_stage || "welcome", message: "Prospect has no valid email." };
  }

  const deliverable = await canReceiveEmail(prospect.email);
  if (!deliverable) {
    return { ok: false, stage: prospect.campaign_stage || "welcome", message: "Recipient domain cannot receive email." };
  }

  const stage = (prospect.campaign_stage || "welcome") as string;
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";

  if (!force && prospect.last_contacted_at) {
    const elapsed = Date.now() - new Date(prospect.last_contacted_at).getTime();
    const minHours = process.env.NODE_ENV === "development" ? 30 * 1000 : 20 * 60 * 60 * 1000;
    if (elapsed < minHours) {
      return { ok: true, stage, message: "Step too soon (pacing interval active)." };
    }
  }

  let nextStage = stage;
  let subject = "";
  let body = "";
  let kind: "welcome" | "drip" | "email" = "drip";
  let stepNumber = 1;
  let stepLabel = "";

  if (stage === "welcome" || !stage) {
    const competitor = prospect.competitor_name ?? "the local market leader";
    subject = `Great news, ${prospect.business_name} — your free audit is on the way! 🎉`;
    body = `Hi ${prospect.business_name} team,\n\nWelcome to Biz Reborn! We just added ${prospect.business_name} to our audit queue — your FREE local growth audit is being compiled right now.\n\nIt covers your Google map-pack standing vs ${competitor}, your review scorecard, unanswered-review leaks, and the exact fixes to lock in your Top 3 spot.\n\nYour audit link lands right back in this inbox within the next hour. Keep an eye out — it includes a 45-second video walkthrough built just for ${prospect.business_name}.\n\nNo strings, no cost. If your listings are already perfect, you'll know in 60 seconds.`;
    kind = "welcome";
    stepNumber = 1;
    stepLabel = "Welcome · Free Audit Incoming";
    nextStage = "pitch";
  } else if (stage === "pitch") {
    const grade = prospect.audit_report?.grade || "B";
    subject = `Your Custom Video Audit & Growth Score for ${prospect.business_name} 🚀`;
    body = `Hi ${prospect.business_name} team,\n\nWe finished analyzing ${prospect.business_name} in ${prospect.city || "your market"} and generated your custom 45-second video audit and brand growth score (${grade}).\n\nYour audit highlights immediate opportunities in your Google map-pack standing, review velocity, and competitor positioning vs ${prospect.competitor_name || "market leaders"}.\n\nWatch your custom video walkthrough and full audit report here:\n\n${base}/pitch/${prospect.slug}\n\nWorth 5 minutes to review your custom growth proposal?`;
    kind = "drip";
    stepNumber = 2;
    stepLabel = "Pitch · Custom Video Audit & Score";
    nextStage = "drip_1";
  } else if (stage === "drip_1") {
    subject = `[Step 1 of 3] Closing review gaps for ${prospect.business_name}`;
    body = `Hi ${prospect.business_name} team,\n\nFollowing up on our video audit for ${prospect.business_name}. Unanswered reviews and low review velocity are quietly dropping your map pack ranking in ${prospect.city || "your area"}.\n\nOur automated review boost and instant text-back infrastructure lock in your Top 3 spot. Take a look at your custom pitch page:\n\n${base}/pitch/${prospect.slug}\n\nLet's get your calendar booked for a quick 10-minute strategy call this week at ${base}/book.`;
    kind = "drip";
    stepNumber = 1;
    stepLabel = "Drip 1 · Review Gaps & Hook";
    nextStage = "drip_2";
  } else if (stage === "drip_2") {
    subject = `[Step 2 of 3] Local SEO & Authority Playbook for ${prospect.business_name}`;
    body = `Hi ${prospect.business_name},\n\nIn ${prospect.city || "your market"}, local customers choose the top 3 businesses on Google Maps over 80% of the time.\n\nHere is how ${prospect.business_name} can capture that demand with our proven multi-engine framework (Reviews, AI Voice Agents, and High-Converting Proposals).\n\nReview your custom proposal and pricing options here:\n\n${base}/pitch/${prospect.slug}\n\nReply to this email or book your strategy call directly at ${base}/book.`;
    kind = "drip";
    stepNumber = 2;
    stepLabel = "Drip 2 · Local Authority Playbook";
    nextStage = "drip_3";
  } else if (stage === "drip_3") {
    subject = `[Step 3 of 3] Projected ROI & Growth Plan for ${prospect.business_name}`;
    body = `Hi ${prospect.business_name} team,\n\nBased on your audit metrics, ${prospect.business_name} is leaving an estimated $${prospect.roi_projection?.projected_monthly?.toLocaleString() || "10,000"}/month on the table in missed customer calls and uncaptured reviews.\n\nOur turnkey system deploys in 48 hours with zero heavy lifting from your team.\n\nReady to activate? Review your proposal or schedule your strategy call today at ${base}/book.`;
    kind = "drip";
    stepNumber = 3;
    stepLabel = "Drip 3 · Financial Close & ROI";
    nextStage = "blog_1";
  } else if (stage.startsWith("blog_")) {
    const nStr = stage.replace("blog_", "");
    const dayNum = parseInt(nStr, 10) || 1;
    if (dayNum > 100) {
      await updateProspect(prospect.id, { campaign_stage: "completed", campaign_last_run_at: new Date().toISOString() });
      return { ok: true, stage: "completed", message: "Campaign sequence completed (100 days finished)." };
    }

    const posts = await fetchPublishedPosts();
    const recs = prospect.recommended_services || [];
    const sorted = [...posts].sort((a, b) => {
      const matchA = recs.includes(a.serviceId) ? 1 : 0;
      const matchB = recs.includes(b.serviceId) ? 1 : 0;
      return matchB - matchA;
    });

    const article = sorted[(dayNum - 1) % sorted.length] || sorted[0];

    subject = `[Day ${dayNum} of 100 Authority Newsletter] ${article.title}`;
    body = `Hi ${prospect.business_name} team,\n\nWelcome to Day ${dayNum} of our Biz Reborn Authority Newsletter series for ${prospect.city || "local businesses"}.\n\nToday's featured guide: "${article.title}"\n\n${article.intro}\n\nKey Takeaways:\n${(article.sections || []).slice(0, 2).map((s) => `• ${s.heading}`).join("\n")}\n\nWant to implement these strategies for ${prospect.business_name}? Pick your modules on our service menu or review your custom proposal and video audit:\n\n${base}/pitch/${prospect.slug}\n\nBest regards,\nDaniel Brown\nLead Growth Specialist, Biz Reborn`;

    kind = "drip";
    stepNumber = 3;
    stepLabel = `100-Day Blog Newsletter (Day ${dayNum} of 100)`;
    nextStage = dayNum >= 100 ? "completed" : `blog_${dayNum + 1}`;
  } else {
    return { ok: true, stage, message: "Campaign already completed." };
  }

  const html = renderProfessionalEmailHtml({
    prospect,
    subject,
    body,
    stepNumber,
  });

  const res = await deliverEmail({
    prospect,
    subject,
    html,
    kind,
    stepLabel,
    trigger: "outreach",
  });

  const updated = await updateProspect(prospect.id, {
    campaign_stage: nextStage,
    campaign_last_run_at: new Date().toISOString(),
  });

  return {
    ok: res.ok || res.simulated,
    stage: nextStage,
    message: res.error || `Successfully sent campaign step: ${stepLabel}`,
    prospect: updated,
  };
}

export async function runAllProspectCampaigns(force = false): Promise<{
  total: number;
  processed: number;
  successes: number;
  errors: number;
}> {
  const { listProspects } = await import("@/lib/prospects");
  const prospects = await listProspects();
  
  const active = prospects.filter(
    (p) => p.email && EMAIL_RE.test(p.email) && p.status !== "invalid" && p.status !== "closed" && p.campaign_stage !== "completed",
  );

  let processed = 0;
  let successes = 0;
  let errors = 0;

  for (const p of active) {
    try {
      const res = await advanceProspectCampaign(p, force);
      processed++;
      if (res.ok) successes++;
      else errors++;
    } catch (err) {
      processed++;
      errors++;
      console.error("[campaign-engine] error for", p.business_name, err);
    }
  }

  return { total: prospects.length, processed, successes, errors };
}
