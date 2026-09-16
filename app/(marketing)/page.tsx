import {
  Capabilities,
  Faq,
  FinalCta,
  GallerySection,
  Hero,
  HowItWorks,
  MarketplaceExport,
  PixelIdentical,
  Playground,
  PricingSection,
  Scenes,
} from "@/components/marketing/sections";
import { Testimonials } from "@/components/marketing/testimonials";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <PixelIdentical />
      <Playground />
      <Scenes />
      <Capabilities />
      <MarketplaceExport />
      <GallerySection />
      <HowItWorks />
      <Testimonials />
      <PricingSection />
      <Faq />
      <FinalCta />
    </>
  );
}
