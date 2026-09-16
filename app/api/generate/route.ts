import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { calculateCreditCost } from "@/config/credits";
import { resolveDimensions, withinResolutionLimit } from "@/config/generation";
import { applyStyle } from "@/config/styles";
import { getProvider } from "@/lib/generation-engine";
import { createGenerationJob } from "@/lib/jobs/create";
import { limitGeneration, RateLimitError } from "@/lib/rate-limit";
import { assertPromptAllowed } from "@/lib/safety";
import { textToImageSchema } from "@/lib/validation/schemas";
import { BadRequestError, errorResponse, PlanRestrictionError } from "@/lib/api/respond";

export const runtime = "nodejs";
export const maxDuration = 300;

/** POST /api/generate — queue a text-to-image generation. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    const limit = limitGeneration(auth.user.id);
    if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);

    const body = await request.json().catch(() => {
      throw new BadRequestError("Invalid request body.");
    });
    const input = textToImageSchema.parse(body);

    assertPromptAllowed(input.prompt, input.negativePrompt);

    // --- Plan enforcement (server-side; the client's copy is display only) ---
    if (input.imageCount > auth.plan.maxImagesPerRequest) {
      throw new PlanRestrictionError(
        `Your ${auth.plan.name} plan allows up to ${auth.plan.maxImagesPerRequest} image${
          auth.plan.maxImagesPerRequest === 1 ? "" : "s"
        } per generation.`,
      );
    }

    const { width, height } = resolveDimensions(input.aspectRatio, input.baseSize);

    if (!withinResolutionLimit(width, height, auth.plan.maxResolution)) {
      throw new PlanRestrictionError(
        `Your ${auth.plan.name} plan is limited to ${auth.plan.maxResolution}px on the longest edge. Upgrade to Pro for larger images.`,
      );
    }

    const capabilities = getProvider().capabilities;
    const styled = applyStyle(input.styleId, input.prompt, input.negativePrompt);
    const creditCost = calculateCreditCost({
      type: "TEXT_TO_IMAGE",
      imageCount: input.imageCount,
    });

    const result = await createGenerationJob({
      auth,
      type: "TEXT_TO_IMAGE",
      rawPrompt: input.prompt,
      rawNegativePrompt: input.negativePrompt ?? null,
      styleId: input.styleId,
      creditCost,
      engineInput: {
        type: "TEXT_TO_IMAGE",
        prompt: styled.prompt,
        negativePrompt: styled.negativePrompt,
        width,
        height,
        imageCount: input.imageCount,
        seed: input.seed ?? null,
        // Only forward parameters the active engine actually honours.
        steps: capabilities.supportsSteps ? input.steps : undefined,
        guidance: capabilities.supportsGuidance ? input.guidance : undefined,
        model: input.model,
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
