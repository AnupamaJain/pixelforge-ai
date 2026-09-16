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
            Pricing that tracks what you actually make
          </h1>
          <p className="mt-4 leading-relaxed text-fg-muted">
            Credits are spent per image, never per session. One image costs{" "}
            {CREDIT_COSTS.TEXT_TO_IMAGE} credit, a transform costs{" "}
            {CREDIT_COSTS.IMAGE_TO_IMAGE}, and upscales cost{" "}
            {CREDIT_COSTS.UPSCALE_2X} at 2× or {CREDIT_COSTS.UPSCALE_4X} at 4×.
            Failed generations are always refunded.
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
