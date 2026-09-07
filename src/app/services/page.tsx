"use client";

import { motion } from "framer-motion";
import { Container, SectionHeading, Eyebrow } from "@/components/ui/section";
import { CartProvider } from "@/components/builder/cart-store";
import { BusinessSelector } from "@/components/builder/business-selector";
import { ServiceMenu } from "@/components/builder/service-menu";
import { RoiCalculator } from "@/components/builder/roi-calculator";
import { Checkout } from "@/components/builder/checkout";
import { PricingTiers } from "@/components/builder/pricing-tiers";

function BuilderShell() {
  return (
    <div className="relative pt-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute -top-20 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[160px]" />
      </div>

      <Container className="relative">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <Eyebrow className="mb-4">The 100-Module Service Menu</Eyebrow>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Build Your Marketing Machine,{" "}
            <span className="text-gradient-brand">Module by Module.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-fog sm:text-lg">
            No $3,000/month mystery retainers. Pick the exact services your
            business needs, see the ROI in real time, and launch with one click.
          </p>
        </div>

        <div className="mb-14">
          <BusinessSelector />
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <ServiceMenu />
            </motion.div>
          </div>
          <div className="lg:sticky lg:top-24">
            <RoiCalculator />
          </div>
        </div>

        <div className="mt-20">
          <SectionHeading
            eyebrow="Step 4"
            title={
              <>
                Launch With{" "}
                <span className="text-gradient-brand">One Click.</span>
              </>
            }
            description="Stripe-secured checkout. Single one-time builds or full recurring retainers — your call."
          />
          <Checkout />
        </div>
      </Container>

      <PricingTiers />
    </div>
  );
}

export default function ServicesPage() {
  return (
    <CartProvider>
      <BuilderShell />
    </CartProvider>
  );
}
