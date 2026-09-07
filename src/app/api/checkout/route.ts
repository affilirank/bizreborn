import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { SERVICE_MAP, SUBSCRIPTION_TIERS } from "@/data/services";
import type { SubscriptionTier } from "@/lib/types";

export async function POST(req: Request) {
  const stripe = getStripe();

  const body = await req.json();
  const {
    businessName,
    email,
    services,
    tier,
    monthlyBilling,
    vertical,
  }: {
    businessName?: string;
    email?: string;
    services?: number[];
    tier?: SubscriptionTier;
    monthlyBilling?: boolean;
    vertical?: string;
  } = body ?? {};

  if (!services?.length) {
    return NextResponse.json(
      { error: "No services selected." },
      { status: 400 },
    );
  }

  const items = services.map((id) => SERVICE_MAP[id]).filter(Boolean);
  const oneTimeTotal = items.reduce((s, x) => s + x.oneTime, 0);
  const monthlyTotal = items.reduce((s, x) => s + x.monthly, 0);
  const tierMonthly = tier ? SUBSCRIPTION_TIERS[tier].monthly : 0;
  const recurring = monthlyBilling ? monthlyTotal + tierMonthly : 0;
  const total = oneTimeTotal + recurring;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // --- Live Stripe mode ---
  if (stripe) {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    const grouped = new Map<
      number,
      { name: string; unit: number; qty: number }
    >();
    for (const s of items) {
      if (s.oneTime > 0) {
        const cur = grouped.get(s.id) ?? {
          name: s.title,
          unit: s.oneTime,
          qty: 0,
        };
        cur.qty += 1;
        grouped.set(s.id, cur);
      }
    }
    for (const line of grouped.values()) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${line.name} (Setup)`,
            description: "Biz Reborn one-time setup fee",
          },
          unit_amount: line.unit * 100,
        },
        quantity: line.qty,
      });
    }

    if (recurring > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${tier && monthlyBilling ? `${SUBSCRIPTION_TIERS[tier].name} + ` : ""}Monthly Services`,
            description: "Recurring marketing retainers",
          },
          recurring: { interval: "month" as const },
          unit_amount: recurring * 100,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: recurring > 0 ? "subscription" : "payment",
      customer_email: email || undefined,
      line_items: lineItems,
      metadata: {
        businessName: businessName ?? "Biz Reborn Client",
        email: email ?? "",
        services: services.join(","),
        tier: tier ?? "none",
        vertical: vertical ?? "professional",
        source: "menu-builder",
      },
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/services?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  }

  // --- Demo mode: echo totals so the client can simulate the payment ---
  return NextResponse.json({
    demo: true,
    totals: {
      oneTime: oneTimeTotal,
      monthly: monthlyTotal,
      tierMonthly,
      recurring,
      total,
      count: items.length,
    },
    items: items.map((s) => ({ id: s.id, title: s.title })),
  });
}
