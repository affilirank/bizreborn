"use client";

import { Flame, EyeOff, Timer, Lock } from "lucide-react";

const pains = [
  {
    icon: Flame,
    title: "Burning Budget",
    desc: "Pouring money into ads that don't convert because your brand foundation is cracked.",
    color: "from-rose-500/20 to-rose-600/10",
    border: "border-rose-500/20",
    iconColor: "text-rose-400",
  },
  {
    icon: EyeOff,
    title: "Invisible",
    desc: "Your ideal customers can't find you online while competitors steal the spotlight.",
    color: "from-amber-500/20 to-amber-600/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: Timer,
    title: "Playing Catch-Up",
    desc: "Reacting to algorithm changes instead of setting the pace in your market.",
    color: "from-cyan-500/20 to-cyan-600/10",
    border: "border-cyan-500/20",
    iconColor: "text-cyan-400",
  },
  {
    icon: Lock,
    title: "Locked In",
    desc: "Stuck with agencies that overcharge and underdeliver. No transparency, no real results.",
    color: "from-purple-500/20 to-purple-600/10",
    border: "border-purple-500/20",
    iconColor: "text-purple-400",
  },
];

export default function PainPoints() {
  return (
    <section className="relative border-t border-ink-800/60 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sora text-2xl font-bold text-white sm:text-3xl">
            Sound Familiar?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Most local businesses are fighting blind. Here&apos;s what we hear
            every day — and exactly how we fix it.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pains.map((pain) => (
            <div
              key={pain.title}
              className={`group rounded-xl border ${pain.border} ${pain.color} p-6 transition-all hover:scale-[1.02]`}
            >
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${pain.iconColor} bg-ink-800/50`}
              >
                <pain.icon size={20} />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-white">
                {pain.title}
              </h3>
              <p className="text-xs leading-relaxed text-ink-400">{pain.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
