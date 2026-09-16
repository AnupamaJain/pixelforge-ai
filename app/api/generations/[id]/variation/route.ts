import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { calculateCreditCost } from "@/config/credits";
import { applyStyle } from "@/config/styles";
import { getProvider } from "@/lib/generation-engine";
import { createGenerationJob } from "@/lib/jobs/create";
import { limitGeneration, RateLimitError } from "@/lib/rate-limit";
import { UPLOADS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, NotFoundError, PlanRestrictionError } from "@/lib/api/respond";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/generations/:id/variation — re-run a generation with a new seed.
 *
 * Reuses the original prompt, style and parameters but produces a brand-new
 * generation with its own id and its own credit transaction.
 */
export async function POST(_request: NextRequest, context: Context) {
  try {
    const auth = await requireAuthContext();
    const { id } = await context.params;

    const limit = limitGeneration(auth.user.id);
    if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);

    const admin = createAdminClient();
    const { data: original } = await admin
      .from("generations")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!original) throw new NotFoundError("That generation could not be found.");

    if (original.type === "UPSCALE") {
      throw new PlanRestrictionError(
        "Upscales can't be varied. Generate a variation of the original image instead.",
      );
    }

    if (original.type === "IMAGE_TO_IMAGE" && !auth.plan.features.imageToImage) {
      throw new PlanRestrictionError(
        "Image-to-image is a Pro feature. Upgrade to vary this generation.",
      );
    }

    const imageCount = Math.min(
      original.image_count ?? 1,
      auth.plan.maxImagesPerRequest,
    );

    const creditCost = calculateCreditCost({
      type: original.type,
      imageCount,
    });

    const capabilities = getProvider().capabilities;
    const styled = applyStyle(
      original.style_id,
      original.prompt,
      original.negative_prompt,
    );

    const result = await createGenerationJob({
      auth,
      type: original.type,
      rawPrompt: original.prompt,
      rawNegativePrompt: original.negative_prompt,
      styleId: original.style_id,
      creditCost,
      parentGenerationId: original.id,
      engineInput: {
        type: original.type,
        prompt: styled.prompt,
        negativePrompt: styled.negativePrompt,
        width: original.width ?? 1024,
        height: original.height ?? 1024,
        imageCount,
        // A fresh random seed is the whole point of a variation.
        seed: null,
        steps: capabilities.supportsSteps ? (original.steps ?? undefined) : undefined,
        guidance: capabilities.supportsGuidance
          ? (original.guidance ?? undefined)
          : undefined,
        strength: original.strength ?? undefined,
        model: original.model,
        sourceBucket: original.source_image_path ? UPLOADS_BUCKET : undefined,
        sourcePath: original.source_image_path ?? undefined,
      },
    });

    return NextResponse.json(
      {
        generationId: result.generationId,
        status: "QUEUED",
        creditCost,
        creditsRemaining: result.creditsRemaining,
      },
      { status: 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
