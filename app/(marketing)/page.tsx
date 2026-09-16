import type { Metadata } from "next";

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
import { JsonLd } from "@/components/seo/json-ld";
import { HOME_FAQS } from "@/components/marketing/sections";
import { buildMetadata } from "@/lib/seo/metadata";
import { faqSchema } from "@/lib/seo/structured-data";
import { SITE } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  path: "/",
});

export default function LandingPage() {
  return (
    <>
      <JsonLd data={faqSchema(HOME_FAQS)} />
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
