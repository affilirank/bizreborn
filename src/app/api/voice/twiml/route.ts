import { NextResponse } from "next/server";
import { getProspectById } from "@/lib/prospects";
import { callAi } from "@/lib/ai-router";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleVoiceWebhook(req);
}

export async function GET(req: Request) {
  return handleVoiceWebhook(req);
}

async function handleVoiceWebhook(req: Request) {
  const url = new URL(req.url);
  const prospectId = url.searchParams.get("prospectId");

  let speechResult = "";
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    speechResult = params.get("SpeechResult") || params.get("Digits") || "";
  } else if (contentType.includes("application/json")) {
    const json = await req.json().catch(() => ({}));
    speechResult = json.SpeechResult || json.Digits || "";
  }

  let businessName = "the business owner";
  let rating = "4.5";
  let review_count = "50";
  let unanswered = "5";
  let competitorName = "top local competitor";
  let competitorReviews = "150";
  let grade = "C";
  let lostMonthly = "$2,000";
  let extraLeads = "21";
  let projectedMonthly = "$3,675";
  let topFlaw = "unanswered reviews and weak review velocity";

  if (prospectId) {
    const p = await getProspectById(prospectId);
    if (p) {
      businessName = p.business_name;
      rating = String(p.google_rating ?? "4.5");
      review_count = String(p.review_count ?? "50");
      unanswered = String(p.unanswered_reviews ?? "5");
      competitorName = p.competitor_name ?? "top competitor";
      competitorReviews = String(p.competitor_reviews ?? "150");
      grade = p.audit_report?.grade ?? "C";
      topFlaw = p.audit_report?.pain_points?.[0] || "unanswered reviews";
      if (p.roi_projection) {
        lostMonthly = `$${Math.round(p.roi_projection.lost_monthly).toLocaleString()}`;
        extraLeads = String(p.roi_projection.leads_per_month);
        projectedMonthly = `$${Math.round(p.roi_projection.projected_monthly).toLocaleString()}`;
      }
    }
  }

  let aiResponseText = "";

  const systemPrompt = `You are Sarah, an expert master AI sales closer for Biz Reborn Marketing (using ElevenLabs cloned voice ID EXAVITQu4vr4xnSDxMaL). You are on an outbound phone call with ${businessName}.
CRITICAL RULE 1: NEVER mention service numbers (like "service #41" or "service #3") on the phone. Speak strictly about solutions, real-world results, features, and projected ROI in natural, confident, conversational human language.
CRITICAL RULE 2: Use the deep knowledge base and brand audit data for this business:
- Rating: ${rating} stars, Reviews: ${review_count} (${unanswered} unanswered)
- Competitor: ${competitorName} (${competitorReviews} reviews)
- Brand Grade: ${grade}
- Top Flaw: ${topFlaw}
- Financial Impact: Leaking roughly ${lostMonthly}/mo to competitors. Fixing it yields +${extraLeads} leads/mo and ${projectedMonthly}/mo in new revenue.

OBJECTION HANDLING PLAYBOOK:
- "I'm busy / Send me an email": "Totally understand you're slammed. I just texted your 45-second video audit and proposal draft over to this number—take a look whenever you have 2 minutes. Sound fair?"
- "How much does it cost?": "It pays for itself with just one new client. That's why we mapped out your custom audit and projected return."
- "We already have an agency": "That’s awesome, glad you have someone! But are they tracking your geo-grid ranking outside your immediate zip code and capturing missed calls after hours?"
- "Not interested": "No worries at all! Just keep an eye on your map rankings. If things change, you know where to find us. Have a great day!"

Your tone is warm, energetic, straightforward, confident, and professional. Keep responses punchy (1-2 sentences maximum) so the conversation flows naturally on a phone call.`;

  const prompt = speechResult
    ? `The business owner said: "${speechResult}". Respond naturally as AI sales closer Sarah, addressing their objection or question using the knowledge base and ROI results (${lostMonthly}/mo leak, ${projectedMonthly}/mo potential), and pivoting to booking 10 minutes or checking their video audit link.`
    : `You have just reached ${businessName} on the phone. Deliver a warm, energetic opening greeting: introduce yourself as Sarah from Biz Reborn Marketing, mention that you audited their brand (Grade ${grade}, ${rating} stars, ${review_count} reviews) and noticed they are leaking ${lostMonthly}/mo to ${competitorName}, and ask if they have 45 seconds to hear how to close the gap.`;

  const aiOutput = await callAi({
    prompt,
    systemPrompt,
    maxTokens: 200,
    thinkingLevel: "minimal",
    timeoutMs: 8000,
  });

  if (aiOutput) {
    aiResponseText = aiOutput;
  } else {
    aiResponseText = speechResult
      ? `That makes total sense. We mapped out an exact plan to add ${extraLeads} leads and ${projectedMonthly} a month. Can we schedule 10 minutes this week?`
      : `Hi ${businessName}, this is Sarah from Biz Reborn. We audited your Google listing and noticed you're leaking roughly ${lostMonthly} a month to ${competitorName}. Do you have 45 seconds to chat about locking in your Top 3 spot?`;
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";
  const audioUrl = `${base}/api/voice/audio?text=${encodeURIComponent(aiResponseText)}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech dtmf" action="/api/voice/twiml${prospectId ? `?prospectId=${prospectId}` : ""}" method="POST" speechTimeout="auto" numDigits="1">
    <Play>${audioUrl}</Play>
  </Gather>
  <Play>${base}/api/voice/audio?text=${encodeURIComponent("We did not hear a response. Feel free to check out your 45-second video audit on our website. Goodbye!")}</Play>
</Response>`;

  return new NextResponse(twiml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}
