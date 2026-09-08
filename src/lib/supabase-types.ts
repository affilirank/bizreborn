export interface Audit {
  id: string;
  user_id: string | null;
  url: string;
  business_name: string | null;
  gbp: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  health_score: number | null;
  grade: string | null;
  breakdowns: Record<string, any> | null;
  pain_points: string[] | null;
  fixes: string[] | null;
  compared_to: string[] | null;
  keyword_searches: string[] | null;
  created_at: string;
  contact: string | null;
  form_data: Record<string, any> | null;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  intro: string | null;
  sections: Record<string, any> | null;
  faq: Record<string, any> | null;
  cta_headline: string | null;
  cta_body: string | null;
  read_time: string | null;
  pillar: string | null;
  pillar_number: number | null;
  service_id: string | null;
  service_title: string | null;
  status: string | null;
  published: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  price: number;
  tier: string | null;
  features: string[] | null;
  active: boolean | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  offer_id: string;
  amount: number;
  status: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  title: string | null;
  data: Record<string, any> | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  status: string | null;
  due_date: string | null;
  created_at: string;
}

export interface WorkLog {
  id: string;
  task_id: string;
  user_id: string;
  hours: number;
  description: string | null;
  date: string;
  created_at: string;
}

export interface Asset {
  id: string;
  name: string;
  url: string;
  type: string | null;
  created_at: string;
}

export type ProspectStatus =
  | "saved"
  | "pending"
  | "scraping"
  | "rendering"
  | "ready"
  | "failed";

/** Brand audit snapshot stored on a prospect (website + socials + reputation). */
export interface ProspectAudit {
  health_score: number;
  grade: string;
  breakdowns: { key: string; label: string; score: number; issues: string[] }[];
  pain_points: string[];
  fixes: string[];
}

/** Projected return if the prospect buys the recommended services. */
export interface RoiProjection {
  acv: number;
  leads_per_month: number;
  projected_monthly: number;
  lost_monthly: number;
  investment_one_time: number;
  investment_monthly: number;
  roas: number;
  payback_months: number;
}

export interface Prospect {
  id: string;
  business_name: string;
  city: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  audit_report: ProspectAudit | null;
  roi_projection: RoiProjection | null;
  recommended_services: number[] | null;
  google_rating: number | null;
  review_count: number | null;
  unanswered_reviews: number | null;
  competitor_name: string | null;
  competitor_reviews: number | null;
  audit_screenshot_url: string | null;
  website_preview_url: string | null;
  voiceover_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  pitch_script: string | null;
  slug: string | null;
  status: ProspectStatus | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}
