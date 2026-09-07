import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import type { MonthlyReport, Offer } from "@/lib/types";

/**
 * Server-only access to offers & reports for public token pages and the
 * offer-completion flow. Uses the service role (bypasses RLS) because these
 * pages are reached via unguessable tokens — not the user's session.
 */

export async function getOfferByToken(token: string): Promise<Offer | null> {
  const admin = createServiceClient();
  if (!admin) return null;
  const { data } = await admin
    .from("offers")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return data ? offerFromRow(data) : null;
}

export async function getReportByToken(
  token: string,
): Promise<MonthlyReport | null> {
  const admin = createServiceClient();
  if (!admin) return null;
  const { data } = await admin
    .from("reports")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return data ? reportFromRow(data) : null;
}

/**
 * Marks an offer as paid (idempotent), creates the client order, and links the
 * offer's auto-created fulfillment tasks to that order. Called from the public
 * offer page (after Stripe payment) and the webhook-safe completion endpoint.
 */
export async function completeOffer(token: string): Promise<Offer | null> {
  const admin = createServiceClient();
  if (!admin) return null;

  const { data: offer } = await admin
    .from("offers")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!offer) return null;
  if (offer.status === "paid") return offerFromRow(offer);

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: null,
      business_name: offer.client_name,
      email: offer.client_email ?? "client@bizreborn.io",
      vertical: "professional",
      service_ids: offer.services,
      one_time_total: offer.offer_price,
      monthly_total: 0,
      tier: null,
      status: "active",
      projection: {},
    })
    .select("id")
    .single();

  if (orderError || !order) return null;

  await admin
    .from("tasks")
    .update({ order_id: order.id })
    .eq("offer_id", offer.id)
    .is("order_id", null);

  const { data: updated } = await admin
    .from("offers")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("token", token)
    .select("*")
    .single();

  return updated ? offerFromRow(updated) : null;
}

// ---------- Row mappers ----------

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
    videoUrl: (r.video_url as string | null) ?? null,
    paidAt: (r.paid_at as string | null) ?? null,
    createdAt: String(r.created_at),
  };
}

function reportFromRow(r: Record<string, unknown>): MonthlyReport {
  return {
    id: String(r.id),
    token: String(r.token),
    clientName: String(r.client_name),
    clientEmail: (r.client_email as string | null) ?? "",
    month: (r.month as string | null) ?? "",
    headline: (r.headline as string | null) ?? "",
    highlights: (r.highlights as string[]) ?? [],
    metrics: (r.metrics as MonthlyReport["metrics"]) ?? [],
    deliverables: (r.deliverables as string[]) ?? [],
    nextSteps: (r.next_steps as string[]) ?? [],
    status: (r.status ?? "draft") as MonthlyReport["status"],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
