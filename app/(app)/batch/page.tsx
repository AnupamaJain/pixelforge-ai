import type { Metadata } from "next";
import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { UpgradeGate } from "@/components/generation/upgrade-gate";
import { BatchView } from "./view";

export const metadata: Metadata = { title: "Batch" };

export default async function BatchPage() {
  const auth = await requireAuthContext();

  if (!auth.plan.features.batchGeneration) {
    return (
      <UpgradeGate
        title="Batch generation is a paid feature"
        description="Paste a spreadsheet and generate your whole catalogue in one run instead of one prompt at a time. Upgrade to unlock it."
      />
    );
  }

  const admin = createAdminClient();
  const { data: brandKits } = await admin
    .from("brand_kits")
    .select("id, name, is_default")
    .eq("user_id", auth.user.id)
    .order("is_default", { ascending: false });

  return (
    <BatchView
      maxRows={auth.plan.maxBatchRows}
      maxImagesPerRow={Math.min(4, auth.plan.maxImagesPerRequest)}
      maxResolution={auth.plan.maxResolution}
      planName={auth.plan.name}
      brandKits={brandKits ?? []}
      canUseProductScenes={auth.plan.features.productScenes}
    />
  );
}
