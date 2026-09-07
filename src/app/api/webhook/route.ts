import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, STRIPE_CONFIG } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/admin";
import { BUSINESS_VERTICALS, SERVICE_MAP } from "@/data/services";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = STRIPE_CONFIG.webhookSecret;
  const signature = req.headers.get("stripe-signature");

  if (!stripe || !secret || !signature) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("[stripe-webhook]", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await persistOrder(session);
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("[billing] Invoice paid", {
        id: invoice.id,
        amount: invoice.amount_paid,
        customer: invoice.customer,
      });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      console.log("[billing] Subscription updated", {
        id: sub.id,
        status: sub.status,
        customer: sub.customer,
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

/**
 * Persists a paid Stripe checkout session into Supabase (order + fulfillment
 * tasks). No-op when Supabase isn't configured (demo mode).
 */
async function persistOrder(session: Stripe.Checkout.Session) {
  const admin = createServiceClient();
  if (!admin) {
    console.log("[fulfillment] New client order", {
      id: session.id,
      business: session.metadata?.businessName,
      services: session.metadata?.services,
      tier: session.metadata?.tier,
    });
    return;
  }

  const metadata = session.metadata ?? {};
  const services = (metadata.services ?? "")
    .split(",")
    .map((id) => Number(id))
    .filter((id) => SERVICE_MAP[id]);
  const items = services.map((id) => SERVICE_MAP[id]);
  const oneTimeTotal = items.reduce((s, x) => s + x.oneTime, 0);
  const monthlyTotal = items.reduce((s, x) => s + x.monthly, 0);
  const vertical =
    typeof metadata.vertical === "string" &&
    BUSINESS_VERTICALS.some((v) => v.id === metadata.vertical)
      ? metadata.vertical
      : "professional";
  const tier =
    metadata.tier && metadata.tier !== "none" ? metadata.tier : null;

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      business_name: metadata.businessName ?? "Biz Reborn Client",
      email: metadata.email ?? session.customer_details?.email ?? "client@bizreborn.io",
      vertical,
      service_ids: services,
      one_time_total: oneTimeTotal,
      monthly_total: monthlyTotal,
      tier,
      status: "active",
      projection: {
        leadIncreasePct: 0,
        leadsPerMonth: Math.round(10 + monthlyTotal / 25),
        acv: 0,
        projectedMonthly: 0,
        roas: monthlyTotal > 0 ? 0 : 0,
      },
      stripe_session_id: session.id,
    })
    .select()
    .single();

  if (error || !order) {
    console.error("[fulfillment] Could not persist order", error);
    return;
  }

  const { error: taskError } = await admin.from("tasks").insert(
    items.map((s) => ({
      order_id: order.id,
      service_id: s.id,
      service_title: s.title,
      status: "queued",
      progress: 0,
    })),
  );
  if (taskError) {
    console.error("[fulfillment] Could not persist tasks", taskError);
  }

  console.log("[fulfillment] Order persisted", {
    id: order.id,
    business: order.business_name,
    services,
    tier,
  });
}
