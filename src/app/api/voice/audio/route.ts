import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Generates and streams ElevenLabs cloned voice audio for Twilio phone calls.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const text = url.searchParams.get("text") || "Hello from Biz Reborn Marketing.";

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // Sarah (energetic & straightforward)

  if (!apiKey) {
    return new NextResponse("ElevenLabs API Key missing", { status: 500 });
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return new NextResponse(`ElevenLabs error: ${errText}`, { status: 500 });
    }

    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[voice audio] error:", err);
    return new NextResponse("Audio generation failed", { status: 500 });
  }
}
