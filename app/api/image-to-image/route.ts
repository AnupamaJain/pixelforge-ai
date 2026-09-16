import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { calculateCreditCost } from "@/config/credits";
import { resolveDimensions, withinResolutionLimit } from "@/config/generation";
import { applyStyle } from "@/config/styles";
import { getProvider } from "@/lib/generation-engine";
import { createGenerationJob } from "@/lib/jobs/create";
import { limitGeneration, RateLimitError } from "@/lib/rate-limit";
import { assertPromptAllowed } from "@/lib/safety";
import { UPLOADS_BUCKET } from "@/lib/storage";
import { imageToImageSchema } from "@/lib/validation/schemas";
import { BadRequestError, errorResponse, PlanRestrictionError } from "@/lib/api/respond";

export const runtime = "nodejs";
export const maxDuration = 300;

/** POST /api/image-to-image — transform an uploaded image. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    if (!auth.plan.features.imageToImage) {
      throw new PlanRestrictionError(
        "Image-to-image is a Pro feature. Upgrade to transform your own images.",
      );
    }

    const limit = limitGeneration(auth.user.id);
    if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);

    const body = await request.json().catch(() => {
      throw new BadRequestError("Invalid request body.");
    });
    const input = imageToImageSchema.parse(body);

    assertPromptAllowed(input.prompt, input.negativePrompt);

    // The upload path is client-supplied, so confirm it sits inside this
    // user's namespace before it is ever read.
    const expectedPrefix = `users/${auth.user.id}/`;
    if (!input.sourcePath.startsWith(expectedPrefix)) {
      throw new BadRequestError("That source image could not be found.");
    }

    if (input.imageCount > auth.plan.maxImagesPerRequest) {
      throw new PlanRestrictionError(
        `Your ${auth.plan.name} plan allows up to ${auth.plan.maxImagesPerRequest} images per generation.`,
      );
    }

    const { width, height } = resolveDimensions(input.aspectRatio, input.baseSize);

    if (!withinResolutionLimit(width, height, auth.plan.maxResolution)) {
      throw new PlanRestrictionError(
        `Your ${auth.plan.name} plan is limited to ${auth.plan.maxResolution}px on the longest edge.`,
      );
    }

    const capabilities = getProvider().capabilities;
    const styled = applyStyle(input.styleId, input.prompt, input.negativePrompt);
    const creditCost = calculateCreditCost({
      type: "IMAGE_TO_IMAGE",
      imageCount: input.imageCount,
    });

    const result = await createGenerationJob({
      auth,
      type: "IMAGE_TO_IMAGE",
      rawPrompt: input.prompt,
      rawNegativePrompt: input.negativePrompt ?? null,
      styleId: input.styleId,
      creditCost,
      engineInput: {
        type: "IMAGE_TO_IMAGE",
        prompt: styled.prompt,
        negativePrompt: styled.negativePrompt,
        width,
        height,
        imageCount: input.imageCount,
        seed: input.seed ?? null,
        steps: capabilities.supportsSteps ? input.steps : undefined,
        guidance: capabilities.supportsGuidance ? input.guidance : undefined,
        strength: input.strength,
        model: input.model,
        // Read-only: the original upload is never overwritten.
        sourceBucket: UPLOADS_BUCKET,
        sourcePath: input.sourcePath,
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
