import { HeroSection } from "@/components/landing/HeroSection";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <FeatureCards />
      <Footer />
    </main>
  );
}
