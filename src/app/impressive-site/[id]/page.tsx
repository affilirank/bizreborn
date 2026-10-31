/**
 * Impressive AI Site Preview — separate build from the plain teaser at
 * /ai-site/[id]. Renders a high-converting, niche-specific landing page
 * with a futuristic AI receptionist demo, packed SEO, and sales tools.
 */

import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { buildImpressiveSiteForProspect } from "@/lib/impressive-site-generator";
import ReceptionistDemo from "@/components/impressive-site/receptionist-demo";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = async ({ params }: PageProps) => {
  const { id } = await params;
  const admin = createServiceClient();
  let title = "Impressive AI Site Preview · Merit Media & Marketing";
  let description = "See your business transformed into a high-converting AI-powered site.";
  if (admin) {
    const { data } = await admin
      .from("prospects")
      .select("business_name,city,google_rating,review_count")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      title = `${data.business_name} · Impressive AI Site Preview · ${data.city ?? "Local"}`;
      description = `AI-powered site for ${data.business_name} in ${data.city ?? "your area"}. ${data.review_count != null ? data.review_count + " reviews" : ""} · ${data.google_rating != null ? data.google_rating.toFixed(1) : "0"}/5 stars.`;
    }
  }
  return { title, description };
};

export default async function ImpressiveSitePage({ params }: PageProps) {
  const { id } = await params;
  let payload: any = null;
  let prospect: any = null;
  let receptionistUrl: string | null = null;

  const admin = createServiceClient();

  if (admin) {
    const queryResult = await admin
      .from("prospects")
      .select(
        "id,business_name,city,phone,google_rating,review_count,impressive_site_data,receptionist_audio_url,recommended_services",
      )
      .eq("id", id)
      .maybeSingle();

    const queryData = queryResult.data;
    const queryError = queryResult.error;
    if (queryError) console.error("[impressive-site] query error:", queryError);
    prospect = queryData;
    if (prospect?.impressive_site_data) {
      payload = prospect.impressive_site_data;
      receptionistUrl = prospect.receptionist_audio_url ?? null;
    }
  }

  // Fallback: generate on first visit (cached after)
  if (!payload) {
    const result = await buildImpressiveSiteForProspect(id);
    if (!result) return notFound();
    payload = result.payload;
    receptionistUrl = result.receptionist_audio_url ?? null;
    prospect = {
      business_name: payload.business_name,
      city: payload.city,
      phone: payload.contact.phone,
      google_rating: payload.trust.rating,
      review_count: payload.trust.review_count,
    };
  }

  const p = payload;
  const name = p.business_name || "Your Business";
  const city = p.city || "your area";
  const phone = p.contact?.phone || prospect?.phone || "(772) 555-0199";
  const phoneHref = `tel:${phone.replace(/[^0-9+]/g, "")}`;

  return (
    <div className="min-h-screen bg-ink-900 text-mist font-sans selection:bg-brand-500/30 selection:text-white">
      {/* Top announcement bar */}
      <div className="sticky top-0 z-50 bg-ink-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-brand-400 animate-ping" />
            <span className="text-gray-400 font-medium">
              Impressive AI Site Preview &bull; <strong className="text-brand-500">{name}</strong> &bull; {city}
            </span>
          </div>
          <a
            href={phoneHref}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded text-xs font-semibold transition-all"
          >
            <PhoneIcon /> Call {phone}
          </a>
        </div>
      </div>

      <main className="relative">
        {/* Hero */}
        <section className="relative overflow-hidden pt-20 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 grid-lines opacity-20 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 brand-gold/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-bold uppercase tracking-wider mb-4">
              {p.hero?.eyebrow || "Licensed & Insured · 24/7 Emergency"}
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white font-display leading-[1.05] tracking-tight mb-6">
              {p.hero?.headline || `${name} — ${city}`}<br />
              <span className="text-gradient-brand block mt-2 md:mt-4 text-3xl md:text-4xl">{p.hero?.subheadline?.split(".")[0] || "Trusted local experts."}</span>
            </h1>
            <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
              {p.hero?.subheadline || `Professional ${p.niche || "services"} in ${city}. Book your free estimate today.`}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-700 text-white font-bold rounded-xl text-lg hover:brightness-110 shadow-[0_0_40px_-15px_rgba(214,165,54,0.5)] transition-all transform hover:-translate-y-0.5"
              >
                {p.hero?.cta_primary || "Get Your Free Estimate"} <ArrowRightIcon size={20} strokeWidth={2.5} />
              </a>
              <a
                href="#receptionist"
                className="inline-flex items-center gap-2 px-8 py-4 glass text-sm font-bold rounded-xl border border-white/10 hover:bg-white/5 transition-all"
              >
                {p.hero?.cta_secondary || "Talk to AI Receptionist"} <MicIcon size={18} strokeWidth={2} />
              </a>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <StarIcon size={14} strokeWidth={2} className="text-brand-500" />
                {p.trust?.rating?.toFixed(1) || "4.8"}/5
              </span>
              <span className="hidden md:inline">·</span>
              <span>{p.trust?.review_count?.toLocaleString() || "75"} Verified Reviews</span>
              <span className="hidden md:inline">·</span>
              <span>{p.trust?.guarantee || "Satisfaction Guaranteed"}</span>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Rating", value: p.trust?.rating?.toFixed(1) || "4.8", sub: "Local Authority" },
                { label: "Reviews", value: p.trust?.review_count?.toLocaleString() || "75", sub: "Verified Feedback" },
                { label: "Response", value: "< 5 min", sub: "Instant AI Reply" },
                { label: "Years", value: p.trust?.years_in_business || "15+", sub: "In Business" },
              ].map((s) => (
                <div key={s.label} className="glass-strong p-5 rounded-2xl text-center border border-white/8 hover:border-brand-500/30 transition-all group">
                  <div className="text-3xl font-black text-brand-500 font-display mb-1">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{s.label}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/3">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white font-display mb-4">Services</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Comprehensive {p.niche || "service"} solutions designed for {city} homeowners and businesses.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(p.services || []).map((service: any) => (
                <div
                  key={service.id || service.title}
                  className="glass-strong p-6 rounded-2xl border border-white/8 hover:border-brand-500/40 hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 mb-5 group-hover:bg-brand-500/20 transition-colors">
                    <LucideIcon name={service.icon || "zap"} size={24} strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">{service.blurb}</p>
                  <ul className="space-y-2 mb-6">
                    {(service.features || []).map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckIcon size={14} strokeWidth={2} className="text-brand-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl border border-white/10 transition-all capitalize"
                  >
                    {service.cta || "Learn More"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white font-display mb-4">What {city} Says</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Real reviews from real {city} customers. See why {name} is the top choice.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(p.testimonials || []).map((t: any) => (
                <div
                  key={t.id || t.quote}
                  className="glass-strong p-6 rounded-2xl border border-white/8 relative group"
                >
                  <div className="absolute top-6 right-6 text-[10px] uppercase tracking-widest text-brand-400/60 font-bold">
                    ⭐ {t.stars}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs">
                      {t.name?.charAt(0) || "J"}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.location} · {t.service}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Receptionist Demo */}
        <section id="receptionist" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white font-display mb-4">24/7 AI Receptionist</h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Your AI front desk answers calls, books jobs, captures leads, and sends SMS callbacks — day or night.
              </p>
            </div>
            <ReceptionistDemo
              businessName={name}
              city={city}
              niche={p.niche || "roofing"}
              script={p.receptionist?.script || ""}
              audioUrl={receptionistUrl}
              tools={p.receptionist?.tools || []}
              greeting={p.receptionist?.greeting || `Thanks for calling ${name}! How can I help you today?`}
            />
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/3">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white font-display mb-4">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-3">
              {(p.faq || []).map((f: any) => (
                <div key={f.id || f.q} className="glass-strong rounded-xl border border-white/8 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-bold text-white hover:bg-white/5 transition-colors"
                  >
                    {f.q}
                    <ChevronDownIcon size={18} strokeWidth={2} />
                  </button>
                  <div className="px-6 pb-4 text-sm text-gray-400 leading-relaxed">{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact / CTA */}
        <section id="contact" className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-brand-700/20" />
          <div className="relative z-10 max-w-3xl mx-auto glass-strong rounded-[2rem] p-8 sm:p-12 text-center border border-white/10">
            <h2 className="text-3xl md:text-4xl font-bold text-white font-display mb-4">
              {p.cta?.headline || `Get Your Free {p.niche || "Service"} Estimate`}
            </h2>
            <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-md mx-auto">
              {p.cta?.subheadline || `Stop losing leads to competitors. Book your free estimate with {name} today.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <a
                href={phoneHref}
                className="flex items-center gap-2 px-8 py-4 bg-white text-ink-900 font-bold rounded-xl text-lg hover:bg-gray-100 transition-all shadow-xl"
              >
                <PhoneIcon size={20} strokeWidth={2} /> Call Now
              </a>
              <a
                href="/book"
                className="px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-700 text-white font-bold rounded-xl text-lg hover:brightness-110 shadow-[0_0_40px_-15px_rgba(214,165,54,0.5)] transition-all"
              >
                {p.cta?.button_text || "Book Online"}
              </a>
            </div>
            <div className="mt-6 text-xs text-gray-500">
              {p.contact?.address || city} &bull; {p.contact?.hours || "Mon–Sat 7am–7pm"} &bull;
              {p.contact?.email || `info@${name.toLowerCase().replace(/\s+/g, "")}.com`}
            </div>
            <p className="mt-3 text-xs text-gray-500">{p.cta?.urgency || "Limited free estimates available this week."}</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-ink-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-brand-500 font-bold">Merit Media & Marketing</span>
            <span className="text-gray-400">· AI-Powered Local Growth</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/" className="hover:text-brand-400 transition-colors">Back to Site</a>
            <a href="/privacy" className="hover:text-brand-400 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-brand-400 transition-colors">Terms</a>
          </div>
          <div className="text-[10px]">Generated via Impressive AI Site Builder · No $49 tiers</div>
        </div>
      </footer>
    </div>
  );
}

// Local icon components (lucide-react wrappers to avoid import bloat issues)
function ArrowRightIcon({ size = 20, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  );
}
function MicIcon({ size = 20, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
  );
}
function PhoneIcon({ size = 20, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 0 7h0.18"/><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 0 7h0.18"/></svg>
  );
}
function StarIcon({ size = 20, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  );
}
function CheckIcon({ size = 16, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  );
}
function ChevronDownIcon({ size = 18, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  );
}
function LucideIcon({ name, size = 24, strokeWidth = 2 }: { name: string; size?: number; strokeWidth?: number }) {
  // Minimal inline icon map for common lucide names used in services
  const icons: Record<string, string> = {
    zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 1.4l3.77-3.77a6 6 0 0 1-0.4-5.6L16.1 1a1 1 0 0 0-1.4 0L7.4 7.6a6 6 0 0 1-5.6 0.4L5 10.1a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 1.4l3.77-3.77a6 6 0 0 1 5.6-0.4L14.7 6.3z"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="3" y1="14" y2="22"/>',
    droplet: '<path d="M12 2.69c5.21 0 9 4.39 9 9.69 0 6.4-10.52 12.48-10.52 12.48S1.51 18.19 1.51 12.38C1.51 7.08 5.07 2.69 12 2.69z"/>',
    roof: '<path d="M3 21v-2a2 2 0 0 1 2-2h2.8L12 1l4.2 15H19a2 2 0 0 1 2 2v2z"/>',
  };
  const d = icons[name] || icons.zap;
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />;
}
