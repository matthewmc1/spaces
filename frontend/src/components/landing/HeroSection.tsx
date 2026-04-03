import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

function BoardPreview() {
  const columns = [
    { name: "Planned", color: "bg-teal-500", cards: 3 },
    { name: "In Progress", color: "bg-amber-500", cards: 2 },
    { name: "Review", color: "bg-orange-400", cards: 1 },
    { name: "Done", color: "bg-emerald-500", cards: 4 },
  ];

  return (
    <div className="mx-auto max-w-4xl mt-16 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
      <div className="bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] border border-neutral-200/60 p-6 overflow-hidden">
        {/* Fake toolbar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-neutral-200" />
            <div className="w-3 h-3 rounded-full bg-neutral-200" />
            <div className="w-3 h-3 rounded-full bg-neutral-200" />
          </div>
          <div className="h-5 w-32 bg-neutral-100 rounded-full" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-neutral-100 rounded-[var(--radius-sm)]" />
            <div className="h-6 w-16 bg-neutral-100 rounded-[var(--radius-sm)]" />
          </div>
        </div>
        {/* Fake columns */}
        <div className="flex gap-4">
          {columns.map((col) => (
            <div key={col.name} className="flex-1">
              <div className={`h-0.5 ${col.color} rounded-full mb-3`} />
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-[family-name:var(--font-display)] text-neutral-600">
                  {col.name}
                </span>
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-neutral-400">
                  {col.cards}
                </span>
              </div>
              <div className="space-y-2">
                {Array.from({ length: col.cards }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-neutral-50 rounded-[var(--radius-md)] p-3 border border-neutral-100"
                  >
                    <div
                      className="h-2.5 bg-neutral-200 rounded-full mb-2"
                      style={{ width: `${60 + Math.random() * 35}%` }}
                    />
                    <div
                      className="h-2 bg-neutral-100 rounded-full"
                      style={{ width: `${40 + Math.random() * 40}%` }}
                    />
                  </div>
                ))}
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
          className="text-5xl font-[family-name:var(--font-display)] tracking-[-0.02em] text-neutral-800 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          Strategic alignment, visible everywhere.
        </h1>
        <p
          className="mt-5 text-lg text-neutral-500 max-w-xl mx-auto leading-relaxed animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          From strategic vision to daily delivery. Spaces gives your teams the clarity to align on what matters, see where effort flows, and ship with confidence.
        </p>
        <div
          className="mt-8 flex items-center justify-center gap-3 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <Link href="/spaces">
            <Button size="lg">Get Started</Button>
          </Link>
          <Button variant="secondary" size="lg">
            Learn More
          </Button>
        </div>
        <div className="mt-12 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
          <p className="text-xs text-neutral-400 uppercase tracking-[0.1em] mb-3">Why clarity matters</p>
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto text-left">
            <div>
              <p className="text-2xl font-[family-name:var(--font-mono)] font-semibold text-primary-600">73%</p>
              <p className="text-xs text-neutral-500 mt-1">of strategic initiatives fail due to poor alignment between teams and goals</p>
            </div>
            <div>
              <p className="text-2xl font-[family-name:var(--font-mono)] font-semibold text-primary-600">2.5x</p>
              <p className="text-xs text-neutral-500 mt-1">faster delivery when teams can see how their work connects to outcomes</p>
            </div>
            <div>
              <p className="text-2xl font-[family-name:var(--font-mono)] font-semibold text-primary-600">40%</p>
              <p className="text-xs text-neutral-500 mt-1">reduction in wasted effort when priorities are visible across the org</p>
            </div>
          </div>
        </div>
      </div>
      <BoardPreview />
    </section>
  );
}
