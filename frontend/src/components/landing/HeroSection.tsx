import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

function PortfolioPreview() {
  const items = [
    { name: "Identity Platform 2026", health: "bg-emerald-500", type: "Programme", pct: 42, inFlight: 7 },
    { name: "Platform Team", health: "bg-amber-500", type: "Team", pct: 36, inFlight: 6 },
    { name: "Mobile Launch Q2", health: "bg-rose-500", type: "Programme", pct: 25, inFlight: 8 },
    { name: "Design & Research", health: "bg-emerald-500", type: "Department", pct: 63, inFlight: 4 },
  ];

  return (
    <div className="mx-auto max-w-4xl mt-16 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
      <div className="bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] border border-neutral-200/60 p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-neutral-200" />
            <div className="w-3 h-3 rounded-full bg-neutral-200" />
            <div className="w-3 h-3 rounded-full bg-neutral-200" />
          </div>
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Portfolio — Flight Level 3</span>
          <div className="flex gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">7 / 10 WIP</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.name} className={`border-l-4 rounded-[var(--radius-md)] border border-neutral-100 p-4`} style={{ borderLeftColor: item.health.replace("bg-", "").includes("emerald") ? "#10b981" : item.health.includes("amber") ? "#f59e0b" : "#f43f5e" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${item.health}`} />
                <span className="text-sm text-neutral-800 font-medium truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                <span>{item.type}</span>
                <span>{item.inFlight} in flight</span>
                <span>{item.pct}% done</span>
              </div>
              <div className="mt-2 h-1 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-400 rounded-full" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="teal-glow py-24 px-6 overflow-hidden">
      <div className="max-w-3xl mx-auto text-center">
        <div className="animate-fade-in-up">
          <Logo variant="full" size={48} className="justify-center mb-8" />
        </div>
        <h1
          className="text-6xl font-[family-name:var(--font-display)] tracking-[-0.02em] text-neutral-800 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          The operating system for engineering teams.
        </h1>
        <p
          className="mt-5 text-lg text-neutral-500 max-w-xl mx-auto leading-relaxed animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          Stop managing work in isolation. Spaces gives engineering leaders portfolio-level visibility,
          WIP discipline, and flow metrics — from org-level strategy to daily delivery.
        </p>
        <div
          className="mt-8 flex items-center justify-center gap-3 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <Link href="/sign-up">
            <Button size="lg">Start Free</Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="secondary" size="lg">Sign In</Button>
          </Link>
        </div>
        <div className="mt-12 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
          <p className="text-xs text-neutral-400 uppercase tracking-[0.1em] mb-3">Built on proven frameworks</p>
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto text-left">
            <div>
              <p className="text-sm font-medium text-primary-600">Flight Levels</p>
              <p className="text-xs text-neutral-500 mt-1">Portfolio boards at Level 3 where leadership has maximum leverage</p>
            </div>
            <div>
              <p className="text-sm font-medium text-primary-600">Flow Framework</p>
              <p className="text-xs text-neutral-500 mt-1">Feature/Defect/Risk/Debt classification shows where capacity actually goes</p>
            </div>
            <div>
              <p className="text-sm font-medium text-primary-600">WIP Discipline</p>
              <p className="text-xs text-neutral-500 mt-1">Explicit limits protect leadership attention — not just team throughput</p>
            </div>
          </div>
        </div>
      </div>
      <PortfolioPreview />
    </section>
  );
}
