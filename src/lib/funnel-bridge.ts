/** Shared constants for the agency-domain Growth Bundle funnel bridge. */

export const AGENCY_URL = "https://meritmarketingfl.com";
export const BRAND_NAME = "Merit Media & Marketing";
export const BRAND_PHONE = "(772) 290-1756";
export const BRAND_EMAIL = "contact@meritmediafl.com";
export const AUTHOR_NAME = "Daniel Brown";
export const PRINT_URL = "https://meritprintfl.com";

export const GROWTH_BUNDLE_FUNNEL_ID = "45ef0ad6-bc41-4454-9cce-740261ade1e6";
export const GROWTH_BUNDLE_TITLE =
  "Google Reputation & Growth Bundle | Merit Media & Marketing";
export const GROWTH_BUNDLE_DESCRIPTION =
  "$497 setup + $397/month Google Reputation & Growth Bundle for roofing, HVAC and home-service contractors. Free 20-second local growth audit by Daniel Brown. Call (772) 290-1756.";

export function isFunnelId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function funnelEmbedUrl(campaignId: string): string {
  return `https://app.meritmediafl.com/f/${campaignId}`;
}
