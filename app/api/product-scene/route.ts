import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { calculateCreditCost } from "@/config/credits";
import { resolveDimensions, withinResolutionLimit } from "@/config/generation";
import { composeScenePrompt, getScene } from "@/config/scenes";
import { getProvider } from "@/lib/generation-engine";
import { createGenerationJob } from "@/lib/jobs/create";
import { limitGeneration, RateLimitError } from "@/lib/rate-limit";
import { assertPromptAllowed } from "@/lib/safety";
import { UPLOADS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { productSceneSchema } from "@/lib/validation/schemas";
import {
  BadRequestError,
  errorResponse,
  PlanRestrictionError,
} from "@/lib/api/respond";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/product-scene
 *
 * Queues a product-scene generation: the product is segmented, a scene is
 * generated around it, and the original product pixels are composited back.
 * See lib/generation-engine/product-scene.ts.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    if (!auth.plan.features.productScenes) {
      throw new PlanRestrictionError(
        "Product Studio is available on paid plans. Upgrade to keep your product pixel-identical across every scene.",
      );
    }

    const provider = getProvider();
    if (!provider.capabilities.productScenes) {
      throw new BadRequestError(
        "This server's image engine doesn't support product scenes.",
      );
    }

    const limit = limitGeneration(auth.user.id);
    if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);

    const body = await request.json().catch(() => {
      throw new BadRequestError("Invalid request body.");
    });
    const input = productSceneSchema.parse(body);

    // The upload path is client-supplied — confirm it's inside this user's space.
    if (!input.sourcePath.startsWith(`users/${auth.user.id}/`)) {
      throw new BadRequestError("That product image could not be found.");
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

    // Brand kit, if supplied, must belong to the caller.
    let brandModifier: string | null = null;
    let brandNegative: string | null = null;

    if (input.brandKitId) {
      const admin = createAdminClient();
      const { data: kit } = await admin
        .from("brand_kits")
        .select("prompt_modifier, negative_modifier, palette")
        .eq("id", input.brandKitId)
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (!kit) throw new BadRequestError("That brand kit could not be found.");

      const palette = Array.isArray(kit.palette) ? (kit.palette as string[]) : [];
      brandModifier = [
        kit.prompt_modifier,
        palette.length ? `colour palette ${palette.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      brandNegative = kit.negative_modifier;
    }

    const scene = getScene(input.sceneId);
    const composed = composeScenePrompt({
      sceneId: input.sceneId,
      productDescription: input.productDescription,
      brandModifier,
      extraPrompt: input.extraPrompt,
    });

    assertPromptAllowed(composed.prompt, composed.negativePrompt);

    const negativePrompt = [composed.negativePrompt, brandNegative]
      .filter(Boolean)
      .join(", ");

    const creditCost = calculateCreditCost({
      type: "PRODUCT_SCENE",
      imageCount: input.imageCount,
    });

    const result = await createGenerationJob({
      auth,
      type: "PRODUCT_SCENE",
      rawPrompt: input.productDescription?.trim()
        ? `${input.productDescription.trim()} — ${scene.name}`
        : scene.name,
      rawNegativePrompt: input.extraPrompt ?? null,
      styleId: null,
      creditCost,
      engineInput: {
        type: "PRODUCT_SCENE",
        prompt: composed.prompt,
        negativePrompt,
        width,
        height,
        imageCount: input.imageCount,
        seed: input.seed ?? null,
        steps: input.steps,
        guidance: input.guidance,
        placement: input.placement,
        shadow: input.shadow,
        sceneId: input.sceneId,
        brandKitId: input.brandKitId ?? null,
        clientId: input.clientId ?? null,
        // Read-only. The upload is never overwritten.
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
        scene: { id: scene.id, name: scene.name },
      },
      { status: 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
