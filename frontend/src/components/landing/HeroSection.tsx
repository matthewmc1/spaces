import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="teal-glow py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <Logo variant="full" size={48} className="justify-center mb-8 animate-fade-in-up" />
        <h1 className="text-5xl font-[family-name:var(--font-display)] tracking-[-0.02em] text-neutral-800 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Strategic alignment, visible everywhere.
        </h1>
        <p className="mt-4 text-lg text-neutral-500 max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          Plan, prioritize, and deliver with clarity across every team and workstream.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Link href="/spaces">
            <Button size="lg">Get Started</Button>
          </Link>
          <Button variant="ghost" size="lg">Learn More</Button>
        </div>
      </div>
    </section>
  );
}
