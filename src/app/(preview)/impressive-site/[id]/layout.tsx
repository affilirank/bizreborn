import type { Metadata } from "next";
export const metadata: Metadata = { title: "AI Site Preview", description: "Built exclusively for this business." };
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Floating isolation bar — zero parent branding */}
      <div className="fixed top-0 left-0 right-0 z-[80] flex items-center justify-between px-4 py-2.5 text-[11px] md:text-xs bg-ink-950/90 backdrop-blur-xl border-b border-white/10">
        <span className="text-gray-300 font-medium">Preview built exclusively for <strong className="text-amber-400">This Business</strong></span>
        <a href="/book" className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[10px] hover:brightness-110 shadow-lg shadow-amber-500/20 transition">Claim Site & AI Agent · $150/mo</a>
      </div>
      {children}
    </>
  );
}
