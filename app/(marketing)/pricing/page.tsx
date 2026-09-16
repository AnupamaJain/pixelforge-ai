import type { Metadata } from "next";
import { Faq, FinalCta, PricingSection } from "@/components/marketing/sections";
import { CREDIT_COSTS } from "@/config/credits";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple credit-based pricing. Start free, upgrade for transforms, upscaling and higher resolutions.",
};

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pricing that tracks what you actually ship
          </h1>
          <p className="mt-4 leading-relaxed text-fg-muted">
            A product photoshoot costs $500–5,000 and takes a week. Credits
            meter what you actually make: {CREDIT_COSTS.PRODUCT_SCENE} per
            product scene, {CREDIT_COSTS.TEXT_TO_IMAGE} per generated image, and{" "}
            {CREDIT_COSTS.UPSCALE_4X} for a 4× upscale. Failed runs are always
            refunded.
          </p>
        </div>
      </section>

      <div className="border-b border-border py-12 sm:py-16">
        <PricingSection compact />
      </div>

      <Faq />
      <FinalCta />
    </>
  );
}
