import type { Metadata } from "next";
import { requireAuthContext } from "@/lib/auth";
import { UpgradeGate } from "@/components/generation/upgrade-gate";
import { PerformanceView } from "./view";

export const metadata: Metadata = { title: "Performance" };

export default async function PerformancePage() {
  const auth = await requireAuthContext();

  if (!auth.plan.features.performanceTracking) {
    return (
      <UpgradeGate
        title="Performance tracking is a Growth feature"
        description="Import how each creative actually performed, sort by ROAS, and let the next batch be informed by the last one. Available on Growth and Agency."
      />
    );
  }

  return <PerformanceView />;
}
