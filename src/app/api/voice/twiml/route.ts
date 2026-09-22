import { NextResponse } from "next/server";
import { getProspectById } from "@/lib/prospects";
import { appendCallEntry, upsertCallRecord, getCallRecord } from "@/lib/call-store";

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
  let callSid = "";
  let callStatus = "";
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    speechResult = params.get("SpeechResult") || params.get("Digits") || "";
    callSid = params.get("CallSid") || "";
    callStatus = params.get("CallStatus") || "";
  } else if (contentType.includes("application/json")) {
    const json = await req.json().catch(() => ({}));
    speechResult = json.SpeechResult || json.Digits || "";
    callSid = json.CallSid || "";
    callStatus = json.CallStatus || "";
  }

  if (callSid && callStatus) {
    await upsertCallRecord({
      callSid,
      prospectId,
      phone: "",
      businessName: "",
      simulated: false,
      status: callStatus === "in-progress" ? "in-progress" : "ringing",
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationSec: 0,
      entries: [],
      outcome: null,
    });
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

  // Fetch previous conversation history to prevent repetition & looping.
  let existingEntries: Array<{ role: "ai" | "user" | "system"; text: string }> = [];

  // Latency: prospect + call history reads are independent — run in parallel
  // (saves ~300-600ms per turn vs sequential awaits).
  const [prospect, rec] = await Promise.all([
    prospectId ? getProspectById(prospectId) : Promise.resolve(null),
    callSid ? getCallRecord(callSid) : Promise.resolve(null),
  ]);

  if (prospect) {
    businessName = prospect.business_name;
    rating = String(prospect.google_rating ?? "4.5");
    review_count = String(prospect.review_count ?? "50");
    unanswered = String(prospect.unanswered_reviews ?? "5");
    competitorName = prospect.competitor_name ?? "top competitor";
    competitorReviews = String(prospect.competitor_reviews ?? "150");
    grade = prospect.audit_report?.grade ?? "C";
    topFlaw = prospect.audit_report?.pain_points?.[0] || "unanswered reviews";
    if (prospect.roi_projection) {
      lostMonthly = `$${Math.round(prospect.roi_projection.lost_monthly).toLocaleString()}`;
      extraLeads = String(prospect.roi_projection.leads_per_month);
      projectedMonthly = `$${Math.round(prospect.roi_projection.projected_monthly).toLocaleString()}`;
    }
  }

  if (rec && Array.isArray(rec.entries)) {
    existingEntries = rec.entries;
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || "7o2jINz1addxWQ92Mv17";

  // Compliment-first opener: lead with something TRUE and positive (never fake
  // "great reviews" at a struggling listing), THEN the gap, THEN the ask.
  const ratingNum = Number(rating) || 0;
  const cityLabel = prospect?.city ?? "your area";
  const compliment =
    ratingNum >= 4.5 && Number(review_count) >= 20
      ? `First off — ${rating} stars across ${review_count} reviews? Genuinely impressive, you all clearly take great care of your customers.`
      : Number(review_count) >= 10
        ? `First off — ${review_count} reviews and counting, it's clear ${businessName} is a real staple in the ${cityLabel} community.`
        : `Love seeing local businesses like yours holding it down in ${cityLabel}.`;

  const systemPrompt = `You are Sarah, an expert master AI sales closer for Biz Reborn Marketing (using ElevenLabs cloned voice ID ${voiceId}). You are on an outbound live phone call with ${businessName}.
CRITICAL RULE 1: NEVER repeat yourself or loop previous statements. Always advance the conversation naturally based on what was just said.
CRITICAL RULE 2: NEVER mention service numbers (like "service #41") on the phone. Speak strictly about solutions, real-world results, features, and projected ROI in natural, confident, conversational human language.
CRITICAL RULE 3: Use the brand audit data:
- Rating: ${rating} stars, Reviews: ${review_count} (${unanswered} unanswered)
- Competitor: ${competitorName} (${competitorReviews} reviews)
- Brand Grade: ${grade}
- Top Flaw: ${topFlaw}
- Financial Impact: Leaking roughly ${lostMonthly}/mo to competitors. Fixing it yields +${extraLeads} leads/mo and ${projectedMonthly}/mo in new revenue.

OBJECTION HANDLING:
- "I'm busy / Send me an email": "Totally understand you're slammed. I just texted your 45-second video audit and proposal draft over to this number—take a look whenever you have 2 minutes. Sound fair?"
- "How much does it cost?": "It pays for itself with just one new client. That's why we mapped out your custom audit and projected return."
- "We already have an agency": "That’s awesome, glad you have someone! But are they tracking your geo-grid ranking outside your immediate zip code and capturing missed calls after hours?"
- "Not interested": "No worries at all! Just keep an eye on your map rankings. If things change, you know where to find us. Have a great day!"

Tone: warm, energetic, straightforward, confident, professional. Keep responses punchy (1-2 sentences maximum).`;

  const openAiKey = process.env.OPENAI_API_KEY;
  let aiResponseText = "";

  if (openAiKey) {
    try {
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      // Append past conversation turns so the model has full context and never loops
      for (const entry of existingEntries) {
        if (entry.role === "user") {
          messages.push({ role: "user", content: entry.text });
        } else if (entry.role === "ai") {
          messages.push({ role: "assistant", content: entry.text });
        }
      }

        if (speechResult) {
          messages.push({ role: "user", content: speechResult });
        } else if (existingEntries.length === 0) {
          messages.push({
            role: "user",
            content: `You have just reached ${businessName} on the phone. Deliver a warm, energetic opening as Sarah from Biz Reborn Marketing with EXACTLY this structure:
1. OPEN with a genuine compliment (never the problem): "${compliment}"
2. DISCOVERY framing: "I was searching for businesses like yours in ${cityLabel} this week and noticed ${competitorName} is outranking you on Google Maps right now — looks like it's mostly the ${unanswered} unanswered reviews."
3. THE OFFER + ASK: "I'd love to help a great business like yours claim that top 3 spot — I already put together a free 45-second video audit for ${businessName} showing exactly how. Can I send it to your email today?"
Rules: under 4 sentences total, sound human and excited for them (not salesy), ONE question at the end (the email ask). Never mention grades, dollar losses, or "audit data" in the first turn.`,
          });
        }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Super fast 5s timeout

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: process.env.CHAT_OPENAI_MODEL || "gpt-4o-mini",
          messages,
          temperature: 0.4,
          // Conversational turns are 1-2 sentences — 80 tokens caps generation
          // time (~1s) without capping quality.
          max_tokens: 80,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (res.ok && content) {
        aiResponseText = content.trim();
      }
    } catch (err) {
      console.warn("[voice twiml] OpenAI error:", err);
    }
  }

  // Fallback if OpenAI failed or key missing
  if (!aiResponseText) {
    aiResponseText = speechResult
      ? `That makes total sense. We mapped out an exact plan to add ${extraLeads} leads and ${projectedMonthly} a month. Can we schedule 10 minutes this week?`
      : `${compliment} This is Sarah with Biz Reborn Marketing — I was searching for businesses like yours in ${cityLabel} and noticed ${competitorName} is outranking you on Google Maps. I put together a free 45-second video audit on exactly how to get you into that top 3 — can I send it to your email today?`;
  }

  if (callSid) {
    const time = new Date().toLocaleTimeString();
    if (speechResult) {
      await appendCallEntry(callSid, { role: "user", text: speechResult, time });
    }
    await appendCallEntry(callSid, { role: "ai", text: aiResponseText, time });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";

  // Latency: per-turn <Play> of a serverless-rendered ElevenLabs MP3 added
  // 2-5s of dead air per response (Twilio fetches the URL, the function
  // cold-starts, ElevenLabs generates) — dead air at the OPENING is the #1
  // hangup cause on cold calls. Polly starts instantly, so it's the default
  // everywhere; set CALL_TWILIO_ELEVENLABS_OPENING=1 to trade 3-5s of silence
  // for the cloned voice on the opening line only.
  const isOpeningTurn = !speechResult && existingEntries.length === 0;
  const useElevenLabsOpening = process.env.CALL_TWILIO_ELEVENLABS_OPENING === "1";
  const escapeXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const gatherAction = `/api/voice/twiml${prospectId ? `?prospectId=${prospectId}` : ""}`;
  const body = isOpeningTurn && useElevenLabsOpening
    ? `<Play>${base}/api/voice/audio?text=${encodeURIComponent(aiResponseText)}</Play>`
    : `<Say voice="Polly.Joanna" language="en-US">${escapeXml(aiResponseText)}</Say>`;

  // Silence handling: give ONE gentle nudge ("Hello? Can you hear me?") before
  // hanging up — an immediate "goodbye" wastes every silent pickup.
  const nudgedAlready = existingEntries.some((e) => e.role === "ai" && /can you hear me/i.test(e.text));
  const afterSilence = nudgedAlready
    ? `<Say voice="Polly.Joanna" language="en-US">No problem — I'll email your free video audit instead. Have a great day!</Say>`
    : `<Say voice="Polly.Joanna" language="en-US">Hello? This is Sarah — can you hear me okay?</Say><Gather input="speech dtmf" action="${gatherAction}" method="POST" speechTimeout="3" numDigits="1" />`;
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech dtmf" action="${gatherAction}" method="POST" speechTimeout="2" numDigits="1">
    ${body}
  </Gather>
  ${afterSilence}
</Response>`;

  return new NextResponse(twiml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}
