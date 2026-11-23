import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived, prospect-scoped token that lets a browser call the protected
 * `/api/merit-bridge` endpoint without ever seeing MERIT_BRIDGE_SECRET or
 * SUPABASE_SERVICE_ROLE_KEY. The master secret stays server-side.
 */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function bridgeSecret(): string | null {
  return (
    process.env.MERIT_BRIDGE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
}

function signature(secret: string, prospectId: string, expiresAt: number): string {
  return createHmac("sha256", secret)
    .update(`${prospectId}:${expiresAt}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export interface ScopedBridgeToken {
  token: string;
  expiresAt: number;
}

export function mintBridgeToken(prospectId: string): ScopedBridgeToken | null {
  const secret = bridgeSecret();
  if (!secret) return null;
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  return { token: signature(secret, prospectId, expiresAt), expiresAt };
}

/**
 * Accepts either the master secret (external automation) or a valid scoped
 * token bound to this exact prospect + expiry.
 */
export function verifyBridgeToken(input: {
  presented: string;
  masterSecret: string | null;
  prospectId: string;
  expiresAt?: unknown;
}): boolean {
  const { presented, masterSecret, prospectId, expiresAt } = input;

  if (masterSecret && safeEqual(presented, masterSecret)) return true;

  const secret = bridgeSecret();
  if (!secret) return false;
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return false;
  if (expiresAt <= Date.now()) return false;

  return safeEqual(presented, signature(secret, prospectId, expiresAt));
}
