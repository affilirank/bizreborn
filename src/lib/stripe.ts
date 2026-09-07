import "server-only";

import Stripe from "stripe";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    typescript: true,
  });
}

export const STRIPE_CONFIG = {
  priceId: process.env.STRIPE_PRICE_ID,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  successUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard?checkout=success`,
  cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/services?checkout=cancelled`,
};

/**
 * Creates a reusable Stripe Payment Link for a customized offer. After payment
 * Stripe redirects back to the public offer page with ?paid=1, which completes
 * the offer (marks paid + creates the order). Returns null when Stripe isn't
 * configured.
 */
export async function createOfferPaymentLink(opts: {
  token: string;
  clientName: string;
  serviceTitles: string[];
  amount: number;
}): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const price = await stripe.prices.create({
    currency: "usd",
    unit_amount: Math.round(opts.amount) * 100,
    product_data: {
      name: `${opts.clientName} — Customized Package`,
      metadata: { source: "offer-builder", services: opts.serviceTitles.join(", ") },
    },
    metadata: { offerToken: opts.token },
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { offerToken: opts.token, clientName: opts.clientName },
    after_completion: {
      type: "redirect",
      redirect: { url: `${baseUrl}/offer/${opts.token}?paid=1` },
    },
  });

  return link.url;
}
