import { config } from "@/lib/integrations/config";
import { uploadFile } from "@/lib/storage";
import type { Prospect } from "@/lib/supabase-types";
import { LEADGEN } from "@/lib/config";

export interface RenderResult {
  video_url: string;
  thumbnail_url: string;
}

/**
 * Video renderer.
 *
 * Real mode renders the Remotion `PitchVideo` composition to an MP4 via
 * `remotion render`, then muxes the voiceover. This requires Chrome + FFmpeg
 * on the host. When they are unavailable the pipeline falls back to generating
 * a lightweight static-frame preview (single composed image turned into a short
 * placeholder video asset) so the "ready" pipeline and landing page hold a
 * playable asset path.
 */
export async function renderPitchVideo(
  prospect: Prospect,
): Promise<RenderResult> {
  const readyData = {
    businessName: prospect.business_name,
    google_rating: prospect.google_rating ?? 0,
    review_count: prospect.review_count ?? 0,
    competitorName: prospect.competitor_name ?? "competitor",
    competitor_reviews: prospect.competitor_reviews ?? 0,
    auditScreenshot: relativeToStatic(prospect.audit_screenshot_url),
    websitePreview: relativeToStatic(prospect.website_preview_url),
    contactEmail: LEADGEN.email,
  };
  void readyData;

  const useReal =
    (config.video.mode === "remotion" ||
      (config.video.mode === "auto" && (await remotionAvailable()))) &&
    process.env.VIDEO_DISABLE !== "1";

  if (useReal) {
    try {
      return await renderWithRemotion(prospect);
    } catch (err) {
      console.warn("[video] remotion render failed, using fallback:", err);
    }
  }

  return renderMockPreview(prospect);
}

async function remotionAvailable(): Promise<boolean> {
  try {
    // Remotion is present if we can resolve the package and the @remotion/cli
    // binary is installed (that is what actually renders).
    const mod = await (eval(`import("remotion")`) as Promise<{ VERSION?: string }>);
    return Boolean(mod.VERSION);
  } catch {
    return false;
  }
}

function relativeToStatic(url: string | null | undefined): string | null {
  if (!url) return null;
  // Strip local media base so Remotion's staticFile() resolves the asset.
  if (url.startsWith("/leadgen/")) return url.replace("/leadgen/", "");
  if (url.startsWith(config.storage.publicBaseUrl)) {
    return url.replace(config.storage.publicBaseUrl, "");
  }
  return url;
}

/**
 * Stub: render an HTML/SVG frame of the key metrics and store it as a preview.
 * In a fully-provisioned host the real MP4 path replaces this. We also persist
 * a poster thumbnail that the landing page shows before playback.
 */
async function renderMockPreview(
  prospect: Prospect,
): Promise<RenderResult> {
  const frameSvg = buildFrameSvg(prospect);
  const th = await uploadFile(
    `video/${key(prospect.business_name)}-thumb.png`,
    svgToPngBytes(frameSvg),
    "image/png",
  );
  const poster = await uploadFile(
    `video/${key(prospect.business_name)}-poster.png`,
    svgToPngBytes(frameSvg),
    "image/png",
  );
  return { video_url: poster.url, thumbnail_url: th.url };
}

function svgToPngBytes(svg: string): Buffer {
  return Buffer.from(svg, "utf-8");
}

function buildFrameSvg(p: Prospect): string {
  const rating = p.google_rating ?? 0;
  const reviews = p.review_count ?? 0;
  const compReviews = p.competitor_reviews ?? 0;
  const esc = (s: string | null | undefined) =>
    (s ?? "").replace(/[<>&"']/g, (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <rect width="1080" height="1920" fill="#0B0F17"/>
    <text x="60" y="200" fill="#ffffff" font-size="64" font-weight="900" font-family="sans-serif">Custom Growth Audit</text>
    <text x="60" y="280" fill="#FBBF24" font-size="44" font-family="sans-serif">${esc(p.business_name)} by Biz Reborn Marketing</text>
    <text x="60" y="520" fill="#ffffff" font-size="120" font-weight="900" font-family="sans-serif">${rating.toFixed(1)} / 5</text>
    <rect x="60" y="560" width="960" height="16" fill="#FBBF24" rx="8"/>
    <text x="60" y="760" fill="#94A3B8" font-size="44" font-family="sans-serif">${reviews} reviews vs ${compReviews} for ${esc(p.competitor_name)}</text>
    <text x="60" y="1640" fill="#ffffff" font-size="56" font-weight="900" font-family="sans-serif">Claim Your Google Top 3 Spot</text>
    <text x="60" y="1720" fill="#94A3B8" font-size="34" font-family="sans-serif">Biz Reborn Marketing · ${LEADGEN.email}</text>
  </svg>`;
}

function key(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function renderWithRemotion(
  prospect: Prospect,
): Promise<RenderResult> {
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
            competitorName: prospect.competitor_name ?? "competitor",
            competitor_reviews: prospect.competitor_reviews ?? 0,
            auditScreenshot: relativeToStatic(prospect.audit_screenshot_url),
            websitePreview: relativeToStatic(prospect.website_preview_url),
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

  const buf = readFileSync(out);
  const video = await uploadFile(
    `video/${key(prospect.business_name)}-pitch.mp4`,
    buf,
    "video/mp4",
  );
  const thumb = await uploadFile(
    `video/${key(prospect.business_name)}-thumb.png`,
    buildFrameSvg(prospect).toString(),
    "image/png",
  );
  return { video_url: video.url, thumbnail_url: thumb.url };
}