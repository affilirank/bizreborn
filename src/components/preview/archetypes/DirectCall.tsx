"use client";

import { ArrowRight, Phone, Check, ShieldCheck, Award, Clock, Sparkles } from "lucide-react";
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

export default function ArchetypeDirectCall({ niche, businessName, city, phone, rating, reviews, services }: Props) {
  const colors = niche.colors;
  return (
    <div style={{ backgroundColor: colors.bg, color: colors.text }} className="min-h-screen font-sans">
      {/* Top floating banner */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 text-[11px] md:text-xs bg-black/30 backdrop-blur-xl border-b border-white/5">
        <span className="text-white/90 font-medium">Preview built exclusively for <strong className="text-amber-400">{businessName}</strong></span>
        <a href="#contact" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[10px] hover:brightness-110 transition shadow-lg shadow-amber-500/20">
          Claim Your Site & AI Agent — Tier 2 ($299/mo) or Tier 3 ($599/mo) <ArrowRight size={10} />
        </a>
      </div>

      {/* Live Audio Hero — Proof of Value */}
      <section id="audio-demo" className="relative overflow-hidden bg-gradient-to-b from-black/80 to-black/40 border-y border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">Test Drive {businessName}'s 24/7 AI Receptionist</h2>
            <p className="text-gray-300 text-sm mb-4">Listen to how our AI answers a $12,000 estimate call at 8:30 PM while you're on a job site.</p>
            <audio controls className="w-full rounded-xl bg-white/10 border border-white/10" preload="auto">
              <source src="/api/voice/audio" type="audio/mpeg" />
            </audio>
          </div>
          <div className="glass rounded-2xl p-6 border border-white/10 max-w-xs shrink-0 text-center">
            <div className="text-3xl font-black text-brand-400 mb-1">100%</div>
            <div className="text-xs text-gray-400 font-medium">Calls Answered — Day or Night</div>
          </div>
        </div>
      </section>

      {/* Hero — Split layout with quote card */}
      <section className="relative pt-24 pb-12 md:pt-32 md:pb-16 overflow-hidden">
        <img src={niche.images.hero} alt="Service hero" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/70" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: Headline + badges */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-widest mb-5">
              <Sparkles size={12} /> {niche.copyHooks.badgeText}
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6 text-white">
              {niche.copyHooks.heroHeadline.split(" ").map((w, i) => (
                <span key={i} className="block">{w}</span>
              ))}
            </h1>
            <p className="text-gray-300 text-lg md:text-xl max-w-lg mb-8 leading-relaxed">{niche.copyHooks.heroSubline}</p>
            <div className="flex items-center gap-4 text-sm text-white/70">
              <span className="flex items-center gap-1"><Award size={14} className="text-amber-400" /> {rating}/5</span>
              <span>·</span>
              <span>{reviews} Verified Reviews</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock size={14} /> 24/7 Service</span>
            </div>
          </div>

          {/* Right: Direct Quote Card */}
          <div id="contact" className="glass-card rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 bg-white/5 backdrop-blur-xl max-w-md ml-auto">
            <h3 className="text-xl font-extrabold text-white mb-2">Get Your Free Estimate</h3>
            <p className="text-sm text-gray-400 mb-5">Same-day inspections available in {city}.</p>
            <form onSubmit={(e) => { e.preventDefault(); alert("Estimate request submitted!"); }} className="space-y-3">
              <input required placeholder="Full Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-400/40 transition" />
              <input required type="tel" placeholder="Phone Number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-400/40 transition" />
              <input required placeholder="Service Needed" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-400/40 transition" />
              <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold rounded-xl text-sm hover:brightness-110 transition shadow-lg shadow-amber-500/20">
                <Phone size={16} /> Call {phone}
              </a>
              <button type="submit" className="w-full py-3.5 bg-white text-ink-900 font-extrabold rounded-xl text-sm hover:bg-gray-100 transition shadow-lg">Request Online — Free</button>
            </form>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-8 bg-gradient-to-r from-black/40 to-transparent backdrop-blur-md border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-6 md:gap-12 text-xs md:text-sm text-white/80 font-medium">
          <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-amber-400" /> Licensed & Insured</span>
          <span className="flex items-center gap-2"><Award size={14} className="text-amber-400" /> 5-Star Rated</span>
          <span className="flex items-center gap-2"><Clock size={14} className="text-amber-400" /> 24/7 Emergency</span>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">Our Services</h2>
          <p className="text-gray-400 mb-12 max-w-xl">Complete {niche.label.toLowerCase()} solutions for homes and businesses in {city}.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((s, i) => (
              <a key={i} href="#contact" className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/30 hover:-translate-y-1 transition-all duration-300 p-6">
                <img src={niche.images[`service${i + 1}` as keyof typeof niche.images]} alt={s.title} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
                <div className="relative z-10">
                  <h3 className="text-lg font-extrabold text-white mb-3">{s.title}</h3>
                  <p className="text-sm text-gray-300 mb-4">{s.blurb}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">Learn More <ArrowRight size={12} /></span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-black/30">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Verified Local Reviews</h2>
          <p className="text-gray-400 mb-10">Real customers. Real results in {city}.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: "Maria T.", stars: 5, quote: "Called at 7am after a storm — they were on-site before noon. Professional, clean, and fair pricing." },
              { name: "James R.", stars: 5, quote: "Best service we've used in 15 years. The crew was respectful, on time, and did exceptional work." },
              { name: "Linda K.", stars: 5, quote: "Transparent quote, no upsells. The AI receptionist booked my inspection instantly at midnight." },
            ].map((r) => (
              <div key={r.name} className="glass p-6 rounded-2xl border border-white/10 text-left">
                <div className="flex gap-0.5 mb-3 text-amber-400 text-xs">{"★".repeat(r.stars)}</div>
                <p className="text-sm text-gray-200 mb-4 italic">"{r.quote}"</p>
                <div className="text-xs font-bold text-white">— {r.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Audio Hero + Proof */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-500/10 to-brand-700/10 border-y border-white/10 py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h3 className="text-2xl font-extrabold text-white mb-2">Listen: AI Answers Emergency Estimates at 8:30 PM</h3>
            <audio controls className="w-full rounded-xl bg-white/10 border border-white/10" preload="none"><source src="/api/voice/audio" type="audio/mpeg" /></audio>
          </div>
          <div className="flex-1 glass rounded-2xl p-5 border border-white/10 text-center">
            <div className="text-4xl font-black text-amber-400 mb-1">100%</div>
            <div className="text-xs text-gray-300 font-medium">Calls answered — day or night</div>
            <a href="#contact" className="inline-block mt-3 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-sm font-bold text-white hover:brightness-110">Book Free Estimate</a>
          </div>
        </div>
      </section>

      {/* AI Receptionist Widget — Sticky visible */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <AIChatAgent businessName={businessName} city={city} niche={niche.id} />
        </div>
      </section>
    </div>
  );
}
