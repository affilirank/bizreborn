import type { Metadata, Viewport } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DemoBanner } from "@/components/layout/demo-banner";
import { ChatWidget } from "@/components/chat/chat-widget";

export const metadata: Metadata = {
  title: {
    default: "Merit Marketing — Measurable Local Growth",
    template: "%s · Merit Marketing",
  },
  description:
    "AI-driven local audit systems, high-converting content infrastructure, and modular marketing pipelines designed to dominate your local market.",
  openGraph: {
    title: "Merit Marketing",
    description:
      "Stop burning cash on invisible marketing. Reborn your business into a local category leader.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0F17",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-900 text-mist">
      <DemoBanner />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
