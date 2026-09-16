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

/**
 * Hosted provider backed by Replicate.
 *
 * Replicate runs SDXL (text-to-image and image-to-image) and Real-ESRGAN
 * (upscaling), so all three operations map to genuine model endpoints rather
 * than being emulated. Model versions are env-configurable.
 *
 * API: POST https://api.replicate.com/v1/predictions -> poll the returned
 * `urls.get` until status is `succeeded` or `failed`.
 */

const API_BASE = "https://api.replicate.com/v1";
const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = Number.parseInt(process.env.HOSTED_TIMEOUT_MS || "180000", 10);

// Pinned versions keep output reproducible; override via env to upgrade.
const SDXL_VERSION =
  process.env.HOSTED_SDXL_VERSION ||
  "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc";
const ESRGAN_VERSION =
  process.env.HOSTED_ESRGAN_VERSION ||
  "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa";

interface PredictionResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string[] | string | null;
  error?: string | null;
  urls?: { get?: string };
}

function apiToken(): string {
  const token = process.env.IMAGE_PROVIDER_API_KEY;
  if (!token) {
    throw new ProviderError("IMAGE_PROVIDER_API_KEY is not configured", {
      userMessage:
        "Image generation is not configured on this server. Set IMAGE_PROVIDER_API_KEY.",
      retryable: false,
    });
  }
  return token;
}

async function replicateFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ProviderError(
      `Replicate ${response.status}: ${detail.slice(0, 500)}`,
      { retryable: response.status >= 500 || response.status === 429 },
    );
  }

  return response;
}

async function createPrediction(
  version: string,
  input: Record<string, unknown>,
): Promise<PredictionResponse> {
  const response = await replicateFetch(`${API_BASE}/predictions`, {
    method: "POST",
    body: JSON.stringify({ version, input }),
  });
  return (await response.json()) as PredictionResponse;
}

async function waitForPrediction(
  prediction: PredictionResponse,
  signal?: AbortSignal,
): Promise<PredictionResponse> {
  const pollUrl = prediction.urls?.get ?? `${API_BASE}/predictions/${prediction.id}`;
  const deadline = Date.now() + TIMEOUT_MS;
  let current = prediction;

  while (Date.now() < deadline) {
    if (current.status === "succeeded") return current;

    if (current.status === "failed" || current.status === "canceled") {
      throw new ProviderError(
        `Replicate prediction ${current.id} ${current.status}: ${current.error ?? "no detail"}`,
      );
    }

    if (signal?.aborted) {
      throw new ProviderError("Generation aborted by caller", { retryable: false });
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const response = await replicateFetch(pollUrl);
    current = (await response.json()) as PredictionResponse;
  }

  throw new ProviderError(`Replicate prediction ${current.id} timed out`, {
    userMessage:
      "The image provider took too long to respond. Your credits have been refunded.",
  });
}

function outputUrls(prediction: PredictionResponse): string[] {
  const { output } = prediction;
  if (!output) throw new ProviderError("Replicate returned no output");
  return Array.isArray(output) ? output : [output];
}

/** Downloads provider output into our own storage; we never hot-link it. */
async function downloadImages(urls: string[]): Promise<Buffer[]> {
  return Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new ProviderError(`Failed to download output (${response.status})`);
      }
      return Buffer.from(await response.arrayBuffer());
    }),
  );
}

async function measureImage(data: Buffer): Promise<{ width: number; height: number }> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(data).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

function toDataUri(image: Buffer, contentType: string): string {
  return `data:${contentType};base64,${image.toString("base64")}`;
}

async function toGeneratedImages(
  buffers: Buffer[],
  seed: number | null,
): Promise<GeneratedImage[]> {
  return Promise.all(
    buffers.map(async (data) => {
      const dims = await measureImage(data);
      return {
        data,
        contentType: "image/png" as const,
        width: dims.width,
        height: dims.height,
        seed,
      };
    }),
  );
}

const capabilities: ProviderCapabilities = {
  textToImage: true,
  imageToImage: true,
  upscale: true,
  supportsSteps: true,
  supportsGuidance: true,
  supportsNegativePrompt: true,
  supportsSeed: true,
  supportsMultipleImages: true,
  maxImagesPerRequest: 4,
  availableModels: [{ id: "sdxl", label: "SDXL" }],
};

export const hostedProvider: ImageGenerationProvider = {
  id: "hosted",
  label: "Hosted (Replicate)",
  capabilities,

  async generateTextToImage(params: TextToImageParams): Promise<GenerationResult> {
    const startedAt = Date.now();
    const seed = params.seed ?? randomSeed();
    const steps = params.steps ?? 30;
    const guidance = params.guidance ?? 7;

    const prediction = await createPrediction(SDXL_VERSION, {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || undefined,
      width: params.width,
      height: params.height,
      num_outputs: params.imageCount,
      num_inference_steps: steps,
      guidance_scale: guidance,
      seed,
      apply_watermark: false,
    });

    const completed = await waitForPrediction(prediction, params.signal);
    const buffers = await downloadImages(outputUrls(completed));

    return {
      images: await toGeneratedImages(buffers, seed),
      metadata: {
        provider: "hosted",
        model: "sdxl",
        seed,
        steps,
        guidance,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async generateImageToImage(params: ImageToImageParams): Promise<GenerationResult> {
    const startedAt = Date.now();
    const seed = params.seed ?? randomSeed();
    const steps = params.steps ?? 30;
    const guidance = params.guidance ?? 7;

    const prediction = await createPrediction(SDXL_VERSION, {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || undefined,
      image: toDataUri(params.image, params.imageContentType),
      prompt_strength: params.strength,
      width: params.width,
      height: params.height,
      num_outputs: params.imageCount,
      num_inference_steps: steps,
      guidance_scale: guidance,
      seed,
      apply_watermark: false,
    });

    const completed = await waitForPrediction(prediction, params.signal);
    const buffers = await downloadImages(outputUrls(completed));

    return {
      images: await toGeneratedImages(buffers, seed),
      metadata: {
        provider: "hosted",
        model: "sdxl",
        seed,
        steps,
        guidance,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async upscale(params: UpscaleParams): Promise<GenerationResult> {
    const startedAt = Date.now();

    const prediction = await createPrediction(ESRGAN_VERSION, {
      image: toDataUri(params.image, params.imageContentType),
      scale: params.factor,
      face_enhance: false,
    });

    const completed = await waitForPrediction(prediction, params.signal);
    const buffers = await downloadImages(outputUrls(completed));

    return {
      images: await toGeneratedImages(buffers, null),
      metadata: {
        provider: "hosted",
        model: "real-esrgan",
        seed: null,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async healthCheck() {
    try {
      // Cheapest authenticated call that proves the token is valid.
      await replicateFetch(`${API_BASE}/account`);
      return { ok: true, detail: "Replicate reachable" };
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : "unreachable",
      };
    }
  },
};
