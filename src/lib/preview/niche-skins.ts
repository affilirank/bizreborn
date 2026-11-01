/**
 * 10-Niche Theme Registry — 30-Variation Matrix Engine
 * 3 Archetypes (DirectCall, PortfolioShowcase, LocalAuthority) × 10 Skins
 */

export interface NicheSkin {
  id: string;
  label: string;
  archetypes: string[]; // preferred archetypes for this niche
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    surface: string;
    text: string;
  };
  fonts: {
    display: string; // headline font family
    body: string;    // body font family
  };
  images: {
    hero: string;     // high-res background
    service1: string;
    service2: string;
    service3: string;
    service4: string;
    team: string;
  };
  copyHooks: {
    heroHeadline: string;
    heroSubline: string;
    ctaPrimary: string;
    ctaSecondary: string;
    badgeText: string;
  };
}

export const NICHE_SKINS: NicheSkin[] = [
  {
    id: "roofing",
    label: "Roofing & Exteriors",
    archetypes: ["DirectCall", "PortfolioShowcase"],
    colors: { primary: "#1a2332", secondary: "#d4913c", accent: "#e87b2b", bg: "#0d1117", surface: "#141d2b", text: "#f0ede8" },
    fonts: { display: "font-sans", body: "font-sans" },
    images: {
      hero: "https://images.unsplash.com/photo-1632823471565-1ec4a85a388e?q=80&w=2070&auto=format&fit=crop",
      service1: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=2070&auto=format&fit=crop",
      service2: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop",
      service3: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2070&auto=format&fit=crop",
      service4: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2070&auto=format&fit=crop",
      team: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=2070&auto=format&fit=crop",
    },
    copyHooks: {
      heroHeadline: "Roof Protection That Lasts. Same-Day Estimates.",
      heroSubline: "Licensed. Insured. 5-Star Rated Locally. Emergency Repair Available 24/7.",
      ctaPrimary: "Get Your Free Roof Inspection",
      ctaSecondary: "Call (555) 019-2387",
      badgeText: "Licensed & Insured · 24/7 Emergency",
    },
  },
  {
    id: "plumbing",
    label: "Plumbing & Drain",
    archetypes: ["DirectCall", "LocalAuthority"],
    colors: { primary: "#0a1128", secondary: "#00b4d8", accent: "#48cae4", bg: "#030a1c", surface: "#09143a", text: "#e6f4f1" },
    fonts: { display: "font-sans", body: "font-sans" },
    images: {
      hero: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop",
      service1: "https://images.unsplash.com/photo-1585704032916-1f44ad8f32a3?q=80&w=2070&auto=format&fit=crop",
      service2: "https://images.unsplash.com/photo-1585704032916-5b752fb0ba0a?q=80&w=2070&auto=format&fit=crop",
      service3: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2070&auto=format&fit=crop",
      service4: "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=2070&auto=format&fit=crop",
      team: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=2070&auto=format&fit=crop",
    },
    copyHooks: {
      heroHeadline: "Fast Plumbing. Clean Results. No Mess Left Behind.",
      heroSubline: "Licensed Master Plumbers. Same-Day Service. Upfront Pricing. No Hidden Fees.",
      ctaPrimary: "Book Your Service Call",
      ctaSecondary: "Request Same-Day Repair",
      badgeText: "Licensed Master Plumber · 24/7 Emergency Line",
    },
  },
  {
    id: "hvac",
    label: "HVAC & Climate",
    archetypes: ["LocalAuthority", "DirectCall"],
    colors: { primary: "#16213e", secondary: "#00d9ff", accent: "#ff6b35", bg: "#0b132b", surface: "#0f1b3a", text: "#f8f9fa" },
    fonts: { display: "font-sans", body: "font-sans" },
    images: {
      hero: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop",
      service1: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop",
      service2: "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=2070&auto=format&fit=crop",
      service3: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop",
      service4: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=2070&auto=format&fit=crop",
      team: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2070&auto=format&fit=crop",
    },
    copyHooks: {
      heroHeadline: "Comfort Engineered for Your Home. Climate Mastery.",
      heroSubline: "HVAC Installation, Repair & Energy Audits. Energy-Star Certified. 0% Financing.",
      ctaPrimary: "Schedule Free Energy Audit",
      ctaSecondary: "Call HVAC Specialist",
      badgeText: "Energy-Star Certified · 10-Year Warranty",
    },
  },
  {
    id: "landscaping",
    label: "Landscaping & Outdoor Living",
    archetypes: ["PortfolioShowcase", "LocalAuthority"],
    colors: { primary: "#1b3a1a", secondary: "#d4a843", accent: "#c48a3e", bg: "#0f1f0a", surface: "#1a2e18", text: "#f5efe6" },
    fonts: { display: "font-serif", body: "font-sans" },
    images: {
      hero: "https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=2070&auto=format&fit=crop",
      service1: "https://images.unsplash.com/photo-1598902108854-10e335adac99?q=80&w=2070&auto=format&fit=crop",
      service2: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?q=80&w=2070&auto=format&fit=crop",
      service3: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop",
      service4: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2070&auto=format&fit=crop",
      team: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=2070&auto=format&fit=crop",
    },
    copyHooks: {
      heroHeadline: "Outdoor Living, Perfected. Design That Grows With You.",
      heroSubline: "Luxury Landscaping, Hardscaping, Irrigation & Outdoor Lighting. Custom Design Consultations.",
      ctaPrimary: "Book Design Consultation",
      ctaSecondary: "View Our Portfolio",
      badgeText: "Licensed Landscape Architect · Award-Winning Design",
    },
  },
  {
    id: "barber",
    label: "Barbershop & Grooming",
    archetypes: ["PortfolioShowcase", "DirectCall"],
    colors: { primary: "#121212", secondary: "#bfa15f", accent: "#8a7350", bg: "#0a0a0a", surface: "#161616", text: "#f0e6d2" },
    fonts: { display: "font-serif", body: "font-sans" },
    images: {
      hero: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop",
      service1: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2070&auto=format&fit=crop",
      service2: "https://images.unsplash.com/photo-1622286342621-806ebf16edc3?q=80&w=2070&auto=format&fit=crop",
      service3: "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?q=80&w=2070&auto=format&fit=crop",
      service4: "https://images.unsplash.com/photo-1517164850305-99a3e65bb47e?q=80&w=2070&auto=format&fit=crop",
      team: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=2070&auto=format&fit=crop",
    },
    copyHooks: {
      heroHeadline: "Precision Cuts. Classic Craft. Modern Grooming.",
      heroSubline: "Premium Haircuts, Beard Design, Hot Towel Shaves, & Scalp Treatments. Walk-Ins Welcome.",
      ctaPrimary: "Book Your Appointment",
      ctaSecondary: "Call Now for Walk-In",
      badgeText: "Master Barber Certified · 5-Star Grooming",
    },
  },
  {
    id: "electrical",
    label: "Electrical & Solar",
    archetypes: ["DirectCall", "LocalAuthority"],
    colors: { primary: "#0f1525", secondary: "#0055ff", accent: "#f0c000", bg: "#070e1c", surface: "#101b3a", text: "#e8edf5" },
    fonts: { display: "font-sans", body: "font-sans" },
    images: {
      hero: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=2070&auto=format&fit=crop",
      service1: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2070&auto=format&fit=crop",
      service2: "https://images.unsplash.com/photo-1518770660439-4636500cff5f?q=80&w=2070&auto=format&fit=crop",
      service3: "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=2070&auto=format&fit=crop",
      service4: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2070&auto=format&fit=crop",
      team: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=2070&auto=format&fit=crop",
    },
    copyHooks: {
      heroHeadline: "Power, Engineered. Solar & Electrical Excellence.",
      heroSubline: "Licensed Electricians. Solar Design & Installation. Smart Home Integration. Safety Inspections.",
      ctaPrimary: "Get Free Solar Assessment",
      ctaSecondary: "Emergency Electrical Repair",
      badgeText: "Licensed Electrician · Solar Certified",
    },
  },
  {
    id: "pest",
    label: "Pest & Wildlife Control",
    archetypes: ["DirectCall", "LocalAuthority"],
    colors: { primary: "#1a2e1a", secondary: "#2a9d8f", accent: "#ffffff", bg: "#0d1a0d", surface: "#152a15", text: "#f0f5ee" },
    fonts: { display: "font-sans", body: "font-sans" },
    images: {
      hero: "https://images.unsplash.com/photo-1473448912268-202ac3e0f268?q=80&w=2070&auto=format&fit=crop",
      service1: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2070&auto=format&fit=crop",
      service2: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2070&auto=format&fit=crop",
      service3: "https://images.unsplash.com/photo-1473448912268-202ac3e0f268?q=80&w=2070&auto=format&fit=crop",
      service4: "https://images.unsplash.com/photo-1501854140884-074bf6edc0a9?q=80&w=2070&auto=format&fit=crop",
      team: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=2070&auto=format&fit=crop",
    },
    copyHooks: {
      heroHeadline: "Protect Your Space. Eliminate Pests Permanently.",
      heroSubline: "Eco-Friendly Pest Control. Wildlife Exclusion. Termite Protection. Family-Safe Treatments.",
      ctaPrimary: "Schedule Free Inspection",
      ctaSecondary: "Call Pest Specialist",
      badgeText: "Eco-Friendly Certified · Family Safe",
    },
  },
  {
    id: "auto",
    label: "Auto Detailing & Ceramic",
    archetypes: ["PortfolioShowcase", "DirectCall"],
    colors: { primary: "#151515", secondary: "#cc1a14", accent: "#b8b8c8", bg: "#060606", surface: "#111111", text: "#f2f2f2" },
    fonts: { display: "font-sans", body: "font-sans" },
    images: {
      hero: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2070&auto=format&fit=crop",
      service1: "https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=2070&auto=format&fit=crop",
      service2: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=2070&auto=format&fit=crop",
      service3: "https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=2070&auto=format&fit=crop",
      service4: "https://images.unsplash.com/photo-1494976387174-0c41dc71598f?q=80&w=2070&auto=format&fit=crop",
      team: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=2070&auto=format&fit=crop",
    },
    copyHooks: {
      heroHeadline: "Showroom Finish. Ceramic Protection That Lasts.",
      heroSubline: "Auto Detailing, Ceramic Coating, Paint Correction, Interior Restoration. Mirror-Gloss Results.",
      ctaPrimary: "Book Ceramic Package",
      ctaSecondary: "View Our Work",
      badgeText: "Certified Ceramic Installer · 10-Year Guarantee",
    },
  },
  {
    id: "realestate",
    label: "Real Estate & Development",
    archetypes: ["PortfolioShowcase", "LocalAuthority"],
    colors: { primary: "#2c1810", secondary: "#c5a07a", accent: "#e8cda9", bg: "#1a0f08", surface: "#2a1c15", text: "#f8f4e8" },
    fonts: { display: "font-serif", body: "font-sans" },
    images: {
      hero: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop",
      service1: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
      service2: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=2070&auto=format&fit=crop",
      service3: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=2070&auto=format&fit=crop",
      service4: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=2070&auto=format&fit=crop",
      team: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=2070&auto=format&fit=crop",
    },
    copyHooks: {
      heroHeadline: "Homes Designed to Inspire. Properties That Sell.",
      heroSubline: "Luxury Real Estate Marketing, Property Photography, Development Branding, Open House Design.",
      ctaPrimary: "Request Property Consultation",
      ctaSecondary: "View Featured Listings",
      badgeText: "Top 1% Local Agent · Luxury Specialist",
    },
  },
  {
    id: "contractor",
    label: "General Contracting & Remodeling",
    archetypes: ["DirectCall", "LocalAuthority", "PortfolioShowcase"],
    colors: { primary: "#2e2e2c", secondary: "#c4a47c", accent: "#bfa06f", bg: "#181816", surface: "#252521", text: "#f2efe9" },
    fonts: { display: "font-sans", body: "font-sans" },
    images: {
      hero: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?q=80&w=2070&auto=format&fit=crop",
      service1: "https://images.unsplash.com/photo-1600566753190-3ce82b0e9d85?q=80&w=2070&auto=format&fit=crop",
      service2: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
      service3: "https://images.unsplash.com/photo-1600210491369-e753d80a41f3?q=80&w=2070&auto=format&fit=crop",
      service4: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop",
      team: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=2070&auto=format&fit=crop",
    },
    copyHooks: {
      heroHeadline: "Build Better. Remodel Smarter. Design for Life.",
      heroSubline: "Custom Home Building, Kitchen & Bath Remodels, Additions & Renovations. Licensed General Contractor.",
      ctaPrimary: "Get Free Design Consultation",
      ctaSecondary: "View Project Gallery",
      badgeText: "Licensed GC · BBB A+ Rated",
    },
  },
];

export const ARCHETYPES = [
  {
    id: "DirectCall",
    label: "Direct Response Lead-Gen",
    description: "Split hero with quote form + sticky call bar",
  },
  {
    id: "PortfolioShowcase",
    label: "Visual Portfolio / Before-After",
    description: "Full-bleed cinematic hero + gallery",
  },
  {
    id: "LocalAuthority",
    label: "Clean Local Authority / Process",
    description: "Center-aligned hero + 3-step process + FAQ",
  },
];
