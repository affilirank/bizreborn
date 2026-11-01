/**
 * Impressive AI Site — Matrix Architecture Preview (30 Variations)
 * Isolated from root layout. Dynamic archetype + niche skin selection.
 */
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { buildImpressiveSiteForProspect } from "@/lib/impressive-site-generator";
import { NICHE_SKINS, ARCHETYPES } from "@/lib/preview/niche-skins";
import ArchetypeDirectCall from "@/components/preview/archetypes/DirectCall";
import ArchetypePortfolioShowcase from "@/components/preview/archetypes/PortfolioShowcase";
import ArchetypeLocalAuthority from "@/components/preview/archetypes/LocalAuthority";

type PageProps = { params: Promise<{ id: string }> };

export const generateMetadata = async ({ params }: PageProps) => {
  const { id } = await params;
  try {
    const admin = createServiceClient();
    if (admin) {
      const { data } = await admin.from("prospects").select("business_name,city").eq("id", id).maybeSingle();
      if (data) return { title: `${data.business_name} — AI Site Preview`, description: `Custom site preview for ${data.business_name} in ${data.city ?? "local market"}. Built exclusively for this business.` };
    }
  } catch {}
  return { title: "AI Site Preview — Built Exclusively for This Business", description: "Custom site preview with AI front-desk and local service details." };
};

export default async function ImpressiveSitePage({ params }: PageProps) {
  const { id } = await params;
  let payload: any = null;
  let prospect: any = null;

  const admin = createServiceClient();
  if (admin) {
    const q = await admin.from("prospects")
      .select("id,business_name,city,phone,google_rating,review_count,impressive_site_data,niche,recommended_services")
      .eq("id", id).maybeSingle();
    prospect = q.data;
    payload = q.data?.impressive_site_data || null;
  }

  if (!payload) {
    const result = await buildImpressiveSiteForProspect(id);
    if (!result) return notFound();
    payload = result.payload;
    prospect = { business_name: payload.business_name, city: payload.city, phone: payload.contact?.phone || "(772) 555-0199", google_rating: payload.trust?.rating || 4.8, review_count: payload.trust?.review_count || 75 };
  }

  const p = payload;
  const businessName = p.business_name || prospect?.business_name || "This Business";
  const city = p.city || prospect?.city || "Local";
  const phone = p.contact?.phone || prospect?.phone || "(772) 555-0199";
  const rating = String(p.trust?.rating || prospect?.google_rating || "4.8");
  const reviews = String(p.trust?.review_count || prospect?.review_count || "75");

  // Niche selection: from payload if available, else default to roofing
  const nicheId = p.niche || "roofing";
  const skin = NICHE_SKINS.find((n) => n.id === nicheId) || NICHE_SKINS[0];

  // Archetype selection: from payload or auto by niche preference
  const archetypeId = p.archetype || (p.archetype === null ? "DirectCall" : (skin.archetypes[0] ?? "DirectCall"));
  const services = (p.services || [
    { title: p.services?.[0]?.title || "Inspection & Repair", blurb: "Licensed professionals delivering quality work on every job." },
    { title: p.services?.[1]?.title || "Installation", blurb: "Premium materials with manufacturer warranties included." },
    { title: p.services?.[2]?.title || "Emergency Service", blurb: "24/7 rapid response when you need it most." },
    { title: p.services?.[3]?.title || "Maintenance", blurb: "Scheduled upkeep to protect your investment long-term." },
  ]);

  const props = { niche: skin, businessName, city, phone, rating, reviews, services };

  // Render the correct archetype — fully isolated from Merit Marketing layout
  if (archetypeId === "PortfolioShowcase") return <ArchetypePortfolioShowcase {...props} />;
  if (archetypeId === "LocalAuthority") return <ArchetypeLocalAuthority {...props} />;
  return <ArchetypeDirectCall {...props} />;
}
