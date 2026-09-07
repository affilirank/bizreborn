import { config } from "@/lib/integrations/config";
import { uploadFile } from "@/lib/storage";
import type { Prospect } from "@/lib/supabase-types";
import { LEADGEN } from "@/lib/config";

export interface RenderResult {
  /** MP4 URL when a real render host produced one; null means "play in-browser". */
  video_url: string | null;
  thumbnail_url: string;
}

/**
 * Video renderer.
 *
 * Real mode renders the Remotion `PitchVideo` composition to an MP4 (needs
 * Chrome + FFmpeg on the host — not available on serverless). Everywhere else
 * the pitch is played by the in-browser `PitchPlayer` (animated scenes +
 * narration built from the prospect data), so this step only produces a
 * self-contained SVG poster and leaves `video_url` empty.
 */
export async function renderPitchVideo(prospect: Prospect): Promise<RenderResult> {
  const useReal =
    (config.video.mode === "remotion" ||
      (config.video.mode === "auto" && (await remotionAvailable()))) &&
    process.env.VIDEO_DISABLE !== "1";

  if (useReal) {
    try {
      return await renderWithRemotion(prospect);
    } catch (err) {
      console.warn("[video] remotion render failed, using in-browser player:", err);
    }
  }

  return { video_url: null, thumbnail_url: posterDataUrl(prospect) };
}

async function remotionAvailable(): Promise<boolean> {
  try {
    const mod = await (eval(`import("remotion")`) as Promise<{ VERSION?: string }>);
    return Boolean(mod.VERSION);
  } catch {
    return false;
  }
}

const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

export function buildPosterSvg(p: Prospect): string {
  const rating = p.google_rating ?? 0;
  const reviews = p.review_count ?? 0;
  const compReviews = p.competitor_reviews ?? 0;
  const grade = p.audit_report?.grade ?? "";
  const lost = p.roi_projection?.lost_monthly;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#0B0F17"/></linearGradient></defs>
  <rect width="1080" height="1920" fill="url(#g)"/>
  <text x="60" y="200" fill="#a5b4fc" font-size="40" font-weight="700" font-family="sans-serif">BIZ REBORN MARKETING · GROWTH AUDIT</text>
  <text x="60" y="300" fill="#ffffff" font-size="72" font-weight="900" font-family="sans-serif">${esc(p.business_name)}</text>
  ${grade ? `<circle cx="900" cy="560" r="120" fill="#F87171" opacity="0.15"/><circle cx="900" cy="560" r="120" fill="none" stroke="#F87171" stroke-width="10"/><text x="900" y="600" text-anchor="middle" fill="#ffffff" font-size="120" font-weight="900" font-family="sans-serif">${esc(grade)}</text><text x="900" y="720" text-anchor="middle" fill="#94A3B8" font-size="32" font-family="sans-serif">brand grade</text>` : ""}
  <text x="60" y="600" fill="#ffffff" font-size="150" font-weight="900" font-family="sans-serif">${rating.toFixed(1)}</text>
  <text x="60" y="660" fill="#FBBF24" font-size="44" font-family="sans-serif">★ ${reviews} reviews · ${p.unanswered_reviews ?? 0} unanswered</text>
  <rect x="60" y="820" width="960" height="24" rx="12" fill="#1f2937"/>
  <rect x="60" y="820" width="${Math.max(40, Math.min(960, Math.round((reviews / Math.max(compReviews, 1)) * 960)))}" height="24" rx="12" fill="#6366F1"/>
  <text x="60" y="900" fill="#94A3B8" font-size="40" font-family="sans-serif">You: ${reviews} vs ${esc(p.competitor_name)}: ${compReviews}</text>
  ${lost ? `<text x="60" y="1120" fill="#F87171" font-size="44" font-weight="700" font-family="sans-serif">Leaking ≈ $${Math.round(lost).toLocaleString("en-US")}/mo to the market leader</text>` : ""}
  <circle cx="540" cy="1400" r="110" fill="#ffffff" opacity="0.1"/><polygon points="505,1340 505,1460 615,1400" fill="#ffffff"/>
  <text x="540" y="1580" text-anchor="middle" fill="#ffffff" font-size="48" font-weight="700" font-family="sans-serif">Watch your 45-second audit</text>
  <text x="540" y="1760" text-anchor="middle" fill="#94A3B8" font-size="34" font-family="sans-serif">${esc(LEADGEN.email)} · www.bizreborn.com</text>
</svg>`;
}

function posterDataUrl(p: Prospect): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildPosterSvg(p))}`;
}

function key(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function renderWithRemotion(prospect: Prospect): Promise<RenderResult> {
  const { spawn } = await import("node:child_process");
  const { mkdtempSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "br-remotion-"));
  const out = join(dir, "output.mp4");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "remotion",
        "render",
        "src/remotion/index.tsx",
        "PitchVideo",
        out,
        "--props",
        JSON.stringify({
          data: {
            businessName: prospect.business_name,
            google_rating: prospect.google_rating ?? 0,
            review_count: prospect.review_count ?? 0,
            unanswered_reviews: prospect.unanswered_reviews ?? 0,
            competitorName: prospect.competitor_name ?? "competitor",
            competitor_reviews: prospect.competitor_reviews ?? 0,
            grade: prospect.audit_report?.grade ?? null,
            painPoints: prospect.audit_report?.pain_points ?? [],
            roi: prospect.roi_projection,
            script: prospect.pitch_script,
            voiceover: prospect.voiceover_url,
            contactEmail: LEADGEN.email,
          },
        }),
      ],
      { cwd: process.cwd(), stdio: "ignore" },
    );
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`remotion exit ${code}`)),
    );
    child.on("error", reject);
  });

  const video = await uploadFile(
    `video/${key(prospect.business_name)}-pitch.mp4`,
    readFileSync(out),
    "video/mp4",
  );
  return { video_url: video.url, thumbnail_url: posterDataUrl(prospect) };
}
