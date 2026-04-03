import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-primary-50 to-white py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <Logo variant="full" size={48} className="justify-center mb-8" />
        <h1 className="text-3xl font-bold text-neutral-800 tracking-tight">
          Strategic alignment, visible everywhere.
        </h1>
        <p className="mt-4 text-lg text-neutral-500 max-w-xl mx-auto">
          Plan, prioritize, and deliver with clarity across every team and workstream.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/spaces">
            <Button size="lg">Get Started</Button>
          </Link>
          <Button variant="ghost" size="lg">Learn More</Button>
        </div>
      </div>
    </section>
  );
}
