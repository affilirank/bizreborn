import {
  ALL_SERVICES,
  BUSINESS_VERTICALS,
  MARKETING_STATS,
  PILLARS,
  SUBSCRIPTION_TIERS,
} from "@/data/services";

export interface KbDoc {
  id: string;
  kind: "service" | "pillar" | "vertical" | "tier" | "stat" | "faq" | "product";
  title: string;
  body: string;
  keywords: string[];
  serviceId?: number;
  href?: string;
}

const money = (n: number) =>
  n === 0 ? "" : n > 0 ? `$${n.toLocaleString()}` : "";

function buildDocs(): KbDoc[] {
  const docs: KbDoc[] = [];

  for (const s of ALL_SERVICES) {
    const priceParts = [
      money(s.oneTime) ? `${money(s.oneTime)} setup` : "",
      money(s.monthly) ? `${money(s.monthly)}/mo` : "",
    ].filter(Boolean);
    docs.push({
      id: `svc-${s.id}`,
      kind: "service",
      serviceId: s.id,
      title: s.title,
      href: `/services?preselect=${s.id}`,
      keywords: [
        s.title.toLowerCase(),
        ...s.tags.map((t) => t.toLowerCase()),
        s.pillar,
      ],
      body: `${s.title}. ${
        s.blurb
      } Pricing: ${priceParts.join(" + ") || "Included in subscription"}.`,
    });
  }

  for (const p of PILLARS) {
    const range = p.services.reduce(
      (acc, s) => ({
        min: acc.min === null || s.monthly > 0 ? (acc.min ?? s.monthly) : Math.min(acc.min, s.monthly),
        max: Math.max(acc.max, s.oneTime + s.monthly),
      }),
      { min: null as number | null, max: 0 },
    );
    docs.push({
      id: `pillar-${p.id}`,
      kind: "pillar",
      title: p.name,
      href: `/services`,
      keywords: [p.name.toLowerCase(), p.tagline.toLowerCase(), p.id],
      body: `${p.name}. ${p.tagline} This pillar ships ${
        p.services.length
      } modules. Typical investment ${money(
        range.min ?? 0,
      )}–${money(range.max)}.`,
    });
  }

  for (const v of BUSINESS_VERTICALS) {
    const pill = v.recommended
      .map((id) => PILLARS.find((p) => p.id === id)?.name.split(" & ")[0])
      .filter(Boolean)
      .join(", ");
    docs.push({
      id: `vertical-${v.id}`,
      kind: "vertical",
      title: v.label,
      href: `/services?vertical=${v.id}`,
      keywords: [v.label.toLowerCase(), v.blurb.toLowerCase(), v.id],
      body: `${v.label}: ${v.blurb} Start with the ${v.recommended.length} highest-impact pillars for this category: ${pill}.`,
    });
  }

  for (const [id, t] of Object.entries(SUBSCRIPTION_TIERS)) {
    docs.push({
      id: `tier-${id}`,
      kind: "tier",
      title: `${t.name} — ${money(t.monthly)}/mo`,
      href: `/services`,
      keywords: [
        t.name.toLowerCase(),
        id,
        "subscription",
        "tier",
        "plan",
        "retainer",
      ],
      body: `${t.name} retainer at ${money(t.monthly)}/month. ${t.headline} Includes: ${t.perks.join(
        "; ",
      )}.`,
    });
  }

  for (const s of MARKETING_STATS) {
    docs.push({
      id: `stat-${s.label.slice(0, 24)}`,
      kind: "stat",
      title: `${s.value}${s.suffix} of local searches`,
      href: "/services",
      keywords: ["stat", "data", "roi", "proof", "local search"],
      body: `${s.value}${s.suffix} ${s.label} Source: ${s.source}.`,
    });
  }

  const faq: Array<[string, string, string[]]> = [
    [
      "What is Biz Reborn?",
      "Biz Reborn is a modular local-marketing machine. Instead of a one-size agency retainer, you pick exactly the modules you need across 10 pillars — Local SEO, short-form video, websites & funnels, reviews, SMS retention, paid ads, social, digital products, commercial real estate, and automation. You pay a one-time setup per module plus a monthly retainer, or bundle into the Solo, Growth, or Local Dominance tier.",
      ["about", "what is", "who are you", "company", "biz reborn", "start"],
    ],
    [
      "How does it work?",
      "Three steps. 1) Run the free AI Brand Audit — it scores your Local SEO, social velocity, conversion, and reputation out of 100 and names the exact gaps. 2) Build your menu — 100 services across 10 pillars, with a live ROI slider that projects monthly revenue. 3) Pay once (or subscribe) and watch fulfillment status in your client dashboard. Demo mode simulates everything; add Stripe keys to take live payments.",
      ["how", "work", "process", "steps", "get started"],
    ],
    [
      "Is there a contract?",
      "No long-term lock-in. You pay monthly for active modules and can swap them anytime. Cancelling a subscription just pauses delivery of the recurring modules — your one-time assets are yours to keep.",
      ["contract", "cancel", "commitment", "lock in", "month to month"],
    ],
    [
      "Why do 88% of local searches matter?",
      "88% of consumers who search for a local business on mobile call or visit within 24 hours. That's why speed, map-pack rank, and instant SMS response decide who wins the local market — and why Biz Reborn prioritizes those systems first.",
      ["88", "local search", "mobile", "stat"],
    ],
    [
      "Do I need a big budget?",
      "No. Start with the Solo tier at $997/mo — 3 active modules and one optimized lead channel. Most owners begin with 1–2 modules (e.g. GBP optimization + SMS text-back) and scale into Growth or Dominance as revenue rises.",
      ["budget", "expensive", "price", "cost", "cheap", "affordable"],
    ],
    [
      "What's the ROI slider?",
      "In the service builder you set your average customer value and how much you want to increase leads. The ROI sidebar projects monthly revenue and ROAS from your module spend, so you see the math before you pay.",
      ["roi", "return", "revenue", "leads", "projection", "calculator"],
    ],
    [
      "What is the AI Brand Audit?",
      "A free 60-second scan that simulates a multi-point audit of your website, Google Business Profile, socials, reviews, and speed. You get a Brand Health Score from 0–100, a grade, 4 breakdown scores, specific pain points, and local keyword intelligence — plus recommended fixes pre-loaded into the service builder.",
      ["audit", "scan", "score", "report", "health"],
    ],
    [
      "Can you handle my barbershop / restaurant / real estate / trades / e-commerce / practice?",
      "Yes. Biz Reborn ships category-specific stacks for 12 verticals — Barbershop & Salon, Real Estate & Mortgage, Contractor & HVAC, Restaurant & QSR, E-Commerce, Professional Services, Gym & Fitness, Dental / Medical / Aesthetics, Auto & Automotive, Law & Legal, Education & Coaching, and Creator / Influencer / Podcast. Each vertical has a recommended pillar stack that matches how buyers in that category choose.",
      ["vertical", "niche", "industry", "category", "barbershop", "salon", "restaurant", "real estate", "contractor", "hvac", "ecommerce", "professional", "fitness", "dental", "automotive", "law", "education", "creator", "influencer", "podcast"],
    ],
    [
      "How fast will I see results?",
      "Setup modules go live in 1–3 weeks. Review velocity and map-pack gains typically show inside 60–90 days, and the SMS text-back systems convert same-day. The dashboard tracks your fulfillment progress module-by-module.",
      ["fast", "when", "timeline", "results", "how long", "expect"],
    ],
    [
      "Who do I talk to if I need help?",
      "Reach us on the Contact page — email is required so a real strategist replies within one business day. If you're a client, support also runs through your client dashboard.",
      ["contact", "help", "human", "support", "talk to", "reach"],
    ],
  ];
  for (const [title, body, keywords] of faq) {
    docs.push({
      id: `faq-${title.slice(0, 24).toLowerCase()}`,
      kind: "faq",
      title,
      body,
      keywords: keywords.map((k) => k.toLowerCase()),
      href: "/services",
    });
  }

  docs.push({
    id: "product-about",
    kind: "product",
    title: "Biz Reborn Marketing",
    href: "/",
    keywords: ["biz reborn", "marketing", "about", "agency", "company"],
    body: "Biz Reborn Marketing is a modular, AI-accelerated local growth system: 10 pillars, 100 services, and 6 industry stacks — with a free AI audit, transparent pricing, live ROI math, and dashboards for clients and admins.",
  });

  return docs;
}

export const KNOWLEDGE_BASE: KbDoc[] = buildDocs();

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "to", "of",
  "for", "and", "or", "but", "in", "on", "at", "by", "with", "from", "as",
  "do", "does", "did", "have", "has", "had", "what", "when", "where", "which",
  "who", "whom", "how", "why", "can", "could", "will", "would", "should",
  "i", "me", "my", "you", "your", "we", "our", "us", "it", "that", "this",
  "these", "those", "there", "their", "they", "them", "if", "then", "than",
  "so", "just", "get", "got", "want", "need", "like", "much", "many",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function searchKnowledgeBase(query: string, limit = 5): KbDoc[] {
  return searchKnowledgeBaseScored(query, limit).map((s) => s.doc);
}

export function searchKnowledgeBaseScored(
  query: string,
  limit = 5,
): Array<{ doc: KbDoc; score: number }> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored: Array<{ doc: KbDoc; score: number }> = [];
  for (const doc of KNOWLEDGE_BASE) {
    let score = 0;
    const titleWords = new Set(tokenize(doc.title));
    const keywordSet = new Set(doc.keywords);
    for (const t of tokens) {
      if (titleWords.has(t)) score += 4;
      if (keywordSet.has(t)) score += 3;
      if (doc.body.toLowerCase().includes(t)) score += 1;
      // partial pillar/service id match
      if (doc.id.includes(t) || doc.title.toLowerCase().includes(t)) score += 2;
    }
    if (score > 0) scored.push({ doc, score });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
