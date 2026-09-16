import "server-only";

import { after } from "next/server";

import { calculateBatchCost } from "@/config/credits";
import { resolveDimensions } from "@/config/generation";
import { composeScenePrompt } from "@/config/scenes";
import { applyStyle } from "@/config/styles";
import type { AuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/generation-engine";
import { UPLOADS_BUCKET } from "@/lib/storage";
import { InsufficientCreditsError, getBalance } from "@/lib/credits";
import { createGenerationJob } from "./create";
import { processJob } from "./worker";
import type { BatchInput } from "@/lib/validation/schemas";

/**
 * Batch runs.
 *
 * A batch is N ordinary generations sharing one template. Each row becomes its
 * own generation with its own credit transaction, so a partial failure refunds
 * exactly the rows that failed — never the whole run.
 *
 * The total cost is checked against the balance up front so a 500-row job
 * cannot spend half the credits and then stop.
 */

/** Fills `{column}` placeholders from a row. Unknown keys are left in place. */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{([a-zA-Z0-9_ -]+)\}/g, (match, key: string) => {
    const normalised = key.trim().toLowerCase();
    for (const [column, value] of Object.entries(variables)) {
      if (column.trim().toLowerCase() === normalised) return value;
    }
    return match;
  });
}

/** Column names referenced by a template, for validating an upload. */
export function templateColumns(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(/\{([a-zA-Z0-9_ -]+)\}/g)) {
    found.add(match[1].trim());
  }
  return [...found];
}

export interface CreateBatchResult {
  batchRunId: string;
  totalRows: number;
  creditCost: number;
  creditsRemaining: number;
}

export async function createBatchRun(params: {
  auth: AuthContext;
  input: BatchInput;
  /** Product batches need one uploaded image per row. */
  sourcePaths?: Record<number, string>;
}): Promise<CreateBatchResult> {
  const { auth, input } = params;
  const admin = createAdminClient();
  const provider = getProvider();

  const creditCost = calculateBatchCost({
    type: input.type,
    rows: input.rows.length,
    imagesPerRow: input.imagesPerRow,
  });

  // Fail before spending anything if the run can't be afforded in full.
  const balance = await getBalance(auth.user.id);
  if (balance < creditCost) {
    throw new InsufficientCreditsError(creditCost, balance);
  }

  const { data: run, error: runError } = await admin
    .from("batch_runs")
    .insert({
      user_id: auth.user.id,
      client_id: input.clientId ?? null,
      brand_kit_id: input.brandKitId ?? null,
      name: input.name,
      type: input.type,
      status: "PROCESSING",
      total_rows: input.rows.length,
      credit_cost: creditCost,
      settings: {
        template: input.template,
        negativeTemplate: input.negativeTemplate,
        styleId: input.styleId,
        sceneId: input.sceneId,
        aspectRatio: input.aspectRatio,
        baseSize: input.baseSize,
        imagesPerRow: input.imagesPerRow,
      },
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create batch run: ${runError?.message}`);
  }

  const { width, height } = resolveDimensions(input.aspectRatio, input.baseSize);
  const jobIds: string[] = [];
  let creditsRemaining = balance;

  for (const [index, variables] of input.rows.entries()) {
    const rendered = renderTemplate(input.template, variables);
    const renderedNegative = input.negativeTemplate
      ? renderTemplate(input.negativeTemplate, variables)
      : null;

    const { data: item } = await admin
      .from("batch_items")
      .insert({
        batch_run_id: run.id,
        user_id: auth.user.id,
        row_index: index,
        variables,
        status: "QUEUED",
      })
      .select("id")
      .single();

    if (!item) continue;

    try {
      const isProductScene = input.type === "PRODUCT_SCENE";
      const sourcePath = params.sourcePaths?.[index];

      const composed = isProductScene
        ? composeScenePrompt({
            sceneId: input.sceneId ?? "studio-white",
            productDescription: rendered,
            extraPrompt: null,
            brandModifier: null,
          })
        : applyStyle(input.styleId, rendered, renderedNegative);

      const created = await createGenerationJob(
        {
          auth,
          type: input.type,
          rawPrompt: rendered,
          rawNegativePrompt: renderedNegative,
          styleId: input.styleId ?? null,
          creditCost: calculateBatchCost({
            type: input.type,
            rows: 1,
            imagesPerRow: input.imagesPerRow,
          }),
          engineInput: {
            type: input.type,
            prompt: composed.prompt,
            negativePrompt: composed.negativePrompt,
            width,
            height,
            imageCount: input.imagesPerRow,
            seed: null,
            model: provider.capabilities.availableModels[0]?.id,
            sceneId: input.sceneId,
            brandKitId: input.brandKitId ?? null,
            clientId: input.clientId ?? null,
            batchItemId: item.id,
            sourceBucket: sourcePath ? UPLOADS_BUCKET : undefined,
            sourcePath,
          },
        },
        // Queued now, processed by the drain below, so one huge request doesn't
        // schedule hundreds of concurrent provider calls.
        { deferProcessing: true },
      );

      creditsRemaining = created.creditsRemaining;
      jobIds.push(created.jobId);

      await admin
        .from("batch_items")
        .update({ generation_id: created.generationId })
        .eq("id", item.id);
    } catch (error) {
      await admin
        .from("batch_items")
        .update({
          status: "FAILED",
          error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
        })
        .eq("id", item.id);
    }
  }

  // Drain with bounded concurrency after the response is flushed.
  after(async () => {
    await drainJobs(jobIds);
  });

  return {
    batchRunId: run.id,
    totalRows: input.rows.length,
    creditCost,
    creditsRemaining,
  };
}

const BATCH_CONCURRENCY = Number.parseInt(
  process.env.BATCH_CONCURRENCY || "2",
  10,
);

/** Processes queued jobs a few at a time so we don't stampede the provider. */
async function drainJobs(jobIds: string[]): Promise<void> {
  const queue = [...jobIds];

  const workers = Array.from(
    { length: Math.max(1, Math.min(BATCH_CONCURRENCY, queue.length)) },
    async () => {
      while (queue.length > 0) {
        const jobId = queue.shift();
        if (!jobId) return;
        try {
          await processJob(jobId);
        } catch (error) {
          console.error("[batch] job failed", {
            jobId,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    },
  );

  await Promise.all(workers);
}
