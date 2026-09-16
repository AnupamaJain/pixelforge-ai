import type { Metadata } from "next";
import { requireAuthContext } from "@/lib/auth";
import { getActiveCapabilities } from "@/lib/generation-engine";
import { GenerateWorkspace } from "./workspace";

export const metadata: Metadata = { title: "Generate" };

export default async function GeneratePage() {
  const auth = await requireAuthContext();
  const capabilities = getActiveCapabilities();

  return (
    <GenerateWorkspace
      maxImages={Math.min(capabilities.maxImagesPerRequest, auth.plan.maxImagesPerRequest)}
      maxResolution={auth.plan.maxResolution}
      supportsSteps={capabilities.supportsSteps}
      supportsGuidance={capabilities.supportsGuidance}
      supportsSeed={capabilities.supportsSeed}
      models={capabilities.availableModels}
    />
  );
}
