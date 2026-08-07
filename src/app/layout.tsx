import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import DemoBanner from "@/components/demo-banner";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ChatWidget from "@/components/chat-widget";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "Biz Reborn Marketing \u2014 Dominate Your Local Market",
  description:
    "AI-driven local marketing agency. Get more customers with brand audits, reputation management, and automated systems.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="bg-ink-950 text-mist antialiased font-sans">
        <DemoBanner />
        <Navbar />
        <main>{children}</main>
        <Footer />
        <ChatWidget />
      </body>
    </html>
  );
}
