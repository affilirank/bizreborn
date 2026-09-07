import type {
  BusinessVertical,
  Pillar,
  ServiceItem,
  VerticalId,
  SubscriptionTier,
} from "@/lib/types";

export const SUBSCRIPTION_TIERS: Record<
  SubscriptionTier,
  { name: string; monthly: number; headline: string; perks: string[] }
> = {
  solo: {
    name: "Solo Launch",
    monthly: 997,
    headline: "Core systems to stop the bleed and start booking.",
    perks: [
      "3 active service modules",
      "1 lead channel optimized",
      "Monthly performance overview",
      "Email support",
    ],
  },
  growth: {
    name: "Growth Engine",
    monthly: 2497,
    headline: "The full machine. Reviews, SMS, content & ads humming.",
    perks: [
      "8 active service modules",
      "3 lead channels optimized",
      "Bi-weekly strategy calls",
      "Priority fulfillment queue",
      "Real-time ROI dashboard",
    ],
  },
  dominance: {
    name: "Local Dominance",
    monthly: 4997,
    headline: "Own your category. Geo-fence competitors. Dominate the map pack.",
    perks: [
      "Unlimited active service modules",
      "All lead channels + geo-fencing",
      "Weekly exec video overviews",
      "Dedicated growth strategist",
      "Quarterly scaling consultation",
    ],
  },
};

export const BUSINESS_VERTICALS: BusinessVertical[] = [
  {
    id: "barbershop",
    label: "Barbershop / Salon",
    emoji: "✂️",
    blurb: "Front-of-chair retention, booking density, and review velocity.",
    recommended: [
      "local-seo",
      "reputation-reviews",
      "sms-retention",
      "short-form-video",
    ],
  },
  {
    id: "realestate",
    label: "Real Estate / Mortgage",
    emoji: "🏡",
    blurb: "Listing capture, CRM nurture, and authority content engines.",
    recommended: [
      "websites-funnels",
      "commercial-real-estate",
      "paid-ads",
      "social-branding",
    ],
  },
  {
    id: "contractor",
    label: "Local Contractor / HVAC",
    emoji: "🔧",
    blurb: "Job-site lead flow, quote calculators, and same-day SMS response.",
    recommended: [
      "local-seo",
      "sms-retention",
      "paid-ads",
      "automation-metrics",
    ],
  },
  {
    id: "restaurant",
    label: "Restaurant / QSR",
    emoji: "🍔",
    blurb: "Foot traffic, local orders, and TikTok gravity in your zip code.",
    recommended: [
      "short-form-video",
      "local-seo",
      "reputation-reviews",
      "social-branding",
    ],
  },
  {
    id: "ecommerce",
    label: "E-Commerce",
    emoji: "🛒",
    blurb: "Conversion rate, retention flows, and ad-scale ROAS.",
    recommended: [
      "websites-funnels",
      "paid-ads",
      "digital-products",
      "automation-metrics",
    ],
  },
  {
    id: "professional",
    label: "Professional Services",
    emoji: "💼",
    blurb: "Authority pipelines, B2B outreach, and high-ticket funnels.",
    recommended: [
      "websites-funnels",
      "digital-products",
      "automation-metrics",
      "social-branding",
    ],
  },
  {
    id: "fitness",
    label: "Gym / Fitness Studio",
    emoji: "💪",
    blurb: "Class capacity, rebooking loops, and transformation content.",
    recommended: [
      "short-form-video",
      "sms-retention",
      "reputation-reviews",
      "social-branding",
    ],
  },
  {
    id: "dental",
    label: "Dental / Medical / Aesthetics",
    emoji: "🦷",
    blurb: "New-patient intake, insurance-driven SEO, and 5-star pipelines.",
    recommended: [
      "reputation-reviews",
      "local-seo",
      "sms-retention",
      "websites-funnels",
    ],
  },
  {
    id: "automotive",
    label: "Auto / Automotive",
    emoji: "🚗",
    blurb: "Service-bay scheduling, warranty recall targeting, and review volume.",
    recommended: [
      "local-seo",
      "reputation-reviews",
      "sms-retention",
      "paid-ads",
    ],
  },
  {
    id: "law",
    label: "Law / Legal",
    emoji: "⚖️",
    blurb: "Case intake funnels, authority content, and client review velocity.",
    recommended: [
      "websites-funnels",
      "reputation-reviews",
      "digital-products",
      "local-seo",
    ],
  },
  {
    id: "education",
    label: "Education / Coaching",
    emoji: "🎓",
    blurb: "Course launches, cohort enrollment, and authority funnels.",
    recommended: [
      "digital-products",
      "websites-funnels",
      "paid-ads",
      "short-form-video",
    ],
  },
  {
    id: "creator",
    label: "Creator / Influencer / Podcast",
    emoji: "🎙️",
    blurb: "Audience growth, sponsor-ready media kits, and monetization funnels.",
    recommended: [
      "short-form-video",
      "social-branding",
      "digital-products",
      "paid-ads",
    ],
  },
];

export const PILLARS: Pillar[] = [
  {
    id: "local-seo",
    number: 1,
    name: "Local SEO & Google Maps Dominance",
    tagline: "Own the map pack. Be the first name in your city's Google search.",
    icon: "MapPin",
    accent: "from-indigo-500 to-violet-600",
    services: [
      {
        id: 1,
        title: "Google Business Profile Optimization & Audit",
        oneTime: 795,
        monthly: 150,
        tags: ["Setup", "GBP"],
        popular: true,
        recommended: ["barbershop", "contractor", "restaurant"],
        blurb:
          "Full GBP rebuild — categories, service menu, photos, posts, and Q&A that flip your listing into a lead machine.",
      },
      {
        id: 2,
        title: "Local Citation & NAP Consistency Cleanup (100+ Directories)",
        oneTime: 595,
        monthly: 0,
        tags: ["Setup"],
        recommended: ["barbershop", "contractor"],
        blurb:
          "Sync your Name/Address/Phone across 100+ directories so Google trusts you and you stop losing map rankings.",
      },
      {
        id: 3,
        title: "Geo-Grid Local Map Pack Tracking & Optimization",
        oneTime: 0,
        monthly: 250,
        tags: ["Ongoing"],
        recommended: ["barbershop", "contractor"],
        blurb:
          "Pinpoint where you rank and win across every neighborhood grid — then push the weak zones into the map pack.",
      },
      {
        id: 4,
        title: "Hyper-Local SEO On-Page Schema Injection",
        oneTime: 450,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "LocalBusiness, Service, and FAQ schema that tells Google exactly who you serve, where, and how to call you.",
      },
      {
        id: 5,
        title: "Google Maps Competitor Review Conquest Campaign",
        oneTime: 0,
        monthly: 400,
        tags: ["Ongoing"],
        recommended: ["barbershop", "restaurant"],
        blurb:
          "A surgical campaign that out-sources reviews where competitors are weak and converts their leakage into your calls.",
      },
      {
        id: 6,
        title: "Organic Keyword & Local Intent Strategy",
        oneTime: 650,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "The exact keyword clusters buyers type when they're ready to spend in your service radius.",
      },
      {
        id: 7,
        title: "Local Backlink Acquisition & Community PR",
        oneTime: 0,
        monthly: 350,
        tags: ["Ongoing"],
        blurb:
          "Earn authority from local media, chambers, and community pages that crush the city map pack.",
      },
      {
        id: 8,
        title: "Voice Search Optimization (Siri, Alexa, Google Assistant)",
        oneTime: 395,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Be the answer when someone asks 'who's the best … near me?' out loud.",
      },
      {
        id: 9,
        title: "Google Local Services Ads (LSA) Setup & Management",
        oneTime: 395,
        monthly: 200,
        tags: ["Setup", "Ongoing"],
        recommended: ["contractor"],
        blurb:
          "The Google Guaranteed badge that puts you at the very top of the local results — with a 'Google Screened' checkmark.",
      },
      {
        id: 10,
        title: "Multi-Location Franchise SEO Architecture",
        oneTime: 1995,
        monthly: 400,
        tags: ["Setup", "Ongoing"],
        blurb:
          "One brand, dozens of markets. A hub-and-spoke architecture that dominates every location simultaneously.",
      },
    ],
  },
  {
    id: "short-form-video",
    number: 2,
    name: "Short-Form Video & Viral Content Production",
    tagline: "15 scroll-stopping reels a month — produced, scripted, and posted.",
    icon: "Clapperboard",
    accent: "from-rose-500 to-pink-600",
    services: [
      {
        id: 11,
        title: "Monthly Short-Form Video Batch Strategy (15 Reels/TikToks)",
        oneTime: 0,
        monthly: 750,
        tags: ["Ongoing"],
        popular: true,
        recommended: ["barbershop", "restaurant"],
        blurb:
          "A monthly batch of 15 proof-driven reels designed around your highest-margin service, not your feelings.",
      },
      {
        id: 12,
        title: "Viral Short-Form Scriptwriting & Hook Development",
        oneTime: 0,
        monthly: 250,
        tags: ["Ongoing"],
        recommended: ["restaurant", "ecommerce"],
        blurb:
          "Hooks engineered to win the first 1.5 seconds — the only metric that decides whether your video gets watched.",
      },
      {
        id: 13,
        title: "On-Site Raw Footage Direction & Shot List Blueprints",
        oneTime: 395,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Hand your phone to a staff member and get cinema-grade raw footage from a simple shot-list.",
      },
      {
        id: 14,
        title: "Professional Short-Form Video Editing (CapCut/Dynamic Captions)",
        oneTime: 0,
        monthly: 500,
        tags: ["Ongoing"],
        blurb:
          "Dynamic captions, cuts, and pacing that turn boring cell-phone clips into a premium content brand.",
      },
      {
        id: 15,
        title: "YouTube Shorts Content Repurposing Pipeline",
        oneTime: 0,
        monthly: 300,
        tags: ["Ongoing"],
        blurb:
          "One shoot, every platform. We re-platform your best reels into a YouTube Shorts discovery engine.",
      },
      {
        id: 16,
        title: "High-Converting Short-Form Video Ad Creation",
        oneTime: 0,
        monthly: 900,
        tags: ["Ongoing"],
        recommended: ["ecommerce"],
        blurb:
          "Native-style UGC ads built for cold traffic that don't look like ads — and convert like direct response.",
      },
      {
        id: 17,
        title: "Aesthetic Brand B-Roll & Visual Asset Library Creation",
        oneTime: 750,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A reusable library of premium B-roll and product shots that makes every future post look expensive.",
      },
      {
        id: 18,
        title: "Trending Audio Tracking & Niche Sound Matching",
        oneTime: 0,
        monthly: 150,
        tags: ["Ongoing"],
        blurb:
          "We ride the wave before it peaks — matching your content to sounds already winning in your niche.",
      },
      {
        id: 19,
        title: "Video SEO & Keyword-Optimized Social Captions",
        oneTime: 0,
        monthly: 200,
        tags: ["Ongoing"],
        blurb:
          "Captions, hashtags, and descriptions tuned to the search queries your local buyers actually type.",
      },
      {
        id: 20,
        title: "Multi-Platform Auto-Distribution & Scheduling Setup",
        oneTime: 395,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "One calendar, five platforms, zero manual posting. Your content ships while you run your business.",
      },
    ],
  },
  {
    id: "websites-funnels",
    number: 3,
    name: "Websites, Landing Pages & Funnels",
    tagline: "Pages built to convert cold traffic into booked appointments.",
    icon: "LayoutTemplate",
    accent: "from-violet-500 to-indigo-600",
    services: [
      {
        id: 21,
        title: "High-Converting Custom Next.js Landing Page Build",
        oneTime: 1995,
        monthly: 0,
        tags: ["Setup"],
        popular: true,
        recommended: ["professional", "realestate", "ecommerce"],
        blurb:
          "A pixel-perfect, lightning-fast landing page engineered around a single action: the call, the form, the booking.",
      },
      {
        id: 22,
        title: "Mobile-First Speed & Performance Optimization",
        oneTime: 595,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Sub-2-second loads that keep the 88% of mobile local searchers on your page instead of your competitor's.",
      },
      {
        id: 23,
        title: "Tap-to-Call & One-Click Booking Infrastructure",
        oneTime: 395,
        monthly: 0,
        tags: ["Setup"],
        recommended: ["barbershop", "contractor"],
        blurb:
          "One thumb-tap between seeing your ad and having your calendar locked. The fastest revenue path on the internet.",
      },
      {
        id: 24,
        title: "Lead Magnet & E-Book Funnel Architecture",
        oneTime: 895,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Give away the answer, capture the email, sell the service — an automated top-of-funnel that feeds your pipeline.",
      },
      {
        id: 25,
        title: "High-Ticket VSL (Video Sales Letter) Page Design",
        oneTime: 1495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "The emotional pitch page that turns video viewers into five-figure clients — written and designed for conviction.",
      },
      {
        id: 26,
        title: "E-Commerce Store Optimization (Shopify/WooCommerce)",
        oneTime: 1295,
        monthly: 150,
        tags: ["Setup", "Ongoing"],
        recommended: ["ecommerce"],
        blurb:
          "Product pages that sell. Upsells, bundles, and abandoned-cart recovery wired into your storefront.",
      },
      {
        id: 27,
        title: "Dynamic A/B Split Testing Setup",
        oneTime: 450,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "We test the headline, the CTA, the offer — and let your buyers vote with their clicks.",
      },
      {
        id: 28,
        title: "Custom Domain & SSL Security Configuration",
        oneTime: 195,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A clean, secure, professional domain footprint with zero technical headaches on your end.",
      },
      {
        id: 29,
        title: "Website Copywriting & Emotional Sales Pitch Engineering",
        oneTime: 995,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Words that agitate the pain, present the fix, and make 'book now' the only logical move.",
      },
      {
        id: 30,
        title: "ADA Accessibility & Legal Compliance Setup",
        oneTime: 595,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "WCAG-compliant structure, accessible media, and privacy infrastructure that keeps you out of court and in search.",
      },
    ],
  },
  {
    id: "reputation-reviews",
    number: 4,
    name: "Reputation & Review Automation",
    tagline: "Manufacture 5-star proof while you sleep — and deflect the hits.",
    icon: "Star",
    accent: "from-emerald-500 to-teal-600",
    services: [
      {
        id: 31,
        title: "Automated Post-Service SMS Review Request Campaigns",
        oneTime: 395,
        monthly: 100,
        tags: ["Setup", "Ongoing"],
        popular: true,
        recommended: ["barbershop", "restaurant", "contractor"],
        blurb:
          "Every happy customer gets a perfectly-timed text asking for a review. Watch your count outrank the town.",
      },
      {
        id: 32,
        title: "QR-Code Review Stand Design for Physical Storefronts",
        oneTime: 295,
        monthly: 0,
        tags: ["Setup"],
        recommended: ["restaurant"],
        blurb:
          "A branded QR stand that turns the 2-minute post-service high into a flood of verified reviews.",
      },
      {
        id: 33,
        title: "Negative Review Deflection & Dispute Management System",
        oneTime: 0,
        monthly: 300,
        tags: ["Ongoing"],
        blurb:
          "An early-warning system that catches unhappy customers before they go public — and disputes the ones that slip through.",
      },
      {
        id: 34,
        title: "Real-Time Review Notification Alerts",
        oneTime: 195,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Instant Slack/text alerts on every new review so your team replies while the customer is still warm.",
      },
      {
        id: 35,
        title: "Review Response Automation & AI Template Setup",
        oneTime: 395,
        monthly: 50,
        tags: ["Setup", "Ongoing"],
        blurb:
          "On-brand replies to every review — thanking fans and rehabilitating critics, without a minute of your time.",
      },
      {
        id: 36,
        title: "Google Review Embed Widgets for Websites",
        oneTime: 295,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Your live star rating embedded across your site as living social proof for every visitor.",
      },
      {
        id: 37,
        title: "Customer Satisfaction Survey (NPS) Funnels",
        oneTime: 495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Find your promoters, rescue your detractors, and measure the health of the experience — not just the numbers.",
      },
      {
        id: 38,
        title: "Video Testimonial Capture Infrastructure",
        oneTime: 495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "The scripts, prompts, and pipeline to capture 60-second video love letters from your best clients.",
      },
      {
        id: 39,
        title: "Local Influencer Outreach & Product Seeding",
        oneTime: 0,
        monthly: 400,
        tags: ["Ongoing"],
        blurb:
          "Put your brand in the hands of local voices your future customers already trust.",
      },
      {
        id: 40,
        title: "Trust Badge & Guarantee Graphic Asset Design",
        oneTime: 295,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Design assets that scream 'risk-free, proven, vetted' at every touchpoint.",
      },
    ],
  },
  {
    id: "sms-retention",
    number: 5,
    name: "Automated Lead Retention & SMS Marketing",
    tagline: "Reply to every lead in seconds — even at 2am — and keep clients for life.",
    icon: "MessageSquareText",
    accent: "from-sky-500 to-cyan-600",
    services: [
      {
        id: 41,
        title: "Instant 'Missed-Call Text-Back' Automation Setup",
        oneTime: 395,
        monthly: 50,
        tags: ["Setup", "Ongoing"],
        popular: true,
        recommended: ["contractor", "barbershop", "professional"],
        blurb:
          "Never lose a missed call again. The caller gets an instant text with your booking link while they're still engaged.",
      },
      {
        id: 42,
        title: "24/7 AI Conversational Webchat Widget",
        oneTime: 495,
        monthly: 100,
        tags: ["Setup", "Ongoing"],
        blurb:
          "An always-on AI concierge that answers FAQs, captures details, and books appointments at 3am.",
      },
      {
        id: 43,
        title: "Database Reactivation Campaign (Re-engaging Past Clients)",
        oneTime: 495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Your past clients are the cheapest pipeline you'll ever have. Wake them up with a crafted re-engagement sequence.",
      },
      {
        id: 44,
        title: "Automated Appointment Reminder & No-Show Reduction Pipeline",
        oneTime: 395,
        monthly: 50,
        tags: ["Setup", "Ongoing"],
        recommended: ["barbershop"],
        blurb:
          "Smart reminders + a same-day rebooking flow that stops the silent no-show.",
      },
      {
        id: 45,
        title: "VIP Customer Text Club & Promo Campaign Setup",
        oneTime: 395,
        monthly: 100,
        tags: ["Setup", "Ongoing"],
        recommended: ["restaurant", "barbershop"],
        blurb:
          "An exclusive text club for your best customers — promos, early access, and off-menu perks that build loyalty.",
      },
      {
        id: 46,
        title: "Automated Birthday & Anniversary Reward Campaigns",
        oneTime: 395,
        monthly: 50,
        tags: ["Setup", "Ongoing"],
        blurb:
          "Automated delight that makes customers feel seen — and brings them in exactly when they're open to buying.",
      },
      {
        id: 47,
        title: "Multi-Channel Lead Nurture Email Sequences",
        oneTime: 595,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A 7-touch email cadence that moves cold leads to booked appointments without a single manual follow-up.",
      },
      {
        id: 48,
        title: "Two-Way SMS Customer Support Inbox",
        oneTime: 295,
        monthly: 80,
        tags: ["Setup", "Ongoing"],
        blurb:
          "One number your customers can text — and a team inbox that answers every message in minutes.",
      },
      {
        id: 49,
        title: "Pipeline Stage Automation & CRM Lead Tracking",
        oneTime: 695,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Every lead, every stage, every touch — tracked automatically so no money slips between the cracks.",
      },
      {
        id: 50,
        title: "Cold Email Outreach System Setup for B2B",
        oneTime: 595,
        monthly: 100,
        tags: ["Setup", "Ongoing"],
        recommended: ["professional", "realestate"],
        blurb:
          "A domain-warmed, deliverability-tested outreach engine that books B2B meetings on autopilot.",
      },
    ],
  },
  {
    id: "paid-ads",
    number: 6,
    name: "Paid Advertising & Geo-Fencing",
    tagline: "Stop advertising to the whole world. Advertise to your zip code.",
    icon: "Target",
    accent: "from-amber-500 to-orange-600",
    services: [
      {
        id: 51,
        title: "Localized Meta Ad Campaign Creation (Facebook/Instagram)",
        oneTime: 495,
        monthly: 300,
        tags: ["Setup", "Ongoing"],
        popular: true,
        recommended: ["restaurant", "barbershop", "contractor"],
        blurb:
          "Hyper-local Facebook & Instagram campaigns that put your brand in front of your service radius daily.",
      },
      {
        id: 52,
        title: "High-Intent Google Search PPC Campaign Management",
        oneTime: 495,
        monthly: 350,
        tags: ["Setup", "Ongoing"],
        recommended: ["professional", "contractor"],
        blurb:
          "Capture buyers already typing 'emergency … near me' — with keyword surgery and negative-term defense.",
      },
      {
        id: 53,
        title: "Hyper-Targeted Competitor Geo-Fencing Ad Setup",
        oneTime: 695,
        monthly: 150,
        tags: ["Setup", "Ongoing"],
        recommended: ["realestate", "contractor"],
        blurb:
          "Serve your ads to phones physically inside your competitor's storefront. Their foot traffic becomes your pipeline.",
      },
      {
        id: 54,
        title: "Retargeting Ad Campaign Architecture (Meta & Google)",
        oneTime: 395,
        monthly: 200,
        tags: ["Setup", "Ongoing"],
        blurb:
          "The 7-11 rule, executed: the people who visited you but didn't convert get seven gentle — and persuasive — second chances.",
      },
      {
        id: 55,
        title: "High-Converting Ad Creative & Graphic Design (10 Sets)",
        oneTime: 995,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Ten ad creative sets designed for the scroll-kill — static, carousel, and UGC-ready formats.",
      },
      {
        id: 56,
        title: "Ad Copywriting & Direct-Response Hook Generation",
        oneTime: 495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Hooks, offers, and CTAs written for response — not for brand awareness awards.",
      },
      {
        id: 57,
        title: "Conversion API (CAPI) & Pixel Tracking Installation",
        oneTime: 495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Server-side tracking that feeds the algorithms real conversions — so your CPA drops and your ad account stays healthy.",
      },
      {
        id: 58,
        title: "TikTok Local Sponsored Ad Campaign Management",
        oneTime: 495,
        monthly: 300,
        tags: ["Setup", "Ongoing"],
        recommended: ["restaurant", "ecommerce"],
        blurb:
          "Reach the 18–34 local audience TikTok keeps captive — with creative that matches the feed, not the billboard.",
      },
      {
        id: 59,
        title: "YouTube In-Stream Video Ad Campaign Setup",
        oneTime: 495,
        monthly: 250,
        tags: ["Setup", "Ongoing"],
        blurb:
          "Skip-able video ads targeting your local competitors' audience and your service keywords.",
      },
      {
        id: 60,
        title: "Monthly Ad Budget Allocation & ROAS Reporting",
        oneTime: 0,
        monthly: 200,
        tags: ["Ongoing"],
        blurb:
          "Your ad dollar, allocated by data. A monthly ROAS report that shows exactly what made and spent money.",
      },
    ],
  },
  {
    id: "social-branding",
    number: 7,
    name: "Social Media Management & Branding",
    tagline: "Look like the market leader you intend to be — on every platform.",
    icon: "Palette",
    accent: "from-fuchsia-500 to-purple-600",
    services: [
      {
        id: 61,
        title: "Full Social Media Profile Redesign & Banner Optimization",
        oneTime: 495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A profile system that converts visitors in the 3 seconds they spend deciding whether to follow.",
      },
      {
        id: 62,
        title: "Monthly Curated Social Media Calendar (30 Posts)",
        oneTime: 0,
        monthly: 500,
        tags: ["Ongoing"],
        blurb:
          "A month of scroll-stopping posts planned around revenue, not vanity. Balanced between proof, story, and offer.",
      },
      {
        id: 63,
        title: "Custom Branded Canva Graphic Templates (20 Assets)",
        oneTime: 595,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A Canva template system your team can actually use — on-brand by default, even on a bad day.",
      },
      {
        id: 64,
        title: "Instagram Story Strategy & Highlight Covers Design",
        oneTime: 395,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Stories engineered for DMs, polls, and link taps — plus branded highlight covers that sell on sight.",
      },
      {
        id: 65,
        title: "Community Management & Inbox Comment Moderation",
        oneTime: 0,
        monthly: 250,
        tags: ["Ongoing"],
        blurb:
          "Every comment answered, every DM handled, every opportunity captured — while you work.",
      },
      {
        id: 66,
        title: "LinkedIn B2B Thought Leadership Content Pipeline",
        oneTime: 0,
        monthly: 450,
        tags: ["Ongoing"],
        recommended: ["professional", "realestate"],
        blurb:
          "Position you as the authority your ideal B2B clients already follow — with consistent, credible insight.",
      },
      {
        id: 67,
        title: "Brand Voice & Style Guide Manual Creation",
        oneTime: 695,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Your brand's personality, codified. So every post, ad, and email sounds unmistakably like you.",
      },
      {
        id: 68,
        title: "Logo & Identity Modernization Refresh",
        oneTime: 995,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A premium identity refresh that instantly elevates the perceived price of everything you sell.",
      },
      {
        id: 69,
        title: "Business Card & Physical Marketing Asset Layout",
        oneTime: 495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Print collateral your customers keep on their desk — not in the trash.",
      },
      {
        id: 70,
        title: "Commercial Storefront Signage & Vehicle Wrap Design",
        oneTime: 895,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A rolling, walking, 24/7 billboard — designed so your brand is unmissable in your city.",
      },
    ],
  },
  {
    id: "digital-products",
    number: 8,
    name: "Digital Products, Courses & Community",
    tagline: "Sell the same expertise twice — as productized knowledge.",
    icon: "GraduationCap",
    accent: "from-teal-500 to-emerald-600",
    services: [
      {
        id: 71,
        title: "Skool or Kajabi Community Setup & Architecture",
        oneTime: 895,
        monthly: 0,
        tags: ["Setup"],
        recommended: ["professional", "realestate"],
        blurb:
          "A paid community built on Skool or Kajabi — with the room structure, onboarding, and engagement loops that retain members.",
      },
      {
        id: 72,
        title: "Digital Course Curriculum Structuring & Slide Design",
        oneTime: 1495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Your expertise, structured into a sellable curriculum — with decks designed to keep students finishing.",
      },
      {
        id: 73,
        title: "Monetized E-Book Layout & Publishing Setup",
        oneTime: 995,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A polished, purchasable e-book — laid out, designed, and published to sell while you sleep.",
      },
      {
        id: 74,
        title: "Membership Tier & Paywall Stripe Integration",
        oneTime: 695,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Tiered memberships and a Stripe-powered paywall so recurring revenue hits your account automatically.",
      },
      {
        id: 75,
        title: "Automated Onboarding Sequence for Digital Communities",
        oneTime: 495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Day-1 to Day-30 onboarding that turns a paying member into an engaged raving fan.",
      },
      {
        id: 76,
        title: "Digital Certificate & Completion Badge Setup",
        oneTime: 295,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Shareable certificates that make finishing your course a status event students post about.",
      },
      {
        id: 77,
        title: "Podcast Setup, Cover Art & Distribution (Spotify/Apple)",
        oneTime: 795,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A professional podcast presence on every major platform — cover art, feed, and distribution handled.",
      },
      {
        id: 78,
        title: "Podcast Audio Editing & Noise Reduction",
        oneTime: 0,
        monthly: 300,
        tags: ["Ongoing"],
        blurb:
          "Radio-quality audio from a home-mic recording — edited, mixed, and mastered.",
      },
      {
        id: 79,
        title: "Podcast Show Notes & SEO Transcript Generation",
        oneTime: 0,
        monthly: 250,
        tags: ["Ongoing"],
        blurb:
          "Show notes and transcripts optimized to pull search traffic from every episode for years.",
      },
      {
        id: 80,
        title: "Micro-Course Funnel & Tripwire Offer Creation",
        oneTime: 995,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A low-priced tripwire that turns cold traffic into buyers — and buyers into members.",
      },
    ],
  },
  {
    id: "commercial-real-estate",
    number: 9,
    name: "Commercial Real Estate & Trade Specialties",
    tagline: "Sell space and skill with assets that close before the walkthrough.",
    icon: "Building2",
    accent: "from-orange-500 to-red-500",
    services: [
      {
        id: 81,
        title: "Storefront Commercial Leasing Digital Pitch Pack",
        oneTime: 1495,
        monthly: 0,
        tags: ["Setup"],
        recommended: ["realestate"],
        blurb:
          "A digital pitch pack that makes a retail or office space irresistible to tenants before the first showing.",
      },
      {
        id: 82,
        title: "Local Storefront Tenant Placement Marketing System",
        oneTime: 895,
        monthly: 250,
        tags: ["Setup", "Ongoing"],
        recommended: ["realestate"],
        blurb:
          "A repeatable system that matches the right tenant to the right space — faster and for better terms.",
      },
      {
        id: 83,
        title: "360-Degree Virtual Property Tour Integration",
        oneTime: 595,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Walk-through-animated virtual tours that let buyers experience the space from their couch.",
      },
      {
        id: 84,
        title: "Aerial Drone Media Editing & Property Walkthroughs",
        oneTime: 495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Drone footage edited into cinematic walkthroughs that make listings feel like movie sets.",
      },
      {
        id: 85,
        title: "Local Real Estate Listing Video Marketing Kits",
        oneTime: 795,
        monthly: 0,
        tags: ["Setup"],
        recommended: ["realestate"],
        blurb:
          "Every listing gets a professional video kit ready for social, email, and SMS blast.",
      },
      {
        id: 86,
        title: "Neighborhood Market Report Lead Magnet Creation",
        oneTime: 595,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "'Your street's market data' reports that capture leads with authority — not ads.",
      },
      {
        id: 87,
        title: "Open House Event Marketing & Lead Capture Funnel",
        oneTime: 495,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A funnel that turns open-house foot traffic into a tracked, nurtured buyer list.",
      },
      {
        id: 88,
        title: "B2B Commercial Landlord Direct-Mail & Digital Combo",
        oneTime: 895,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Owners get an unignorable physical + digital combo that books the conversation.",
      },
      {
        id: 89,
        title: "Trade Business Quote Calculator Web Widget Build",
        oneTime: 995,
        monthly: 0,
        tags: ["Setup"],
        recommended: ["contractor"],
        blurb:
          "A self-quoting widget that lets prospects price their own job — and hands you pre-qualified leads.",
      },
      {
        id: 90,
        title: "Commercial Property Signage QR Lead Generator",
        oneTime: 395,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "A QR sign system that turns drive-by traffic into a tracked lead pipeline.",
      },
    ],
  },
  {
    id: "automation-metrics",
    number: 10,
    name: "Advanced Marketing Automation & Metrics",
    tagline: "Total visibility, zero guesswork. Your revenue, explained by data.",
    icon: "LineChart",
    accent: "from-lime-500 to-emerald-600",
    services: [
      {
        id: 91,
        title: "Custom Real-Time Marketing Dashboard Setup",
        oneTime: 1295,
        monthly: 0,
        tags: ["Setup"],
        popular: true,
        blurb:
          "A live command center tracking calls, leads, reviews, and revenue — updated in real time.",
      },
      {
        id: 92,
        title: "Stripe & Point-of-Sale Payment Integration",
        oneTime: 595,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Get paid on autopilot — with payment data feeding straight into your performance dashboard.",
      },
      {
        id: 93,
        title: "Zapier & Make.com Advanced Workflow Automations",
        oneTime: 595,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Your tools, wired together. Lead captures that trigger emails, tasks, texts, and CRM updates instantly.",
      },
      {
        id: 94,
        title: "Call Tracking & Conversation Recording System",
        oneTime: 495,
        monthly: 50,
        tags: ["Setup", "Ongoing"],
        recommended: ["contractor", "professional"],
        blurb:
          "Every phone lead attributed to its source, with call recordings you can actually listen back to.",
      },
      {
        id: 95,
        title: "Customer Lifetime Value (LTV) Tracking Frameworks",
        oneTime: 695,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "Know exactly what a client is worth over time — so every marketing dollar is justified by math.",
      },
      {
        id: 96,
        title: "Monthly Executive Performance Video Overviews",
        oneTime: 0,
        monthly: 200,
        tags: ["Ongoing"],
        blurb:
          "A 5-minute video each month that explains your numbers in plain English — no dashboard login required.",
      },
      {
        id: 97,
        title: "Competitor Price & Offer Monitoring Intelligence",
        oneTime: 695,
        monthly: 100,
        tags: ["Setup", "Ongoing"],
        blurb:
          "We watch your competitors' prices, promos, and positioning so you're never blindsided by the market.",
      },
      {
        id: 98,
        title: "Multi-Location Centralized Marketing Management",
        oneTime: 995,
        monthly: 300,
        tags: ["Setup", "Ongoing"],
        blurb:
          "Every location, one dashboard, one system of record — managed centrally with local execution.",
      },
      {
        id: 99,
        title: "Franchise Marketing Playbook Development",
        oneTime: 1995,
        monthly: 0,
        tags: ["Setup"],
        blurb:
          "The exact playbook every franchisee runs — so consistent, replicable growth becomes a system, not a hope.",
      },
      {
        id: 100,
        title: "Quarterly Strategic Scaling & Pivot Consultations",
        oneTime: 0,
        monthly: 350,
        tags: ["Ongoing"],
        blurb:
          "A quarterly boardroom session with your strategist: what's winning, what's dying, and where to double down.",
      },
    ],
  },
];

export const ALL_SERVICES: ServiceItem[] = PILLARS.flatMap((p) =>
  p.services.map((s) => ({ ...s, pillar: p.id })),
);

export const SERVICE_MAP: Record<number, ServiceItem> = Object.fromEntries(
  ALL_SERVICES.map((s) => [s.id, s]),
) as Record<number, ServiceItem>;

export const PILLAR_MAP: Record<string, Pillar> = Object.fromEntries(
  PILLARS.map((p) => [p.id, p]),
);

export function getVertical(id: VerticalId | string) {
  return BUSINESS_VERTICALS.find((v) => v.id === id);
}

export function getPillar(id: string) {
  return PILLAR_MAP[id];
}

export function recommendedServicesFor(verticalId: VerticalId) {
  const vertical = getVertical(verticalId);
  if (!vertical) return [];
  const pillarIds = new Set(vertical.recommended);
  return ALL_SERVICES.filter(
    (s) => pillarIds.has(s.pillar) || s.recommended?.includes(verticalId),
  );
}

export const MARKETING_STATS = [
  {
    value: 88,
    suffix: "%",
    label: "of consumers who search for a local business on mobile call or visit within 24 hours.",
    source: "Nectafy / Google consumer research",
  },
  {
    value: 76,
    suffix: "%",
    label: "of local searches lead to a same-day phone call.",
    source: "Google \"near me\" local search study",
  },
  {
    value: 300,
    suffix: "%",
    label: "more leads convert for businesses using short-form video & automated SMS response.",
    source: "Meta business conversion benchmarks",
  },
];
