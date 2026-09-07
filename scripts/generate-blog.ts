/**
 * Generates src/data/blog.ts — 100 full-length SEO articles, one per service.
 * Run: npx tsx scripts/generate-blog.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PILLARS, BUSINESS_VERTICALS } from "../src/data/services";
import type { PillarId } from "../src/lib/types";

/* ------------------------------------------------------------------ */
/* Per-pillar curated topic banks                                      */
/* ------------------------------------------------------------------ */

interface PillarTopic {
  noun: string;
  keywords: string[];
  benefits: string[];
  metrics: { label: string; description: string }[];
  mistakes: string[];
  bestPractices: string[];
  faq: { q: string; a: string }[];
}

const VERT_LABELS: Record<string, string> = Object.fromEntries(
  BUSINESS_VERTICALS.map((v) => [v.id, v.label.toLowerCase()]),
);

const TOPICS: Record<PillarId, PillarTopic> = {
  "local-seo": {
    noun: "local SEO system",
    keywords: ["local SEO", "Google Business Profile", "map pack", "local search ranking", "near me", "Google Maps", "local citations"],
    benefits: [
      "Local SEO is the only channel where you can be found by buyers with the highest intent on the internet — people who are already searching for exactly what you sell in exactly your area.",
      "The Google Map Pack occupies the top of the search results on mobile, which is where the majority of local purchases begin.",
      "Unlike paid ads, local SEO compounds: every review, citation, and piece of authority you earn keeps working for months and years.",
      "Businesses that rank in the top three local results capture the overwhelming share of clicks, calls, and walk-ins in their category.",
    ],
    metrics: [
      { label: "Map pack rankings", description: "Track which neighborhoods you appear in and push weak zones into the top three." },
      { label: "Calls and direction requests", description: "The two actions that map directly to revenue from your Google Business Profile." },
      { label: "Search visibility", description: "The share of local searches your keywords capture each month." },
      { label: "Review velocity", description: "A proxy for trust signals Google uses to rank you against the local pack." },
    ],
    mistakes: [
      "Ignoring the difference between location and service area — your GBP hides if your service area is misconfigured.",
      "Copy-pasting the same content across categories instead of picking the category that actually converts.",
      "Posting sporadically and never answering Q&A, which signals to Google that your listing is stale.",
      "Letting NAP data drift across directories, which erodes the trust signals citations are supposed to build.",
      "Chasing national keywords instead of the hyper-local terms your service radius actually searches.",
    ],
    bestPractices: [
      "Pick the highest-converting GBP categories, not the most generic ones.",
      "Upload fresh photos weekly — listings with regular photo updates get more clicks and calls.",
      "Reply to every review, and use the questions & answers section as a keyword surface.",
      "Keep your name, address, and phone number identical across every directory.",
    ],
    faq: [
      { q: "How long does local SEO take to show results?", a: "Most clients see movement in the map pack within 60–90 days, with meaningful ranking gains at the 3–6 month mark. Local SEO is a compounding channel — early wins build authority that accelerates later gains." },
      { q: "Do I need paid ads if I rank #1 in Google Maps?", a: "Ranking #1 captures a huge share of free traffic, but ads give you volume and speed on top of it. Most dominant local brands run both — the map pack captures intent, and ads capture demand that would otherwise go to competitors." },
      { q: "What is a citation and why does it matter?", a: "A citation is any mention of your business name, address, and phone number (NAP) on another website. Consistent citations across 100+ directories tell Google your business is real, established, and trustworthy — a core ranking signal." },
      { q: "Is local SEO worth it for a service-area business?", a: "Absolutely. You just need to configure your service area and landing pages correctly so Google knows exactly which zip codes you serve. Most service businesses see higher ROI from local SEO than any other channel." },
      { q: "Can you guarantee the #1 map pack spot?", a: "No honest agency can guarantee rankings — Google's algorithm is opaque and changes constantly. What we can do is systematically improve every ranking factor we control, which is what consistently moves businesses into the top three." },
    ],
  },
  "short-form-video": {
    noun: "short-form video engine",
    keywords: ["short-form video", "Reels", "TikTok", "viral hooks", "video marketing", "content production", "short-form video marketing"],
    benefits: [
      "Short-form video is the highest-reach, lowest-cost attention engine local businesses have ever had access to.",
      "Reels and TikToks get surfaced by the algorithm to people who have never heard of you — a discovery mechanism no other organic channel gives a local business.",
      "Dynamic captions keep viewers watching with sound off, which is how most people consume short-form content.",
      "One strong hook can win you tens of thousands of local impressions at zero ad spend.",
    ],
    metrics: [
      { label: "Hook rate", description: "The percentage of viewers who watch past the first 1.5 seconds — the metric that decides whether the algorithm pushes your video." },
      { label: "Average watch time", description: "Retention is the algorithm's strongest signal; longer watch time means more distribution." },
      { label: "Profile visits and follows", description: "The proof that your content is converting strangers into an audience." },
      { label: "DMs and saves", description: "Engagement actions that correlate with actual buying intent." },
    ],
    mistakes: [
      "Posting randomly instead of batching content on a monthly cadence that the algorithm can learn from.",
      "Putting the hook at the end — if you don't win the first 1.5 seconds, nothing else matters.",
      "Making every video about selling instead of proving results, story, and value.",
      "Ignoring trending audio until the trend has already peaked.",
      "Posting the same video to every platform without adapting captions and format.",
    ],
    bestPractices: [
      "Win the first 1.5 seconds with a visual or spoken hook that promises a specific outcome.",
      "Batch film in one session using a shot list so your content stays consistent without eating your week.",
      "Use dynamic captions on everything — most people watch with sound off.",
      "Repurpose one shoot across Reels, TikTok, Shorts, and your ad account.",
    ],
    faq: [
      { q: "How many videos do I need to post per month?", a: "A monthly batch of 15 is the minimum for the algorithm to find your pattern. Consistency matters more than polish — a library of 90+ videos over six months gives the platform plenty of data to work with." },
      { q: "Do I need professional equipment?", a: "No. A modern phone, good lighting, and a simple shot list produce results. The editing and captions are where your content goes from amateur to premium." },
      { q: "How long until short-form video generates leads?", a: "Most brands see meaningful engagement within 30–60 days and lead flow once you have a critical mass of content plus a clear call to action. Video compounds like every other organic channel." },
      { q: "Should I do Reels, TikTok, or both?", a: "Both — but with a single shoot repurposed per platform. The formats and audiences overlap enough that one content engine can feed both plus YouTube Shorts." },
      { q: "Can short-form video work for B2B or contractors?", a: "Yes — before-and-after proof, job breakdowns, and educational content are exactly what contractors, realtors, and B2B brands convert with." },
    ],
  },
  "websites-funnels": {
    noun: "conversion-focused website system",
    keywords: ["landing page", "conversion rate", "sales funnel", "website design", "CRO", "lead generation", "funnel"],
    benefits: [
      "Your website is the only asset every other marketing channel funnels into — if it converts poorly, you're paying to advertise a leaky bucket.",
      "A single-action landing page built for speed converts at rates the multi-purpose homepage never will.",
      "Mobile speed is decisive: sub-2-second loads keep the majority of local searchers on your page instead of your competitor's.",
      "Funnels let you capture leads with offers instead of begging for contact form submissions.",
    ],
    metrics: [
      { label: "Conversion rate", description: "The percentage of visitors who take your single desired action — call, form, or booking." },
      { label: "Largest Contentful Paint", description: "How fast your page visually loads; the biggest ranking and bounce factor." },
      { label: "Cost per lead", description: "What you actually pay to acquire a lead when traffic is factored against conversions." },
      { label: "Abandoned cart / form completion", description: "Where you lose buyers, and what a funnel fix can recover." },
    ],
    mistakes: [
      "Designing for looks instead of a single action — every extra option is a conversion you didn't get.",
      "Building a slow, bloated site that loses mobile searchers before the first fold.",
      "Hiding your phone number and booking button below the fold.",
      "Treating your website as static instead of testing headlines, CTAs, and offers.",
      "Ignoring accessibility, which both keeps you out of legal trouble and expands your audience.",
    ],
    bestPractices: [
      "One page, one goal — remove every link that doesn't serve the primary action.",
      "Put tap-to-call and one-click booking above the fold on mobile.",
      "Compress images and script so the page loads in under two seconds.",
      "A/B test the headline, offer, and CTA until your buyers vote with clicks.",
    ],
    faq: [
      { q: "How fast should my website load?", a: "Under two seconds on mobile. Beyond speed score, a fast page converts better and ranks higher — it's one of the few improvements that pays off in every channel at once." },
      { q: "Landing page or full website?", a: "For paid traffic, a dedicated landing page beats a homepage almost every time. Keep your full site for organic visitors, but send ads to a page engineered around one action." },
      { q: "Do I need a VSL (video sales letter) page?", a: "For high-ticket offers, yes. A well-written VSL page can lift conversion rates dramatically because it presents the full pitch before asking for the decision." },
      { q: "What's the difference between a funnel and a website?", a: "A website is a place people land; a funnel is a sequence of decisions you move them through — from lead magnet to email capture to booking. Funnels convert because they're built around a journey, not a menu." },
      { q: "How do I know if my page is underperforming?", a: "Compare your conversion rate to your industry baseline, then A/B test the headline and CTA. If you're sending traffic but getting no calls, the page — not the traffic — is the problem." },
    ],
  },
  "reputation-reviews": {
    noun: "reputation & review system",
    keywords: ["online reviews", "Google reviews", "reputation management", "review automation", "social proof", "customer reviews"],
    benefits: [
      "Reviews are the #1 trust factor local buyers check — and they're also a direct Google ranking signal.",
      "A steady stream of fresh reviews keeps your rating high and your listing algorithmically 'active'.",
      "Automation captures reviews from happy customers in the moment, instead of hoping they remember you next week.",
      "Deflecting negative reviews before they go public protects a reputation that took years to build.",
    ],
    metrics: [
      { label: "Review velocity", description: "New reviews per week — freshness is a ranking and trust signal." },
      { label: "Average star rating", description: "The headline number every prospect checks before choosing you." },
      { label: "Response rate", description: "Reply speed to new reviews; it signals care to both customers and Google." },
      { label: "Net Promoter Score", description: "The underlying satisfaction that drives reviews, retention, and referrals." },
    ],
    mistakes: [
      "Asking for reviews only from happy customers while ignoring the pipeline to capture them consistently.",
      "Reacting publicly and defensively to negative reviews instead of handling them off-channel.",
      "Buying reviews — Google can strip your listing, and fake reviews are easy to spot.",
      "Letting reviews pile up unanswered, which reads as neglect to prospects.",
      "Never measuring satisfaction until a detractor goes public.",
    ],
    bestPractices: [
      "Text every happy customer within minutes of service with a direct review link.",
      "Put a branded QR review stand where the post-service high is highest.",
      "Reply to every review — thank promoters, and move detractors to a private channel.",
      "Monitor reviews in real time so you respond while the customer is still warm.",
    ],
    faq: [
      { q: "How many reviews do I need to outrank competitors?", a: "There's no magic number — it's about velocity, recency, and rating. Ten fresh reviews this month beat a hundred that stopped a year ago. Consistency is what flips the map pack." },
      { q: "Is it allowed to ask customers for reviews?", a: "Yes — asking for a review is fine. You just can't incentivize or script them. What matters is the timing: ask immediately after service, when satisfaction is highest." },
      { q: "How do I handle a negative review?", a: "Respond publicly, briefly, and professionally, then take the conversation private to resolve it. A well-handled negative review can actually build trust — prospects see how you treat complaints." },
      { q: "Do reviews really affect Google ranking?", a: "Yes. Review velocity and rating are among the strongest local ranking signals. Combined with citations and on-page signals, reviews are a major lever on map pack position." },
      { q: "What's the difference between reputation management and getting more reviews?", a: "Getting reviews is one tactic; reputation management is the full system — capture, deflection, response, widgets, testimonials, and the satisfaction funnel that feeds them all." },
    ],
  },
  "sms-retention": {
    noun: "SMS & lead retention system",
    keywords: ["SMS marketing", "text message marketing", "lead retention", "missed call text back", "customer retention", "appointment reminders"],
    benefits: [
      "Text messages have a 98% open rate and are read within minutes — no other channel reaches your customers that reliably.",
      "Your past clients are the cheapest pipeline you'll ever have; reactivation campaigns consistently outperform cold acquisition.",
      "Missed calls are pure lost revenue — an instant text-back recovers calls your team couldn't answer.",
      "Automation runs at 3am, while your competitors sleep — booking, answering, and nurturing without your involvement.",
    ],
    metrics: [
      { label: "Missed-call recovery", description: "The share of missed calls converted into a text conversation and a booking." },
      { label: "Response rate", description: "Open-and-reply rates on SMS campaigns — the fastest feedback loop in marketing." },
      { label: "No-show rate", description: "The drop in missed appointments after automated reminder flows are live." },
      { label: "Reactivation ROI", description: "Revenue per campaign from re-engaging past clients instead of acquiring new ones." },
    ],
    mistakes: [
      "Texting everyone the same broadcast and burning opt-outs on your best list.",
      "Letting missed calls go unreturned — the most expensive 30 seconds in your business.",
      "Reminding customers of appointments but never rebooking the ones who cancel.",
      "Collecting emails and numbers but never running a nurture sequence on them.",
      "Ignoring the data — not tracking which campaigns actually drove bookings.",
    ],
    bestPractices: [
      "Text back missed calls instantly with a booking link while intent is highest.",
      "Run a monthly VIP text club with exclusive promos to build loyalty and frequency.",
      "Automate appointment reminders plus a same-day rebooking flow.",
      "Track every lead through pipeline stages so nothing slips between the cracks.",
    ],
    faq: [
      { q: "Do I need my customers' permission to text them?", a: "Yes — SMS is opt-in, and compliance matters. That's why the best flows start at the point of service: asking for permission while the customer is right in front of you converts at a very high rate." },
      { q: "What's a good open rate for SMS?", a: "Text messages consistently open above 90%, compared to ~20% for email. It's why SMS is the highest-ROI retention channel for local businesses." },
      { q: "How do I reactivate old customers?", a: "Run a crafted re-engagement sequence — a rebooking offer, a VIP invite, or a 'we miss you' hook — to a segmented list of past clients. Old customers already trust you, so conversion is faster and cheaper." },
      { q: "Can SMS really reduce no-shows?", a: "Automated reminders routinely cut no-show rates in half, and a same-day rebooking flow recovers appointments that would otherwise be lost to cancellation." },
      { q: "SMS or email for retention?", a: "Both — they do different jobs. Email is for nurture sequences and education; SMS is for immediate, high-intent actions like reminders, rebooking, and offers. A multi-channel system uses each where it's strongest." },
    ],
  },
  "paid-ads": {
    noun: "paid advertising engine",
    keywords: ["paid advertising", "Google Ads", "Facebook ads", "PPC", "geo-fencing", "retargeting", "ROAS"],
    benefits: [
      "Paid ads are the only channel that lets you buy time — rank today while your organic engine builds.",
      "Hyper-local targeting puts your message in front of your exact service radius, eliminating wasted ad spend.",
      "Retargeting captures the 95%+ of visitors who don't convert on the first visit and brings them back.",
      "Geo-fencing lets you serve ads to phones physically inside a competitor's storefront — their foot traffic becomes your pipeline.",
    ],
    metrics: [
      { label: "Cost per acquisition", description: "The real price of a customer — what matters more than clicks or impressions." },
      { label: "Return on ad spend (ROAS)", description: "Revenue generated per ad dollar, allocated by data not guesswork." },
      { label: "Click-through rate", description: "How relevant and scroll-stopping your creative and offer are." },
      { label: "Conversion rate", description: "The share of clicks that turn into a call, form, or booking." },
    ],
    mistakes: [
      "Running ads without server-side conversion tracking, so the algorithms are flying blind.",
      "Boosting posts instead of building structured, objective-based campaigns.",
      "Letting Google spend budget on irrelevant searches without negative keyword defense.",
      "Judging ads by impressions instead of cost per acquisition.",
      "Reusing one creative until it's stale instead of refreshing sets monthly.",
    ],
    bestPractices: [
      "Track every conversion server-side so the algorithm learns your real customers.",
      "Target your service radius and geo-fence competitors, not broad cities.",
      "Retarget everyone who engaged but didn't convert — the 7-11 rule works.",
      "Report ROAS monthly and reallocate budget to what's actually making money.",
    ],
    faq: [
      { q: "How much should I spend on ads?", a: "Start with a budget your margin can support — usually $1,000–$3,000/month for local campaigns — then scale what's profitable. The allocation should be driven by ROAS data, not a fixed guess." },
      { q: "What is geo-fencing and does it work?", a: "Geo-fencing serves ads to phones that enter a defined area — like a competitor's storefront. It works because it intercepts buyers with demonstrated intent who are physically in your market." },
      { q: "Why does my cost per lead keep going up?", a: "Usually three causes: stale creative (ad fatigue), missing negative keywords on Google, or weak conversion tracking. Fix those and CPAs almost always come back down." },
      { q: "Google or Facebook ads for local businesses?", a: "Google captures high intent — people already searching. Facebook/Instagram creates demand through reach and retargeting. The best local stacks run both: Google for intent, Meta for volume and retargeting." },
      { q: "When is it time to hire someone to run my ads?", a: "When your time is worth more than the fee, or when your cost per lead is higher than it should be and you can't fix it. A structured account with proper tracking almost always outperforms self-managed spend." },
    ],
  },
  "social-branding": {
    noun: "social branding system",
    keywords: ["social media marketing", "social media management", "brand identity", "content calendar", "personal branding", "social media strategy"],
    benefits: [
      "Social media is where your customers decide to trust you before they ever call.",
      "A consistent, on-brand feed builds perceived value — brands that look premium can charge premium prices.",
      "A monthly content calendar planned around revenue turns posting from a chore into a system.",
      "Community management captures the DMs and comments that are quietly generating leads you never see.",
    ],
    metrics: [
      { label: "Engagement rate", description: "Likes, comments, saves, and shares relative to reach — the health metric of your audience." },
      { label: "Profile conversions", description: "Visits that turn into follows, DMs, or link taps toward booking." },
      { label: "Brand consistency", description: "How recognizable your content is at a glance — the asset that compounds recognition." },
      { label: "Community response time", description: "How fast you answer DMs and comments, which decides how many turn into customers." },
    ],
    mistakes: [
      "Posting vanity content that earns likes from your mother instead of leads from your market.",
      "Starting over with a new logo or voice every few months instead of building one consistent identity.",
      "Ignoring DMs and comments, where the actual buying conversations happen.",
      "Posting on a whim instead of a calendar planned around offers and proof.",
      "Being on every platform badly instead of dominating the one your customers use.",
    ],
    bestPractices: [
      "Build a brand voice guide and style system so every post is unmistakably you.",
      "Plan a 30-day calendar balanced between proof, story, and offer.",
      "Use Canva templates so your team stays on-brand even on a bad day.",
      "Reply to every comment and DM — the inbox is a lead channel, not a chore.",
    ],
    faq: [
      { q: "Which social platform should I focus on?", a: "The one your customers actually use daily. For most local consumer businesses that's Instagram; for B2B it's LinkedIn; for restaurants and bars it's TikTok. Dominate one before you add a second." },
      { q: "How often should I post?", a: "Consistency beats frequency. Posting daily from a planned calendar is ideal; three to four quality posts a week is a workable floor. The algorithm rewards rhythm, not sporadic bursts." },
      { q: "Can I manage social media myself?", a: "You can — but the opportunity cost is brutal. A managed system with a calendar, templates, and community management frees you to run the business while the content runs itself." },
      { q: "Do I need a professional logo and brand identity?", a: "Yes. Your brand's perceived quality directly sets the price people expect to pay. A modern identity refresh is one of the fastest ways to raise your perceived value." },
      { q: "How do I measure social media ROI?", a: "Track profile visits to DMs to bookings, plus the revenue from promo campaigns. If you can't see the path from content to customers, you're posting for vanity." },
    ],
  },
  "digital-products": {
    noun: "digital product system",
    keywords: ["digital products", "online course", "membership", "e-book", "podcast", "community", "digital product"],
    benefits: [
      "Digital products let you sell expertise once and collect revenue repeatedly — the highest-margin asset a service business can own.",
      "A paid community converts your best clients from one-off buyers into recurring members.",
      "Products give you an entry-level offer that turns cold traffic into buyers cheaply before you sell the high-ticket service.",
      "A podcast and e-books build authority that makes the rest of your marketing easier to convert.",
    ],
    metrics: [
      { label: "Recurring revenue", description: "Monthly membership and subscription income that doesn't depend on new customer acquisition." },
      { label: "Conversion to tripwire", description: "How many cold visitors take your low-priced entry offer." },
      { label: "Course completion", description: "The retention metric that decides reviews, referrals, and upgrades." },
      { label: "Member retention", description: "How long paying members stay — the number that makes the model profitable." },
    ],
    mistakes: [
      "Building a course before proving anyone wants to pay for it.",
      "Selling information instead of transformation — students pay for outcomes.",
      "Letting membership communities go quiet and passive until they churn.",
      "Publishing a podcast with poor audio, which kills credibility before the first listener decides.",
      "Making the product the whole business instead of a feeder into your service line.",
    ],
    bestPractices: [
      "Launch with a low-priced tripwire to validate demand before building the flagship.",
      "Structure your course around a transformation with a clear curriculum and finish line.",
      "Automate Day-1 to Day-30 onboarding so new members engage without your manual effort.",
      "Turn every podcast episode into a transcript and show notes that pull search traffic.",
    ],
    faq: [
      { q: "Do I need an audience before launching a course?", a: "You need buyers, not necessarily a big audience. Start with a micro-course or tripwire offered to your existing clients and email list — proven demand beats a huge untapped audience." },
      { q: "How do I price a digital product?", a: "Price by the transformation, not the content. A micro-course that solves one urgent problem can sell for $47–$200; a flagship course that delivers a complete result can command $500–$2,000+." },
      { q: "What's the difference between a course and a membership?", a: "A course is a one-time deliverable with a finish line; a membership is ongoing value with recurring revenue. Most creators run a course as the flagship and a membership as the retention layer." },
      { q: "How do I actually make money from a podcast?", a: "Podcasts are rarely the revenue source — they're the authority engine. The money comes from the course, membership, or service the podcast funnels into, plus sponsorship as the audience grows." },
      { q: "Which platform should I use for my community?", a: "Skool is the fastest to launch and great for courses-plus-community; Kajabi handles more complex funnels and memberships. Start with the simplest platform that covers your core use case." },
    ],
  },
  "commercial-real-estate": {
    noun: "commercial real estate marketing system",
    keywords: ["commercial real estate marketing", "real estate marketing", "property marketing", "drone footage", "listing video", "tenant placement", "CRE"],
    benefits: [
      "Commercial deals are decided by presentation — a property that looks premium commands premium terms and faster lease-up.",
      "Digital pitch packs and virtual tours let buyers experience a space without a single showing trip.",
      "Video marketing kits make every listing shareable across social, email, and SMS simultaneously.",
      "Lead magnet reports turn your market expertise into a pipeline of property-owner contacts.",
    ],
    metrics: [
      { label: "Lease-up velocity", description: "Days on market for commercial listings — the metric presentation directly improves." },
      { label: "Lead capture rate", description: "Visitors converted into tracked, nurtured buyer or landlord lists." },
      { label: "Tour-to-offer conversion", description: "How many showings turn into signed interest — the funnel your marketing feeds." },
      { label: "Cost per qualified lead", description: "What your marketing actually costs to produce a serious inquiry." },
    ],
    mistakes: [
      "Listing properties with photos when competitors are listing with drone video and virtual tours.",
      "Relying on MLS photos instead of a branded, shareable marketing kit for every listing.",
      "Capturing open-house visitors without a funnel to track and nurture them.",
      "Marketing to tenants while ignoring the landlords who control the inventory.",
      "Treating every listing the same instead of tailoring the pitch to the space's best-fit tenant.",
    ],
    bestPractices: [
      "Produce a professional video kit for every listing — drone, walkthrough, and social cutdowns.",
      "Build a branded digital pitch pack for each space before the first showing.",
      "Capture open-house visitors into a tracked nurture list, not a clipboard.",
      "Use lead magnets like market reports to attract owner-occupiers and landlords.",
    ],
    faq: [
      { q: "Does marketing really move commercial vacancy faster?", a: "Yes — presentation drives perceived value. A space marketed with a drone walkthrough, branded pitch pack, and targeted outreach consistently leases faster and at better terms than one relying on basic listings." },
      { q: "Should I use drone footage for every listing?", a: "For retail, office, and larger industrial spaces, yes. Aerial context — parking, access, foot traffic — is exactly what tenants and buyers can't see in floor plan photos." },
      { q: "How do I generate commercial leads without cold calling?", a: "Market reports, open-house funnels, and QR signage capture inbound interest from owners and tenants. Lead magnets position you as the expert and bring the pipeline to you." },
      { q: "What's a digital pitch pack?", a: "A branded, interactive document — photos, floor plans, amenities, traffic data, and terms — that makes a space irresistible to a tenant before the first showing. It's the modern equivalent of the printed one-sheet." },
      { q: "Is commercial real estate marketing different from residential?", a: "The channels are similar but the buyers and stakes differ. Commercial deals are higher value and longer cycle, so the presentation and nurture system need to be more sophisticated and track more of the journey." },
    ],
  },
  "automation-metrics": {
    noun: "marketing automation system",
    keywords: ["marketing automation", "CRM", "Zapier", "call tracking", "dashboards", "analytics", "LTV"],
    benefits: [
      "Automation wires your tools together so leads, tasks, and reports move without manual work.",
      "A real-time dashboard replaces guesswork with a command center for every metric that matters.",
      "Call tracking attributes every phone lead to its source, so you stop guessing which channel works.",
      "LTV tracking justifies every marketing dollar with math instead of hope.",
    ],
    metrics: [
      { label: "Lead attribution", description: "Every lead and call traced to its source — the foundation of sane marketing decisions." },
      { label: "Response speed", description: "The minutes (or seconds) between a lead arriving and your team or automation responding." },
      { label: "Automation throughput", description: "Manual hours eliminated per week by wired workflows." },
      { label: "Customer lifetime value", description: "The number that tells you what you can actually afford to pay for a customer." },
    ],
    mistakes: [
      "Collecting data in five disconnected tools and never looking at it in one place.",
      "Automating the wrong things and making broken workflows faster.",
      "Tracking clicks but not phone calls, so offline revenue is invisible to the system.",
      "Buying a CRM and expecting it to manage itself — systems need configuration and maintenance.",
      "Measuring vanity metrics instead of the ones that predict revenue.",
    ],
    bestPractices: [
      "Build one source of truth: a dashboard that tracks calls, leads, reviews, and revenue together.",
      "Attribute every phone call to its source before you spend another ad dollar.",
      "Wire lead capture to trigger instant follow-up across email, SMS, and CRM tasks.",
      "Review metrics monthly with someone who can translate them into decisions.",
    ],
    faq: [
      { q: "Why does my marketing feel like guesswork?", a: "Because you're missing data, not results. Without call tracking and a unified dashboard, you can't see which channel produced which customer — and you can't scale what you can't measure." },
      { q: "What's the difference between a CRM and automation?", a: "A CRM stores and organizes relationships; automation makes them move — triggering emails, texts, and tasks when things happen. The best systems are a CRM plus automation wired together." },
      { q: "Is Zapier/Make.com worth it for a small business?", a: "Almost always. A few well-built automations — lead capture to follow-up, form to task, invoice to dashboard — can save hours a week and close the response-time gap that loses you customers." },
      { q: "How do I track phone calls to my ads?", a: "Call tracking replaces your ad phone numbers with trackable numbers that record and attribute every call to its source. It's the only way to see the full ROI of offline conversions." },
      { q: "What's customer lifetime value and why should I care?", a: "LTV is the total revenue a customer generates over their relationship with you. It tells you how much you can afford to pay to acquire one — the number every other marketing decision hangs on." },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Composition helpers                                                 */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const INTRO_OPENERS = [
  "Every dollar of marketing you run funnels into one question: does it get the phone to ring?",
  "The difference between a business that dominates its market and one that survives it is rarely budget — it's systems.",
  "Most local businesses don't have a marketing problem. They have a 'where does every lead come from' problem.",
  "There are two ways to market a local business: hope, or a system. Only one of them compounds.",
  "If you could only fix one thing in your marketing this year, it should be the thing that makes every other channel work harder.",
];

const ROI_STATS = [
  "76% of local searches that happen on mobile lead to a same-day call",
  "the top three local results capture the overwhelming majority of clicks in the map pack",
  "businesses that respond to leads within five minutes are dramatically more likely to convert them",
  "the companies that act on their marketing data compound results far faster than those that guess",
];

const DIY_VS_DFY = [
  "The DIY route is real — you can learn any of this and do it yourself. But the learning curve, the mistakes, and the months of lost momentum usually cost more than the service ever will. Done-for-you means the system is built, tested, and running while you focus on delivering the work that makes your business money.",
  "You can absolutely do this in-house. But 'doing' isn't the same as 'having it done right' — a specialist has run this playbook across dozens of markets and knows the pitfalls before you hit them. The fee buys speed, certainty, and your time back.",
  "There's a version of this you can run yourself, and for a small operation that can be the right call. Where done-for-you wins is velocity: the system gets built in days, not months, and it's engineered by someone who's already made the mistakes you'd be paying to learn.",
];

const CHECKLIST_LEAD = [
  "Use this as your scorecard before you invest another dollar in this area:",
  "Here's the short checklist that separates the businesses that win at this from the ones that don't:",
  "Run through this list and you'll know exactly where you stand:",
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function truncate(str: string, len: number): string {
  const s = str.trim().replace(/\s+/g, " ");
  if (s.length <= len) return s;
  const cut = s.slice(0, len - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function rotate<T>(arr: T[], seed: number): T[] {
  const i = Math.abs(seed) % arr.length;
  return [...arr.slice(i), ...arr.slice(0, i)];
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/* ------------------------------------------------------------------ */
/* Article builders                                                    */
/* ------------------------------------------------------------------ */

interface ServiceInput {
  id: number;
  title: string;
  oneTime: number;
  monthly: number;
  tags: string[];
  blurb: string;
  recommended?: string[];
  pillar: PillarId;
  pillarName: string;
  pillarNumber: number;
}

interface Article {
  slug: string;
  serviceId: number;
  pillar: PillarId;
  pillarName: string;
  pillarNumber: number;
  serviceTitle: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  readTime: number;
  published: string;
  updated: string;
  intro: string;
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
  faq: { q: string; a: string }[];
  ctaHeadline: string;
  ctaBody: string;
}

function buildArticle(svc: ServiceInput, pillarIdx: number): Article {
  const topic = TOPICS[svc.pillar];
  const serviceTitle = svc.title;
  const low = serviceTitle.toLowerCase();
  const seed = svc.id;
  const primaryKeyword = low;
  const verticals = (svc.recommended ?? []).map((v) => VERT_LABELS[v] ?? v);
  const verticalSentence =
    verticals.length > 0
      ? `This matters most for ${listify(verticals)}, but the system applies to any local business in the same position.`
      : `The system applies to any local business that wants to stop guessing and start compounding.`;

  const oneTimeLabel = svc.oneTime > 0 ? `$${svc.oneTime}` : "included";
  const monthlyLabel = svc.monthly > 0 ? `$${svc.monthly}/month` : "one-time only";
  const pricingLine =
    svc.monthly > 0
      ? `a ${oneTimeLabel} setup plus ${monthlyLabel} to keep the system running and optimized`
      : `a flat ${oneTimeLabel} — no ongoing retainer, ever`;

  const intro = [
    `${pick(INTRO_OPENERS, seed)} When it comes to ${primaryKeyword}, the businesses that win in their city have one thing in common: they run it as a system, not a side project. ${svc.blurb} That's exactly the gap this module closes.`,
    `Here's the uncomfortable truth about local marketing: your competitor is running ${pick(topic.keywords, seed + 1)} as an ongoing, measured program — and most of their advantage is just that. ${primaryKeyword} works the same way. You either build the system, or you pay for its absence in missed calls and lost rankings every single month. ${verticalSentence}`,
  ].join(" ");

  const sections: Article["sections"] = [];

  sections.push({
    heading: `What Is ${svc.title} (And Why Local Businesses Need It)`,
    paragraphs: [
      `At its core, ${primaryKeyword} is a ${topic.noun} designed to deliver one outcome: more qualified customers contacting your business. Concretely, it means ${svc.blurb.toLowerCase()} ${pick(topic.benefits, seed + 2)}`,
      `For a local business, this isn't a nice-to-have. ${pick(topic.benefits, seed + 3)} ${verticalSentence}`,
    ],
  });

  sections.push({
    heading: `How ${svc.title} Works: The 3-Step System`,
    paragraphs: [
      `We don't sell a deliverable — we install a system you can see, measure, and keep. Every ${primaryKeyword} engagement runs through the same three phases:`,
    ],
    bullets: [
      `Audit & baseline — We measure where you are today, so every improvement from here has a number attached to it.`,
      `Build & launch — ${titleCase(svc.title)} is configured, connected to your existing tools, and flipped live with tracking in place.`,
      `Optimize & report — We review ${pick(topic.metrics, seed + 4).label.toLowerCase()} monthly and compound what's working.`,
    ],
  });

  sections.push({
    heading: `What It Costs: ${oneTimeLabel} + ${monthlyLabel}`,
    paragraphs: [
      `Transparency is the point. ${svc.title} is ${pricingLine}. There's no surprise line item, no agency mystery retainer — you know exactly what the system costs and what it's supposed to produce.`,
      `The smart way to think about the price is against the cost of not having it. ${pick(ROI_STATS, seed + 5)} — and ${primaryKeyword} is the lever that captures that.`,
    ],
  });

  sections.push({
    heading: `How to Measure the ROI of ${svc.title}`,
    paragraphs: [
      `A marketing system without numbers is a hobby. Here are the metrics we track so you can see the return, not just feel it:`,
    ],
    bullets: topic.metrics.map(
      (m) => `${m.label}: ${m.description}`,
    ),
  });

  sections.push({
    heading: `${svc.title}: Best Practices`,
    paragraphs: [
      `After running ${primaryKeyword} across dozens of local markets, these are the practices that consistently separate winners from everyone else:`,
    ],
    bullets: topic.bestPractices,
  });

  sections.push({
    heading: `Common Mistakes That Kill ${svc.title} Results`,
    paragraphs: [
      `Most businesses don't fail because the tactic is wrong — they fail by making these mistakes, usually without realizing it:`,
    ],
    bullets: topic.mistakes,
  });

  sections.push({
    heading: `DIY vs. Done-For-You: Which Is Right for You?`,
    paragraphs: [
      pick(DIY_VS_DFY, seed + 6),
      `If you'd rather have the system built, running, and reported on — without adding another thing to your plate — that's exactly what the ${svc.title} module at Biz Reborn is for.`,
    ],
  });

  sections.push({
    heading: `The Local Business Action Checklist`,
    paragraphs: [pick(CHECKLIST_LEAD, seed + 7)],
    bullets: [
      `Know your baseline for ${pick(topic.metrics, seed + 8).label.toLowerCase()} before you change anything.`,
      `Have ${primaryKeyword} configured and connected to your tracking before you scale spend.`,
      `Set a monthly review cadence so the system gets optimized, not just installed.`,
      `Keep the rest of your marketing feeding the same measurement — one source of truth, not five.`,
    ],
  });

  const faq = topic.faq.map((f) => ({ ...f }));

  const title = `${svc.title}: The Complete Local Marketing Guide`;
  const metaTitle = truncate(`${svc.title} | Guide, Pricing & ROI`, 60);
  const metaDescription = truncate(
    `${svc.blurb} Learn how ${primaryKeyword} works for local businesses — pricing, ROI metrics, best practices, and an FAQ.`,
    158,
  );

  const allText = [intro, ...sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.bullets ?? [])])].join(" ");
  const readTime = Math.max(4, Math.round(wordCount(allText) / 200));

  const published = new Date(Date.UTC(2026, 0, 1, 12, 0, 0) - seed * 8.64e7).toISOString().slice(0, 10);

  return {
    slug: slugify(serviceTitle),
    serviceId: svc.id,
    pillar: svc.pillar,
    pillarName: svc.pillarName,
    pillarNumber: svc.pillarNumber,
    serviceTitle,
    title,
    metaTitle,
    metaDescription,
    keywords: [primaryKeyword, ...topic.keywords.slice(0, 6)],
    readTime,
    published,
    updated: published,
    intro,
    sections,
    faq,
    ctaHeadline: `Ready to make ${primaryKeyword} work for your business?`,
    ctaBody: `Pick the ${svc.title} module on the service menu and launch in one click — or run the free AI brand audit first to see exactly where you're leaking customers.`,
  };
}

function listify(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/* ------------------------------------------------------------------ */
/* Write output                                                        */
/* ------------------------------------------------------------------ */

const articles: Article[] = [];
for (const p of PILLARS) {
  for (const s of p.services) {
    articles.push(
      buildArticle(
        {
          ...s,
          pillar: p.id,
          pillarName: p.name,
          pillarNumber: p.number,
        },
        p.number,
      ),
    );
  }
}

const out = `/**
 * AUTO-GENERATED by scripts/generate-blog.ts — do not edit by hand.
 * 100 full-length SEO articles, one per service in the Biz Reborn service menu.
 */
import type { PillarId } from "@/lib/types";

export interface BlogSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface BlogArticle {
  slug: string;
  serviceId: number;
  pillar: PillarId;
  pillarName: string;
  pillarNumber: number;
  serviceTitle: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  readTime: number;
  published: string;
  updated: string;
  intro: string;
  sections: BlogSection[];
  faq: { q: string; a: string }[];
  ctaHeadline: string;
  ctaBody: string;
}

export const BLOG_ARTICLES: BlogArticle[] = ${JSON.stringify(articles, null, 2)};

export const BLOG_BY_SLUG: Record<string, BlogArticle> = Object.fromEntries(
  BLOG_ARTICLES.map((a) => [a.slug, a]),
);
`;

writeFileSync(join(process.cwd(), "src/data/blog.ts"), out, "utf8");
console.log(`Generated ${articles.length} articles -> src/data/blog.ts`);
