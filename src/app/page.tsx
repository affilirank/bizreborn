import Hero from "@/components/hero";
import PainPoints from "@/components/pain-points";
import Stats from "@/components/stats";
import Engines from "@/components/engines";
import PillarsPreview from "@/components/pillars-preview";
import AuditWidget from "@/components/audit-widget";
import Testimonials from "@/components/testimonials";
import FinalCTA from "@/components/final-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <PainPoints />
      <Stats />
      <Engines />
      <PillarsPreview />
      <AuditWidget />
      <Testimonials />
      <FinalCTA />
    </>
  );
}
