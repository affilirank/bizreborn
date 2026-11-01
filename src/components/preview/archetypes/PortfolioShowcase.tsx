"use client";

import { ArrowRight, Check, Sparkles, Play, Image as ImageIcon, ShieldCheck } from "lucide-react";
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

export default function ArchetypePortfolioShowcase({ niche, businessName, city, phone, rating, reviews, services }: Props) {
  const colors = niche.colors;
  return (
    <div style={{ backgroundColor: colors.bg, color: colors.text }} className="min-h-screen font-sans selection:bg-amber-500/30">
      {/* Floating banner */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 text-[11px] md:text-xs bg-black/40 backdrop-blur-xl border-b border-white/5">
        <span className="text-white/80 font-medium">Exclusive Preview: <strong className="text-amber-300">{businessName}</strong></span>
        <a href="#contact" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 text-white font-bold text-[10px] hover:brightness-110 shadow-lg shadow-amber-500/20 transition">Claim This Site · $150/mo <ArrowRight size={10} /></a>
      </div>

      {/* Full-bleed cinematic hero */}
      <section className="relative h-[92vh] min-h-[560px] flex items-end">
        <img src={niche.images.hero} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-16 md:pb-24">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/90 text-[10px] font-extrabold uppercase tracking-widest mb-5 backdrop-blur-sm">Portfolio Preview</span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[0.95] tracking-tight mb-6 drop-shadow-2xl">
              {niche.copyHooks.heroHeadline}
            </h1>
            <p className="text-lg md:text-2xl text-white/90 mb-8 leading-relaxed drop-shadow-lg">{niche.copyHooks.heroSubline}</p>
            <div className="flex flex-wrap gap-3 mb-8">
              <a href="#contact" className="inline-flex items-center gap-2 px-7 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold rounded-2xl text-base hover:brightness-110 shadow-xl shadow-amber-500/25 transition">{niche.copyHooks.ctaPrimary}<ArrowRight size={18} /></a>
              <a href="#gallery" className="inline-flex items-center gap-2 px-7 py-4 bg-white/10 text-white font-extrabold rounded-2xl text-base border border-white/20 hover:bg-white/15 transition backdrop-blur-md"><Play size={18} /> View Project Gallery</a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust ribbon */}
      <section className="bg-gradient-to-b from-black/60 to-transparent -mt-10 pt-10 pb-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16 text-xs md:text-sm text-white/60 font-medium">
          <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-amber-400" /> {rating}/5 Rating</span>
          <span>{reviews} Verified Reviews</span>
          <span>Same-Day Service</span>
          <span>Licensed & Insured</span>
        </div>
      </section>

      {/* Project Spotlight Gallery */}
      <section id="gallery" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-2">Recent Work</h2>
              <p className="text-gray-400">Project gallery for {city} clients.</p>
            </div>
            <a href="#contact" className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition">Book Your Project <ArrowRight size={16} /></a>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="group relative overflow-hidden rounded-2xl aspect-[4/5] md:aspect-[3/4] bg-white/5 border border-white/10 hover:border-amber-400/30 transition-all">
                <img src={niche.images[`service${i}` as keyof typeof niche.images]} alt="Project" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-white font-extrabold text-lg mb-1">Project Spotlight {i}</h3>
                  <p className="text-xs text-gray-300">{city} · {niche.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Breakdown */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-black/30">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">Why {businessName}?</h2>
            <div className="space-y-3">
              {[
                "Licensed & Insured Professionals",
                "Same-Day Service in Most Areas",
                "Transparent Upfront Pricing — No Hidden Fees",
                "24/7 Emergency Response Line",
                "100% Satisfaction Guarantee",
              ].map((f) => (
                <div key={f} className="flex items-center gap-3 text-sm text-white/90 font-medium">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400"><Check size={12} strokeWidth={3} /></div>
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <img src={niche.images.hero} alt="Service detail" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Reviews Carousel */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Client Reviews</h2>
          <p className="text-gray-400">Verified Google reviews from {city} customers.</p>
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
          {[
            { name: "David M.", text: "Outstanding work. They showed up on time, explained everything, and cleaned up after themselves." },
            { name: "Sarah W.", text: "Called for an emergency repair — the AI receptionist booked me instantly. Crew arrived within the hour." },
            { name: "Tom H.", text: "Professional, fast, and transparent. The quote matched the final bill exactly. Highly recommend." },
          ].map((r) => (
            <div key={r.name} className="glass-strong p-6 rounded-2xl border border-white/10 text-left">
              <div className="text-amber-400 text-xs font-extrabold mb-2">★★★★★ Verified</div>
              <p className="text-sm text-gray-200 mb-4 leading-relaxed">"{r.text}"</p>
              <div className="text-xs font-bold text-white">— {r.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Receptionist */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-black/50">
        <div className="max-w-4xl mx-auto">
          <AIChatAgent businessName={businessName} city={city} niche={niche.id} />
        </div>
      </section>
    </div>
  );
}
