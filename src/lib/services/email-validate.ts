const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Returns a real, clickable Google Maps search URL for a business. This is
 * always safe to store on a prospect (it does NOT assert the business exists),
 * and lets the operator verify the listing directly instead of trusting an
 * AI-fabricated website/email.
 */
export function mapsSearchUrl(businessName: string, city?: string | null): string {
  const query = [businessName, city].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Trims/lowercases an email and returns it only if it has a real structure. */
export function normalizeEmail(value: unknown): string | null {
  if (value == null) return null;
  const email = String(value).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

let dnsModule: typeof import("node:dns") | null | undefined;

function getDns() {
  if (dnsModule === undefined) {
    try {
      // node:dns is only available on the Node runtime; on an edge runtime we
      // deliberately stay permissive rather than break every send.
      dnsModule = require("node:dns");
    } catch {
      dnsModule = null;
    }
  }
  return dnsModule;
}

/**
 * Checks whether a domain has at least one MX record, meaning it can actually
 * receive mail. Domains with no MX (parked, invented, dead) must never be used
 * as recipients. Falls back permissive on runtimes without DNS access.
 */
export async function domainHasMx(domain: string): Promise<boolean> {
  const host = domain.toLowerCase().replace(/^www\./, "");
  const dns = getDns();
  if (!dns || !dns.promises?.resolveMx) return true;

  try {
    const timeout = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 3000);
    });
    const lookup = (async () => {
      const hosts = await dns.promises.resolveMx(host);
      return hosts;
    })();
    const hosts = await Promise.race([lookup, timeout]);
    return Array.isArray(hosts) && hosts.some((h) => h.exchange && h.exchange.length > 1);
  } catch {
    return false;
  }
}

/**
 * True only when the email is well-formed AND its domain can receive mail.
 * Used as the gate before any outbound send.
 */
export async function canReceiveEmail(value: unknown): Promise<boolean> {
  const email = normalizeEmail(value);
  if (!email) return false;
  const domain = email.split("@")[1];
  return domainHasMx(domain);
}