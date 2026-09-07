import { config, hasGemini } from "@/lib/integrations/config";
import { slugify } from "@/lib/utils";

/**
 * AI writing assistant for the blog builder.
 *
 * Edits are scoped to the fields the user asked about (a "prune" of the editor
 * state). When GEMINI_API_KEY is present we ask Gemini 1.5 Flash for the full
 * JSON patch; otherwise a deterministic local engine writes the copy so the
 * assistant always works, even with no external service configured.
 */

export type BlogSectionDraft = {
  heading: string;
  paragraphs: string;
  bullets: string;
};

export type BlogFaqDraft = { q: string; a: string };

export interface BlogDraft {
  title: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  intro: string;
  read_time: string;
  status: string;
  sections: BlogSectionDraft[];
  faq: BlogFaqDraft[];
  cta_headline: string;
  cta_body: string;
}

/** Partial editor state — only the fields the assistant wants to change. */
export type BlogPatch = Partial<BlogDraft>;

export interface BlogAssistantResult {
  reply: string;
  patch?: BlogPatch;
  mode: "live" | "demo";
}

const EMAIL = "bizrebornmarketing@gmail.com";

function topic(d: BlogDraft): string {
  const kw = d.keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)[0];
  return kw || d.title.trim().replace(/[^a-z0-9 ]+/gi, "").split(" ").slice(0, 2).join(" ") || "local business growth";
}

function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function demoIntro(d: BlogDraft): string {
  const k = topic(d);
  return [
    `Most service businesses in 2026 are leaking customers they never even hear about — not because the work is bad, but because no one can find them when it counts.`,
    `This guide breaks down exactly how to turn ${k} into a steady stream of booked calls and walked-in customers, using the same ranking levers the big players own.`,
  ].join("\n\n");
}

function demoMeta(d: BlogDraft): string {
  const b = d.title.trim() || topic(d);
  return `Learn how ${b.toLowerCase().replace(/\.$/, "")} helps local businesses book more customers — practical steps, real examples, and a clear plan to outrank the competition.`;
}

function demoFaq(d: BlogDraft): BlogFaqDraft[] {
  const k = topic(d).toLowerCase();
  const b = d.title.trim() || titleCase(k);
  return [
    {
      q: `How long until ${k} shows real results?`,
      a: `Most businesses see movement in the map pack and review velocity within 30–60 days when the Google Business Profile, review response, and content are tightened together.`,
    },
    {
      q: `Is better ${k} expensive?`,
      a: `Not the parts that matter most. Review response, profile optimization, and consistent local content are low-cost, high-leverage moves any business can start immediately.`,
    },
    {
      q: `Why should ${
        d.title.split(" ").slice(0, 3).join(" ").replace(/[?.!]+$/, "") || b
      } really matter to me?`,
      a: `Because it's the difference between being the obvious choice when a nearby customer searches — or being invisible while a competitor takes the call.`,
    },
  ];
}

function demoSections(d: BlogDraft): BlogSectionDraft[] {
  const k = topic(d).toLowerCase();
  const base = d.title.trim() || titleCase(k);
  const existing = d.sections
    .filter((s) => s.heading.trim())
    .map((s) => s.heading.trim());
  const headings = existing.length
    ? existing
    : [
        `Why ${titleCase(k)} Determines Who Wins the Locality`,
        `Where Most Local Businesses Quietly Lose the Lead`,
        `A Simple, Repeatable Plan to Own the Top Spot`,
      ];
  return headings.map((heading, i) => {
    const paragraphs =
      i === 0
        ? [
            `When a nearby customer searches for what you do, Google rewards the business it trusts — and trust is rebuilt every time you answer a review, refresh your profile, and publish local, relevant content.`,
            `That's the quiet scale of ${
              base.toLowerCase().replace(/\.$/, "") || k
            }: it doesn't just pull more visits, it pulls the right visits at the moment they're ready to buy.`,
          ]
        : i === 1
          ? [
              `The leak is rarely your service. It's the gaps nobody manages: unanswered reviews, an outdated Google Business Profile, and no fresh local content to feed the ranking algorithm.`,
              `Every one of those gaps is a customer a competitor is happy to take.`,
            ]
          : [
              `The fix is a weekly, automated rhythm: respond to every review, publish one local piece of content, tighten your profile, and track the map pack weekly.`,
              `Do that consistently for 60 days and you stop chasing — you start being found.`,
            ];
    return {
      heading,
      paragraphs: paragraphs.join("\n"),
      bullets:
        i === 2
          ? ["Answer every review within 48 hours", "Refresh profile + local content weekly", "Track map-pack position every Monday"].join("\n")
          : "",
    };
  });
}

function demoCta(d: BlogDraft): { cta_headline: string; cta_body: string } {
  const k = topic(d).toLowerCase();
  return {
    cta_headline: "Ready to Own the Top Spot on Google Maps?",
    cta_body: `Book a free strategy call about ${k} and get a custom growth audit for your market — ${EMAIL}.`,
  };
}

function localEngine(d: BlogDraft, instruction: string): BlogPatch {
  const i = instruction.toLowerCase();
  const head = i.split(/[.:,;]/)[0].trim();
  const patch: BlogPatch = {};
  const hasSectionsIntent = /section|article|full post|draft post|expand|outline|content|write the whole/.test(i);

  if (!/cta|call.{0,3}action/.test(head) && /title|headline|hook|name/.test(i)) {
    const title = d.title.trim() || titleCase(topic(d));
    const variants = [
      title,
      `Why Every ${titleCase(topic(d))} Business Is Losing Local Searches (and How to Win)`,
      `The ${titleCase(topic(d))} Playbook: 7 Moves That Fill Your Schedule`,
    ];
    patch.title = variants[d.title.trim() ? 1 : 2];
    if (!d.slug.trim()) patch.slug = slugify(patch.title);
    if (!d.meta_title.trim()) patch.meta_title = patch.title;
  }

  if (/intro|opening|hook paragraph/.test(i)) {
    patch.intro = demoIntro(d);
  }

  if (/meta|seo|keyword/.test(i)) {
    patch.meta_description = demoMeta(d);
    if (!d.keywords.trim()) {
      patch.keywords = `${topic(d)}, local seo, google maps, review management, lead generation`;
    }
  }

  if (/faq|question/.test(i)) {
    patch.faq = demoFaq(d);
  }

  if (/cta|call-to-action|call.?to.?action/.test(i)) {
    const cta = demoCta(d);
    patch.cta_headline = cta.cta_headline;
    patch.cta_body = cta.cta_body;
  }

  if (Object.keys(patch).length === 0 && /rewrite|tone|punch/.test(i)) {
    patch.intro = demoIntro(d);
    patch.meta_description = demoMeta(d);
  }

  if (hasSectionsIntent || Object.keys(patch).length === 0) {
    patch.sections = demoSections(d);
  }

  return patch;
}

function replyFor(patch: BlogPatch): string {
  const touched = Object.keys(patch).join(", ");
  return `Done — updated: ${touched}. Review the fields and tweak anything you like; you can hit Undo to step back.`;
}

function geminiPrompt(d: BlogDraft, instruction: string): string {
  return (
    "You are the AI writing assistant inside the Biz Reborn Marketing blog editor. " +
    "You write crisp, persuasive local-SEO marketing copy in a confident American voice. " +
    "Respond ONLY with a single JSON object, no markdown fences, no commentary. Shape: " +
    '{"reply": "<one short summary sentence for the admin>", "patch": { any subset of ' +
    '{"title","slug","meta_title","meta_description","keywords","intro","read_time",' +
    '"sections":[{"heading","paragraphs","bullets"}],"faq":[{"q","a"}],"cta_headline","cta_body"} }}. ' +
    'Only include patch fields the user asked to change. bullets/paragraphs are plain text with newlines. ' +
    'keywords is a comma-separated string.\n\nCURRENT DRAFT (JSON):\n' +
    JSON.stringify(d) +
    "\n\nUSER REQUEST:\n" +
    instruction
  );
}

function extractJson(text: string): BlogPatch | null {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start));
    if (parsed && typeof parsed === "object" && "patch" in parsed) {
      return (parsed as { patch: BlogPatch }).patch ?? null;
    }
    return parsed as BlogPatch;
  } catch {
    return null;
  }
}

async function geminiBlogEdit(
  d: BlogDraft,
  instruction: string,
): Promise<BlogAssistantResult | null> {
  if (!hasGemini()) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt(d, instruction) }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
        }),
      },
    );
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const patch = extractJson(text);
    if (!patch) return null;
    return {
      reply: "Gemini drafted the edit — review and tweak as needed.",
      patch,
      mode: "live",
    };
  } catch (err) {
    console.warn("[gemini] blog edit failed, using fallback:", err);
    return null;
  }
}

/** Scoped copy edit for the blog builder. Never throws. */
export async function blogAssistant(
  d: BlogDraft,
  instruction: string,
): Promise<BlogAssistantResult> {
  const live = await geminiBlogEdit(d, instruction);
  if (live) return live;

  const patch = localEngine(d, instruction);
  return {
    reply: replyFor(patch),
    patch,
    mode: "demo",
  };
}