import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/supabase/server";
import { SERVICE_MAP } from "@/data/services";
import { createOfferPaymentLink } from "@/lib/stripe";
import type { Offer } from "@/lib/types";

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const clientName = String(body?.clientName ?? "").trim();
  const clientEmail = String(body?.clientEmail ?? "").trim();
  const services: number[] = Array.isArray(body?.services)
    ? body.services.map((id: unknown) => Number(id)).filter(Number.isInteger)
    : [];
  const offerPrice = Math.round(Number(body?.offerPrice ?? 0));
  const notes = String(body?.notes ?? "").trim();

  if (!clientName || services.length === 0 || offerPrice <= 0) {
    return NextResponse.json(
      { error: "Client name, at least one service, and a price are required." },
      { status: 400 },
    );
  }

  const items = services.map((id) => SERVICE_MAP[id]).filter(Boolean);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "No matching services in the catalog." },
      { status: 400 },
    );
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Storage is not configured." },
      { status: 503 },
    );
  }

  const listPrice = items.reduce((s, x) => s + x.oneTime + x.monthly, 0);
  const discountPct =
    listPrice > offerPrice
      ? Math.round(((listPrice - offerPrice) / listPrice) * 100)
      : 0;
  const serviceTitles = items.map((s) => s.title);
  const token = crypto.randomUUID();

  const paymentLink = await createOfferPaymentLink({
    token,
    clientName,
    serviceTitles,
    amount: offerPrice,
  }).catch((err) => {
    console.error("[offers] Stripe payment link failed", err);
    return null;
  });

  const { data, error } = await admin
    .from("offers")
    .insert({
      token,
      client_name: clientName,
      client_email: clientEmail || null,
      services,
      service_titles: serviceTitles,
      list_price: listPrice,
      offer_price: offerPrice,
      discount_pct: discountPct,
      status: "draft",
      stripe_payment_link: paymentLink,
      notes: notes || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not save the offer." },
      { status: 500 },
    );
  }

  // Auto-create one fulfillment task per selected module so the work lands on
  // the admin task board immediately.
  const { error: taskError } = await admin.from("tasks").insert(
    items.map((s) => ({
      offer_id: data.id,
      order_id: null,
      service_id: s.id,
      service_title: s.title,
      client_name: clientName,
      status: "queued",
      progress: 0,
      estimated_hours: 0,
    })),
  );
  if (taskError) {
    console.error("[offers] Could not auto-create tasks", taskError);
  }

  return NextResponse.json({ offer: offerFromRow(data) }, { status: 201 });
}

function offerFromRow(r: Record<string, unknown>): Offer {
  return {
    id: String(r.id),
    token: String(r.token),
    clientName: String(r.client_name),
    clientEmail: (r.client_email as string | null) ?? "",
    services: (r.services as number[]) ?? [],
    serviceTitles: (r.service_titles as string[]) ?? [],
    listPrice: Number(r.list_price ?? 0),
    offerPrice: Number(r.offer_price ?? 0),
    discountPct: Number(r.discount_pct ?? 0),
    status: (r.status ?? "draft") as Offer["status"],
    stripePaymentLink: (r.stripe_payment_link as string | null) ?? null,
    notes: (r.notes as string | null) ?? "",
    paidAt: (r.paid_at as string | null) ?? null,
    createdAt: String(r.created_at),
  };
}
