import { generateVoiceover } from "@/lib/services/tts";
import { uploadFile } from "@/lib/storage";
import { createServiceClient } from "@/lib/supabase/admin";

export interface VoiceReceptionistResult {
  receptionist_audio_url: string;
  script: string;
}

/**
 * Builds a futuristic, tool-packed receptionist script that sells the niche.
 * Mentions concrete capabilities: booking, lead capture, pricing, FAQ, SMS callback, directions.
 */
function buildScript(
  businessName: string,
  city: string | null,
  category: string | null,
  tools: string[],
): string {
  const toolPhrases: Record<string, string> = {
    appointment_booking: "I can book your appointment instantly — same-day or emergency slots available.",
    lead_capture: "I'll capture your details and send them straight to our team so no lead slips through.",
    faq_knowledge_base: "Ask me anything — pricing, licensing, insurance, service areas — I've got answers.",
    service_pricing: "I can walk you through our service pricing and give you a ballpark quote right now.",
    sms_callback: "Want a recap? I'll text you a summary of this conversation and a booking link.",
    map_directions: "Need to find us? I'll send you directions and a Google Maps link in seconds.",
  };
  const activeTools = tools.filter((t) => toolPhrases[t]);
  const toolsText = activeTools.length
    ? activeTools.map((t) => toolPhrases[t]).join(" ")
    : "I handle booking, lead capture, pricing, FAQs, and SMS callbacks.";
  const area = city ?? "your area";
  const nicheText = category ?? "local home services";

  return `Thanks for calling ${businessName} in ${area}! This is your 24/7 AI front desk for ${nicheText}. I'm here to help you right now — no hold music, no voicemail. ${toolsText} Just tell me what you need and I'll take care of it. Who am I speaking with today?`;
}

export async function generateReceptionistAudio(
  prospectId: string,
  businessName: string,
  city: string | null,
  category: string | null,
): Promise<VoiceReceptionistResult | null> {
  const tools = [
    "appointment_booking",
    "lead_capture",
    "faq_knowledge_base",
    "service_pricing",
    "sms_callback",
    "map_directions",
  ];
  const script = buildScript(businessName, city, category, tools);

  try {
    const voice = await generateVoiceover(script, businessName);
    const url = voice.voiceover_url || `https://meritmediafl.com/audio/receptionist-${prospectId}.mp3`;

    const admin = createServiceClient();
    if (admin) {
      await admin
        .from("prospects")
        .update({ receptionist_audio_url: url, reception_script: script })
        .eq("id", prospectId);
    }
    return { receptionist_audio_url: url, script };
  } catch (e) {
    console.error("[voice] generation failed:", e);
    return null;
  }
}
