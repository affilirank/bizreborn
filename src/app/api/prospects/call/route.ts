import { NextResponse } from "next/server";
import { isAdminOrDemo } from "@/lib/supabase/server";
import { getProspectById } from "@/lib/prospects";
import { upsertCallRecord } from "@/lib/call-store";

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

  if (prospectId) {
    const p = await getProspectById(prospectId);
    if (p) {
      if (!phone && p.phone) {
        phone = p.phone;
      }
      if (!businessName && p.business_name) {
        businessName = p.business_name;
      }
    }
  }

  if (!phone) {
    return NextResponse.json(
      { error: "Prospect phone number is required to initiate an AI voice call." },
      { status: 400 },
    );
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

  return NextResponse.json({
    success: true,
    simulated: true,
    callSid: simulatedSid,
    status: "in-progress",
    message: `Simulated AI voice call initiated to ${phone} for ${businessName || "Business"}. Note: A2P 10DLC registration is NOT required for voice calls. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER for live calls.`,
  });
}
