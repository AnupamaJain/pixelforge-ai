import "server-only";

import {
  ProviderError,
  type GeneratedImage,
  type GenerationResult,
  type ImageGenerationProvider,
  type ImageToImageParams,
  type ProviderCapabilities,
  type TextToImageParams,
  type UpscaleParams,
} from "@/lib/generation-engine/types";
import {
  buildImageToImageGraph,
  buildTextToImageGraph,
  buildUpscaleGraph,
  OUTPUT_NODE,
  type InvokeGraph,
  type ModelIdentifier,
} from "./graphs";

/**
 * Adapter for a self-hosted InvokeAI server.
 *
 * Lifecycle: upload any source image -> enqueue a graph batch -> poll the queue
 * item -> read the output image name from the session results -> download the
 * bytes. Endpoints verified against InvokeAI's routers:
 *   POST /api/v1/queue/{queue_id}/enqueue_batch
 *   GET  /api/v1/queue/{queue_id}/i/{item_id}
 *   POST /api/v1/images/upload
 *   GET  /api/v1/images/i/{image_name}/full
 */

const QUEUE_ID = process.env.INVOKEAI_QUEUE_ID || "default";
const POLL_INTERVAL_MS = 1200;
const DEFAULT_TIMEOUT_MS = Number.parseInt(
  process.env.INVOKEAI_TIMEOUT_MS || "180000",
  10,
);

interface QueueItemResponse {
  item_id: number;
  status: "pending" | "in_progress" | "waiting" | "completed" | "failed" | "canceled";
  error_message?: string | null;
  error_type?: string | null;
  session?: {
    results?: Record<string, { type?: string; image?: { image_name?: string } }>;
  };
}

function baseUrl(): string {
  const url = process.env.INVOKEAI_BASE_URL;
  if (!url) {
    throw new ProviderError("INVOKEAI_BASE_URL is not configured", {
      userMessage:
        "The local generation server is not configured. Check INVOKEAI_BASE_URL.",
      retryable: false,
    });
  }
  return url.replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const key = process.env.INVOKEAI_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function invokeFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
    cache: "no-store",
  });

  if (!response.ok) {
    // Response bodies can echo filesystem paths; keep them out of the UI.
    const detail = await response.text().catch(() => "");
    throw new ProviderError(
      `InvokeAI ${path} responded ${response.status}: ${detail.slice(0, 500)}`,
      { retryable: response.status >= 500 },
    );
  }

  return response;
}

/** Resolves the configured SDXL main model into a full model identifier. */
async function resolveModel(requested?: string): Promise<ModelIdentifier> {
  const response = await invokeFetch("/api/v2/models/?model_type=main");
  const payload = (await response.json()) as {
    models?: Array<ModelIdentifier & { base?: string; name?: string }>;
  };

  const models = payload.models ?? [];
  if (models.length === 0) {
    throw new ProviderError("No main models installed in InvokeAI", {
      userMessage:
        "No image model is installed on the generation server. Install an SDXL model in InvokeAI first.",
      retryable: false,
    });
  }

  const wanted = requested || process.env.INVOKEAI_MODEL_KEY;
  const match = wanted
    ? models.find((m) => m.key === wanted || m.name === wanted)
    : undefined;

  // Prefer SDXL since the graph builders emit SDXL nodes.
  const chosen = match ?? models.find((m) => m.base === "sdxl") ?? models[0];

  if (chosen.base !== "sdxl") {
    throw new ProviderError(
      `Configured model '${chosen.name}' has base '${chosen.base}', but the graph builder targets SDXL`,
      {
        userMessage:
          "The generation server has no SDXL model available. Install one, or set INVOKEAI_MODEL_KEY.",
        retryable: false,
      },
    );
  }

  return {
    key: chosen.key,
    hash: chosen.hash,
    name: chosen.name,
    base: chosen.base,
    type: chosen.type,
  };
}

async function uploadImage(image: Buffer, contentType: string): Promise<string> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(image)], { type: contentType }),
    "source.png",
  );

  const response = await invokeFetch(
    "/api/v1/images/upload?image_category=general&is_intermediate=true",
    { method: "POST", body: form },
  );

  const payload = (await response.json()) as { image_name?: string };
  if (!payload.image_name) {
    throw new ProviderError("InvokeAI upload returned no image_name");
  }
  return payload.image_name;
}

async function enqueue(graph: InvokeGraph, runs: number): Promise<number[]> {
  const response = await invokeFetch(`/api/v1/queue/${QUEUE_ID}/enqueue_batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batch: { graph, runs }, prepend: false }),
  });

  const payload = (await response.json()) as { item_ids?: number[] };
  if (!payload.item_ids?.length) {
    throw new ProviderError("InvokeAI enqueue returned no queue items");
  }
  return payload.item_ids;
}

async function waitForItem(
  itemId: number,
  signal?: AbortSignal,
): Promise<QueueItemResponse> {
  const deadline = Date.now() + DEFAULT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new ProviderError("Generation aborted by caller", { retryable: false });
    }

    const response = await invokeFetch(`/api/v1/queue/${QUEUE_ID}/i/${itemId}`);
    const item = (await response.json()) as QueueItemResponse;

    if (item.status === "completed") return item;

    if (item.status === "failed" || item.status === "canceled") {
      throw new ProviderError(
        `InvokeAI queue item ${itemId} ${item.status}: ${item.error_message ?? "no detail"}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new ProviderError(`InvokeAI queue item ${itemId} timed out`, {
    userMessage:
      "The generation server took too long to respond. Your credits have been refunded.",
  });
}

function extractImageName(item: QueueItemResponse, nodeId: string): string {
  const results = item.session?.results ?? {};

  const direct = results[nodeId]?.image?.image_name;
  if (direct) return direct;

  // Node ids can be suffixed during graph preparation, so fall back to any
  // result that carries an image.
  for (const result of Object.values(results)) {
    if (result?.image?.image_name) return result.image.image_name;
  }

  throw new ProviderError("InvokeAI session produced no output image");
}

async function downloadImage(imageName: string): Promise<Buffer> {
  const response = await invokeFetch(
    `/api/v1/images/i/${encodeURIComponent(imageName)}/full`,
  );
  return Buffer.from(await response.arrayBuffer());
}

async function runGraph(
  graph: InvokeGraph,
  outputNode: string,
  runs: number,
  signal?: AbortSignal,
): Promise<{ data: Buffer; imageName: string }[]> {
  const itemIds = await enqueue(graph, runs);

  const settled = await Promise.all(
    itemIds.map(async (itemId) => {
      const item = await waitForItem(itemId, signal);
      const imageName = extractImageName(item, outputNode);
      return { data: await downloadImage(imageName), imageName };
    }),
  );

  return settled;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

async function measureImage(data: Buffer): Promise<{ width: number; height: number }> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(data).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

const capabilities: ProviderCapabilities = {
  textToImage: true,
  imageToImage: true,
  upscale: true,
  // Product Studio needs background removal. InvokeAI ships the pieces
  // (`grounding_dino` -> `segment_anything` -> `apply_tensor_mask_to_image`),
  // but that graph is not wired up here yet, so the capability is reported
  // honestly as unavailable rather than failing at generation time.
  // Run IMAGE_PROVIDER=hosted for Product Studio.
  productScenes: false,
  supportsSteps: true,
  supportsGuidance: true,
  supportsNegativePrompt: true,
  supportsSeed: true,
  supportsMultipleImages: true,
  maxImagesPerRequest: 4,
  availableModels: [{ id: "sdxl", label: "SDXL (local)" }],
};

export const invokeAIProvider: ImageGenerationProvider = {
  id: "invokeai",
  label: "InvokeAI (self-hosted)",
  capabilities,

  async generateTextToImage(params: TextToImageParams): Promise<GenerationResult> {
    const startedAt = Date.now();
    const model = await resolveModel(params.model);
    const seed = params.seed ?? randomSeed();
    const steps = params.steps ?? 30;
    const guidance = params.guidance ?? 7;

    const images: GeneratedImage[] = [];

    // Each image gets its own seed so a batch yields variations, not duplicates.
    for (let index = 0; index < params.imageCount; index += 1) {
      const imageSeed = seed + index;
      const graph = buildTextToImageGraph({
        model,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt ?? "",
        width: params.width,
        height: params.height,
        steps,
        guidance,
        seed: imageSeed,
        scheduler: process.env.INVOKEAI_SCHEDULER || "euler",
      });

      const [result] = await runGraph(graph, OUTPUT_NODE.textToImage, 1, params.signal);
      const dims = await measureImage(result.data);

      images.push({
        data: result.data,
        contentType: "image/png",
        width: dims.width || params.width,
        height: dims.height || params.height,
        seed: imageSeed,
      });
    }

    return {
      images,
      metadata: {
        provider: "invokeai",
        model: model.name,
        seed,
        steps,
        guidance,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async generateImageToImage(params: ImageToImageParams): Promise<GenerationResult> {
    const startedAt = Date.now();
    const model = await resolveModel(params.model);
    const seed = params.seed ?? randomSeed();
    const steps = params.steps ?? 30;
    const guidance = params.guidance ?? 7;

    // Uploaded once and reused; the caller's buffer is never mutated.
    const imageName = await uploadImage(params.image, params.imageContentType);

    const images: GeneratedImage[] = [];

    for (let index = 0; index < params.imageCount; index += 1) {
      const imageSeed = seed + index;
      const graph = buildImageToImageGraph({
        model,
        imageName,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt ?? "",
        width: params.width,
        height: params.height,
        steps,
        guidance,
        seed: imageSeed,
        strength: params.strength,
        scheduler: process.env.INVOKEAI_SCHEDULER || "euler",
      });

      const [result] = await runGraph(graph, OUTPUT_NODE.imageToImage, 1, params.signal);
      const dims = await measureImage(result.data);

      images.push({
        data: result.data,
        contentType: "image/png",
        width: dims.width || params.width,
        height: dims.height || params.height,
        seed: imageSeed,
      });
    }

    return {
      images,
      metadata: {
        provider: "invokeai",
        model: model.name,
        seed,
        steps,
        guidance,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async upscale(params: UpscaleParams): Promise<GenerationResult> {
    const startedAt = Date.now();
    const imageName = await uploadImage(params.image, params.imageContentType);

    const graph = buildUpscaleGraph({ imageName, factor: params.factor });
    const [result] = await runGraph(graph, OUTPUT_NODE.upscale, 1, params.signal);
    const dims = await measureImage(result.data);

    return {
      images: [
        {
          data: result.data,
          contentType: "image/png",
          width: dims.width,
          height: dims.height,
          seed: null,
        },
      ],
      metadata: {
        provider: "invokeai",
        model: params.factor === 2 ? "RealESRGAN_x2plus" : "RealESRGAN_x4plus",
        seed: null,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async healthCheck() {
    try {
      const response = await invokeFetch("/api/v1/app/version");
      const payload = (await response.json()) as { version?: string };
      return { ok: true, detail: `InvokeAI ${payload.version ?? "unknown"}` };
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : "unreachable",
      };
    }
  },
};
