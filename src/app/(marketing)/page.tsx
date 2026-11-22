import { Hero } from "@/components/home/hero";
import { AuditWidget } from "@/components/audit/audit-widget";
import { PainPoints } from "@/components/home/pain-points";
import { Stats } from "@/components/home/stats";
import { Engines } from "@/components/home/engines";
import { PillarsPreview } from "@/components/home/pillars-preview";
import { Testimonials } from "@/components/home/testimonials";
import { FinalCTA } from "@/components/home/final-cta";
import { Container } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <PainPoints />
      <Stats />
      <Engines />
      <PillarsPreview />

      {/* Engine A — embedded audit widget */}
      <section id="audit" className="relative scroll-mt-24 py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-96 w-[700px] -translate-x-1/2 rounded-full bg-brand-500/8 blur-[140px]" />
        </div>
        <Container className="relative">
          <SectionHeading
            eyebrow="Engine One · Free"
            title={
              <>
                How Healthy Is Your Brand{" "}
                <span className="text-gradient-brand">Right Now?</span>
              </>
            }
            description="Run the AI audit, get your Brand Health Score out of 100, and see exactly where competitors are beating you."
          />
          <AuditWidget />
        </Container>
      </section>

      <Testimonials />
      <FinalCTA />
    </>
  );
}
