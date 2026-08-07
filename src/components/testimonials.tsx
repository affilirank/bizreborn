"use client";

import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    name: "Mike R.",
    business: "Coastal Plumbing & Rooter",
    rating: 5,
    quote:
      "Our phone hasn't stopped ringing since Biz Reborn overhauled our Google profile. We went from page 3 to the local 3-pack in under 6 weeks.",
  },
  {
    name: "Sarah T.",
    business: "Vero Beach Dental",
    rating: 5,
    quote:
      "The brand audit was eye-opening. We had no idea our online reputation was bleeding potential patients. They fixed everything — reviews, site, local SEO.",
  },
  {
    name: "James K.",
    business: "Treasure Coast Electrical",
    rating: 5,
    quote:
      "We tried three other agencies before Biz Reborn. Nobody else could show us a clear ROI. They're not just marketing — they're a growth partner.",
  },
  {
    name: "Lisa M.",
    business: "Indian River Landscaping",
    rating: 5,
    quote:
      "The automated review system is worth it alone. We went from 12 reviews to 85 in three months. Our close rate went through the roof.",
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1));

  const t = testimonials[current];

  return (
    <section className="relative border-t border-ink-800/60 bg-ink-900/30">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sora text-2xl font-bold text-white sm:text-3xl">
            What Our Clients Say
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Real results from real local business owners.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <div className="relative rounded-xl border border-ink-800/60 bg-ink-900/50 p-8 sm:p-10">
            <Quote
              size={32}
              className="absolute right-6 top-6 text-brand-500/20"
            />

            <div className="mb-4 flex gap-1">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className="fill-amber-400 text-amber-400"
                />
              ))}
            </div>

            <blockquote className="text-sm leading-relaxed text-ink-300">
              &ldquo;{t.quote}&rdquo;
            </blockquote>

            <div className="mt-6 border-t border-ink-800/40 pt-4">
              <div className="font-sora text-sm font-semibold text-white">
                {t.name}
              </div>
              <div className="text-xs text-ink-500">{t.business}</div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-700 text-ink-400 transition-all hover:border-brand-500/30 hover:text-brand-400"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "h-1.5 w-6 rounded-full transition-all",
                    i === current
                      ? "bg-gradient-to-r from-brand-500 to-glow-500"
                      : "bg-ink-700 hover:bg-ink-600"
                  )}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-700 text-ink-400 transition-all hover:border-brand-500/30 hover:text-brand-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
