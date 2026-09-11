"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/audit", label: "AI Brand Audit" },
  { href: "/services", label: "Service Menu" },
  { href: "/book", label: "Book a Call" },
  { href: "/blog", label: "Blog & Guides" },
  { href: "/contact", label: "Contact Us" },
  { href: "/dashboard", label: "Client Portal" },
  { href: "/admin", label: "Admin Portal" },
  { href: "/login", label: "Sign In" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-ink-800/60 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-glow-500 shadow-lg shadow-brand-500/20">
            <span className="text-sm font-bold leading-none text-white">BR</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-white">
              Biz Reborn
            </span>
            <span className="text-[10px] font-medium tracking-wider text-brand-400 uppercase">
              Marketing
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-xs font-medium text-ink-300 transition-all hover:bg-ink-800/60 hover:text-brand-300"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-ink-300 hover:bg-ink-800/60 lg:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-800/60 bg-ink-950/95 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-300 transition-all hover:bg-ink-800/60 hover:text-brand-300"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
