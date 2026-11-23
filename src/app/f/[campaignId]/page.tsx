import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FunnelBridge } from "@/components/funnel-bridge";
import {
  AGENCY_URL,
  BRAND_NAME,
  GROWTH_BUNDLE_DESCRIPTION,
  GROWTH_BUNDLE_TITLE,
  isFunnelId,
} from "@/lib/funnel-bridge";

type PageProps = { params: Promise<{ campaignId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { campaignId } = await params;
  const canonicalPath = `/f/${campaignId}`;
  return {
    metadataBase: new URL(AGENCY_URL),
    title: { absolute: GROWTH_BUNDLE_TITLE },
    description: GROWTH_BUNDLE_DESCRIPTION,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: GROWTH_BUNDLE_TITLE,
      description: GROWTH_BUNDLE_DESCRIPTION,
      url: canonicalPath,
      siteName: BRAND_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: GROWTH_BUNDLE_TITLE,
      description: GROWTH_BUNDLE_DESCRIPTION,
    },
  };
}

export default async function FunnelPage({ params }: PageProps) {
  const { campaignId } = await params;
  if (!isFunnelId(campaignId)) notFound();
  return <FunnelBridge campaignId={campaignId} canonicalPath={`/f/${campaignId}`} />;
}
