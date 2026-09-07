import type { Metadata } from "next";
import { MessageSquareText } from "lucide-react";
import { ContactForm, ContactPerks } from "@/components/contact/contact-form";
import { Container } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Reach the Biz Reborn Marketing team. Email is required — a real growth strategist replies within one business day.",
};

export default function ContactPage() {
  return (
    <div className="relative pt-32 pb-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand-500/12 blur-[160px]" />
      </div>

      <Container className="relative">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <Badge variant="brand" className="mb-4">
            <MessageSquareText className="h-3.5 w-3.5" /> We answer
          </Badge>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Let&apos;s Reborn Your{" "}
            <span className="text-gradient-brand">Marketing.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-fog sm:text-lg">
            Tell us where you are, where you want to be, and what&apos;s in the
            way. A growth strategist — not an autoresponder — replies to your
            inbox within one business day.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <ContactForm />
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <ContactPerks />
        </div>
      </Container>
    </div>
  );
}
