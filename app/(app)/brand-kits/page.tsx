import type { Metadata } from "next";
import { requireAuthContext } from "@/lib/auth";
import { UpgradeGate } from "@/components/generation/upgrade-gate";
import { BrandKitsView } from "./view";

export const metadata: Metadata = { title: "Brand Kits" };

export default async function BrandKitsPage() {
  const auth = await requireAuthContext();

  if (!auth.plan.features.brandKits) {
    return (
      <UpgradeGate
        title="Brand kits are a paid feature"
        description="Lock every generation to your palette, your language and your look — so output stops arriving off-brand. Upgrade to create one."
      />
    );
  }

  return <BrandKitsView limit={auth.plan.maxBrandKits} planName={auth.plan.name} />;
}
