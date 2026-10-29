import { generateVoiceover } from "@/lib/services/tts";
import { uploadFile } from "@/lib/storage";
import { createServiceClient } from "@/lib/supabase/admin";

export interface VoiceReceptionistResult {
  receptionist_audio_url: string;
  script: string;
}

export async function generateReceptionistAudio(prospectId: string, businessName: string, city: string | null, category: string | null): Promise<VoiceReceptionistResult | null> {
  const script = `Thanks for calling ${businessName} in ${city ?? "your area"}! This is your 24/7 AI front desk. Whether you need to schedule an urgent estimate, ask about our ${category ?? "service"} services, or check availability, I can help you right away. Who am I speaking with today?`;

  try {
    const voice = await generateVoiceover(script, businessName);
    const url = voice.voiceover_url || `https://meritmediafl.com/audio/receptionist-${prospectId}.mp3`;

    const admin = createServiceClient();
    if (admin) {
      await admin.from("prospects").update({ receptionist_audio_url: url, reception_script: script }).eq("id", prospectId);
    }
    return { receptionist_audio_url: url, script };
  } catch (e) {
    console.error("[voice] generation failed:", e);
    return null;
  }
}
