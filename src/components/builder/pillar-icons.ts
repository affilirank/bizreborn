import {
  MapPin,
  Clapperboard,
  LayoutTemplate,
  Star,
  MessageSquareText,
  Target,
  Palette,
  GraduationCap,
  Building2,
  LineChart,
  Sparkles,
} from "lucide-react";
import type { ComponentType } from "react";

export const PILLAR_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "local-seo": MapPin,
  "short-form-video": Clapperboard,
  "websites-funnels": LayoutTemplate,
  "reputation-reviews": Star,
  "sms-retention": MessageSquareText,
  "paid-ads": Target,
  "social-branding": Palette,
  "digital-products": GraduationCap,
  "commercial-real-estate": Building2,
  "automation-metrics": LineChart,
};

export const FALLBACK_ICON = Sparkles;
