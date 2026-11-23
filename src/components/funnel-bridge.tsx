import {
  AGENCY_URL,
  AUTHOR_NAME,
  BRAND_EMAIL,
  BRAND_NAME,
  BRAND_PHONE,
  GROWTH_BUNDLE_DESCRIPTION,
  GROWTH_BUNDLE_TITLE,
  PRINT_URL,
  funnelEmbedUrl,
} from "@/lib/funnel-bridge";

interface FunnelBridgeProps {
  campaignId: string;
  canonicalPath: string;
}

export function FunnelBridge({ campaignId, canonicalPath }: FunnelBridgeProps) {
  const canonical = `${AGENCY_URL}${canonicalPath}`;
  const embedUrl = funnelEmbedUrl(campaignId);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: BRAND_NAME,
    url: canonical,
    telephone: "+1-772-290-1756",
    email: BRAND_EMAIL,
    description: GROWTH_BUNDLE_DESCRIPTION,
    author: { "@type": "Person", name: AUTHOR_NAME },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Vero Beach, Florida" },
      { "@type": "AdministrativeArea", name: "Treasure Coast, Florida" },
      { "@type": "Country", name: "United States" },
    ],
    offers: {
      "@type": "Offer",
      name: "Google Reputation & Growth Bundle",
      price: "397",
      priceCurrency: "USD",
      description:
        "$497 one-time setup plus $397/month for local reputation, follow-up and growth reporting.",
    },
  };

  return (
    <div className="min-h-screen bg-ink-950 text-mist">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-white/10 bg-ink-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href={AGENCY_URL} className="font-display text-xl font-semibold tracking-tight text-mist">
              {BRAND_NAME}
            </a>
            <p className="text-sm text-fog">
              Local growth systems for contractors — built by {AUTHOR_NAME}.
            </p>
          </div>
          <div className="flex flex-col gap-1 text-sm sm:items-end">
            <a href="tel:+17722901756" className="font-semibold text-brand-300">
              {BRAND_PHONE}
            </a>
            <a href={`mailto:${BRAND_EMAIL}`} className="text-fog underline">
              {BRAND_EMAIL}
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-5 rounded-xl border border-brand-500/40 bg-ink-900 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            Growth Bundle — $497 setup + $397/mo
          </p>
          <h1 className="font-display mt-1 text-2xl font-semibold text-mist sm:text-3xl">
            {GROWTH_BUNDLE_TITLE}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-fog">
            Complete the interactive audit below. It only takes 20 seconds. Need help? Call{" "}
            <a href="tel:+17722901756" className="font-semibold text-brand-300 underline">
              {BRAND_PHONE}
            </a>{" "}
            or email{" "}
            <a href={`mailto:${BRAND_EMAIL}`} className="underline">
              {BRAND_EMAIL}
            </a>
            .
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl">
          <iframe
            src={embedUrl}
            title={GROWTH_BUNDLE_TITLE}
            className="h-[1100px] w-full border-0"
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        <footer className="mt-6 flex flex-col gap-2 text-xs text-fog sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {BRAND_NAME}. Authored by {AUTHOR_NAME}.
          </span>
          <span>
            Offline branding by{" "}
            <a href={PRINT_URL} className="text-brand-300 underline">
              Merit Print
            </a>{" "}
            — yard signs, vehicle magnets and DTF crew shirts.
          </span>
        </footer>
      </div>
    </div>
  );
}
