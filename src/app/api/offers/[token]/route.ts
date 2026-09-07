import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getOfferByToken } from "@/lib/portal";
import { createOfferPaymentLink } from "@/lib/stripe";

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

  // Note: these actions are token-gated (the token is the private secret a
  // client receives with their proposal link). Payment completion is handled
  // server-side by the public offer page after Stripe's redirect, not here.

  switch (action) {
    case "decline": {
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
      return NextResponse.json({ offer });
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
    default:
      return NextResponse.json(
        { error: "Unknown action." },
        { status: 400 },
      );
  }
}
