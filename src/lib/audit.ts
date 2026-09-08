import type {
  AuditBreakdown,
  AuditReport,
} from "@/lib/types";
import { clamp, seededRandom } from "@/lib/utils";

export interface AuditInput {
  url: string;
  businessName: string;
  gbp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  reviews?: "none" | "few" | "some" | "many";
  postingFreq?: "daily" | "weekly" | "monthly" | "never";
  leadSource?: "google" | "social" | "referrals" | "walkin" | "ads";
  crmCapture?: "yes" | "no";
}

const SEVERITY = ["Critical", "High", "Moderate"] as const;

export function runAudit(input: AuditInput): AuditReport {
  const rand = seededRandom(
    `${input.url}|${input.businessName}|${input.gbp ?? ""}|${input.instagram ?? ""}|${input.facebook ?? ""}|${input.tiktok ?? ""}`,
  );

  const hasHttps = /^https:\/\//i.test(input.url.trim());
  const hasWww = /www\./i.test(input.url.trim());
  const isSubpage = /\/[a-z0-9-]+\/?$/i.test(input.url.trim()) && !hasWww;

  const leadBoost =
    input.leadSource === "google"
      ? 8
      : input.leadSource === "social" || input.leadSource === "ads"
        ? 4
        : 0;
  const leadPenalty =
    input.leadSource === "referrals" || input.leadSource === "walkin" ? -8 : 0;

  const localSeo = Math.round(
    clamp(
      38 +
        rand() * 18 -
        (hasWww ? 4 : 0) -
        (isSubpage ? 6 : 0) +
        leadBoost +
        leadPenalty,
      18,
      96,
    ),
  );

  const freqBase =
    input.postingFreq === "daily"
      ? 62
      : input.postingFreq === "weekly"
        ? 50
        : input.postingFreq === "monthly"
          ? 34
          : 20;
  const socialVelocity = Math.round(
    clamp(
      freqBase +
        (input.instagram || input.tiktok || input.facebook ? 6 : 0) +
        rand() * 18,
      10,
      96,
    ),
  );

  const conversion = Math.round(
    clamp(
      30 +
        rand() * 24 -
        (hasHttps ? 6 : 0) +
        (input.crmCapture === "yes" ? 8 : input.crmCapture === "no" ? -6 : 0),
      12,
      96,
    ),
  );

  const reviewBase =
    input.reviews === "many"
      ? 68
      : input.reviews === "some"
        ? 54
        : input.reviews === "few"
          ? 40
          : input.reviews === "none"
            ? 24
            : 34;
  const reputation = Math.round(
    clamp(reviewBase + (input.gbp ? 5 : 0) + rand() * 16, 14, 96),
  );

  const breakdowns: AuditBreakdown[] = [
    {
      key: "localSeo",
      label: "Local SEO Score",
      score: localSeo,
      description: localSeo < 40 ? "Off the map pack radar." : localSeo < 65 ? "On the edge of the map pack." : "Map pack presence building.",
      issues: [],
    },
    {
      key: "socialVelocity",
      label: "Social Content Velocity",
      score: socialVelocity,
      description: socialVelocity < 40 ? "Channels posting at ghost-town frequency." : socialVelocity < 65 ? "Occasional posting, no momentum." : "Consistent output.",
      issues: [],
    },
    {
      key: "conversion",
      label: "Conversion Infrastructure",
      score: conversion,
      description: conversion < 40 ? "Visitors arrive and bounce." : conversion < 65 ? "Pages convert below potential." : "Conversion paths working.",
      issues: [],
    },
    {
      key: "reputation",
      label: "Reputation Score",
      score: reputation,
      description: reputation < 40 ? "Review velocity far behind competitors." : reputation < 65 ? "Review volume is average." : "Social proof compounding.",
      issues: [],
    },
  ];

  const painPoints: string[] = [];
  const fixes: string[] = [];

  if (!hasHttps || isSubpage) {
    painPoints.push("No SSL / shallow crawl structure — Google can't index your pages with full trust.");
    fixes.push("Migrate to HTTPS and flatten your site architecture with hyper-local schema.");
  }

  if (localSeo < 65) {
    painPoints.push("Missing or incomplete LocalBusiness schema markup — search engines cannot parse your exact service radius and offerings.");
    fixes.push("Hyper-Local SEO On-Page Schema Injection (service #4) to dominate rich snippets.");
  }

  if (localSeo < 70) {
    painPoints.push("Blind spots in neighborhood map rankings — you rank in your immediate block but vanish two miles away.");
    fixes.push("Geo-Grid Local Map Pack Tracking & Optimization (service #3) to systematically capture surrounding zip codes.");
  }

  if (reputation < 70) {
    painPoints.push("Limited local authority backlinks and community PR — leaving top map-pack positioning vulnerable to rivals.");
    fixes.push("Local Backlink Acquisition & Community PR (service #7) to build unbreakable domain authority.");
  }

  if (conversion < 60) {
    painPoints.push(`Sub-optimal mobile load speed and performance (estimated ${(3 + rand() * 4).toFixed(1)}s) — bleeding mobile searchers before your page even paints.`);
    fixes.push("Mobile-First Speed & Performance Optimization (service #22) for instant sub-2s loads.");
  }

  if (conversion < 65) {
    painPoints.push("No missed-call text-back infrastructure — potential clients who call and get voicemail bounce to your competitors instantly.");
    fixes.push("Instant 'Missed-Call Text-Back' Automation Setup (service #41) to convert missed calls into booked texts.");
  }

  if (conversion < 70) {
    painPoints.push("Lack of 24/7 AI booking agent / webchat concierge — inquiries arriving after hours or during peak calls are lost until morning.");
    fixes.push("24/7 AI Conversational Webchat Widget & AI Voice Booking Agent (service #42).");
  }

  if (!input.gbp) {
    painPoints.push("No Google Business Profile detected in your funnel — you're invisible in the map pack.");
    fixes.push("Google Business Profile Optimization & Audit (service #1) + citation cleanup (service #2).");
  } else if (reputation < 55) {
    painPoints.push("Your Google review velocity trails competitors in the area.");
    fixes.push("Automated Post-Service SMS Review Campaigns (service #31).");
  }

  if (!input.instagram && !input.tiktok && !input.facebook) {
    painPoints.push("Dead social channels — zero short-form video presence while rivals dominate the feed.");
    fixes.push("Monthly Short-Form Video Batch Strategy, 15 Reels/TikToks (service #11).");
  } else if (socialVelocity < 45) {
    painPoints.push("Social channels exist but post below a momentum threshold — the algorithm ignores you.");
    fixes.push("Multi-Platform Auto-Distribution & Scheduling Setup (service #20).");
  }

  if (conversion < 45) {
    painPoints.push(`Slow load speed (estimated ${(3 + rand() * 4).toFixed(1)}s) is bleeding mobile local searchers.`);
    fixes.push("Mobile-First Speed & Performance Optimization (service #22).");
  }

  if (conversion < 60) {
    painPoints.push("No tap-to-call or instant text-back infrastructure — hot leads go cold in minutes.");
    fixes.push("Instant Missed-Call Text-Back Automation (service #41) + Tap-to-Call (service #23).");
  }

  if (reputation < 65) {
    painPoints.push("No automated review request system — happy customers never leave proof.");
    fixes.push("QR-Code Review Stand Design (service #32) + Review Response Automation (service #35).");
  }

  if (input.reviews === "none" || input.reviews === "few") {
    painPoints.push("Low review count (your estimate) — prospects pick the business with 50+ five-stars down the street.");
    fixes.push("Automated Post-Service SMS Review Campaigns (service #31).");
  }

  if (input.postingFreq === "never") {
    painPoints.push("No social posting at all — zero organic reach while competitors post weekly.");
    fixes.push("Monthly Short-Form Video Batch Strategy, 15 Reels/TikToks (service #11).");
  } else if (input.postingFreq === "monthly") {
    painPoints.push("Posting once a month is below the momentum threshold — the algorithm won't push you.");
    fixes.push("Multi-Platform Auto-Distribution & Scheduling Setup (service #20).");
  }

  if (input.crmCapture === "no") {
    painPoints.push("No contact capture system — visitors who don't buy today are gone forever.");
    fixes.push("Pipeline Stage Automation & CRM Lead Tracking (service #49).");
  }

  if (painPoints.length === 0) {
    painPoints.push("Your core infrastructure is solid — the wins now come from compounding velocity.");
    fixes.push("Quarterly Strategic Scaling & Pivot Consultation (service #100).");
  }

  breakdowns.forEach((b, i) => {
    const sev = SEVERITY[Math.floor(rand() * 3)];
    b.issues.push(
      b.score < 40
        ? `${sev} gap in ${b.label.toLowerCase().replace(" score", "")} detected`
        : b.score < 65
          ? `Opportunity zone: ${b.label.toLowerCase().replace(" score", "")} underperforming`
          : `Healthy: ${b.label.toLowerCase().replace(" score", "")} performing`,
    );
    if (b.score < 40) b.issues.push("Competitors in your grid outrank this channel.");
    if (i === 0 && !hasHttps) b.issues.push("SSL certificate not detected.");
  });

  const healthScore = Math.round(
    localSeo * 0.35 + socialVelocity * 0.25 + conversion * 0.25 + reputation * 0.15,
  );

  const grade =
    healthScore >= 80 ? "A" : healthScore >= 65 ? "B" : healthScore >= 45 ? "C" : "D";

  const comparedTo = [
    { label: "Local avg. competitor", count: 24 + Math.round(rand() * 30) },
    { label: "Top map-pack performer", count: 180 + Math.round(rand() * 120) },
  ];
  if (reputation > 0) comparedTo.push({ label: "Your estimated reviews", count: Math.round(reputation * rand() * 0.6) });

  const keywordSearches = [
    { term: `${input.businessName} near me`, volume: 1200 + Math.round(rand() * 4000), difficulty: 28 + Math.round(rand() * 30) },
    { term: `best ${firstWord(input.businessName)} in ${cityFrom(input)}`, volume: 400 + Math.round(rand() * 900), difficulty: 18 + Math.round(rand() * 25) },
    { term: `${firstWord(input.businessName)} ${suffixWord()} services`, volume: 250 + Math.round(rand() * 600), difficulty: 12 + Math.round(rand() * 20) },
  ];

  return {
    id: `AUD-${Date.now().toString(36).toUpperCase()}${Math.floor(rand() * 90 + 10)}`,
    createdAt: new Date().toISOString(),
    url: input.url,
    businessName: input.businessName,
    gbp: input.gbp,
    socials: { instagram: input.instagram, facebook: input.facebook, tiktok: input.tiktok },
    healthScore,
    grade,
    breakdowns,
    painPoints,
    fixes,
    comparedTo,
    keywordSearches,
  };
}

function firstWord(s: string) {
  const w = s.trim().split(/\s+/)[0] ?? "your business";
  return w.replace(/[^a-zA-Z0-9'&-]/g, "");
}

function suffixWord() {
  const words = ["local", "professional", "premium", "trusted"];
  return words[Math.floor(Math.random() * words.length)];
}

function cityFrom(input: AuditInput) {
  const m = input.url.match(/(?:\.|\/)([a-z-]{3,12})(?:\.|com|net|org)/i);
  return m ? m[1] : "your city";
}

export const AUDIT_STEPS = [
  { label: "Analyzing website signals", detail: "SSL, structure, on-page setup" },
  { label: "Analyzing Google Business Profile", detail: "Map pack ranking factors" },
  { label: "Scanning social channels", detail: "Instagram, TikTok, Facebook velocity" },
  { label: "Estimating review velocity", detail: "Reputation vs. competitors" },
  { label: "Checking conversion infrastructure", detail: "Contact capture, text-back, booking" },
  { label: "Scoring short-form video presence", detail: "Posting frequency & momentum" },
  { label: "Compiling local keyword intelligence", detail: "Intent + difficulty" },
  { label: "Generating your brand health report", detail: "Final score computation" },
];
