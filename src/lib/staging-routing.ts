/**
 * Staging routing override — sends all outreach to review queue instead of prospect.
 * Set STAGING_TO=meritmediamarketingfl@gmail.com in .env.local or environment.
 */
export const STAGING_RECIPIENT = process.env.STAGING_TO || "meritmediamarketingfl@gmail.com";
export const STAGING_MODE = !!process.env.STAGING_TO;
