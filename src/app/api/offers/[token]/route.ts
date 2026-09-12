import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getOfferByToken } from "@/lib/portal";
import { createOfferCheckoutSession, createOfferPaymentLink } from "@/lib/stripe";
import { sendOfferEmail } from "@/lib/offer-email";
import { SERVICE_MAP } from "@/data/services";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Storage is not configured." },
      { status: 503 },
    );
  }

  const offer = await getOfferByToken(token);
  if (!offer) {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }

  switch (action) {
    case "decline": {
      const { data: rawOffer } = await admin
        .from("offers")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      const { error } = await admin
        .from("offers")
        .update({ status: "declined" })
        .eq("token", token);
      if (error) {
        return NextResponse.json(
          { error: "Could not update the offer." },
          { status: 500 },
        );
      }

      if (rawOffer) {
        // Automatically update any associated fulfillment tasks or prospect records so they don't show active/false fulfillment status
        await admin
          .from("tasks")
          .update({ status: "cancelled", assignee: null })
          .eq("offer_id", rawOffer.id);

        if (rawOffer.prospect_id) {
          await admin
            .from("prospects")
            .update({ status: "declined" })
            .eq("id", rawOffer.prospect_id);
        }
        if (rawOffer.client_email) {
          await admin
            .from("prospects")
            .update({ status: "declined" })
            .eq("email", rawOffer.client_email);
        }
        if (rawOffer.client_name) {
          await admin
            .from("prospects")
            .update({ status: "declined" })
            .ilike("business_name", rawOffer.client_name);
        }
      }

      return NextResponse.json({ offer });
    }
    case "checkout": {
      // Recurring retainer: the client picks a commitment term on the
      // proposal page and we build a fresh Stripe subscription checkout
      // (initiation/setup + discounted monthly retainer for that term).
      if (offer.billingMode !== "monthly") {
        return NextResponse.json(
          { error: "This proposal is a one-time investment." },
          { status: 400 },
        );
      }
      const term = Math.round(Number(body?.term ?? 0));
      if (![6, 12, 24].includes(term)) {
        return NextResponse.json(
          { error: "Choose a 6, 12, or 24 month term." },
          { status: 400 },
        );
      }
      const monthlyRate = Math.round(Number(offer.monthlyTermPrices[term] ?? 0));
      if (monthlyRate <= 0) {
        return NextResponse.json(
          { error: "No rate set for that term." },
          { status: 400 },
        );
      }
      const setupItems = offer.services
        .map((id) => SERVICE_MAP[id])
        .filter(Boolean)
        .map((s) => ({ title: s.title, amount: s.oneTime }));
      const discountPct =
        offer.monthlyListPrice > monthlyRate
          ? Math.round(((offer.monthlyListPrice - monthlyRate) / offer.monthlyListPrice) * 100)
          : 0;

      const url = await createOfferCheckoutSession({
        token: offer.token,
        clientName: offer.clientName,
        clientEmail: offer.clientEmail,
        serviceTitles: offer.serviceTitles,
        setupItems,
        monthlyRate,
        termMonths: term,
        discountPct,
      }).catch((err) => {
        console.error("[offers] checkout session failed", err);
        return null;
      });
      if (!url) {
        return NextResponse.json(
          { error: "Stripe is not configured." },
          { status: 503 },
        );
      }
      await admin
        .from("offers")
        .update({ term_months: term, stripe_payment_link: url, status: "sent" })
        .eq("token", token);
      return NextResponse.json({ url });
    }
    case "payment-link": {
      if (offer.stripePaymentLink) {
        return NextResponse.json({ url: offer.stripePaymentLink });
      }
      const url = await createOfferPaymentLink({
        token: offer.token,
        clientName: offer.clientName,
        serviceTitles: offer.serviceTitles,
        amount: offer.offerPrice,
      }).catch((err) => {
        console.error("[offers] payment link failed", err);
        return null;
      });
      if (!url) {
        return NextResponse.json(
          { error: "Stripe is not configured." },
          { status: 503 },
        );
      }
      await admin
        .from("offers")
        .update({ stripe_payment_link: url, status: "sent" })
        .eq("token", token);
      return NextResponse.json({ url });
    }
    case "send": {
      // Sends the branded proposal email (custom HTML like the rest of the
      // outreach). One-time offers get their Stripe payment link generated
      // first so the email's CTA can take the client straight to checkout.
      if (!offer.clientEmail) {
        return NextResponse.json(
          { error: "Add a client email before sending the proposal." },
          { status: 400 },
        );
      }
      let currentOffer = offer;
      let paymentLink = currentOffer.stripePaymentLink;
      if (currentOffer.billingMode === "one-time" && !paymentLink) {
        const url = await createOfferPaymentLink({
          token: currentOffer.token,
          clientName: currentOffer.clientName,
          serviceTitles: currentOffer.serviceTitles,
          amount: currentOffer.offerPrice,
        }).catch((err) => {
          console.error("[offers] payment link failed", err);
          return null;
        });
        if (url) paymentLink = url;
      }
      if (paymentLink !== currentOffer.stripePaymentLink) {
        await admin
          .from("offers")
          .update({ stripe_payment_link: paymentLink })
          .eq("token", token);
        currentOffer = { ...currentOffer, stripePaymentLink: paymentLink };
      }
      const result = await sendOfferEmail(currentOffer);
      if (result.ok || result.simulated) {
        await admin
          .from("offers")
          .update({ status: "sent" })
          .eq("token", token);
      }
      return NextResponse.json({
        ok: result.ok,
        simulated: result.simulated,
        error: result.error ?? null,
        paymentLink: currentOffer.stripePaymentLink,
      });
    }
    default:
      return NextResponse.json(
        { error: "Unknown action." },
        { status: 400 },
      );
  }
}
