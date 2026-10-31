import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { generateSitePayload, buildPreviewForProspect } from "@/lib/ai-site-generator";

type PageProps = {
  params: Promise<{ id: string; slug?: string[] }>;
};

export default async function AIPreviewPage({ params }: PageProps) {
  const { id, slug } = await params;
  let payload = null;
  let url = `/ai-site/${id}`;
  let prospect: any = null;

  // Try to load cached payload first
  const admin = createServiceClient();
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : 'unknown';
  console.log('[ai-site] Querying DB host:', supabaseHost, '| Request ID:', id);
  if (admin) {
    const queryResult = await admin.from("prospects").select("id,business_name,generated_site_data,receptionist_audio_url,google_rating,review_count").eq("id", id).maybeSingle();
    const queryData = queryResult.data;
    const queryError = queryResult.error;
    console.log('[ai-site] Query result:', {
      hasData: Boolean(queryData),
      hasSiteData: Boolean(queryData?.generated_site_data),
      error: queryError ? queryError.message : null,
    });
    if (queryError) console.error("[ai-site] prospect not found:", id, queryError);
    prospect = queryData;
    if (prospect?.generated_site_data) {
      payload = prospect.generated_site_data;
    }
  }

  // Fallback: generate on first visit (cached after)
  if (!payload) {
    const result = await buildPreviewForProspect(id, Array.isArray(slug) ? slug.join("/") : slug);
    if (!result) return notFound();
    payload = result.payload;
    url = result.url;
  }

  // Load receptionist audio if cached
  let receptionistUrl: string | null = null;
  if (admin) {
    const { data: r, error: rErr } = await admin.from("prospects").select("receptionist_audio_url,business_name").eq("id", id).single();
    if (rErr) console.error("Supabase audio query error:", rErr);
    receptionistUrl = r?.receptionist_audio_url ?? null;
  }

  const p = payload as { hero: { headline: string; subheadline: string; badge: string; cta_text: string }; services: Array<{ title: string; blurb: string; icon: string }>; testimonials: Array<{ quote: string; name: string; stars: number }>; faq: Array<{ q: string; a: string }>; meta: { title: string; description: string } };
  const name = prospect ? prospect.business_name || "Your Business" : "Your Business";

  return (
    <div className="min-h-screen bg-[#0B0F17] text-gray-100 font-sans">
      <header className="sticky top-0 z-50 bg-[#0B0F17]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="font-display font-bold text-brand-cyan text-lg tracking-tight">Merit Media &amp; Marketing</a>
          <a href="tel:+17725550199" className="hidden sm:inline-flex ml-4 px-3 py-1.5 rounded-full bg-brand-cyan/10 text-brand-cyan text-xs font-extrabold hover:bg-brand-cyan/20 transition">Call (772) 555-0199</a>
          <a href="/" className="text-xs text-brand-cyan hover:underline">Back to site</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 md:py-20 space-y-20">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-brand-card to-brand-obsidian border border-white/10 shadow-2xl p-8 md:p-14">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 space-y-6">
            <span className="inline-block px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-[11px] font-extrabold uppercase tracking-wider">AI-Generated Preview</span>
            <h1 className="text-3xl md:text-6xl font-extrabold text-white font-display leading-[1.1] tracking-tight">
              {p.hero.headline}
            </h1>
            <p className="text-gray-300 text-base md:text-xl max-w-2xl leading-relaxed">{p.hero.subheadline}</p>
            <div className="pt-4 flex flex-wrap gap-3">
              <a href="#contact" className="inline-block px-7 py-3.5 bg-gradient-to-r from-brand-cyan to-brand-blue text-[#04060A] font-extrabold rounded-xl hover:brightness-110 transition shadow-lg text-sm uppercase tracking-wider">{p.hero.cta_text}</a>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-xs font-bold text-brand-gold">{p.hero.badge}</span>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Rating", value: prospect?.google_rating != null ? `${prospect.google_rating}/5` : "—", sub: "Local Authority" },
            { label: "Reviews", value: prospect?.review_count != null ? String(prospect.review_count) : "0", sub: "Verified Feedback" },
            { label: "Response", value: "24/7 AI", sub: "Instant DM & Call" },
            { label: "Location", value: prospect?.city ? String(prospect.city) : "—", sub: "Geographic Reach" },
          ].map((s) => (
            <div key={s.label} className="bg-[#0E1526]/60 border border-white/8 rounded-2xl p-5 text-center space-y-1 hover:border-brand-cyan/20 transition">
              <div className="text-2xl font-black text-brand-cyan font-display">{s.value}</div>
              <div className="text-xs text-gray-400">{s.sub}</div>
            </div>
          ))}
        </section>

        {/* Services */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-white font-display mb-6">Services</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {p.services.map((s: any) => (
              <div key={s.title} className="bg-[#0E1526]/60 glass-border rounded-2xl p-6 space-y-2 hover:border-brand-cyan/20 transition">
                <h3 className="font-bold text-white text-base">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-gradient-to-b from-brand-card/60 to-brand-navy/40 rounded-3xl p-8 md:p-10 border border-white/10">
          <h2 className="text-xl md:text-2xl font-bold text-white font-display mb-6">What Clients Say</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {p.testimonials.map((t: any, i: number) => (
              <blockquote key={i} className="bg-brand-obsidian/60 rounded-2xl p-6 border border-white/5 relative">
                <div className="text-brand-gold font-bold text-xs tracking-widest mb-3">★★★★★</div>
                <p className="text-sm text-gray-300 leading-relaxed italic">"{t.quote}"</p>
                <div className="mt-4 text-xs font-semibold text-white">— {t.name}</div>
              </blockquote>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white font-display">Common Questions</h2>
          <div className="space-y-3">
            {p.faq.map((f: any, i: number) => (
              <div key={i} className="bg-[#0E1526]/60 border border-white/8 rounded-2xl p-5 space-y-1">
                <h3 className="font-bold text-white text-sm">{f.q}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Voice Receptionist Placeholder */}
        <section id="contact" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-cyan/15 to-brand-blue/10 border border-brand-cyan/30 p-8 md:p-12 space-y-6">
          <div className="absolute -top-16 -right-16 w-60 h-60 bg-brand-cyan/15 rounded-full blur-3xl pointer-events-none"></div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white font-display relative z-10">AI Voice Receptionist</h2>
          <p className="text-gray-300 relative z-10">Claim your preview site and 24/7 AI front desk. Schedule a walkthrough to activate the full pipeline.</p>
          <a href="#" className="inline-block relative z-10 px-6 py-3 bg-brand-cyan text-brand-obsidian font-extrabold rounded-xl hover:brightness-110 transition shadow-lg text-sm">Claim Your Website & AI Receptionist</a>
        </section>
      </main>

      {/* Voice Receptionist Section */}
      <section id="receptionist" className="bg-gradient-to-b from-brand-navy to-brand-obsidian border border-brand-cyan/20 rounded-3xl p-8 md:p-10 space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-cyan/20 text-brand-cyan font-extrabold text-lg">&#128222;</span>
          <h2 className="text-xl md:text-2xl font-bold text-white font-display">24/7 AI Receptionist Preview</h2>
          <span className="ml-auto px-2 py-0.5 rounded bg-brand-gold/10 text-brand-gold text-[10px] font-bold uppercase tracking-wider">Live Audio</span>
        </div>
        <p className="text-sm text-gray-300">Listen to how your new AI front desk answers when a prospect calls.</p>
        {receptionistUrl ? (
          <div className="bg-brand-obsidian/60 border border-white/10 rounded-2xl p-4 space-y-3">
            <audio controls preload="metadata" src={receptionistUrl} className="w-full rounded-xl" aria-label="AI Receptionist Preview" />
            <p className="text-xs text-brand-cyan font-medium">Preview for {name}</p>
          </div>
        ) : (
          <div className="bg-brand-obsidian/60 border border-dashed border-white/10 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">Audio demo will generate after first visit via AI Voice Pipeline.</p>
          </div>
        )}
      </section>

      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-xs text-gray-500">
        Generated via AI Site Generator &bull; Merit Media & Marketing, LLC &bull; <a href="/" className="text-brand-cyan hover:underline">Back to site</a>
      </footer>
    </div>
  );
}
