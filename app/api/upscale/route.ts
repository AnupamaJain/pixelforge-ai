import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { calculateCreditCost } from "@/config/credits";
import { createGenerationJob } from "@/lib/jobs/create";
import { limitGeneration, RateLimitError } from "@/lib/rate-limit";
import { GENERATIONS_BUCKET, UPLOADS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { upscaleSchema } from "@/lib/validation/schemas";
import {
  BadRequestError,
  errorResponse,
  NotFoundError,
  PlanRestrictionError,
} from "@/lib/api/respond";

export const runtime = "nodejs";
export const maxDuration = 300;

/** POST /api/upscale — enlarge an existing output or a fresh upload. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    if (!auth.plan.features.upscale) {
      throw new PlanRestrictionError(
        "Upscaling is a Pro feature. Upgrade to enlarge your images.",
      );
    }

    const limit = limitGeneration(auth.user.id);
    if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);

    const body = await request.json().catch(() => {
      throw new BadRequestError("Invalid request body.");
    });
    const input = upscaleSchema.parse(body);

    let sourceBucket: string;
    let sourcePath: string;
    let prompt = "Upscaled image";
    let parentGenerationId: string | null = null;

    if (input.outputId) {
      // Ownership is enforced in the query itself, so one user can never
      // upscale (and thereby read) another user's image.
      const admin = createAdminClient();
      const { data: output } = await admin
        .from("generation_outputs")
        .select("storage_path, generation_id, generations(prompt)")
        .eq("id", input.outputId)
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (!output) throw new NotFoundError("That image could not be found.");

      sourceBucket = GENERATIONS_BUCKET;
      sourcePath = output.storage_path;
      parentGenerationId = output.generation_id;

      const parent = output.generations as unknown as { prompt?: string } | null;
      if (parent?.prompt) prompt = parent.prompt;
    } else {
      const expectedPrefix = `users/${auth.user.id}/`;
      if (!input.sourcePath?.startsWith(expectedPrefix)) {
        throw new BadRequestError("That source image could not be found.");
      }
      sourceBucket = UPLOADS_BUCKET;
      sourcePath = input.sourcePath;
    }

    const creditCost = calculateCreditCost({
      type: "UPSCALE",
      upscaleFactor: input.factor,
    });

    const result = await createGenerationJob({
      auth,
      type: "UPSCALE",
      rawPrompt: prompt,
      rawNegativePrompt: null,
      styleId: null,
      creditCost,
      parentGenerationId,
      engineInput: {
        type: "UPSCALE",
        prompt,
        negativePrompt: "",
        // Output dimensions are whatever the upscaler returns; they are
        // measured from the result rather than predicted here.
        width: 0,
        height: 0,
        imageCount: 1,
        seed: null,
        upscaleFactor: input.factor,
        sourceBucket,
        sourcePath,
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
