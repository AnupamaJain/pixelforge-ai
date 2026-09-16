import type { Metadata } from "next";
import { requireAuthContext } from "@/lib/auth";
import { UpgradeGate } from "@/components/generation/upgrade-gate";
import { GENERATIONS_BUCKET, createSignedUrl } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { UpscaleWorkspace } from "./workspace";

export const metadata: Metadata = { title: "Upscale" };

export default async function UpscalePage({
  searchParams,
}: {
  searchParams: Promise<{ output?: string }>;
}) {
  const auth = await requireAuthContext();

  if (!auth.plan.features.upscale) {
    return (
      <UpgradeGate
        title="Upscaling is a Pro feature"
        description="Enlarge any image to 2× or 4× with a real super-resolution model. Upgrade to Pro to unlock upscaling, transforms and higher resolutions."
      />
    );
  }

  // Deep-linked from the gallery: preload the chosen image if it's the caller's.
  const { output: outputId } = await searchParams;
  let preselected: { id: string; url: string | null; prompt: string } | null = null;

  if (outputId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("generation_outputs")
      .select("id, storage_path, generations(prompt)")
      .eq("id", outputId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (data) {
      const parent = data.generations as unknown as { prompt?: string } | null;
      preselected = {
        id: data.id,
        url: await createSignedUrl(GENERATIONS_BUCKET, data.storage_path),
        prompt: parent?.prompt ?? "",
      };
    }
  }

  return (
    <UpscaleWorkspace
      preselected={preselected}
      maxUploadMb={Number(process.env.MAX_UPLOAD_SIZE_MB || 10)}
    />
  );
}
