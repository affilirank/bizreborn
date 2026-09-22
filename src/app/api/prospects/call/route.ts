import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { getProspectById } from "@/lib/prospects";
import { upsertCallRecord } from "@/lib/call-store";
import { applyContactLog, makeContactLog } from "@/lib/crm-actions";
import type { Prospect } from "@/lib/supabase-types";

export const dynamic = "force-dynamic";

/**
 * A2P 10DLC REGISTRATION QUESTION & ANSWER:
 * Q: Is A2P 10DLC registration required for Twilio outbound calling?
 * A: For voice calls, A2P 10DLC registration is NOT required! A2P 10DLC is strictly for SMS/MMS messaging in the US.
 * For outbound voice calls, you just need a Twilio phone number and a TwiML Voice webhook URL — no brand vetting or carrier fees required.
 */
export async function POST(req: Request) {
  if (!(await isAdminOrDemo())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const prospectId = String(body?.prospectId ?? "").trim();
  const explicitPhone = String(body?.phone ?? "").trim();

  let phone = explicitPhone;
  let businessName = String(body?.businessName ?? "").trim();
  let prospect: Prospect | null = null;

  if (prospectId) {
    prospect = await getProspectById(prospectId);
    if (prospect) {
      if (!phone && prospect.phone) {
        phone = prospect.phone;
      }
      if (!businessName && prospect.business_name) {
        businessName = prospect.business_name;
      }
    }
  }

  if (!phone) {
    return NextResponse.json(
      { error: "Prospect phone number is required to initiate an AI voice call." },
      { status: 400 },
    );
  }

  // E.164 normalize (Retell requires +1XXXXXXXXXX).
  const digits = phone.replace(/\D/g, "");
  const e164 = digits.length === 10 ? `+1${digits}` : `+${digits}`;

  // PREFERRED: Retell AI voice agent — sub-second responses, interruption
  // handling, transcripts, and post-call analysis. Overrides the Twilio chain.
  // Only used when CALL_PROVIDER=retell (Twilio is ~10x cheaper and default).
  const retellKey = process.env.RETELL_API_KEY;
  const retellAgent = process.env.RETELL_AGENT_ID;
  const { callProvider } = await import("@/lib/services/dialer");
  if (retellKey && retellAgent && callProvider() === "retell") {
    try {
      const dyn: Record<string, string> = {
        contact_name: "the business owner",
        business_name: businessName || "the business",
        grade: "n/a",
        health_score: "n/a",
        rating: "n/a",
        reviews: "n/a",
        unanswered: "n/a",
        competitor_name: "the local market leader",
        competitor_reviews: "n/a",
        lost_monthly: "n/a",
        extra_leads: "n/a",
        projected_monthly: "n/a",
      };
      if (prospect) {
        const roi = prospect.roi_projection;
        dyn.contact_name = "the business owner";
        dyn.business_name = prospect.business_name;
        dyn.grade = prospect.audit_report?.grade ?? "n/a";
        dyn.health_score = prospect.audit_report?.health_score != null ? String(prospect.audit_report.health_score) : "n/a";
        dyn.rating = prospect.google_rating != null ? String(prospect.google_rating) : "n/a";
        dyn.reviews = prospect.review_count != null ? String(prospect.review_count) : "n/a";
        dyn.unanswered = prospect.unanswered_reviews != null ? String(prospect.unanswered_reviews) : "n/a";
        dyn.competitor_name = prospect.competitor_name ?? "the local market leader";
        dyn.competitor_reviews = prospect.competitor_reviews != null ? String(prospect.competitor_reviews) : "n/a";
        dyn.lost_monthly = roi ? `$${Math.round(roi.lost_monthly).toLocaleString()}` : "n/a";
        dyn.extra_leads = roi ? String(roi.leads_per_month) : "n/a";
        dyn.projected_monthly = roi ? `$${Math.round(roi.projected_monthly).toLocaleString()}` : "n/a";
      }

      const fromNumber = process.env.RETELL_FROM_NUMBER;
      const callBody: Record<string, unknown> = {
        to_number: e164,
        // When no dedicated number is configured, the agent dials from the
        // number bound to it in the Retell dashboard.
        ...(fromNumber ? { from_number: fromNumber } : { from_agent: retellAgent }),
        retell_llm_dynamic_variables: dyn,
        metadata: { prospectId: prospectId || "", businessName: businessName || "" },
        reduced_latency: true,
      };

      const res = await fetch("https://api.retellai.com/v2/create-phone-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${retellKey}`,
        },
        body: JSON.stringify(callBody),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          { error: `Retell call failed: ${data?.message || res.status}` },
          { status: 400 },
        );
      }
      const callId = String(data.call_id ?? `retell_${Date.now()}`);
      await upsertCallRecord({
        callSid: callId,
        prospectId: prospectId || null,
        phone: e164,
        businessName: businessName || "Business",
        simulated: false,
        status: "dialing",
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationSec: 0,
        entries: [
          { role: "system", text: `Retell AI call initiated to ${e164} for ${businessName || "Business"}.`, time: new Date().toLocaleTimeString() },
        ],
        outcome: null,
      });
      if (prospect) {
        try {
          await applyContactLog(
            prospect,
            makeContactLog({ kind: "call", trigger: "outreach", stepLabel: `Retell AI call initiated to ${e164}` }),
            "outreach",
          );
        } catch (err) {
          console.warn("[call] pipeline log failed:", err);
        }
      }
      return NextResponse.json({
        success: true,
        simulated: false,
        callSid: callId,
        status: "registered",
        message: `Retell AI call initiated to ${e164} — live transcript and outcome land back in the CRM when the call ends.`,
      });
    } catch (err) {
      console.error("[call] Retell error:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Retell call failed." },
        { status: 500 },
      );
    }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  const host = req.headers.get("host") || "www.bizreborn.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  const twimlUrl = `${protocol}://${host}/api/voice/twiml${prospectId ? `?prospectId=${prospectId}` : ""}`;

  if (accountSid && authToken && twilioNumber) {
    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${auth}`,
          },
          body: new URLSearchParams({
            To: phone,
            From: twilioNumber,
            Url: twimlUrl,
            StatusCallback: `${protocol}://${host}/api/voice/status`,
            StatusCallbackEvent: "initiated ringing answered completed",
            StatusCallbackMethod: "POST",
          }),
        },
      );

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const callSid = String(data.sid ?? "");
        await upsertCallRecord({
          callSid: callSid || `CA_${Date.now()}`,
          prospectId: prospectId || null,
          phone,
          businessName: businessName || "Business",
          simulated: false,
          status: "dialing",
          startedAt: new Date().toISOString(),
          endedAt: null,
          durationSec: 0,
          entries: [
            {
              role: "system",
              text: `Outbound call initiated to ${phone} for ${businessName || "Business"}.`,
              time: new Date().toLocaleTimeString(),
            },
          ],
          outcome: null,
        });
        if (prospect) {
          try {
            await applyContactLog(
              prospect,
              makeContactLog({ kind: "call", trigger: "outreach", stepLabel: "Outbound AI voice call initiated" }),
              "outreach",
            );
          } catch (err) {
            console.warn("[call] pipeline log failed:", err);
          }
        }
        return NextResponse.json({
          success: true,
          simulated: false,
          callSid: callSid || `CA_${Date.now()}`,
          status: data.status,
          message: `Live outbound call initiated to ${phone} from ${twilioNumber} via Twilio!`,
        });
      } else {
        return NextResponse.json(
          { error: data.message || "Twilio call initiation failed." },
          { status: 400 },
        );
      }
    } catch (err) {
      console.error("[call] Twilio error:", err);
    }
  }

  // Fallback simulation when Twilio keys are absent
  const simulatedSid = `CA_simulated_${Date.now()}`;
  await upsertCallRecord({
    callSid: simulatedSid,
    prospectId: prospectId || null,
    phone,
    businessName: businessName || "Business",
    simulated: true,
    status: "in-progress",
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationSec: 0,
    entries: [
      {
        role: "system",
        text: `Simulated outbound call connected to ${phone} for ${businessName || "Business"}.`,
        time: new Date().toLocaleTimeString(),
      },
    ],
    outcome: null,
  });

  if (prospect) {
    try {
      await applyContactLog(
        prospect,
        makeContactLog({ kind: "call", trigger: "outreach", stepLabel: "Outbound AI voice call initiated (simulated)" }),
        "outreach",
      );
    } catch (err) {
      console.warn("[call] pipeline log failed:", err);
    }
  }

  return NextResponse.json({
    success: true,
    simulated: true,
    callSid: simulatedSid,
    status: "in-progress",
    message: `Simulated AI voice call initiated to ${phone} for ${businessName || "Business"}. Note: A2P 10DLC registration is NOT required for voice calls. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER for live calls.`,
  });
}
