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

/**
 * Creates a Stripe Checkout Session for a recurring retainer proposal. Charges
 * the one-time initiation/setup fees immediately plus the first month of the
 * discounted monthly retainer for the chosen commitment term, then continues
 * billing monthly. Returns the hosted checkout URL (or null when unconfigured).
 */
export async function createOfferCheckoutSession(opts: {
  token: string;
  clientName: string;
  clientEmail: string;
  serviceTitles: string[];
  setupItems: Array<{ title: string; amount: number }>;
  monthlyRate: number;
  termMonths: number;
  discountPct: number;
}): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const setup of opts.setupItems) {
    if (setup.amount <= 0) continue;
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${setup.title} (Initiation / Setup)`,
          description: "Biz Reborn one-time setup fee",
        },
        unit_amount: Math.round(setup.amount) * 100,
      },
      quantity: 1,
    });
  }
  lineItems.push({
    price_data: {
      currency: "usd",
      product_data: {
        name: `${opts.clientName} — Retainer (${opts.termMonths}-month rate)`,
        description: opts.discountPct > 0
          ? `Recurring marketing retainer — save ${opts.discountPct}% over list with a ${opts.termMonths}-month commitment`
          : `Recurring marketing retainer — ${opts.termMonths}-month commitment`,
      },
      recurring: { interval: "month" as const },
      unit_amount: Math.round(opts.monthlyRate) * 100,
    },
    quantity: 1,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: opts.clientEmail || undefined,
    line_items: lineItems,
    metadata: {
      offerToken: opts.token,
      clientName: opts.clientName,
      email: opts.clientEmail,
      services: opts.serviceTitles.join(", "),
      termMonths: String(opts.termMonths),
      monthlyRate: String(opts.monthlyRate),
      source: "offer-builder",
    },
    subscription_data: {
      metadata: {
        offerToken: opts.token,
        clientName: opts.clientName,
        source: "offer-builder",
      },
    },
    success_url: `${baseUrl}/offer/${opts.token}?paid=1&term=${opts.termMonths}`,
    cancel_url: `${baseUrl}/offer/${opts.token}`,
  });

  return session.url;
}
