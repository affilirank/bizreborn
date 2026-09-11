import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { BookingWidget } from "@/components/bookings/booking-widget";
import { Container } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Book Your Strategy Call",
  description:
    "Book a free strategy call with Biz Reborn Marketing. Walk through your growth audit, review our service recommendations, and see a live demo of what we do.",
};

export default function BookPage() {
  return (
    <div className="relative pt-32 pb-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand-500/12 blur-[160px]" />
      </div>

      <Container className="relative">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <Badge variant="brand" className="mb-4">
            <CalendarClock className="h-3.5 w-3.5" /> Free strategy call
          </Badge>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Book Your{" "}
            <span className="text-gradient-brand">Growth Strategy Call</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-fog sm:text-lg">
            We walk through your audit results, recommend the exact services your
            business needs, and — if you want — set a follow-up Microsoft Teams
            session where we share our screen and demo everything live.
          </p>
        </div>

        <BookingWidget />
      </Container>
    </div>
  );
}