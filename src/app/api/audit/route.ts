import { NextResponse } from "next/server";
import { z } from "zod";
import { runAudit } from "@/lib/audit";
import { callAi } from "@/lib/ai-router";
import { ALL_SERVICES } from "@/data/services";

export const dynamic = "force-dynamic";

const AuditSchema = z.object({
  url: z.string().or(z.string().min(2)),
  businessName: z.string().max(120).optional().default(""),
  gbp: z.string().max(120).optional().default(""),
  instagram: z.string().max(120).optional().default(""),
  facebook: z.string().max(120).optional().default(""),
  tiktok: z.string().max(120).optional().default(""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = AuditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid audit input.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const normalizedUrl = input.url.includes("://")
      ? input.url
      : `https://${input.url}`;

    // Try AI-powered real audit lookup using our smart AI router (Gemini -> OpenAI)
    let aiReport: any = null;
    const aiPrompt = [
      `Business Name: ${input.businessName || "Local Business"}`,
      `Website URL: ${normalizedUrl}`,
      `GBP / Socials: GBP=${input.gbp}, IG=${input.instagram}, FB=${input.facebook}, TikTok=${input.tiktok}`,
      `Available Services Catalog (ID and Title): ${JSON.stringify(ALL_SERVICES.map(s => ({ id: s.id, title: s.title, pillar: s.pillar })))}`,
      `Analyze this business and return a JSON object representing an AuditReport:`,
      `Keys required:`,
      `- healthScore (number 10-95)`,
      `- grade (string A, B, C, or D)`,
      `- breakdowns (array of 4 objects: key ('localSeo'|'socialVelocity'|'conversion'|'reputation'), label, score (10-95), description, issues (array of strings))`,
      `- painPoints (array of 3-5 real specific marketing/SEO flaws for this business)`,
      `- fixes (array of 3-5 specific fix descriptions, each referencing a matching service from the catalog by its service id, e.g. "Hyper-Local SEO On-Page Schema Injection (service #4)")`,
      `- comparedTo (array of 2 objects: label, count)`,
      `- keywordSearches (array of 3 objects: term, volume, difficulty)`,
      `Return ONLY valid raw JSON, no markdown fences.`,
    ].join("\n");

    const text = await callAi({
      prompt: aiPrompt,
      systemPrompt: "You are an expert agency auditor and local SEO specialist. Provide real, rigorous intelligence based on public business data.",
      jsonMode: true,
      maxTokens: 4000,
    });

    if (text) {
      try {
        const parsedJson = JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
        if (parsedJson && typeof parsedJson.healthScore === "number") {
          aiReport = {
            id: `AUD-${Date.now().toString(36).toUpperCase()}`,
            createdAt: new Date().toISOString(),
            url: normalizedUrl,
            businessName: input.businessName || "Local Business",
            gbp: input.gbp,
            socials: { instagram: input.instagram, facebook: input.facebook, tiktok: input.tiktok },
            healthScore: Number(parsedJson.healthScore) || 54,
            grade: String(parsedJson.grade || "C"),
            breakdowns: Array.isArray(parsedJson.breakdowns) ? parsedJson.breakdowns : [],
            painPoints: Array.isArray(parsedJson.painPoints) ? parsedJson.painPoints : [],
            fixes: Array.isArray(parsedJson.fixes) ? parsedJson.fixes : [],
            comparedTo: Array.isArray(parsedJson.comparedTo) ? parsedJson.comparedTo : [
              { label: "Local avg. competitor", count: 32 },
              { label: "Top map-pack performer", count: 185 },
            ],
            keywordSearches: Array.isArray(parsedJson.keywordSearches) ? parsedJson.keywordSearches : [
              { term: `${input.businessName || "business"} near me`, volume: 1800, difficulty: 32 },
            ],
          };
        }
      } catch (parseErr) {
        console.warn("[audit api] AI json parse failed, using fallback runner:", parseErr);
      }
    }

    const report = aiReport || runAudit({ ...input, url: normalizedUrl });
    return NextResponse.json({ report });
  } catch (err) {
    console.error("[audit api] error:", err);
    return NextResponse.json({ error: "Audit failed." }, { status: 500 });
  }
}
