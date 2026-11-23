import type { Metadata } from "next";
import { FunnelBridge } from "@/components/funnel-bridge";
import {
  AGENCY_URL,
  BRAND_NAME,
  GROWTH_BUNDLE_DESCRIPTION,
  GROWTH_BUNDLE_FUNNEL_ID,
  GROWTH_BUNDLE_TITLE,
} from "@/lib/funnel-bridge";

const CANONICAL_PATH = "/swipe-file";

export const metadata: Metadata = {
  metadataBase: new URL(AGENCY_URL),
  title: { absolute: GROWTH_BUNDLE_TITLE },
  description: GROWTH_BUNDLE_DESCRIPTION,
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: GROWTH_BUNDLE_TITLE,
    description: GROWTH_BUNDLE_DESCRIPTION,
    url: CANONICAL_PATH,
    siteName: BRAND_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: GROWTH_BUNDLE_TITLE,
    description: GROWTH_BUNDLE_DESCRIPTION,
  },
};

export default function SwipeFilePage() {
  return <FunnelBridge campaignId={GROWTH_BUNDLE_FUNNEL_ID} canonicalPath={CANONICAL_PATH} />;
}
