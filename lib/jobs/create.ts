import "server-only";

import { after } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { spendCredits } from "@/lib/credits";
import { getProvider } from "@/lib/generation-engine";
import type { AuthContext } from "@/lib/auth";
import type { GenerationType } from "@/types";
import { processJob, type JobInput } from "./worker";

/**
 * Creates a generation, reserves its credits and schedules execution.
 *
 * Ordering matters. The generation row is written first so the credit ledger
 * can reference it; credits are then deducted atomically; only once that
 * succeeds is the job queued. If the deduction fails, the generation is marked
 * CANCELLED and nothing is charged.
 */

export interface CreateJobParams {
  auth: AuthContext;
  type: GenerationType;
  /** Prompt as typed by the user — stored for history and re-use. */
  rawPrompt: string;
  rawNegativePrompt: string | null;
  /** Prompt after style modifiers — sent to the engine. */
  engineInput: JobInput;
  styleId: string | null;
  creditCost: number;
  parentGenerationId?: string | null;
}

export interface CreateJobResult {
  generationId: string;
  jobId: string;
  creditsRemaining: number;
}

export async function createGenerationJob(
  params: CreateJobParams,
): Promise<CreateJobResult> {
  const admin = createAdminClient();
  const provider = getProvider();
  const { auth, engineInput } = params;

  const { data: generation, error: generationError } = await admin
    .from("generations")
    .insert({
      user_id: auth.user.id,
      type: params.type,
      status: "QUEUED",
      prompt: params.rawPrompt,
      negative_prompt: params.rawNegativePrompt,
      style_id: params.styleId,
      provider: provider.id,
      model: engineInput.model ?? provider.capabilities.availableModels[0]?.id ?? "default",
      // Upscale output size is unknown until the engine returns; the worker
      // backfills it from the actual result.
      width: engineInput.width || null,
      height: engineInput.height || null,
      seed: engineInput.seed,
      steps: engineInput.steps ?? null,
      guidance: engineInput.guidance ?? null,
      strength: engineInput.strength ?? null,
      upscale_factor: engineInput.upscaleFactor ?? null,
      image_count: engineInput.imageCount,
      credit_cost: params.creditCost,
      source_image_path: engineInput.sourcePath ?? null,
      parent_generation_id: params.parentGenerationId ?? null,
    })
    .select("id")
    .single();

  if (generationError || !generation) {
    throw new Error(`Failed to create generation: ${generationError?.message}`);
  }

  let creditsRemaining: number;

  try {
    creditsRemaining = await spendCredits({
      userId: auth.user.id,
      amount: params.creditCost,
      type: params.type === "UPSCALE" ? "UPSCALE" : "GENERATION",
      generationId: generation.id,
      description: describeSpend(params.type, engineInput),
    });
  } catch (error) {
    // Nothing was charged — roll the placeholder back so it never shows in the
    // gallery or history.
    await admin
      .from("generations")
      .update({ status: "CANCELLED", error_message: "Not enough credits." })
      .eq("id", generation.id);
    throw error;
  }

  await admin.from("prompt_history").insert({
    user_id: auth.user.id,
    generation_id: generation.id,
    type: params.type,
    prompt: params.rawPrompt,
    negative_prompt: params.rawNegativePrompt,
    style_id: params.styleId,
    model: engineInput.model ?? provider.capabilities.availableModels[0]?.id ?? "default",
    status: "QUEUED",
  });

  const { data: job, error: jobError } = await admin
    .from("generation_jobs")
    .insert({
      user_id: auth.user.id,
      generation_id: generation.id,
      status: "QUEUED",
      provider: provider.id,
      // Pro plans jump the queue where the engine supports it.
      priority: auth.planId === "PRO" ? 10 : 0,
      input: engineInput,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    throw new Error(`Failed to queue job: ${jobError?.message}`);
  }

  // Runs after the response is flushed, so the client isn't held open for the
  // duration of the model run. sweepStuckJobs() is the backstop if this
  // instance dies before finishing.
  after(async () => {
    try {
      await processJob(job.id);
    } catch (error) {
      console.error("[jobs] background processing threw", {
        jobId: job.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return {
    generationId: generation.id,
    jobId: job.id,
    creditsRemaining,
  };
}

function describeSpend(type: GenerationType, input: JobInput): string {
  if (type === "UPSCALE") return `${input.upscaleFactor ?? 2}× upscale`;
  const noun = type === "TEXT_TO_IMAGE" ? "text-to-image" : "image-to-image";
  return `${input.imageCount} × ${noun} (${input.width}×${input.height})`;
}
