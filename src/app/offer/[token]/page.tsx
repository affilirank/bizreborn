import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BadgePercent, CheckCircle2, Check, FileText, Lock } from "lucide-react";
import { Container } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { completeOffer, getOfferByToken } from "@/lib/portal";
import { OfferDecline } from "./offer-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const offer = await getOfferByToken(token);
  return offer
    ? { title: `Your Customized Proposal — ${offer.clientName}` }
    : { title: "Proposal" };
}

export default async function OfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;
  let offer = await getOfferByToken(token);
  if (!offer) notFound();

  // Stripe redirects back here after a successful payment.
  if (paid === "1" && offer.status !== "paid") {
    const updated = await completeOffer(token);
    if (updated) offer = updated;
  }

  const paidOffer = offer.status === "paid";
  const declined = offer.status === "declined";

  return (
    <div className="relative min-h-screen pb-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute left-1/2 top-0 h-96 w-[700px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[140px]" />
      </div>

      <header className="relative border-b border-white/5">
        <Container className="flex items-center justify-between py-5">
          <Logo />
          <Badge variant="brand" className="px-3 py-1.5">
            <FileText className="h-3 w-3" /> Customized proposal
          </Badge>
        </Container>
      </header>

      <Container className="relative mt-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          Prepared for {offer.clientName}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-white sm:text-4xl">
          Your personalized growth plan
        </h1>
        <p className="mt-2 text-sm text-fog">
          We built this package around what will move the needle for your
          business — curated modules, at a price that works for you.
        </p>

        {paidOffer && (
          <div className="mt-6 rounded-2xl border border-glow-500/30 bg-glow-500/10 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-glow-400" />
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Payment received — you&apos;re in!
                </h2>
                <p className="text-sm text-fog">
                  The team has been notified and your fulfillment tasks are
                  queued. Watch for a kickoff email from your manager.
                </p>
              </div>
            </div>
          </div>
        )}

        {declined && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-ink-800/60 p-6">
            <h2 className="font-display text-lg font-bold text-white">
              Offer declined
            </h2>
            <p className="mt-1 text-sm text-fog">
              Thanks for letting us know. If you change your mind, just reach
              out — we can always rework the package.
            </p>
          </div>
        )}

        {/* Services */}
        <div className="mt-8 rounded-3xl border border-white/8 bg-ink-850/60 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-white">
              What&apos;s included
            </h2>
            <Badge variant="brand">{offer.services.length} modules</Badge>
          </div>
          <ul className="mt-5 space-y-3">
            {offer.serviceTitles.map((title) => (
              <li
                key={title}
                className="flex items-start gap-3 rounded-xl border border-white/5 bg-ink-800/40 px-4 py-3"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-glow-400" />
                <span className="text-sm text-mist">{title}</span>
              </li>
            ))}
          </ul>

          {offer.notes && (
            <div className="mt-5 rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 text-sm text-fog">
              {offer.notes}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mt-6 rounded-3xl border border-white/8 bg-ink-850/60 p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-mute">
                Regular price
              </p>
              <p className="mt-1 text-2xl font-bold text-mute line-through">
                ${offer.listPrice.toLocaleString()}
              </p>
            </div>
            {offer.discountPct > 0 && (
              <Badge variant="emerald" className="px-3 py-1.5">
                <BadgePercent className="h-3.5 w-3.5" /> Save {offer.discountPct}%
              </Badge>
            )}
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-mute">
                Your price
              </p>
              <p className="font-display text-4xl font-extrabold text-glow-400">
                ${offer.offerPrice.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[11px] text-fog">one-time investment</p>
            </div>
          </div>

          {!paidOffer && !declined && (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              {offer.stripePaymentLink ? (
                <Link
                  href={offer.stripePaymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-8 text-base font-semibold text-white shadow-[0_8px_30px_-8px_rgba(99,102,241,0.7)] transition hover:bg-brand-400"
                >
                  Pay ${offer.offerPrice.toLocaleString()} &amp; get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <div className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                  A secure payment link is being generated — your manager will
                  send it to you shortly.
                </div>
              )}
              <OfferDecline token={offer.token} />
            </div>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-mute">
          <Lock className="h-3 w-3" /> Private link · only you and the Biz Reborn
          team can see this proposal
        </p>
      </Container>
    </div>
  );
}
