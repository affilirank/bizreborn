export type VerticalId =
  | "barbershop"
  | "realestate"
  | "contractor"
  | "restaurant"
  | "ecommerce"
  | "professional"
  | "fitness"
  | "dental"
  | "automotive"
  | "law"
  | "education"
  | "creator";

export type PillarId =
  | "local-seo"
  | "short-form-video"
  | "websites-funnels"
  | "reputation-reviews"
  | "sms-retention"
  | "paid-ads"
  | "social-branding"
  | "digital-products"
  | "commercial-real-estate"
  | "automation-metrics";

export interface ServiceItem {
  id: number;
  pillar: PillarId;
  title: string;
  oneTime: number;
  monthly: number;
  tags: string[];
  recommended?: VerticalId[];
  popular?: boolean;
  blurb: string;
}

export type ServiceSeed = Omit<ServiceItem, "pillar">;

export interface Pillar {
  id: PillarId;
  number: number;
  name: string;
  tagline: string;
  icon: string;
  accent: string;
  services: ServiceSeed[];
}

export interface BusinessVertical {
  id: VerticalId;
  label: string;
  emoji: string;
  blurb: string;
  recommended: PillarId[];
}

export type AuditBreakdownKey =
  | "localSeo"
  | "socialVelocity"
  | "conversion"
  | "reputation";

export interface AuditBreakdown {
  key: AuditBreakdownKey;
  label: string;
  score: number;
  description: string;
  issues: string[];
}

export interface AuditReport {
  id: string;
  createdAt: string;
  url: string;
  businessName: string;
  gbp?: string;
  socials: { instagram?: string; facebook?: string; tiktok?: string };
  healthScore: number;
  grade: string;
  breakdowns: AuditBreakdown[];
  painPoints: string[];
  fixes: string[];
  comparedTo: { label: string; count: number }[];
  keywordSearches: { term: string; volume: number; difficulty: number }[];
  contact?: { name?: string; phone?: string; email?: string };
  formData?: Record<string, unknown>;
}

export interface CartSelection {
  serviceId: number;
}

export interface SelectedService extends ServiceItem {
  quantity: number;
}

export interface CheckoutLine {
  name: string;
  amount: number;
  qty: number;
}

export interface CheckoutPayload {
  businessName: string;
  email: string;
  phone?: string;
  vertical: VerticalId;
  services: number[];
  monthly?: boolean;
  acv: number;
  leadIncrease: number;
}

export interface FulfillmentItem {
  serviceId: number;
  title: string;
  status: "queued" | "in_progress" | "review" | "completed";
  progress: number;
}

export interface ClientOrder {
  id: string;
  createdAt: string;
  businessName: string;
  email: string;
  vertical: VerticalId;
  services: ServiceItem[];
  counts: { services: number; oneTime: number; monthly: number };
  projection: {
    leadIncreasePct: number;
    leadsPerMonth: number;
    acv: number;
    projectedMonthly: number;
    roas: number;
  };
  status: "active" | "cancelled" | "paused";
  fulfillment: FulfillmentItem[];
}

export type SubscriptionTier = "solo" | "growth" | "dominance";

export interface Lead {
  id: string;
  createdAt: string;
  name: string;
  businessName: string;
  phone: string;
  email: string;
  source: "audit" | "contact" | "chat";
  message?: string;
  vertical?: string;
}

export interface CartTotals {
  oneTime: number;
  monthly: number;
  estimatedLeads: number;
  projectedRevenue: number;
  roas: number;
}

export interface Offer {
  id: string;
  token: string;
  clientName: string;
  clientEmail: string;
  services: number[];
  serviceTitles: string[];
  listPrice: number;
  offerPrice: number;
  discountPct: number;
  status: "draft" | "sent" | "paid" | "declined";
  stripePaymentLink: string | null;
  notes: string;
  /** Pitch video (mp4) or a /pitch/[slug] page URL embedded in the proposal. */
  videoUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface ReportMetric {
  label: string;
  value: string;
}

export interface MonthlyReport {
  id: string;
  token: string;
  clientName: string;
  clientEmail: string;
  month: string;
  headline: string;
  highlights: string[];
  metrics: ReportMetric[];
  deliverables: string[];
  nextSteps: string[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

export interface WorkLog {
  id: string;
  taskId: string | null;
  clientName: string;
  service: string;
  workDate: string;
  hours: number;
  notes: string;
  createdAt: string;
}
