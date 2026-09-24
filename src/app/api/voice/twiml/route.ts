import { NextResponse } from "next/server";
import { getProspectById } from "@/lib/prospects";
import { upsertCallRecord, getCallRecord, summarizeOutcome } from "@/lib/call-store";
import type { CallTranscriptEntry } from "@/lib/call-store";
import { classifyCallTranscript } from "@/lib/call-intent";
import { performPostCallIntents } from "@/lib/call-actions";

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
  const isOpeningTurn = !speechResult && existingEntries.length === 0;

  const cityLabel = prospect?.city ?? "your area";
  const ownerCheck = businessName === "the business owner"
    ? "the business owner"
    : `the owner of ${businessName}`;

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

Tone: warm, curious, straightforward, and professional. Be transparent that this is an unsolicited outreach call. Keep every response to one short sentence unless the person asks for detail. Ask one question at a time. Stop speaking immediately when the person starts talking or sounds rushed.`;

  const openAiKey = process.env.OPENAI_API_KEY;
  let aiResponseText = "";

  if (openAiKey && !isOpeningTurn) {
    try {
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      // Keep only the latest turns so the live request stays small and focused.
      for (const entry of existingEntries.slice(-8)) {
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
            content: `You have just reached ${businessName} on the phone. Say this in a natural, trustworthy way: "Hi, am I speaking with ${ownerCheck}? This is Sarah with Biz Reborn Marketing. I found your business while researching local businesses in ${cityLabel}, noticed a couple of opportunities on your Google profile, and made a free 45-second video showing them. Is it okay if I tell you the quick reason I called?" Keep it under 4 short sentences. Do not claim they requested anything, do not exaggerate, and ask only the final permission question.`,
          });
        }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        Number(process.env.CALL_AI_TIMEOUT_MS ?? 2500),
      );

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
          max_tokens: 45,
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
      ? `I hear you, and I will keep this brief: I noticed a couple of Google opportunities for ${businessName} and made a free 45-second video; would you like me to send it over?`
      : `Hi, am I speaking with ${ownerCheck}? This is Sarah with Biz Reborn Marketing. I found your business while researching local businesses in ${cityLabel}, noticed a couple of opportunities on your Google profile, and made a free 45-second video showing them. Is it okay if I tell you the quick reason I called?`;
  }

  // LIVE ACTION WIRING (Twilio path): if the prospect just asked for the
  // audit/proposal, asked to book, or said stop calling — DO IT NOW, mid-call,
  // and confirm it out loud. Same executor the Retell agent uses.
  let liveConfirmation = "";
  if (speechResult) {
    const flags = classifyCallTranscript([speechResult]);
    if (flags.send_audit || flags.book_call || flags.stop_calling) {
      const performed = await performPostCallIntents(prospectId ?? null, flags, callSid || "");
      if (/stop_calling/.test(performed[0] ?? "")) {
        // Honor it immediately and end warmly.
        aiResponseText = "Absolutely — I'll stop calling and take you off our list. Sorry to have bothered you. Have a great day!";
        liveConfirmation = "STOP";
      } else if (/send_audit/.test(performed[0] ?? "")) {
        liveConfirmation = "AUDIT_SENT";
        aiResponseText = `${aiResponseText} Actually — I just sent it to your inbox this very second. Check your email in about a minute, it's a 45-second video made just for ${businessName}.`;
      } else if (/book_call/.test(performed[0] ?? "")) {
        liveConfirmation = "BOOKED";
        aiResponseText = `${aiResponseText} And I've already placed a hold on the calendar for you — you'll get a confirmation email in a minute. Which day works best for you to talk for 10 minutes?`;
      }
    }
  }

  if (callSid) {
    const time = new Date().toLocaleTimeString();
    const entries: CallTranscriptEntry[] = [...(rec?.entries ?? [])];
    if (speechResult) {
      entries.push({ role: "user", text: speechResult, time });
    }
    entries.push({ role: "ai", text: aiResponseText, time });
    if (liveConfirmation && liveConfirmation !== "STOP" && prospectId) {
      entries.push({
        role: "system",
        text: `LIVE ACTION (${liveConfirmation}): ${liveConfirmation === "AUDIT_SENT" ? "audit/proposal email sent while the prospect was on the phone" : "booking hold placed while the prospect was on the phone"}.`,
        time,
      });
    }
    await upsertCallRecord({
      ...(rec ?? {
        callSid,
        prospectId,
        phone: "",
        businessName,
        simulated: false,
        status: "in-progress" as const,
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationSec: 0,
        outcome: null,
      }),
      entries,
      outcome: summarizeOutcome(entries),
    });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";

  // Latency: per-turn <Play> of a serverless-rendered ElevenLabs MP3 added
  // 2-5s of dead air per response (Twilio fetches the URL, the function
  // cold-starts, ElevenLabs generates) — dead air at the OPENING is the #1
  // hangup cause on cold calls. Polly starts instantly, so it's the default
  // everywhere; set CALL_TWILIO_ELEVENLABS_OPENING=1 to trade 3-5s of silence
  // for the cloned voice on the opening line only.
  const useElevenLabsOpening = process.env.CALL_TWILIO_ELEVENLABS_OPENING === "1";
  const escapeXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const gatherAction = `/api/voice/twiml${prospectId ? `?prospectId=${prospectId}` : ""}`;
  const body = isOpeningTurn && useElevenLabsOpening
    ? `<Play>${base}/api/voice/audio?text=${encodeURIComponent(aiResponseText)}</Play>`
    : `<Say voice="${(process.env.TWILIO_TTS_VOICE || "Polly.Joanna")}" language="en-US">${escapeXml(aiResponseText)}</Say>`;

  // Silence handling: give ONE gentle nudge ("Hello? Can you hear me?") before
  // hanging up — an immediate "goodbye" wastes every silent pickup.
  const nudgedAlready = existingEntries.some((e) => e.role === "ai" && /can you hear me/i.test(e.text));
  // Voice is switchable via TWILIO_TTS_VOICE (default Polly.Joanna — female,
  // warm, best cold-call hangup tolerance). Alternatives: Polly.Ruth,
  // Polly.Kimberly, Polly.Salli (female) · Polly.Matthew, Polly.Christopher,
  // Polly.Joey (male — test if your niche skews male-owned trades).
  const voice = process.env.TWILIO_TTS_VOICE || "Polly.Joanna";
  const afterSilence = nudgedAlready
    ? `<Say voice="${voice}" language="en-US">No problem — I'll email your free video audit instead. Have a great day!</Say>`
    : `<Say voice="${voice}" language="en-US">Hello? This is Sarah — can you hear me okay?</Say><Gather input="speech dtmf" action="${gatherAction}" method="POST" speechTimeout="3" numDigits="1" />`;
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${body}
  <Gather input="speech dtmf" action="${gatherAction}" method="POST" speechTimeout="auto" timeout="1" numDigits="1" />
  ${afterSilence}
</Response>`;

  return new NextResponse(twiml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}
