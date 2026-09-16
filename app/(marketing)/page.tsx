import {
  Faq,
  FinalCta,
  GallerySection,
  Hero,
  HowItWorks,
  ImageToImage,
  PricingSection,
  StylePresetsSection,
  TextToImage,
  Upscaling,
} from "@/components/marketing/sections";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <TextToImage />
      <ImageToImage />
      <Upscaling />
      <StylePresetsSection />
      <GallerySection />
      <HowItWorks />
      <PricingSection />
      <Faq />
      <FinalCta />
    </>
  );
}
