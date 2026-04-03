import { redirect } from "next/navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  if (process.env.NEXT_PUBLIC_SHOW_LANDING !== "true") {
    redirect("/spaces");
  }

  return (
    <main>
      <HeroSection />
      <FeatureCards />
      <Footer />
    </main>
  );
}
