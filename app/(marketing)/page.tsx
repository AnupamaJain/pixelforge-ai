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
import { PlatformStrip } from "@/components/marketing/platform-strip";
import { ReviewWall } from "@/components/marketing/review-wall";
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
      <PlatformStrip />
      <PixelIdentical />
      <Playground />
      <Scenes />
      <Capabilities />
      <MarketplaceExport />
      <GallerySection />
      <HowItWorks />
      <ReviewWall />
      <PricingSection />
      <Faq />
      <FinalCta />
    </>
  );
}
