import { config } from "@/lib/integrations/config";
import { uploadFile } from "@/lib/storage";

/**
 * Audio engine.
 *
 * Real mode shells out to Python `edge-tts` (Microsoft Edge neural TTS) to
 * synthesize a natural `voiceover.mp3` from the pitch script. When Python or
 * the edge-tts module is unavailable, it falls back to generating a silent MP3
 * placeholder so downstream muxing still works — and the actual narration can
 * be generated later simply by enabling TTS_MODE=edge-tts.
 */
export async function generateVoiceover(
  script: string,
  businessName: string,
): Promise<{ voiceover_url: string | null }> {
  const key = safeKey(businessName);

  const useReal =
    (config.tts.mode === "edge-tts" ||
      (config.tts.mode === "auto" && (await edgeTtsAvailable()))) &&
    process.env.TTS_DISABLE !== "1";

  if (useReal) {
    try {
      const mp3 = await runEdgeTts(script);
      const stored = await uploadFile(`audio/${key}-voiceover.mp3`, mp3, "audio/mpeg");
      return { voiceover_url: stored.url };
    } catch (err) {
      console.warn("[tts] edge-tts failed, narration will use the browser voice:", err);
    }
  }

  // No server TTS available (e.g. serverless). The pitch player narrates the
  // script client-side with the Web Speech API, so we simply skip the file.
  if (process.env.TTS_STUB_UPLOAD === "1") {
    try {
      const stub = await silentMp3Stub();
      const stored = await uploadFile(`audio/${key}-voiceover.mp3`, stub, "audio/mpeg");
      return { voiceover_url: stored.url };
    } catch (err) {
      console.warn("[tts] stub upload failed:", err);
    }
  }
  return { voiceover_url: null };
}

async function edgeTtsAvailable(): Promise<boolean> {
  try {
    const { execFileSync } = await import("node:child_process");
    execFileSync("python3", ["-c", "import edge_tts"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function runEdgeTts(script: string): Promise<Buffer> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileP = promisify(execFile);
  // Call a bundled python helper so we don't need node bindings for edge-tts.
  const py = `
import asyncio, sys
import edge_tts
async def main():
    tts = edge_tts.Communicate(sys.argv[1], "${config.tts.voice}")
    await tts.save(sys.argv[2])
asyncio.run(main())
`;
  const { writeFileSync, mkdtempSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "br-tts-"));
  const scriptPath = join(dir, "tts.py");
  const outPath = join(dir, "out.mp3");
  writeFileSync(scriptPath, py);
  await execFileP("python3", [scriptPath, script, outPath]);
  const { readFileSync } = await import("node:fs");
  return readFileSync(outPath);
}

async function silentMp3Stub(): Promise<Buffer> {
  // Writes an MP3 of ~0.15s of silence using raw MPEG frames that FFmpeg and
  // browsers can decode — a stand-in until real narration is enabled.
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileP = promisify(execFile);
  const { writeFileSync, mkdtempSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "br-audio-"));
  const wav = join(dir, "silence.wav");
  const mp3 = join(dir, "silence.mp3");

  // 16-bit 22050 Hz mono, 0.15s of zeros.
  const rate = 22050;
  const sampleCount = Math.round(rate * 0.15);
  const buf = Buffer.alloc(sampleCount * 2);
  const header = Buffer.from("RIFF");
  const total = 36 + buf.length;
  const out = Buffer.concat([
    header,
    Buffer.from(new Uint8Array(new Uint32Array([total]).buffer)),
    Buffer.from("WAVEfmt "),
    Buffer.from(new Uint8Array(new Uint32Array([16]).buffer)),
    Buffer.from(new Uint8Array(new Uint16Array([1]).buffer)),
    Buffer.from(new Uint8Array(new Uint16Array([1]).buffer)),
    Buffer.from(new Uint8Array(new Uint32Array([rate]).buffer)),
    Buffer.from(new Uint8Array(new Uint32Array([rate * 2]).buffer)),
    Buffer.from(new Uint8Array(new Uint16Array([2]).buffer)),
    Buffer.from(new Uint8Array(new Uint16Array([16]).buffer)),
    Buffer.from("data"),
    Buffer.from(new Uint8Array(new Uint32Array([buf.length]).buffer)),
    buf,
  ]);
  writeFileSync(wav, out);

  try {
    await execFileP("ffmpeg", ["-y", "-i", wav, "-codec:a", "libmp3lame", mp3]);
    return readFileSync(mp3);
  } catch {
    // No ffmpeg available — return the WAV bytes (browsers decode WAV too).
    return out;
  }
}

function safeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}