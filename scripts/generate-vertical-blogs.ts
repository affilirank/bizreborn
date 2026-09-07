/**
 * Generates src/data/vertical-blogs.ts — one SEO article per business vertical,
 * engineered to rank for "<category> marketing" searches and convert business
 * owners via stats, pain points, and mapped solutions.
 * Run: npx tsx scripts/generate-vertical-blogs.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PILLARS } from "../src/data/services";
import type { PillarId, VerticalId } from "../src/lib/types";

/* ------------------------------------------------------------------ */
/* Per-vertical content                                                 */
/* ------------------------------------------------------------------ */

interface PainPoint {
  title: string;
  stat: string;
  body: string;
}

interface Solution {
  title: string;
  body: string;
  serviceId: number;
}

interface VerticalBlogSpec {
  id: VerticalId;
  keyword: string;
  label: string;
  title: string;
  audience: string;
  primaryPillar: PillarId;
  intro: string[];
  painPoints: PainPoint[];
  solutions: Solution[];
  playbook: string[];
  metrics: { label: string; description: string }[];
  faq: { q: string; a: string }[];
}

const VERTICAL_BLOGS: VerticalBlogSpec[] = [
  /* ------------------------------------------------------------------ */
  {
    id: "barbershop",
    keyword: "barbershop marketing",
    label: "Barbershops",
    title: "Barbershop Marketing: How to Fill More Chairs Every Single Week",
    audience: "barbershop and salon owners",
    primaryPillar: "local-seo",
    intro: [
      "Barbering is a $20B+ industry in the US alone, and the barbers who win aren't always the best haircutters — they're the ones whose phone rings. The majority of new walk-in traffic in any city is decided on Google: who shows up in the map pack, who has the freshest reviews, and who answers the call first.",
      "The brutal part is that most shops leave that traffic on the table. No one is managing their Google Business Profile, reviews are aging and thin, and a missed call after hours is silently becoming a competitor's client. This guide is the exact playbook for fixing all of it — with the numbers that prove why each step matters.",
    ],
    painPoints: [
      {
        title: "You're invisible on Google Maps",
        stat: "46% of all Google searches are looking for local information",
        body: "When someone searches 'barbershop near me,' the map pack decides who gets the walk-in. Shops with an unclaimed, stale, or category-misconfigured GBP lose to whoever bothered to optimize.",
      },
      {
        title: "Your reviews stopped two years ago",
        stat: "98% of consumers read online reviews before choosing a local business",
        body: "Fresh reviews are both a trust signal for customers and a ranking signal for Google. A shop with 400 reviews but none in six months ranks and converts worse than one with 40 this month.",
      },
      {
        title: "Missed calls are walking out the door",
        stat: "78% of customers buy from the business that responds first",
        body: "During a haircut you can't answer your phone — and every missed call is a potential client who books with the shop down the street instead. An instant text-back while they're still searching flips that.",
      },
      {
        title: "Your chair has gaps your schedule doesn't show you",
        stat: "Businesses that reactivate past clients see them convert at a fraction of the cost of new ads",
        body: "Clients who stop coming don't usually leave angry — they just forget. Nobody texts them, so they drift to whoever reminds them first. Your past-client list is the cheapest pipeline in the business.",
      },
    ],
    solutions: [
      {
        title: "Rebuild your Google Business Profile into a lead machine",
        body: "Correct categories, service menu, photos, posts, and Q&A so the map pack actually routes 'near me' searchers to your door instead of your competitor's.",
        serviceId: 1,
      },
      {
        title: "Automate review capture after every single cut",
        body: "Text every client a direct review link within minutes of their chair time ending, when satisfaction is highest — turning your daily chair count into a compounding review engine.",
        serviceId: 31,
      },
      {
        title: "Win back missed calls with an instant text-back",
        body: "Every call you can't answer triggers a same-day text with a booking link, so no appointment request ever dies in a missed-call log.",
        serviceId: 41,
      },
      {
        title: "Reactivate the clients who stopped booking",
        body: "A curated text sequence to past clients — 'we miss you' hooks, rebooking offers, and barber-specific promos — recovers revenue without spending a dollar on new lead acquisition.",
        serviceId: 43,
      },
      {
        title: "Let short-form video do your outbound marketing",
        body: "A monthly batch of 15 Reels and TikToks — fades, transformations, and shop culture — gets pushed to local audiences the algorithm already has, free.",
        serviceId: 11,
      },
    ],
    playbook: [
      "Weeks 1–2: Rebuild the GBP, fix categories, upload fresh photos, and flip review capture on after every service.",
      "Weeks 3–4: Turn on missed-call text-back and appointment reminders so no booking request dies silently.",
      "Days 30–90: Launch the past-client reactivation sequence and the first monthly video batch, then track calls, reviews, and rebookings on one dashboard.",
    ],
    metrics: [
      { label: "Map pack appearances", description: "Which neighborhoods you rank in, and where competitors out-position you." },
      { label: "Review velocity", description: "New reviews per week — the freshness signal that decides your local rank." },
      { label: "Missed-call recovery", description: "Calls converted into text conversations and bookings instead of lost leads." },
      { label: "Rebook rate", description: "The share of past clients you bring back with retention campaigns." },
    ],
    faq: [
      { q: "How many reviews does a barbershop need to outrank competitors?", a: "It's about velocity more than volume. Ten fresh reviews this month beat a hundred from two years ago. A shop that captures reviews from every haircut will outrank shops that never ask." },
      { q: "How do I get more 'barbershop near me' walk-ins?", a: "Claim and optimize your Google Business Profile with the right categories, keep photos fresh, respond to every review, and build review velocity. The map pack is decided by exactly those signals." },
      { q: "Is it worth running Instagram for a barbershop?", a: "Yes — Instagram and TikTok are where haircut clients decide before they book. A monthly batch of before-and-after and transformation content outperforms almost any other organic channel for shops." },
      { q: "What's the #1 mistake barbershop owners make with marketing?", a: "Doing nothing consistent. Most shops market for two weeks, see nothing, and quit. Marketing that fills chairs is a system — reviews, Google, texts, and content running every week, not when you remember." },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "realestate",
    keyword: "real estate marketing",
    label: "Real Estate & Mortgage",
    title: "Real Estate Marketing That Brings Listings, Not Just Likes",
    audience: "realtors, brokers, and mortgage professionals",
    primaryPillar: "websites-funnels",
    intro: [
      "97% of home buyers search online before they ever make a call, and 44% of buyers found the agent they hired through the internet. The listing wars aren't won in the yard — they're won in search results, video, and follow-up speed.",
      "Here's the uncomfortable math: most agents market the same way — posting houses on their own feed and hoping. Meanwhile the agents who control the market treat every listing as a campaign: a branded video kit, a captured and nurtured lead list, and a response time measured in minutes, not days.",
    ],
    painPoints: [
      {
        title: "You win listings but lose the lead capture",
        stat: "93% of recent buyers used the internet during their home search",
        body: "Every open house and every listing page is a stream of buyers walking by — and without a funnel to capture them, they walk into a competitor's pipeline.",
      },
      {
        title: "Your listings look amateur next to video-first agents",
        stat: "Listings with professional video get more engagement in the first 48 hours",
        body: "Buyers scroll past photo-only listings when the competition has drone footage and virtual walkthroughs they can watch without leaving the couch.",
      },
      {
        title: "Your past clients have gone quiet",
        stat: "The average referral comes 6–18 months after the last interaction",
        body: "The agents who close the most deals aren't just acquiring — they're staying top-of-mind with everyone they've ever worked with through systematic re-engagement.",
      },
      {
        title: "You respond to buyer leads too slowly",
        stat: "The first responder wins — a 5-minute response is 21x more likely to qualify a lead",
        body: "A lead that waits a day for a call is a lead someone else already showed. Speed is the cheapest, most reliable conversion lever in real estate.",
      },
    ],
    solutions: [
      {
        title: "Turn every listing into a branded pitch asset",
        body: "A conversion-focused landing page per property or farm area — capture forms, video, and a single clear next step — instead of a generic multi-purpose site.",
        serviceId: 21,
      },
      {
        title: "Produce video kits buyers actually watch",
        body: "Drone flythroughs, walkthrough edits, and social cutdowns that make each listing shareable across Instagram, TikTok, and email simultaneously.",
        serviceId: 85,
      },
      {
        title: "Capture open-house visitors into a nurture list",
        body: "A market-report lead magnet that turns visitors into a tracked, sequenced list of future buyers and sellers instead of a clipboard you lose.",
        serviceId: 86,
      },
      {
        title: "Win the follow-up race with automation",
        body: "Instant text-back on missed calls and wired CRM workflows so every buyer lead gets a reply in minutes — while you're showing someone else a house.",
        serviceId: 41,
      },
      {
        title: "Re-engage every past client automatically",
        body: "Database reactivation sequences keep your sphere top-of-mind for the next move, so referrals come to you instead of your competitor.",
        serviceId: 43,
      },
    ],
    playbook: [
      "Weeks 1–2: Build the lead-capture funnel and set up call tracking so every inquiry is attributed to its source.",
      "Weeks 3–4: Install the market-report lead magnet and automate instant text-back on missed calls and forms.",
      "Days 30–90: Put a video kit on the next three listings, launch the past-client reactivation flow, and review attribution monthly.",
    ],
    metrics: [
      { label: "Lead capture rate", description: "Visitors converted into tracked buyer and seller lists." },
      { label: "Response time", description: "Minutes between inquiry and contact — the #1 conversion lever in the business." },
      { label: "Listing video views", description: "Watch time on property videos, a leading indicator of showing requests." },
      { label: "Sphere reactivation", description: "Past clients re-engaged per quarter — your cheapest source of new deals." },
    ],
    faq: [
      { q: "Do I really need video for every listing?", a: "If your market has video-first agents, yes. Buyers watch listings before they call on them. A drone walkthrough and social cutdown for high-value listings is table stakes in most markets now." },
      { q: "How do I capture leads without annoying people?", a: "Trade value — a market report, open-house guide, or neighborhood data — for a contact. Then nurture with useful, non-spammy follow-up. Capture-and-ghost is what annoys people." },
      { q: "What's the best way to stay top-of-mind with past clients?", a: "A monthly reactivation touch — market updates, 'your home's value' reports, and occasional offers — running automatically. Consistency beats intensity." },
      { q: "How much should a realtor spend on marketing?", a: "Work backwards from your average commission. If each closed deal nets you $10K+, spending a few hundred a month on capture, video, and follow-up systems is obviously profitable if it produces one extra closing a year." },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "contractor",
    keyword: "contractor marketing",
    label: "Local Contractors & HVAC",
    title: "Contractor Marketing: Get the Phone Ringing in Your Service Area",
    audience: "HVAC, plumbing, roofing, and electrical business owners",
    primaryPillar: "local-seo",
    intro: [
      "Homeowners don't comparison-shop contractors the way they shop for products — they search 'hvac repair near me' at the moment something breaks, and they hire whichever three companies show up first and answer. 82% of local searches happen on mobile, and 76% of people who search nearby visit the business within a day.",
      "The businesses that own their city's map pack in HVAC, plumbing, roofing, and electrical aren't the biggest companies — they're the ones who optimized their Google presence, respond in minutes, and turned their quote process into a system. This guide shows exactly how to become that business.",
    ],
    painPoints: [
      {
        title: "You only show up in results when someone types your name",
        stat: "88% of local searches on a smartphone result in a call or visit within 24 hours",
        body: "Breakdowns are urgent and local. If your Google Business Profile isn't optimized for your exact service radius, the jobs in your city go to whoever claims them first.",
      },
      {
        title: "Homeowners call 3+ contractors and pick the fastest responder",
        stat: "78% of customers buy from the business that responds first",
        body: "You're on a job site, the phone rings, you miss it — and the homeowner booked the guy who called back in three minutes. Missed calls are the most expensive 30 seconds in a service business.",
      },
      {
        title: "You pay for leads instead of owning them",
        stat: "The average cost per lead on aggregator platforms keeps climbing every year",
        body: "Angi, Thumbtack, and lead-buying services rent you customers. A business that owns its local SEO, reviews, and inbound pipeline stops paying a toll forever.",
      },
      {
        title: "Your quote process leaks jobs",
        stat: "Homeowners who get an instant, specific estimate are dramatically more likely to book",
        body: "When a prospect has to wait a day for a quote, they've usually called the competitor who sent a ballpark number while they were still on the phone.",
      },
    ],
    solutions: [
      {
        title: "Own the map pack for every service you run",
        body: "Full Google Business Profile optimization — service menus, service-area setup, photos, and posts — so emergency searches route straight to your team.",
        serviceId: 1,
      },
      {
        title: "Put an instant quote calculator on your site",
        body: "A job-specific calculator widget that gives homeowners a ballpark in seconds — and captures their info before they call your competitor.",
        serviceId: 89,
      },
      {
        title: "Text back every missed call instantly",
        body: "Missed calls trigger an immediate SMS with your info and a booking link, so the urgent job books with you while you finish the one you're on.",
        serviceId: 41,
      },
      {
        title: "Compound reviews from every completed job",
        body: "Automated post-service SMS review requests capture your 5-star reputation after every install and repair, feeding both trust and local rank.",
        serviceId: 31,
      },
      {
        title: "Buy the urgent searches with Local Services Ads",
        body: "Google Local Services Ads put you at the top with the 'Google Guaranteed' badge — the fastest way to own emergency demand while your organic engine builds.",
        serviceId: 9,
      },
    ],
    playbook: [
      "Weeks 1–2: Optimize the GBP for your service radius and install the quote calculator.",
      "Weeks 3–4: Turn on instant missed-call text-back and automated review capture after every job.",
      "Days 30–90: Add Local Services Ads, launch a monthly content batch of before-and-after jobs, and track every call to its source.",
    ],
    metrics: [
      { label: "Map pack visibility", description: "Which service-area searches you rank for, by zip code." },
      { label: "Missed-call recovery", description: "The share of missed calls converted into conversations and bookings." },
      { label: "Cost per booked job", description: "What you actually pay per job — the number that decides whether paid leads are a toll or a highway." },
      { label: "Quote-to-book rate", description: "How many estimates become jobs, and what the fastest responders convert." },
    ],
    faq: [
      { q: "Should I keep paying for lead aggregator leads?", a: "Use them as a bridge, not a business model. Every lead you buy is an opportunity to win the customer and the review — but the endgame is owning local SEO so the jobs come inbound without a toll." },
      { q: "What's the most underrated marketing channel for contractors?", a: "Your Google Business Profile plus missed-call text-back. Urgency means the map pack and response speed beat every other channel in the trades." },
      { q: "Do video before-and-afters work for trades?", a: "Exceptionally well. Homeowners trust visual proof — completed jobs, process, and results convert better than any testimonial page." },
      { q: "How do I rank higher than the big national chains?", a: "National chains don't win hyper-local searches on service-area signals the way a well-optimized local profile with fresh reviews and consistent citations does. Out-local the chains and you'll outrank them." },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "restaurant",
    keyword: "restaurant marketing",
    label: "Restaurants & QSR",
    title: "Restaurant Marketing: Turn Foot Traffic Into a Local Obsession",
    audience: "restaurant, café, and QSR owners",
    primaryPillar: "short-form-video",
    intro: [
      "Dining is one of the most location-driven purchases on the planet — and it's decided on a phone. Whether it's 'restaurants near me,' a trending TikTok of a sizzling dish, or the 4.8-star Google rating that wins the tap, the modern customer meets you online before they ever sit down.",
      "The restaurants that are packed on a Tuesday night aren't just good — they've engineered discoverability. Fresh content that gets pushed by the algorithm, reviews that stack up weekly, and a follow-up system that turns one-time diners into regulars.",
    ],
    painPoints: [
      {
        title: "The algorithm decides who's crowded — and you're invisible",
        stat: "Video is the #1 way diners now discover new restaurants",
        body: "TikTok and Reels content of your food gets pushed to locals who have never searched for you. Restaurants posting weekly video are replacing traditional advertising entirely.",
      },
      {
        title: "Your rating is deciding your walk-ins",
        stat: "98% of consumers read online reviews before choosing where to eat",
        body: "A stack of fresh 5-star reviews — photos included — is the cheapest marketing you'll ever run. A stagnant rating quietly sends diners to the place with the fresher feed.",
      },
      {
        title: "Regulars slip away without a system",
        stat: "A repeat customer is worth dramatically more than a first-time visitor",
        body: "You see the same faces weekly and never capture them. Without a text or email list, your regulars only come back by memory — and they're one competitor's promo away from leaving.",
      },
      {
        title: "No-shows are eating your revenue",
        stat: "Automated reminders routinely cut no-show rates in half",
        body: "Every empty reserved table is revenue you planned on. A simple reminder text before reservations fills tables other restaurants leave empty.",
      },
    ],
    solutions: [
      {
        title: "Give the algorithm a monthly batch it can't ignore",
        body: "15 short-form videos a month — signature dishes, behind-the-line energy, plating shots — engineered to win local reach on TikTok and Reels at zero ad spend.",
        serviceId: 11,
      },
      {
        title: "Capture reviews after every great visit",
        body: "Automated post-visit review requests and QR review stands turn satisfied tables into a compounding local rating.",
        serviceId: 31,
      },
      {
        title: "Own your regulars with a VIP text club",
        body: "Exclusive promos and daily specials sent by text build frequency and loyalty — and keep you top-of-mind for the 'where should we eat?' decision.",
        serviceId: 45,
      },
      {
        title: "Stop no-shows with automated reminders",
        body: "Reservation reminders and rebooking flows recover tables that would otherwise sit empty every single night.",
        serviceId: 44,
      },
      {
        title: "Put your most photogenic dishes behind paid reach",
        body: "Hyper-local Meta ads targeting your zip code drive your best content to the exact audience most likely to walk in.",
        serviceId: 51,
      },
    ],
    playbook: [
      "Weeks 1–2: Set up review capture and an Instagram/TikTok presence with a monthly content batch plan.",
      "Weeks 3–4: Launch the VIP text club and automated reservation reminders.",
      "Days 30–90: Run local video ads on your top three dishes, monitor review velocity, and let the data pick your specials.",
    ],
    metrics: [
      { label: "Review velocity", description: "Fresh reviews per week — your rating is a live trust score customers check before every visit." },
      { label: "Social reach", description: "Video views and saves in your local area, the leading indicator of new-face discovery." },
      { label: "VIP list size", description: "The size of your owned audience — the asset that makes you independent of algorithm luck." },
      { label: "No-show rate", description: "Reservations lost to reminders, and the revenue recovered by rebooking." },
    ],
    faq: [
      { q: "Do restaurants really need TikTok?", a: "Not every restaurant — but the ones in your city using video are winning the discovery war. If your customers are under 50, short-form video is where they decide to try you." },
      { q: "How do I get more Google reviews without being annoying?", a: "Timing is everything. Ask while the experience is fresh — a text with a direct review link shortly after the visit captures satisfaction at its peak." },
      { q: "What's a VIP text club and do I need to pay for it?", a: "It's an opt-in text list of your regulars who get exclusive offers. It costs a fraction of what paid ads cost and reaches people who already love you." },
      { q: "Why are no-shows still costing me money?", a: "Because nobody reminded them. A reminder text before the reservation is the single highest-ROI fix a restaurant can make this month." },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "ecommerce",
    keyword: "e-commerce marketing",
    label: "E-Commerce",
    title: "E-Commerce Marketing: Turn Traffic Into Repeat Buyers, Not One-Offs",
    audience: "online store owners",
    primaryPillar: "websites-funnels",
    intro: [
      "Your store is fighting a brutal math problem: roughly 70% of shopping carts get abandoned, and 95%+ of first-time visitors leave without buying. E-commerce isn't won by traffic — it's won by conversion, retention, and repeat purchase economics.",
      "Most store owners respond by buying more ads to a leaky bucket. The winners install the systems that fix the leaks: a fast, conversion-tuned storefront, retargeting that recovers the 70%, and retention flows that turn buyers into subscribers.",
    ],
    painPoints: [
      {
        title: "70% of your carts are walking away",
        stat: "The average online cart abandonment rate is around 70%",
        body: "Every abandoned cart is money you already paid to acquire. Abandoned-cart recovery flows alone routinely recover a meaningful share of that revenue.",
      },
      {
        title: "Your store is too slow to convert",
        stat: "53% of mobile visitors leave a page that takes over 3 seconds to load",
        body: "A bloated theme is silently destroying your conversion rate — and every ad dollar spent on slow pages is money flushed.",
      },
      {
        title: "You're renting customers from the algorithm",
        stat: "Acquiring a new customer costs 5–7x more than keeping one",
        body: "If your only plan is 'buy more ads,' your margins get eaten the moment the algorithm shifts. An owned email/SMS list is the difference between a store and a business.",
      },
      {
        title: "Past buyers never come back",
        stat: "Repeat customers spend dramatically more and cost far less to convert",
        body: "The customers who already bought and trusted you are your cheapest revenue. Without retention flows, they never get the nudge to buy again.",
      },
    ],
    solutions: [
      {
        title: "Rebuild the store around conversion, not design",
        body: "A fast, mobile-first storefront with one clear action per page — the highest-leverage fix for the 70% abandonment problem.",
        serviceId: 26,
      },
      {
        title: "Recover the 70% with retargeting",
        body: "Meta and Google retargeting campaigns that follow your cart abandoners and window shoppers until they come back and buy.",
        serviceId: 54,
      },
      {
        title: "Turn buyers into repeat buyers with retention flows",
        body: "Email and SMS sequences that turn a first purchase into a second — order follow-ups, replenishment reminders, and reactivation offers.",
        serviceId: 43,
      },
      {
        title: "Reach the shoppers the algorithm hides from you",
        body: "TikTok ads on product videos let you acquire customers in a discovery feed where competitors aren't even competing yet.",
        serviceId: 58,
      },
      {
        title: "Stop guessing with a real revenue dashboard",
        body: "Attribution and LTV tracking wired into one view, so you know exactly which product, channel, and offer actually makes money.",
        serviceId: 91,
      },
    ],
    playbook: [
      "Weeks 1–2: Fix site speed and install CAPI/pixel tracking so your ad algorithms actually learn.",
      "Weeks 3–4: Launch abandoned-cart and first-purchase retention flows in email and SMS.",
      "Days 30–90: Scale the winning product behind retargeting and TikTok ads, guided by a single revenue dashboard.",
    ],
    metrics: [
      { label: "Cart abandonment recovery", description: "Revenue recovered from the ~70% of carts that leave." },
      { label: "Repeat purchase rate", description: "The share of buyers who come back — the health metric of your store." },
      { label: "Cost per acquisition", description: "What you pay per new customer, by channel and product." },
      { label: "Customer lifetime value", description: "Total revenue per customer — the number that sets your real ad budget." },
    ],
    faq: [
      { q: "Why is my conversion rate stuck at 1%?", a: "Usually speed, trust, or friction. If your store loads slow on mobile, lacks reviews and guarantees, or buries the buy button, visitors leave regardless of traffic quality." },
      { q: "Should I focus on ads or email/SMS?", a: "Both — but in the right order. First fix retention so every buyer becomes two, then scale acquisition. Ads to a leaky bucket just burn money faster." },
      { q: "How do I reduce cart abandonment?", a: "Speed, transparency (shipping costs up front), trust badges, and an abandoned-cart email/SMS sequence. The sequence alone recovers a meaningful share of the lost 70%." },
      { q: "What's the fastest way to raise AOV?", a: "Post-purchase upsells and bundles tested against your top-selling product, then promoted through your retention flows to an audience that already trusts you." },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "professional",
    keyword: "professional services marketing",
    label: "Professional Services",
    title: "Professional Services Marketing: Win the High-Ticket Clients",
    audience: "agencies, consultants, accountants, and B2B firms",
    primaryPillar: "websites-funnels",
    intro: [
      "High-ticket clients don't hire from a website — they hire from trust, authority, and timing. They research, compare, and only then call. The firms that close the big deals win on three things: appearing as the authority, nurturing the relationship, and answering fast when intent peaks.",
      "The trap for professional services is marketing like a product company. Nobody is going to impulse-buy a $25K engagement. The system that wins is a funnel: authority content, a lead magnet, a nurture sequence, and a response cadence measured in minutes.",
    ],
    painPoints: [
      {
        title: "Prospects research you before they ever call",
        stat: "Most B2B buyers are 70%+ through their decision before contacting a vendor",
        body: "By the time you know a prospect exists, they've read your content, checked your LinkedIn, and compared you to three competitors. If your authority surface is thin, you're pre-eliminated.",
      },
      {
        title: "Your inbound dries up without an engine",
        stat: "The first vendor to respond is dramatically more likely to win the deal",
        body: "Firms that market sporadically — a post when they remember — have no pipeline. Authority content and nurture systems run whether or not you're in a busy week.",
      },
      {
        title: "You win on price because you never built the case",
        stat: "Perceived value, not actual value, sets what clients will pay",
        body: "When your marketing never tells the story of your outcome, the only thing prospects compare is price. That's a race to the bottom you don't want to run.",
      },
      {
        title: "Leads go cold because follow-up is manual",
        stat: "Leads contacted within 5 minutes convert 21x better than those contacted after 30",
        body: "You can't personally nurture every inbound lead and run your practice. Automation is the only way to respond instantly and consistently.",
      },
    ],
    solutions: [
      {
        title: "Build the funnel high-ticket clients expect",
        body: "A conversion-engineered site with a single next step — strategy call, diagnostic, or proposal — instead of a brochure that asks nothing.",
        serviceId: 21,
      },
      {
        title: "Establish authority on LinkedIn",
        body: "A thought-leadership pipeline that keeps you visible to your exact buyer personas while you're doing client work.",
        serviceId: 66,
      },
      {
        title: "Turn your expertise into an entry offer",
        body: "A lead magnet and nurture sequence that trade real value for a conversation — the mechanism that turns readers into discovery calls.",
        serviceId: 24,
      },
      {
        title: "Never let a hot lead go cold",
        body: "Automated lead capture to follow-up: instant responses, nurture emails, and pipeline tracking so every inquiry gets the 5-minute treatment.",
        serviceId: 49,
      },
      {
        title: "Sell the transformation, not the hours",
        body: "A high-ticket page engineered around the outcome and proof — the difference between competing on price and commanding your rate.",
        serviceId: 25,
      },
    ],
    playbook: [
      "Weeks 1–2: Map your offer into a funnel — authority content, lead magnet, single next step — and wire lead capture.",
      "Weeks 3–4: Automate instant response and a 30-day nurture sequence for every new lead.",
      "Days 30–90: Publish LinkedIn authority content weekly, A/B test the pitch page, and track every lead to a decision.",
    ],
    metrics: [
      { label: "Lead-to-call rate", description: "Inquiries that actually turn into conversations." },
      { label: "Response time", description: "Minutes to first contact — the single biggest controllable conversion lever." },
      { label: "Average engagement value", description: "What each client is worth, so you know what an inquiry is really worth." },
      { label: "Proposal close rate", description: "How many pitches win, and what the presentation system does to that number." },
    ],
    faq: [
      { q: "How do professional service firms generate leads without cold calling?", a: "Authority content plus a lead magnet plus a nurture sequence. Prospects come to you already convinced, and your system moves them from reader to call without a single cold dial." },
      { q: "Should I compete on price to win clients?", a: "Competing on price trains clients to treat you as a commodity. The fix is marketing that sells your outcome — proof, process, and positioning — so price stops being the deciding factor." },
      { q: "Is LinkedIn worth it for B2B services?", a: "Yes — it's where your buyers research. A consistent thought-leadership pipeline on LinkedIn is the highest-ROI authority channel for professional services." },
      { q: "How fast should I respond to an inbound lead?", a: "Minutes, not hours. A 5-minute response is the single highest-leverage conversion action available to a services firm — automate it so it happens even at 9pm." },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "fitness",
    keyword: "gym marketing",
    label: "Gyms & Fitness Studios",
    title: "Gym Marketing: Fill Your Classes Without Buying More Ads",
    audience: "gym and fitness studio owners",
    primaryPillar: "sms-retention",
    intro: [
      "The fitness industry has a retention problem: around half of new members churn within six months. A studio that churns members is a studio that has to buy new members every month just to stand still — and ad prices keep climbing.",
      "The gyms that grow actually flip the model. They market to the members they already have, they create content that makes the fitness-curious obsessed, and they turn their schedule into a system of reminders, rebookings, and community. This is that playbook.",
    ],
    painPoints: [
      {
        title: "You're losing members to the six-month wall",
        stat: "Roughly half of new gym members quit within six months",
        body: "Memberships die from silence, not dissatisfaction. Nobody checks in, nobody nudges, so attendance fades and the charge-back cancels. Retention marketing is the cheapest membership growth there is.",
      },
      {
        title: "The algorithm doesn't know your studio exists",
        stat: "Most local consumers discover fitness studios through social video",
        body: "Transformation content and class energy on Reels/TikTok get pushed to your exact zip code — free discovery most studios ignore while buying expensive ads.",
      },
      {
        title: "Missed calls become lost membership inquiries",
        stat: "Businesses that respond first win the majority of the business",
        body: "When someone searching 'gym near me' calls and you're mid-class, the gym that texts back in three minutes gets the tour booking.",
      },
      {
        title: "Your schedule has holes you can't see",
        stat: "No-shows and forgotten classes cost studios measurable revenue each month",
        body: "An automated reminder flow fills classes that would otherwise hold empty spots — no new marketing spend required.",
      },
    ],
    solutions: [
      {
        title: "Market to the members you already have",
        body: "A VIP text club and automated re-engagement sequence that reduces churn and fills classes from your existing roster before you spend a dollar on acquisition.",
        serviceId: 45,
      },
      {
        title: "Stop no-shows with automated reminders",
        body: "Class reminders and rebooking flows that cut no-shows and keep your schedule full without recruiting a single new member.",
        serviceId: 44,
      },
      {
        title: "Win the 'gym near me' tour inquiry",
        body: "Instant text-back on missed calls captures membership interest while it's hot — the difference between a tour booked and a lead lost.",
        serviceId: 41,
      },
      {
        title: "Give the algorithm transformation content",
        body: "A monthly batch of short-form video — client journeys, class energy, coaching moments — engineered for local reach.",
        serviceId: 11,
      },
      {
        title: "Turn every 5-star member into a magnet",
        body: "Automated review capture and member story videos that turn your happiest clients into your best marketing.",
        serviceId: 31,
      },
    ],
    playbook: [
      "Weeks 1–2: Launch automated class reminders and the member text club.",
      "Weeks 3–4: Turn on review capture and missed-call text-back for membership inquiries.",
      "Days 30–90: Start the monthly video batch, run a reactivation campaign for lapsed members, and watch attendance fill from the roster you already have.",
    ],
    metrics: [
      { label: "Member retention rate", description: "The share of members who renew — the number that sets your real growth." },
      { label: "Class fill rate", description: "Occupancy per session, and the no-shows reminders recover." },
      { label: "Member reactivation", description: "Lapsed members brought back by automated campaigns." },
      { label: "Inquiry-to-tour rate", description: "How many membership calls turn into tours — a response-speed problem." },
    ],
    faq: [
      { q: "Why do I have to buy new members every month?", a: "Because you're losing the ones you have. Fix retention first — reminders, reactivation, community — and your acquisition budget finally becomes growth instead of maintenance." },
      { q: "Do gyms really grow on TikTok and Reels?", a: "Yes — transformation content is the most shareable content on the internet. Studios that post client journeys monthly get discovered by their whole city for free." },
      { q: "What's the best way to reduce no-shows?", a: "Automated class reminders plus a same-day rebooking flow. Studios routinely cut no-shows in half with a reminder system alone." },
      { q: "How do I get more tours from 'gym near me' searches?", a: "Optimize your Google profile and answer calls instantly. When you're mid-class, a missed-call text-back is what keeps the inquiry from booking with the studio down the street." },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "dental",
    keyword: "dental marketing",
    label: "Dental, Medical & Aesthetics",
    title: "Dental Practice Marketing: Fill Your Schedule With New Patients",
    audience: "dental, medical, and aesthetics practice owners",
    primaryPillar: "reputation-reviews",
    intro: [
      "Patients choose a provider like they choose a restaurant — by reputation. 72% of patients use online reviews as their first step in finding a new provider, and the average practice's no-show rate silently costs it thousands every month.",
      "The practices with full schedules aren't just good clinicians — they've engineered the patient journey: a Google profile that wins the map pack, fresh 5-star reviews, instant text-back on missed calls, and reminders that protect chair time.",
    ],
    painPoints: [
      {
        title: "New patients research you before they book",
        stat: "72% of patients use online reviews as their first step when choosing a provider",
        body: "Your rating and review freshness are the front door of your practice. Patients skip providers with thin or dated reviews and choose the one that looks most trusted.",
      },
      {
        title: "Missed calls become missed new patients",
        stat: "The provider that responds first usually gets the appointment",
        body: "Front desks can't answer every call — hygiene visits, procedures, and lunch all pull them away. Every unanswered new-patient call is someone who booked elsewhere.",
      },
      {
        title: "No-shows are bleeding your schedule",
        stat: "Automated reminders routinely cut no-show rates in half",
        body: "Every empty chair is revenue you planned on. A reminder text before appointments and a rebooking flow for cancellations protects your day.",
      },
      {
        title: "Your Google presence doesn't reflect your quality",
        stat: "98% of consumers read online reviews before choosing a local business",
        body: "Great care without review velocity is invisible. Patients don't know you're the best dentist in town if Google shows you with three old reviews.",
      },
    ],
    solutions: [
      {
        title: "Win the 'dentist near me' map pack",
        body: "A fully optimized Google Business Profile — categories, service menu, photos, and Q&A — so new-patient searches route to your practice.",
        serviceId: 1,
      },
      {
        title: "Automate reviews after every appointment",
        body: "Post-visit text requests capture 5-star reviews from satisfied patients, feeding both your local rank and the trust new patients check.",
        serviceId: 31,
      },
      {
        title: "Protect chair time from no-shows",
        body: "Appointment reminders and same-day rebooking flows that cut no-shows and recover cancelled slots automatically.",
        serviceId: 44,
      },
      {
        title: "Never lose a new-patient inquiry",
        body: "Instant text-back on missed calls captures new-patient requests while intent is highest — even during procedures.",
        serviceId: 41,
      },
      {
        title: "Capture high-value procedures with paid search",
        body: "Local Google Ads on 'teeth whitening,' 'implants,' and other high-margin procedures bring patients ready to book.",
        serviceId: 52,
      },
    ],
    playbook: [
      "Weeks 1–2: Rebuild the GBP and flip on automated review capture after every appointment.",
      "Weeks 3–4: Launch appointment reminders, rebooking flows, and missed-call text-back.",
      "Days 30–90: Run local ads on your highest-margin procedures, and watch new-patient volume and review velocity climb together.",
    ],
    metrics: [
      { label: "New-patient calls", description: "Inbound inquiries attributed to Google, ads, and referral sources." },
      { label: "Review velocity", description: "Fresh reviews per week — the leading indicator of new-patient trust." },
      { label: "No-show rate", description: "Missed appointments, and the chair time reminders recover." },
      { label: "New-patient cost", description: "What each new patient costs — the number your marketing decisions hang on." },
    ],
    faq: [
      { q: "How do I get more Google reviews from patients?", a: "Ask at the moment of satisfaction — right after treatment — with a text link to your review page. Automated post-visit requests capture reviews at a far higher rate than signs at the front desk." },
      { q: "Why do patients choose another practice with worse hours?", a: "Because reputation beats convenience. A practice with a fresh, active review profile and a visible Google presence gets chosen by patients who never know your hours were better." },
      { q: "How do I stop no-shows?", a: "Automated reminders before appointments plus a rebooking flow for cancellations. Most practices cut no-shows roughly in half with the reminder system alone." },
      { q: "Is Google Ads worth it for a dental practice?", a: "For high-margin procedures, absolutely. 'Implants near me' and 'teeth whitening' searchers have high intent, and a properly structured local campaign pays for itself with one or two booked procedures." },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "automotive",
    keyword: "automotive marketing",
    label: "Auto & Automotive",
    title: "Automotive Marketing: Put Your Shop First When the Check Engine Light Comes On",
    audience: "auto shops, dealerships, and detailers",
    primaryPillar: "local-seo",
    intro: [
      "Car repairs are decided by urgency, proximity, and trust — usually within minutes of a breakdown or a warning light. Shoppers don't browse repair shops like products; they search 'brake repair near me' and call the first two or three businesses Google shows with strong reviews.",
      "The shops that stay full aren't the biggest — they're the ones who own their local search presence, stack fresh reviews, and answer fast when a car is sitting in the lot. Every hour that passes between a search and a response is a job you're losing to the shop down the street.",
    ],
    painPoints: [
      {
        title: "You only get called if they already know you",
        stat: "Most drivers research a repair shop online before ever calling",
        body: "When a check engine light comes on, Google decides who gets the job. A weak GBP and thin reviews mean the busy shop two blocks over gets your traffic.",
      },
      {
        title: "Reviews are the mechanic's first impression",
        stat: "98% of consumers read online reviews before choosing a business",
        body: "Drivers don't know you're honest — they infer it from your rating and how you respond to complaints. Review velocity is trust, and trust is booked jobs.",
      },
      {
        title: "Missed calls during a packed bay",
        stat: "The first responder gets the appointment",
        body: "You're under a car when the phone rings — and the driver searching 'mechanic near me' books with whoever calls back first.",
      },
      {
        title: "Service reminders are going to your competitors",
        stat: "Repeat service customers are the most profitable revenue in automotive",
        body: "Drivers forget their oil change or service milestone. Shops that don't remind them lose that visit to whoever sends the reminder first.",
      },
    ],
    solutions: [
      {
        title: "Own every 'repair near me' search in your radius",
        body: "Full GBP optimization — services, service area, photos, and posts — so breakdown searches route to your bays instead of the shop with the better listing.",
        serviceId: 1,
      },
      {
        title: "Stack reviews from every completed job",
        body: "Automated post-service review requests build the trust score drivers check before calling anyone.",
        serviceId: 31,
      },
      {
        title: "Text back every missed call instantly",
        body: "Missed calls become immediate text conversations with a booking link — while the driver is still sitting in your parking lot or searching.",
        serviceId: 41,
      },
      {
        title: "Remind drivers it's time for service",
        body: "Automated service reminders and reactivation campaigns bring vehicles back to your shop before the check engine light sends them elsewhere.",
        serviceId: 44,
      },
      {
        title: "Capture urgent search demand",
        body: "High-intent Google Ads on 'brake repair,' 'oil change,' and other emergency services put you first while your organic presence compounds.",
        serviceId: 52,
      },
    ],
    playbook: [
      "Weeks 1–2: Optimize the GBP and flip on automated review capture after every service.",
      "Weeks 3–4: Turn on missed-call text-back and automated service reminders.",
      "Days 30–90: Run local ads on urgent repairs, launch vehicle-reactivation campaigns, and track every call to its source.",
    ],
    metrics: [
      { label: "Map pack share", description: "Which repair searches you rank for in your service radius." },
      { label: "Review velocity", description: "Fresh reviews per week — the trust score drivers check first." },
      { label: "Missed-call recovery", description: "Service requests converted from calls you couldn't answer." },
      { label: "Return-service rate", description: "Vehicles brought back by reminders — your cheapest, highest-margin revenue." },
    ],
    faq: [
      { q: "How do I compete with the big chain shops?", a: "Out-local them. Chains win on spend; independents win on local signals — a well-optimized profile, fresh reviews, and instant response to urgent searches." },
      { q: "Do reviews really matter for a repair shop?", a: "More than almost any other category. Drivers can't judge your work before it happens, so they judge your reviews. Fresh, abundant reviews are the difference between a full bay and a quiet one." },
      { q: "How do I get cars back for service?", a: "Automated reminders tied to service milestones and oil changes. Drivers who get a 'time for service' text come back; drivers who don't, forget." },
      { q: "Should I run Google Ads for my shop?", a: "Yes, for urgent, high-intent searches — brake repair, AC service, oil change. Emergency searches convert fast, and a local campaign targeting your radius is the fastest way to win them." },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "law",
    keyword: "law firm marketing",
    label: "Law & Legal",
    title: "Law Firm Marketing: Get the High-Value Cases Before Your Competitor",
    audience: "law firms and attorneys",
    primaryPillar: "websites-funnels",
    intro: [
      "96% of people who need legal help start with a search engine — and they're choosing a firm before the first consultation. Legal is one of the most trust-sensitive, high-stakes purchases on the internet, decided by reputation, authority, and response speed.",
      "The firms that win the high-value cases have turned their marketing into a system: a website that converts, authority content that proves expertise, client reviews that build trust, and a response cadence measured in minutes because legal leads decay fast.",
    ],
    painPoints: [
      {
        title: "Clients judge you before they ever call",
        stat: "96% of people seeking legal advice use a search engine first",
        body: "Your website and reviews are your first court appearance. A thin site and dated reviews lose cases to firms that look more established online.",
      },
      {
        title: "Legal leads are hot — and they cool fast",
        stat: "The first firm to respond wins a disproportionate share of the case",
        body: "A potential client is often in crisis and comparing three firms simultaneously. The one that answers in minutes, not days, gets the retainer.",
      },
      {
        title: "Negative mentions shape your reputation",
        stat: "Most clients check reviews and complaints before hiring an attorney",
        body: "Unanswered negative reviews and scattered mentions quietly cost you cases. Reputation management controls the story prospects see.",
      },
      {
        title: "You compete on hourly rate instead of outcomes",
        stat: "Clients choose based on perceived trust and authority",
        body: "When your marketing never demonstrates outcomes and expertise, the only differentiator left is price — the worst race a firm can run.",
      },
    ],
    solutions: [
      {
        title: "Turn your website into a case-intake machine",
        body: "A conversion-focused site with case-type landing pages and a single next step — consultation, case evaluation, or callback.",
        serviceId: 21,
      },
      {
        title: "Control the story prospects see",
        body: "Negative review deflection and dispute management keeps damaging mentions from dominating the reputation prospects check.",
        serviceId: 33,
      },
      {
        title: "Capture case-type leads with expert content",
        body: "A lead magnet per practice area — 'What to do after a car accident' guides — that trade real value for a consultation.",
        serviceId: 24,
      },
      {
        title: "Never let a hot case inquiry go cold",
        body: "Instant text-back and 24/7 capture ensure every case-type inquiry gets answered while the client is still comparing firms.",
        serviceId: 41,
      },
      {
        title: "Win the cases clients are actively searching",
        body: "High-intent Google Ads on your exact practice areas put your firm first when a client is in crisis and searching now.",
        serviceId: 52,
      },
    ],
    playbook: [
      "Weeks 1–2: Rebuild the intake path — case-type landing pages, single clear next step, instant response.",
      "Weeks 3–4: Set up review capture, negative deflection, and practice-area lead magnets.",
      "Days 30–90: Launch ads on your highest-value practice areas and publish authority content weekly.",
    ],
    metrics: [
      { label: "Case-intake calls", description: "Inquiries per practice area, attributed to source." },
      { label: "Response time", description: "Minutes from inquiry to contact — the metric that decides who gets the retainer." },
      { label: "Review & rating health", description: "The trust surface prospects evaluate before calling." },
      { label: "Cost per qualified case", description: "What each serious inquiry costs, by practice area." },
    ],
    faq: [
      { q: "Do law firms really need to compete on response time?", a: "Absolutely. Legal leads are high-stakes and time-sensitive. Clients often contact multiple firms in the same hour, and the first to respond builds the trust that wins the case." },
      { q: "Is Google Ads worth it for attorneys?", a: "For practice areas with clear intent — personal injury, family law, criminal defense — yes. Cost per click is high because the cases are worth a lot. A structured campaign with proper tracking pays for itself quickly." },
      { q: "How do I compete with larger firms on reputation?", a: "You don't outspend them — you out-execute locally. Fresh reviews, strong practice-area content, and instant response time beat a big-budget website that responds in a day." },
      { q: "How should I handle negative reviews as a firm?", a: "Respond publicly and professionally, then move it private. Deflection systems route complaints to resolution before they go public — protecting the reputation prospects judge you on." },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "education",
    keyword: "education marketing",
    label: "Education & Coaching",
    title: "Education & Coaching Marketing: Fill Your Cohort Without Wasting Ad Spend",
    audience: "course creators, coaches, and educators",
    primaryPillar: "digital-products",
    intro: [
      "The coaching and course market is a multi-billion-dollar industry, and the difference between a course that sells and one that sits is rarely the content — it's the funnel. Students don't buy information; they buy transformation, and they buy it from people they trust.",
      "The creators who fill cohorts consistently run a system: an entry offer that proves demand cheaply, a community that retains, a nurture engine that warms cold audiences, and authority content that makes the trust decision easy.",
    ],
    painPoints: [
      {
        title: "You built the course, not the business",
        stat: "Most course creators never make back their production cost",
        body: "The 'build it and they will come' assumption is the most expensive mistake in education marketing. A funnel must exist before the content does.",
      },
      {
        title: "You're selling information to people buying transformation",
        stat: "Students don't pay for content — they pay for outcomes",
        body: "A course positioned as 'hours of video' competes on price. One positioned as a transformation — with a curriculum, a finish line, and proof — commands its value.",
      },
      {
        title: "Cold audiences need warming before they buy",
        stat: "Only a small fraction of your audience is ready to buy on first contact",
        body: "Without a nurture sequence, most of your audience churns out of awareness before they're ever ready to enroll. You need a system to warm them.",
      },
      {
        title: "Launchless months are empty months",
        stat: "A cohort business lives or dies on consistent enrollment, not launch spikes",
        body: "If your revenue depends on launch adrenaline, the months between launches leak students to competitors who market every day.",
      },
    ],
    solutions: [
      {
        title: "Prove demand with a tripwire offer",
        body: "A low-priced micro-course or mini-guide that converts cold traffic into buyers cheaply — before you invest in the flagship.",
        serviceId: 80,
      },
      {
        title: "Turn buyers into a retained community",
        body: "A Skool or Kajabi community architecture that keeps students engaged, referred, and upgraded instead of churning.",
        serviceId: 71,
      },
      {
        title: "Warm cold audiences with a lead magnet",
        body: "An irresistible free asset plus a nurture sequence that moves readers from curious to enroll-ready on autopilot.",
        serviceId: 24,
      },
      {
        title: "Keep every lead moving, not static",
        body: "Multi-channel nurture emails that graduate prospects through awareness to application — without you sending a single manual email.",
        serviceId: 47,
      },
      {
        title: "Reach the students searching for the result you deliver",
        body: "Targeted ads on your transformation keywords capture the demand that's already looking for exactly what you teach.",
        serviceId: 58,
      },
    ],
    playbook: [
      "Weeks 1–2: Package the entry offer and build the lead-magnet funnel that feeds it.",
      "Weeks 3–4: Set up the community and automate the nurture sequence for every new lead.",
      "Days 30–90: Launch ads on your outcome keywords, collect social proof from early students, and open enrollment to a warmed list instead of a cold one.",
    ],
    metrics: [
      { label: "Tripwire conversion", description: "Cold visitors converted by your entry offer — proof of demand." },
      { label: "List-to-enrollment", description: "The share of your audience that enrolls when nurtured properly." },
      { label: "Community retention", description: "How long students stay engaged — the driver of referrals and upsells." },
      { label: "Revenue per launch", description: "Cohort revenue attributed to the funnel, not the adrenaline." },
    ],
    faq: [
      { q: "Do I need an audience before I can sell a course?", a: "You need buyers, not necessarily a big audience. A tripwire offered to a small warm list proves demand, funds development, and generates the testimonials that sell the flagship." },
      { q: "What's the difference between a course and a membership for my business?", a: "A course is a one-time transformation with a finish line; a membership is recurring value with recurring revenue. Most creators use the course as the flagship and a membership as the retention layer." },
      { q: "Why isn't my course selling even with good content?", a: "The problem is almost always the funnel, not the content. If there's no lead magnet, no nurture, and no warm launch, even excellent courses sit unpurchased." },
      { q: "How much should I spend on ads as an educator?", a: "Start small and prove your funnel first — validate the tripwire converts, then scale ads to it. Spending on ads before the funnel converts is paying to accelerate a leak." },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "creator",
    keyword: "creator and influencer marketing",
    label: "Creators, Influencers & Podcasts",
    title: "Creator Marketing: Turn Your Audience Into a Real Business",
    audience: "influencers, podcasters, and digital creators",
    primaryPillar: "short-form-video",
    intro: [
      "There are more than five million active podcasts, and short-form feeds now distribute content to billions — which means attention is no longer the problem. The problem is monetization. Most creators have an audience and still can't pay rent with it, because they treat their content as the product instead of the engine.",
      "The creators who built real businesses did the same thing in the same order: they systematized growth, packaged their authority into an entry offer, and built the funnel that turns followers into paying customers and brand partners.",
    ],
    painPoints: [
      {
        title: "You have an audience, not a business",
        stat: "A fraction of creators earn a sustainable income from their content",
        body: "Followers and subscribers are a liability until they're monetized. Without an offer, a funnel, and an email/SMS list, your audience belongs to the platform — and the platform can take it away.",
      },
      {
        title: "The algorithm runs your revenue",
        stat: "Short-form discovery is the fastest distribution channel in history — and the least predictable",
        body: "Relying on platform reach alone means feast-or-famine months. An owned audience — email, SMS, community — makes your income independent of a single feed's mood.",
      },
      {
        title: "Sponsors don't see you as a media kit",
        stat: "Brands evaluate creators on audience quality and monetization proof",
        body: "Without a professional media kit, rate card, and audience data, brands lowball you or skip you for the creator who looks like a business.",
      },
      {
        title: "Your content isn't working as marketing",
        stat: "Consistent short-form creators compound reach while sporadic ones restart from zero",
        body: "Posting randomly means the algorithm never learns your audience. A batched, consistent system is the difference between a following and a business.",
      },
    ],
    solutions: [
      {
        title: "Package your audience into an entry offer",
        body: "A tripwire or micro-offer that turns followers into buyers — the first step from content creator to business owner.",
        serviceId: 80,
      },
      {
        title: "Treat your podcast like a business asset",
        body: "Professional setup, distribution, and cover art that make your show sponsor-ready and searchable on every platform.",
        serviceId: 77,
      },
      {
        title: "Turn every episode into search traffic",
        body: "SEO transcripts and show notes that pull Google traffic and make your expertise findable long after an episode airs.",
        serviceId: 79,
      },
      {
        title: "Systematize the growth engine",
        body: "A monthly batch of short-form content — hooks, edits, and platform-adapted cutdowns — that keeps discovery compounding.",
        serviceId: 11,
      },
      {
        title: "Build the brand brands pay for",
        body: "A cohesive visual identity and profile system that makes you look like a media company, not a hobbyist.",
        serviceId: 17,
      },
    ],
    playbook: [
      "Weeks 1–2: Launch the entry offer and start building an owned audience — email/SMS capture on every platform.",
      "Weeks 3–4: Upgrade your media kit, podcast setup, and social identity to sponsor-ready standard.",
      "Days 30–90: Batch monthly content, convert episodes into SEO assets, and pitch sponsors with real audience data.",
    ],
    metrics: [
      { label: "Owned audience size", description: "Email and SMS subscribers — the audience the platform can't take from you." },
      { label: "Offer conversion", description: "Followers converted into buyers by your entry offer." },
      { label: "Sponsorship CPM", description: "What brands pay per thousand listeners or followers — the media-kit number." },
      { label: "Discovery reach", description: "Consistent monthly views across your content system." },
    ],
    faq: [
      { q: "How do creators actually make consistent money?", a: "Three streams in order: an owned audience (email/SMS), an entry offer that converts it, and sponsorships sold with real audience data. Platforms are the top of the funnel, not the business." },
      { q: "Should I focus on growing on the platform or building my list?", a: "Both, but list first. Platform growth is leased traffic; an email and SMS list is owned traffic that converts and survives algorithm changes." },
      { q: "How do I get sponsors as a small creator?", a: "Build a professional media kit with audience data and proof of monetization. Brands pay for predictable quality, and a small, engaged, monetized audience beats a large unengaged one." },
      { q: "Is a podcast actually worth starting in 2026?", a: "Yes — but run it like a business asset, not a hobby. The show builds authority and search traffic, and every episode should funnel into your offer and your owned audience." },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Composition                                                          */
/* ------------------------------------------------------------------ */

const PILLAR_MAP: Record<PillarId, { name: string; number: number }> =
  Object.fromEntries(
    PILLARS.map((p) => [p.id, { name: p.name, number: p.number }]),
  ) as Record<PillarId, { name: string; number: number }>;

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function truncate(str: string, len: number): string {
  const s = str.trim().replace(/\s+/g, " ");
  if (s.length <= len) return s;
  const cut = s.slice(0, len - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

interface Section {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

function buildArticle(spec: VerticalBlogSpec, idx: number) {
  const pillar = PILLAR_MAP[spec.primaryPillar];
  const sections: Section[] = [];

  sections.push({
    heading: `Why Most ${spec.label} Marketing Doesn't Work`,
    paragraphs: spec.intro,
  });

  sections.push({
    heading: `The ${spec.painPoints.length} Problems Holding Back ${spec.label}`,
    paragraphs: [
      `Every one of these shows up in every market we audit — and each one quietly routes customers to whoever fixed it first.`,
    ],
    bullets: spec.painPoints.map(
      (p) => `${p.title}. ${p.stat}. ${p.body}`,
    ),
  });

  sections.push({
    heading: `The Solutions: A ${spec.keyword} System That Actually Converts`,
    paragraphs: [
      `None of these fixes are a campaign — they're a system, and they're exactly what the Biz Reborn module library was built to deliver. Each one below is a single installable module you can launch in a click:`,
    ],
    bullets: spec.solutions.map(
      (s) => `${s.title}. ${s.body}`,
    ),
  });

  sections.push({
    heading: `The 90-Day ${spec.label} Growth Playbook`,
    paragraphs: [
      `Here's the exact sequence a business in your category should run — in order, because each step makes the next one stronger:`,
    ],
    bullets: spec.playbook,
  });

  sections.push({
    heading: `The Metrics That Matter for ${spec.label}`,
    paragraphs: [
      `If you're going to invest in marketing, track the numbers that predict revenue — not vanity metrics. These are the ones that matter for your category:`,
    ],
    bullets: spec.metrics.map((m) => `${m.label}: ${m.description}`),
  });

  sections.push({
    heading: `The ${spec.label} Marketing Checklist`,
    paragraphs: [
      `Run through this before you spend another dollar on marketing:`,
    ],
    bullets: [
      `Claim and fully optimize your Google Business Profile with the right categories, service menu, and photos.`,
      `Have automated review capture running after every customer interaction.`,
      `Answer every inquiry — calls, forms, texts — in minutes, not days.`,
      `Retain what you have: reminders, rebooking, and past-client reactivation running on autopilot.`,
      `Track every lead to its source so you know which channel actually pays.`,
    ],
  });

  const faq = spec.faq;
  const title = spec.title;
  const metaTitle = truncate(`${spec.keyword}: Stats, Pain Points & the Fixes`, 60);
  const metaDescription = truncate(
    `The complete ${spec.keyword} playbook for ${spec.audience} — the stats that prove what's costing you customers, the pain points that hold back ${spec.label.toLowerCase()}, and the exact solutions that fix them.`,
    158,
  );
  const keywords = [
    spec.keyword,
    `${spec.label.toLowerCase()} marketing`,
    `${spec.label.toLowerCase()} advertising`,
    `marketing for ${spec.label.toLowerCase()}`,
    "local marketing",
    "business growth",
    ...spec.painPoints.slice(0, 2).map((p) => p.title.toLowerCase()),
  ];

  const allText = [
    spec.title,
    spec.intro.join(" "),
    ...sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.bullets ?? [])]),
    ...faq.flatMap((f) => [f.q, f.a]),
  ].join(" ");
  const readTime = Math.max(7, Math.round(wordCount(allText) / 200));

  const published = new Date(Date.UTC(2026, 6, 1, 12, 0, 0) + idx * 2 * 8.64e7)
    .toISOString()
    .slice(0, 10);

  return {
    slug: slugify(spec.keyword),
    serviceId: 0,
    pillar: spec.primaryPillar,
    pillarName: pillar.name,
    pillarNumber: pillar.number,
    serviceTitle: spec.label,
    title,
    metaTitle,
    metaDescription,
    keywords,
    readTime,
    published,
    updated: published,
    intro: spec.intro.join(" "),
    sections,
    faq,
    ctaHeadline: `Ready to make ${spec.keyword} work for your ${spec.label.toLowerCase()}?`,
    ctaBody: `Launch the ${spec.label.toLowerCase()} stack on the service menu — pre-filtered to the modules that move your category — or run the free AI brand audit first to see exactly where you're losing customers.`,
  };
}

const articles = VERTICAL_BLOGS.map(buildArticle);

const out = `/**
 * AUTO-GENERATED by scripts/generate-vertical-blogs.ts — do not edit by hand.
 * One SEO article per business vertical, engineered to rank for "<category>
 * marketing" searches and convert business owners via stats, pain points,
 * and mapped solutions.
 */
import type { BlogArticle } from "@/data/blog";

export const VERTICAL_ARTICLES: BlogArticle[] = ${JSON.stringify(articles, null, 2)};

export const VERTICAL_BY_SLUG: Record<string, BlogArticle> = Object.fromEntries(
  VERTICAL_ARTICLES.map((a) => [a.slug, a]),
);
`;

writeFileSync(join(process.cwd(), "src/data/vertical-blogs.ts"), out, "utf8");
console.log(`Generated ${articles.length} vertical articles -> src/data/vertical-blogs.ts`);
