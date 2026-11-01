"use client";

import { ArrowRight, Phone, ShieldCheck, Award, Sparkles, Check } from "lucide-react";
import AIChatAgent from "@/components/ai-chat-agent";
import type { NicheSkin } from "@/lib/preview/niche-skins";

interface Props {
  niche: NicheSkin;
  businessName: string;
  city: string;
  phone: string;
  rating: string;
  reviews: string;
  services: { title: string; blurb: string; icon: string }[];
}

export default function ArchetypeLocalAuthority({ niche, businessName, city, phone, rating, reviews }: Props) {
  const colors = niche.colors;
  return (
    <div style={{ backgroundColor: colors.bg, color: colors.text }} className="min-h-screen font-sans">
      {/* Floating banner */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 text-[11px] md:text-xs bg-black/30 backdrop-blur-xl border-b border-white/5">
        <span className="text-white/90 font-medium">Exclusive Preview for <strong className="text-amber-300">{businessName}</strong> · {city}</span>
        <a href="#contact" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[10px] hover:brightness-110 shadow-lg shadow-amber-500/20 transition">Claim Site · $150/mo <ArrowRight size={10} /></a>
      </div>

      {/* Clean centered hero */}
      <section className="relative pt-32 md:pt-40 pb-16 md:pb-24 overflow-hidden">
        <img src={niche.images.hero} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/60 to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/80 text-[10px] font-extrabold uppercase tracking-[0.15em] mb-8 backdrop-blur-md">
            <ShieldCheck size={14} className="text-amber-400" /> {niche.copyHooks.badgeText}
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6 drop-shadow-xl">
            {niche.copyHooks.heroHeadline}
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">{niche.copyHooks.heroSubline}</p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <a href="#contact" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold rounded-2xl shadow-xl shadow-amber-500/25 hover:brightness-110 transition">{niche.copyHooks.ctaPrimary}<ArrowRight size={18} /></a>
            <a href="#process" className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 text-white font-extrabold rounded-2xl border border-white/10 hover:bg-white/10 transition backdrop-blur-md">How It Works</a>
          </div>
          <div className="flex items-center justify-center gap-8 text-sm font-medium text-white/60">
            <span className="flex items-center gap-2"><Award size={16} className="text-amber-400" /> {rating}/5 Rating</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{reviews} Verified Reviews</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Serving {city}</span>
          </div>
        </div>
      </section>

      {/* 3-Step Process */}
      <section id="process" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">How It Works</h2>
          <p className="text-gray-400">Three simple steps to a completed job.</p>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { num: "01", title: "Request a Quote", desc: "Call or fill the form. Our AI receptionist answers instantly — even at midnight." },
            { num: "02", title: "Free Inspection", desc: "A licensed pro visits your property for a no-obligation assessment and transparent quote." },
            { num: "03", title: "Job Completed", desc: "Work finished on schedule. Final walkthrough, satisfaction check, and warranty activation." },
          ].map((step) => (
            <div key={step.num} className="relative glass-strong rounded-3xl p-8 border border-white/10 hover:-translate-y-1 transition-all duration-300">
              <div className="text-6xl font-black text-amber-500/20 absolute top-4 right-4 select-none">{step.num}</div>
              <h3 className="text-xl font-extrabold text-white mb-3">{step.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-black/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-10 text-center">Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: <ShieldCheck size={20} />, title: "Inspection & Diagnosis", desc: "Full property inspection with digital report and photo documentation." },
              { icon: <Award size={20} />, title: "Installation & Repair", desc: "Licensed installation backed by manufacturer warranties and our satisfaction guarantee." },
              { icon: <Sparkles size={20} />, title: "Maintenance Plans", desc: "Scheduled maintenance to extend life and prevent costly emergency failures." },
              { icon: <Phone size={20} />, title: "24/7 Emergency Line", desc: "Live AI receptionist connects you directly to the on-call specialist." },
            ].map((s, i) => (
              <div key={i} className="glass-strong p-6 rounded-2xl border border-white/10 hover:border-amber-400/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4">{s.icon}</div>
                <h3 className="text-base font-extrabold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-10">Frequently Asked</h2>
          <div className="space-y-3">
            {[
              { q: "How quickly can you respond to an emergency?", a: "Our 24/7 AI receptionist connects you to the on-call specialist within 2 minutes. Same-city response is typically under 60 minutes." },
              { q: "Do you offer warranties?", a: "Yes — all installations include manufacturer warranties plus our own satisfaction guarantee. Details are included in every quote." },
              { q: "Is the estimate really free?", a: "Absolutely. Every inspection, diagnosis, and quote is 100% free with zero obligation to proceed." },
            ].map((faq, i) => (
              <div key={i} className="glass-strong rounded-xl border border-white/10 overflow-hidden">
                <button className="w-full text-left px-6 py-4 font-bold text-sm text-white hover:bg-white/5 flex items-center justify-between transition-colors">
                  {faq.q}
                  <ArrowRight size={14} className="rotate-90 text-amber-400" />
                </button>
                <div className="px-6 pb-4 text-sm text-gray-400">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact + AI Widget */}
      <section id="contact" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-black/30 to-transparent">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400">Book your free inspection, or talk to the AI receptionist anytime.</p>
        </div>
        <div className="max-w-md mx-auto mb-16">
          <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 w-full py-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold rounded-2xl text-lg shadow-xl shadow-amber-500/25 hover:brightness-110 transition">Call {phone}<Phone size={20} /></a>
        </div>
        <AIChatAgent businessName={businessName} city={city} niche={niche.id} />
      </section>
    </div>
  );
}
