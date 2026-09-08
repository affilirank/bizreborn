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
  let competitorName = "top local competitor";
  let grade = "C";

  if (prospectId) {
    const p = await getProspectById(prospectId);
    if (p) {
      businessName = p.business_name;
      rating = String(p.google_rating ?? "4.5");
      review_count = String(p.review_count ?? "50");
      competitorName = p.competitor_name ?? "top competitor";
      grade = p.audit_report?.grade ?? "C";
    }
  }

  let aiResponseText = "";

  const systemPrompt = `You are Alex, an expert AI sales voice agent for Biz Reborn Marketing (using ElevenLabs cloned voice ID 7o2jINz1addxWQ92Mv17). You are on an outbound phone call with ${businessName}. Your tone is warm, highly professional, conversational, confident, and polite. Keep responses short (1-2 sentences maximum) so it sounds natural on a phone call.`;

  const prompt = speechResult
    ? `The business owner said: "${speechResult}". Respond naturally as AI sales agent Alex, answering their question or addressing their concern about their brand audit (Grade ${grade}, ${rating} stars, ${review_count} reviews) and offering 10 minutes to walk through their growth plan.`
    : `You have just reached ${businessName} on the phone. Deliver a warm opening greeting: introduce yourself as Alex from Biz Reborn Marketing, mention that you audited their Google listing (${rating} stars, ${review_count} reviews) compared to ${competitorName}, and ask if they have 45 seconds to hear how to close the gap.`;

  const aiOutput = await callAi({
    prompt,
    systemPrompt,
  });

  if (aiOutput) {
    aiResponseText = aiOutput;
  } else {
    aiResponseText = speechResult
      ? `That makes total sense. We would love to show you the exact breakdown and projected ROI. Can we schedule 10 minutes this week?`
      : `Hi ${businessName}, this is Alex from Biz Reborn. We ran a quick brand audit on your Google listing and noticed some opportunities to pull ahead of ${competitorName}. Do you have 45 seconds to chat about your review growth?`;
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
