import { ALL_SERVICES, SUBSCRIPTION_TIERS } from "@/data/services";
import { searchKnowledgeBase, type KbDoc } from "@/lib/knowledge-base";

export interface ChatSuggestion {
  label: string;
  href: string;
}

export interface ChatReply {
  text: string;
  suggestions: ChatSuggestion[];
}

const PILLAR_SYNONYMS: Record<string, string[]> = {
  "local-seo": ["seo", "google", "map pack", "gbp", "maps", "rank", "search"],
  "short-form-video": ["video", "reels", "tiktok", "shorts", "content"],
  "websites-funnels": ["website", "landing page", "funnel", "web", "page"],
  "reputation-reviews": ["review", "reputation", "stars", "rating"],
  "sms-retention": ["sms", "text", "retention", "follow up", "missed call"],
  "paid-ads": ["ads", "advertising", "ppc", "facebook ads", "meta", "geo"],
  "social-branding": ["social", "instagram", "branding", "posting"],
  "digital-products": ["course", "ebook", "podcast", "product", "community"],
  "commercial-real-estate": ["real estate", "commercial", "leasing"],
  "automation-metrics": ["automation", "dashboard", "metrics", "tracking", "crm"],
};

const VERTICAL_HINTS: Record<string, string[]> = {
  barbershop: ["barbershop", "barber", "salon", "hair", "grooming"],
  realestate: ["real estate", "realtor", "mortgage", "property", "agent"],
  contractor: ["contractor", "hvac", "plumbing", "roof", "electrician", "trade"],
  restaurant: ["restaurant", "food", "cafe", "bar", "qsr", "eatery"],
  ecommerce: ["ecommerce", "e-commerce", "shop", "store", "online store"],
  professional: ["professional", "lawyer", "attorney", "doctor", "clinic", "accountant", "services"],
  fitness: ["gym", "fitness", "trainer", "yoga", "pilates", "crossfit"],
  dental: ["dental", "dentist", "orthodontist", "medical", "aesthetics", "med spa", "dermatology", "clinic"],
  automotive: ["automotive", "auto", "car wash", "mechanic", "detailing", "dealership", "tire"],
  law: ["lawyer", "attorney", "law firm", "legal", "law"],
  education: ["education", "coach", "tutor", "course", "school", "academy"],
  creator: ["influencer", "creator", "podcast", "podcaster", "youtube", "youtuber", "tiktoker", "streamer"],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function suggestionFor(doc: KbDoc): ChatSuggestion | null {
  if (doc.kind === "service" && doc.serviceId) {
    const svc = ALL_SERVICES.find((s) => s.id === doc.serviceId);
    return svc
      ? { label: `Add: ${svc.title}`, href: `/services?preselect=${svc.id}` }
      : null;
  }
  if (doc.href) {
    return { label: doc.title, href: doc.href };
  }
  return null;
}

const GREETINGS = /^(hi|hello|hey|yo|sup|howdy|good (morning|afternoon|evening))[!.]*$/;

function intent(m: string) {
  const lower = m.toLowerCase();
  const has = (...words: string[]) => words.some((w) => lower.includes(w));

  if (GREETINGS.test(m.toLowerCase())) return "greeting";

  // "How should I price MY business" is a novel strategy question, not a
  // request for Biz Reborn's pricing — let it fall through to the LLM.
  const selfPricing =
    /(price|pricing|charge|cost)\b[^.]*\b(my|our)\b/.test(lower) ||
    /(my|our)\s+(price|pricing|prices)\b/.test(lower) ||
    /should i charge|what should i charge/.test(lower);

  if (
    !selfPricing &&
    has("price", "pricing", "cost", "how much", "budget", "cheap", "afford")
  )
    return "pricing";
  if (
    has("contact", "human", "talk to someone", "real person", "support", "assistance", "assist me", "reach someone") ||
    /\bhelp\b|need help|help me|help!|help please/.test(lower)
  )
    return "contact";
  if (has("audit", "scan", "brand health", "score my", "score my brand"))
    return "audit";
  if (has("roi", "return on", "revenue", "projection", "leads", "calculate"))
    return "roi";
  if (
    has("tier", "subscription", "retainer", "plan", "solo", "growth", "dominance")
  )
    return "tiers";

  for (const [pillar, words] of Object.entries(PILLAR_SYNONYMS)) {
    if (words.some((w) => lower.includes(w))) return `pillar:${pillar}`;
  }
  for (const [vertical, words] of Object.entries(VERTICAL_HINTS)) {
    if (words.some((w) => lower.includes(w))) return `vertical:${vertical}`;
  }

  if (
    has("how it works", "how does it work", "process", "get started", "steps")
  )
    return "how";
  if (has("what is", "who are", "about", "company", "what do you do"))
    return "about";
  if (has("fast", "how long", "timeline", "results", "when will"))
    return "timeline";
  if (has("cancel", "contract", "commitment", "lock in")) return "contract";
  return "kb";
}

function buildReply(
  reply: string,
  docs: Array<KbDoc | ChatSuggestion>,
): ChatReply {
  const suggestions: ChatSuggestion[] = [];
  for (const doc of docs) {
    if ("label" in doc) {
      if (suggestions.length < 3) suggestions.push(doc);
      continue;
    }
    const s = suggestionFor(doc);
    if (s && suggestions.length < 3) suggestions.push(s);
  }
  return { text: reply, suggestions };
}

export function chatWithAssistant(message: string): ChatReply {
  const intentName = intent(message);
  const money = (n: number) => `$${n.toLocaleString()}`;

  switch (intentName) {
    case "greeting":
      return buildReply(
        pick([
          "Hey there! I'm the Biz Reborn growth assistant. Ask me about pricing, our 100 service modules, which pillar to start with, or what the AI audit will tell you — I'm trained on the whole playbook.",
          "Hi! I can walk you through the 10 pillars, recommend a stack for your industry, explain pricing, or set you up with the free audit. What's your business?",
        ]),
        [],
      );

    case "pricing": {
      const solo = SUBSCRIPTION_TIERS.solo.monthly;
      const growth = SUBSCRIPTION_TIERS.growth.monthly;
      const dom = SUBSCRIPTION_TIERS.dominance.monthly;
      return buildReply(
        `Here's the pricing map:\n\n• A-la-carte: each module has a one-time setup fee (${money(
          195,
        )}–${money(1995)}) plus a monthly retainer where it applies.\n• Solo Launch: ${money(
          solo,
        )}/mo — 3 active modules, 1 optimized lead channel.\n• Growth Engine: ${money(
          growth,
        )}/mo — 8 modules, 3 channels, strategy calls.\n• Local Dominance: ${money(
          dom,
        )}/mo — unlimited modules, geo-fencing, dedicated strategist.\n\nMost owners start with Solo or 1–2 a-la-carte modules and scale as revenue grows.`,
        [
          {
            label: `Solo Launch · ${money(solo)}/mo`,
            href: "/services",
          },
          {
            label: `Growth Engine · ${money(growth)}/mo`,
            href: "/services",
          },
          {
            label: "Build my menu + ROI",
            href: "/services",
          },
        ],
      );
    }

    case "contact":
      return buildReply(
        "Happy to connect you with a human. Head to the Contact page and fill out the form — email is required so a growth strategist replies within one business day. If you're an existing client, support runs through your client dashboard.",
        [{ label: "Open contact form", href: "/contact" }],
      );

    case "audit":
      return buildReply(
        "The free AI Brand Audit is the perfect starting point. It simulates a 60-second multi-point scan of your website, Google Business Profile, socials, speed, and reviews — then gives you:\n\n• A Brand Health Score (0–100) and grade\n• 4 breakdown scores (Local SEO, Social Velocity, Conversion, Reputation)\n• Specific pain points, e.g. missing schema, no text-back, slow page speed, dead socials\n• Local keyword intelligence\n\nIt's free, takes ~60 seconds, and your recommended fixes get pre-loaded into the service builder.",
        [{ label: "Run the free audit", href: "/audit" }],
      );

    case "roi":
      return buildReply(
        "Open the service builder and use the ROI sidebar. Move the 'lead increase' slider and set your average customer value — the sidebar projects monthly revenue and ROAS from your module spend in real time, so you see the math before you pay. As a rule of thumb, businesses pairing short-form video with automated SMS text-back see 300% more leads convert.",
        [{ label: "Open the service builder", href: "/services" }],
      );

    case "tiers":
      return buildReply(
        `We have three retainers:\n\n• Solo Launch (${money(
          SUBSCRIPTION_TIERS.solo.monthly,
        )}/mo) — core systems to stop the bleed: 3 modules, 1 lead channel.\n• Growth Engine (${money(
          SUBSCRIPTION_TIERS.growth.monthly,
        )}/mo) — the full machine: reviews, SMS, content & ads, 8 modules, 3 channels.\n• Local Dominance (${money(
          SUBSCRIPTION_TIERS.dominance.monthly,
        )}/mo) — own your category: unlimited modules, geo-fencing, dedicated strategist.\n\nYou can also build a fully custom a-la-carte menu with our ROI slider.`,
        searchKnowledgeBase("subscription tier retainer", 3),
      );

    case "how":
      return buildReply(
        "Three steps:\n\n1) Run the free AI Brand Audit — get your score and see the gaps.\n2) Build your menu — 100 services across 10 pillars, with a live ROI slider.\n3) Pay once or subscribe — track fulfillment and metrics in your client dashboard.\n\nDemo mode simulates everything so you can try the full flow with zero payment setup.",
        [{ label: "Start the audit", href: "/audit" }],
      );

    case "about":
      return buildReply(
        "Biz Reborn Marketing is a modular, AI-accelerated local growth system. Instead of a one-size agency retainer, you pick exactly the modules you need across 10 pillars — Local SEO, short-form video, websites & funnels, reviews, SMS retention, paid ads, social branding, digital products, commercial real estate, and automation. 100 services, 6 industry stacks, transparent pricing, and live ROI math.",
        [{ label: "See the homepage", href: "/" }],
      );

    case "timeline":
      return buildReply(
        "Setup modules go live in 1–3 weeks. Review velocity and map-pack gains typically show inside 60–90 days, while SMS text-back and tap-to-call systems convert same-day. Your client dashboard tracks fulfillment module-by-module so you always know what's shipping.",
        [],
      );

    case "contract":
      return buildReply(
        "No long-term lock-in. You pay monthly for active modules and can swap them anytime. Cancelling a subscription pauses recurring delivery — your one-time assets (websites, funnels, brand kits) are yours to keep.",
        [],
      );

    default: {
      if (intentName.startsWith("pillar:")) {
        const pillarId = intentName.slice(7);
        const docs = searchKnowledgeBase(pillarId, 5);
        const top = docs[0];
        return buildReply(
          top
            ? `${top.title} is one of our 10 pillars: ${top.body}\n\nWant me to recommend specific modules from it?`
            : "That maps to one of our core pillars. Let me pull the exact modules for you.",
          docs,
        );
      }

      if (intentName.startsWith("vertical:")) {
        const verticalId = intentName.slice(9);
        const docs = searchKnowledgeBase(verticalId, 5);
        const top = docs.find((d) => d.kind === "vertical");
        return buildReply(
          top
            ? `Great news — we run a dedicated stack for ${top.title}. ${top.body} The recommended modules are pre-filtered for you below; tap any of them to pre-load it into the builder.`
            : "Let me pull the category-specific recommendations for you.",
          docs,
        );
      }

      const docs = searchKnowledgeBase(message, 5);
      if (docs.length === 0) {
        return {
          text: `Good question. Here's the honest version: I'm a marketing assistant with deep playbook knowledge — I can answer most anything about local marketing strategy, and I'm exact on Biz Reborn's services, pricing, the 10 pillars, the audit engine, and industry stacks.\n\nFor a quick win on that, run the free AI Brand Audit — it scores your site, GBP, socials and reviews and lists exactly what's hurting you. Or tell me a bit more (your industry, what you're trying to fix) and I'll point you at the right modules. If you'd rather talk to a human, the Contact form routes to a strategist.`,
          suggestions: [
            { label: "Run the free audit", href: "/audit" },
            { label: "See pricing", href: "/services" },
            { label: "Open contact form", href: "/contact" },
          ],
        };
      }

      const top = docs[0];
      const more = docs.length > 1 ? "I found a few related items below too." : "";
      return buildReply(`${top.body} ${more}`, docs);
    }
  }
}

export function kbContextForRag(query: string, limit = 8): string {
  return searchKnowledgeBase(query, limit)
    .map((d) => `- ${d.title} :: ${d.body}`)
    .join("\n");
}

// Whether the free deterministic engine can answer confidently enough to
// avoid paying for an LLM call on this message. Only the high-frequency,
// structured intents (pricing, tiers, audit, contact, greetings…) are
// answered locally for free; every other question is novel and goes to the
// live AI so it can genuinely answer instead of guessing.
const STRUCTURED_INTENTS = new Set([
  "greeting",
  "pricing",
  "contact",
  "audit",
  "roi",
  "tiers",
  "how",
  "about",
  "timeline",
  "contract",
]);

export function canAnswerLocally(message: string): boolean {
  return STRUCTURED_INTENTS.has(intent(message));
}
