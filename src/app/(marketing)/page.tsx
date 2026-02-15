import { HeroSection } from "@/components/marketing/hero-section";
import { DemoMockup } from "@/components/marketing/demo-mockup";
import { PainSection } from "@/components/marketing/pain-section";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Capabilities } from "@/components/marketing/capabilities";
import { TheMath } from "@/components/marketing/the-math";
import { SocialProof } from "@/components/marketing/social-proof";
import { Pricing } from "@/components/marketing/pricing";
import { FAQ } from "@/components/marketing/faq";
import { FinalCTA } from "@/components/marketing/final-cta";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <DemoMockup />
      <PainSection />
      <HowItWorks />
      <Capabilities />
      <TheMath />
      <SocialProof />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  );
}
