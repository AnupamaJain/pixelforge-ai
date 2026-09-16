import type { Metadata } from "next";

import { requireAuthContext } from "@/lib/auth";
import { getActiveCapabilities } from "@/lib/generation-engine";
import { createAdminClient } from "@/lib/supabase/admin";
import { UpgradeGate } from "@/components/generation/upgrade-gate";
import { ProductStudio } from "./workspace";

export const metadata: Metadata = { title: "Product Studio" };

export default async function ProductStudioPage() {
  const auth = await requireAuthContext();

  if (!auth.plan.features.productScenes) {
    return (
      <UpgradeGate
        title="Product Studio is a paid feature"
        description="Put your product in fifty scenes without a photoshoot — and keep it pixel-identical in every one. Upgrade to unlock it."
      />
    );
  }

  const capabilities = getActiveCapabilities();
  const admin = createAdminClient();

  const { data: brandKits } = await admin
    .from("brand_kits")
    .select("id, name, is_default")
    .eq("user_id", auth.user.id)
    .order("is_default", { ascending: false });

  return (
    <ProductStudio
      maxImages={Math.min(
        capabilities.maxImagesPerRequest,
        auth.plan.maxImagesPerRequest,
      )}
      maxResolution={auth.plan.maxResolution}
      supportsSteps={capabilities.supportsSteps}
      supportsGuidance={capabilities.supportsGuidance}
      engineSupportsScenes={capabilities.productScenes}
      brandKits={brandKits ?? []}
      canUseBrandKits={auth.plan.features.brandKits}
      maxUploadMb={Number(process.env.MAX_UPLOAD_SIZE_MB || 10)}
    />
  );
}
