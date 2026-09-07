import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DemoBanner } from "@/components/layout/demo-banner";
import { ChatWidget } from "@/components/chat/chat-widget";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Biz Reborn Marketing — Dominate Your Local Market",
    template: "%s · Biz Reborn Marketing",
  },
  description:
    "AI-driven local audit systems, high-converting content infrastructure, and modular marketing pipelines designed to dominate your local market.",
  openGraph: {
    title: "Biz Reborn Marketing",
    description:
      "Stop burning cash on invisible marketing. Reborn your business into a local category leader.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0F17",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink-900 text-mist">
        <DemoBanner />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <ChatWidget />
      </body>
    </html>
  );
}
