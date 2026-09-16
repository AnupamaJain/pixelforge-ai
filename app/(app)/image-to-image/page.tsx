import type { Metadata } from "next";
import { requireAuthContext } from "@/lib/auth";
import { getActiveCapabilities } from "@/lib/generation-engine";
import { UpgradeGate } from "@/components/generation/upgrade-gate";
import { ImageToImageWorkspace } from "./workspace";

export const metadata: Metadata = { title: "Image to Image" };

export default async function ImageToImagePage() {
  const auth = await requireAuthContext();

  // Server-side gate. The route handler enforces this again on submit.
  if (!auth.plan.features.imageToImage) {
    return (
      <UpgradeGate
        title="Image to Image is a Pro feature"
        description="Upload your own images and redirect them with a prompt. Upgrade to Pro to unlock transforms, upscaling and higher resolutions."
      />
    );
  }

  const capabilities = getActiveCapabilities();

  return (
    <ImageToImageWorkspace
      maxImages={Math.min(capabilities.maxImagesPerRequest, auth.plan.maxImagesPerRequest)}
      maxResolution={auth.plan.maxResolution}
      supportsSteps={capabilities.supportsSteps}
      supportsGuidance={capabilities.supportsGuidance}
      supportsSeed={capabilities.supportsSeed}
      maxUploadMb={Number(process.env.MAX_UPLOAD_SIZE_MB || 10)}
    />
  );
}
