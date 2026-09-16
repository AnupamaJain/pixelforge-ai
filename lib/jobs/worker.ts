import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { refundCredits } from "@/lib/credits";
import {
  generateImage,
  generateProductScene,
  imageToImage,
  upscaleImage,
  ProviderError,
  type GenerationResult,
} from "@/lib/generation-engine";
import {
  GENERATIONS_BUCKET,
  UPLOADS_BUCKET,
  downloadImage,
  generationObjectPath,
  uploadImage as putObject,
} from "@/lib/storage";

/**
 * Generation job worker.
 *
 * Jobs are created (and credits deducted) inside the request, then executed
 * out of band so the HTTP request never blocks on a multi-minute model run.
 * The client polls GET /api/generations/:id for status.
 *
 * Failure is the interesting path: the job is marked FAILED, credits are
 * refunded (idempotently), and only a sanitised message reaches the user.
 */

export interface JobInput {
  type: "TEXT_TO_IMAGE" | "IMAGE_TO_IMAGE" | "PRODUCT_SCENE" | "UPSCALE";
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  imageCount: number;
  seed: number | null;
  steps?: number;
  guidance?: number;
  strength?: number;
  model?: string;
  upscaleFactor?: 2 | 4;
  sourceBucket?: string;
  sourcePath?: string;
  /** Product-scene only. */
  sceneId?: string;
  placement?: { scale: number; offsetX: number; offsetY: number };
  shadow?: boolean;
  brandKitId?: string | null;
  clientId?: string | null;
  batchItemId?: string | null;
}

const GENERIC_FAILURE =
  "Image generation failed. Your credits have been refunded. Please try again.";

async function runProvider(
  input: JobInput,
  cutoutSink?: (cutout: Buffer) => Promise<void>,
): Promise<GenerationResult> {
  if (input.type === "TEXT_TO_IMAGE") {
    return generateImage({
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      width: input.width,
      height: input.height,
      imageCount: input.imageCount,
      seed: input.seed,
      steps: input.steps,
      guidance: input.guidance,
      model: input.model,
    });
  }

  if (!input.sourcePath || !input.sourceBucket) {
    throw new ProviderError("Job is missing its source image", {
      userMessage: "The source image could not be found.",
      retryable: false,
    });
  }

  const source = await downloadImage(input.sourceBucket, input.sourcePath);

  if (input.type === "PRODUCT_SCENE") {
    const result = await generateProductScene({
      productImage: source.data,
      productContentType: source.contentType,
      scenePrompt: input.prompt,
      negativePrompt: input.negativePrompt,
      width: input.width,
      height: input.height,
      imageCount: input.imageCount,
      seed: input.seed,
      steps: input.steps,
      guidance: input.guidance,
      placement: input.placement,
      shadow: input.shadow,
    });

    // Persist the cut-out so the guarantee can be re-verified later.
    if (cutoutSink) await cutoutSink(result.cutout);

    return result;
  }

  if (input.type === "IMAGE_TO_IMAGE") {
    return imageToImage({
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      image: source.data,
      imageContentType: source.contentType,
      strength: input.strength ?? 0.65,
      width: input.width,
      height: input.height,
      imageCount: input.imageCount,
      seed: input.seed,
      steps: input.steps,
      guidance: input.guidance,
      model: input.model,
    });
  }

  return upscaleImage({
    image: source.data,
    imageContentType: source.contentType,
    factor: input.upscaleFactor ?? 2,
  });
}

/**
 * Executes one job end to end. Never throws — every failure path is recorded
 * on the job and the generation row so the UI can surface it.
 */
export async function processJob(jobId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: job, error: jobError } = await admin
    .from("generation_jobs")
    .select("id, user_id, generation_id, status, input, attempts")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError || !job) {
    console.error("[worker] job not found", { jobId, message: jobError?.message });
    return;
  }

  // Guards against a cron sweep racing the inline invocation.
  if (job.status !== "QUEUED") return;

  const claimed = await admin
    .from("generation_jobs")
    .update({
      status: "PROCESSING",
      started_at: new Date().toISOString(),
      attempts: (job.attempts ?? 0) + 1,
    })
    .eq("id", jobId)
    .eq("status", "QUEUED")
    .select("id");

  // Another worker won the race.
  if (!claimed.data || claimed.data.length === 0) return;

  await admin
    .from("generations")
    .update({ status: "PROCESSING" })
    .eq("id", job.generation_id);
  await admin
    .from("prompt_history")
    .update({ status: "PROCESSING" })
    .eq("generation_id", job.generation_id);

  const input = job.input as JobInput;

  try {
    // Product scenes return a cut-out alongside the images; store it under the
    // generation so the pixel-identical claim stays auditable.
    let cutoutPath: string | null = null;

    const result = await runProvider(input, async (cutout) => {
      cutoutPath = `users/${job.user_id}/generations/${job.generation_id}/product-mask.png`;
      await putObject({
        bucket: GENERATIONS_BUCKET,
        path: cutoutPath,
        data: cutout,
        contentType: "image/png",
      });
    });

    if (result.images.length === 0) {
      throw new ProviderError("Provider returned zero images");
    }

    // Persist every output to our own storage before marking the job complete.
    const rows = [];
    for (const [index, image] of result.images.entries()) {
      const path = generationObjectPath({
        userId: job.user_id,
        generationId: job.generation_id,
        index,
        contentType: image.contentType,
      });

      await putObject({
        bucket: GENERATIONS_BUCKET,
        path,
        data: image.data,
        contentType: image.contentType,
      });

      rows.push({
        generation_id: job.generation_id,
        user_id: job.user_id,
        storage_path: path,
        width: image.width,
        height: image.height,
        seed: image.seed,
      });
    }

    const { error: outputError } = await admin
      .from("generation_outputs")
      .insert(rows);

    if (outputError) {
      throw new Error(`Failed to record outputs: ${outputError.message}`);
    }

    const completedAt = new Date().toISOString();

    const [firstImage] = result.images;

    await admin
      .from("generations")
      .update({
        status: "COMPLETED",
        completed_at: completedAt,
        seed: result.metadata.seed,
        model: result.metadata.model,
        // Backfills the true output size, which matters for upscales where the
        // dimensions are decided by the engine.
        width: firstImage.width || null,
        height: firstImage.height || null,
        product_mask_path: cutoutPath,
        product_preserved: input.type === "PRODUCT_SCENE" ? true : false,
      })
      .eq("id", job.generation_id);

    await admin
      .from("generation_jobs")
      .update({
        status: "COMPLETED",
        completed_at: completedAt,
        output: {
          imageCount: result.images.length,
          durationMs: result.metadata.durationMs,
        },
      })
      .eq("id", jobId);

    await admin
      .from("prompt_history")
      .update({ status: "COMPLETED" })
      .eq("generation_id", job.generation_id);

    if (input.batchItemId) {
      await recordBatchProgress(input.batchItemId, "COMPLETED");
    }
  } catch (error) {
    await failJob({
      jobId,
      generationId: job.generation_id,
      userId: job.user_id,
      error,
    });

    if (input.batchItemId) {
      await recordBatchProgress(input.batchItemId, "FAILED");
    }
  }
}

/**
 * Advances a batch item and its parent run. The run is marked COMPLETED once
 * every item has settled, so the UI can stop polling.
 */
async function recordBatchProgress(
  batchItemId: string,
  status: "COMPLETED" | "FAILED",
): Promise<void> {
  const admin = createAdminClient();

  const { data: item } = await admin
    .from("batch_items")
    .update({ status })
    .eq("id", batchItemId)
    .select("batch_run_id")
    .maybeSingle();

  if (!item) return;

  const { data: siblings } = await admin
    .from("batch_items")
    .select("status")
    .eq("batch_run_id", item.batch_run_id);

  if (!siblings) return;

  const completed = siblings.filter((row) => row.status === "COMPLETED").length;
  const failed = siblings.filter((row) => row.status === "FAILED").length;
  const settled = completed + failed === siblings.length;

  await admin
    .from("batch_runs")
    .update({
      completed_rows: completed,
      failed_rows: failed,
      status: settled ? (completed === 0 ? "FAILED" : "COMPLETED") : "PROCESSING",
      completed_at: settled ? new Date().toISOString() : null,
    })
    .eq("id", item.batch_run_id);
}

async function failJob(params: {
  jobId: string;
  generationId: string;
  userId: string;
  error: unknown;
}): Promise<void> {
  const admin = createAdminClient();

  // Provider payloads can contain API keys and internal hostnames, so the
  // detailed message is logged server-side and never returned to the client.
  const internalMessage =
    params.error instanceof Error ? params.error.message : String(params.error);
  const userMessage =
    params.error instanceof ProviderError
      ? params.error.userMessage
      : GENERIC_FAILURE;

  console.error("[worker] generation failed", {
    jobId: params.jobId,
    generationId: params.generationId,
    message: internalMessage,
  });

  const { data: generation } = await admin
    .from("generations")
    .select("credit_cost")
    .eq("id", params.generationId)
    .maybeSingle();

  const completedAt = new Date().toISOString();

  await admin
    .from("generations")
    .update({
      status: "FAILED",
      error_message: userMessage,
      completed_at: completedAt,
    })
    .eq("id", params.generationId);

  await admin
    .from("generation_jobs")
    .update({
      status: "FAILED",
      error: internalMessage.slice(0, 2000),
      completed_at: completedAt,
    })
    .eq("id", params.jobId);

  await admin
    .from("prompt_history")
    .update({ status: "FAILED" })
    .eq("generation_id", params.generationId);

  // refund_credits is idempotent per generation, so a retried failure path
  // cannot hand out the same credits twice.
  if (generation?.credit_cost && generation.credit_cost > 0) {
    await refundCredits({
      userId: params.userId,
      amount: generation.credit_cost,
      generationId: params.generationId,
    });
  }
}

/**
 * Picks up jobs that were queued but never started — e.g. the instance died
 * mid-request. Intended to be hit by a scheduled job.
 */
export async function sweepStuckJobs(maxAgeMs = 120_000): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

  const { data: stuck } = await admin
    .from("generation_jobs")
    .select("id")
    .eq("status", "QUEUED")
    .lt("created_at", cutoff)
    .limit(10);

  if (!stuck?.length) return 0;

  for (const job of stuck) {
    await processJob(job.id);
  }

  return stuck.length;
}

export { UPLOADS_BUCKET };
