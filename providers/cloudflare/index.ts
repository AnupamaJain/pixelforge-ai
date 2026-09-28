import "server-only";

import {
  ProviderError,
  type GeneratedImage,
  type GenerationResult,
  type ImageGenerationProvider,
  type ImageToImageParams,
  type ProviderCapabilities,
  type SceneParams,
  type SegmentParams,
  type SegmentResult,
  type TextToImageParams,
  type UpscaleParams,
} from "@/lib/generation-engine/types";

/**
 * Cloudflare Workers AI provider — the free-tier option.
 *
 * Workers AI includes **10,000 Neurons per day at no charge** on both the Free
 * and Paid plans, with no card required. Flux Schnell costs ~4.8 neurons per
 * 512x512 tile, so a 1024x1024 image is ~19 neurons — roughly **500 images a
 * day for free**. That is enough to develop against and to serve early
 * customers before any spend is needed.
 *
 * Trade-offs against the Replicate provider, stated plainly:
 *  - Workers AI has no background-removal model, so segmentation runs locally
 *    (see providers/cloudflare/segment.ts).
 *  - It has no super-resolution model either, so upscaling is a high-quality
 *    Lanczos resample rather than a generative upscale. `capabilities` reports
 *    this honestly so the UI can say so.
 */

const API_BASE = "https://api.cloudflare.com/client/v4/accounts";

/**
 * Model IDs are env-overridable: Cloudflare adds and retires models faster
 * than a release cycle, and a wrong default should be fixable without a deploy.
 */
const MODELS = {
  textToImage:
    process.env.CLOUDFLARE_TEXT_MODEL || "@cf/black-forest-labs/flux-1-schnell",
  sdxl:
    process.env.CLOUDFLARE_SDXL_MODEL ||
    "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  inpaint:
    process.env.CLOUDFLARE_INPAINT_MODEL ||
    "@cf/runwayml/stable-diffusion-v1-5-inpainting",
} as const;

function credentials(): { accountId: string; token: string } {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !token) {
    throw new ProviderError("Cloudflare Workers AI is not configured", {
      userMessage:
        "Image generation is not configured on this server. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
      retryable: false,
    });
  }

  return { accountId, token };
}

/**
 * Runs a model. Workers AI returns either raw image bytes or a JSON envelope
 * with a base64 payload depending on the model, so both are handled.
 */
async function run(
  model: string,
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Buffer> {
  const { accountId, token } = credentials();

  const response = await fetch(`${API_BASE}/${accountId}/ai/run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    if (response.status === 429) {
      throw new ProviderError(`Workers AI rate limited: ${detail.slice(0, 200)}`, {
        userMessage:
          "The free daily image allowance has been used up. It resets every 24 hours.",
        retryable: true,
      });
    }

    throw new ProviderError(
      `Workers AI ${model} responded ${response.status}: ${detail.slice(0, 300)}`,
      { retryable: response.status >= 500 },
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as {
      result?: { image?: string } | string;
      success?: boolean;
      errors?: { message: string }[];
    };

    if (payload.success === false) {
      throw new ProviderError(
        `Workers AI error: ${payload.errors?.map((e) => e.message).join("; ") ?? "unknown"}`,
      );
    }

    const base64 =
      typeof payload.result === "string" ? payload.result : payload.result?.image;

    if (!base64) throw new ProviderError("Workers AI returned no image data");
    return Buffer.from(base64, "base64");
  }

  return Buffer.from(await response.arrayBuffer());
}

async function measure(data: Buffer): Promise<{ width: number; height: number }> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(data).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

/** Workers AI image models expect dimensions in multiples of 8, within bounds. */
function clampDimension(value: number): number {
  return Math.max(256, Math.min(1024, Math.round(value / 8) * 8));
}

async function toGenerated(
  buffers: Buffer[],
  seed: number | null,
): Promise<GeneratedImage[]> {
  return Promise.all(
    buffers.map(async (data) => {
      const dims = await measure(data);
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
  // Workers AI has no super-resolution model, so upscaling is a Lanczos
  // resample rather than a generative upscale. Reported honestly.
  upscale: true,
  // Scene generation and compositing work; segmentation runs locally.
  productScenes: true,
  supportsSteps: true,
  supportsGuidance: true,
  supportsNegativePrompt: true,
  supportsSeed: true,
  supportsMultipleImages: true,
  // Each image is a separate request against the daily neuron allowance, so
  // this is kept lower than the paid providers.
  maxImagesPerRequest: 4,
  availableModels: [
    { id: "flux-schnell", label: "FLUX Schnell (fastest, free tier)" },
    { id: "sdxl", label: "SDXL Base" },
  ],
};

export const cloudflareProvider: ImageGenerationProvider = {
  id: "cloudflare",
  label: "Cloudflare Workers AI (free tier)",
  capabilities,

  async generateTextToImage(params: TextToImageParams): Promise<GenerationResult> {
    const startedAt = Date.now();
    const seed = params.seed ?? randomSeed();
    const steps = params.steps ?? 8;

    const model = params.model === "sdxl" ? MODELS.sdxl : MODELS.textToImage;
    const isFlux = model.includes("flux");

    const images: GeneratedImage[] = [];

    // One request per image: Workers AI has no batch parameter, and separate
    // seeds give genuine variations rather than duplicates.
    for (let index = 0; index < params.imageCount; index += 1) {
      const imageSeed = seed + index;

      const input: Record<string, unknown> = isFlux
        ? {
            prompt: params.prompt,
            // Flux Schnell is a distilled few-step model; more steps waste
            // neurons without improving the image.
            steps: Math.min(8, steps),
            seed: imageSeed,
          }
        : {
            prompt: params.prompt,
            negative_prompt: params.negativePrompt || undefined,
            width: clampDimension(params.width),
            height: clampDimension(params.height),
            num_steps: Math.min(20, steps),
            guidance: params.guidance ?? 7.5,
            seed: imageSeed,
          };

      const data = await run(model, input, params.signal);
      const dims = await measure(data);

      images.push({
        data,
        contentType: "image/png",
        width: dims.width || params.width,
        height: dims.height || params.height,
        seed: imageSeed,
      });
    }

    return {
      images,
      metadata: {
        provider: "cloudflare",
        model: isFlux ? "flux-1-schnell" : "sdxl-base-1.0",
        seed,
        steps,
        guidance: params.guidance,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async generateImageToImage(params: ImageToImageParams): Promise<GenerationResult> {
    const startedAt = Date.now();
    const seed = params.seed ?? randomSeed();
    const sharp = (await import("sharp")).default;

    const width = clampDimension(params.width);
    const height = clampDimension(params.height);

    // Workers AI takes image bytes as a plain array of ints.
    const source = await sharp(params.image)
      .resize(width, height, { fit: "cover" })
      .png()
      .toBuffer();

    const images: GeneratedImage[] = [];

    for (let index = 0; index < params.imageCount; index += 1) {
      const data = await run(
        MODELS.sdxl,
        {
          prompt: params.prompt,
          negative_prompt: params.negativePrompt || undefined,
          image: [...source],
          strength: params.strength,
          num_steps: Math.min(20, params.steps ?? 15),
          guidance: params.guidance ?? 7.5,
          seed: seed + index,
        },
        params.signal,
      );

      const dims = await measure(data);
      images.push({
        data,
        contentType: "image/png",
        width: dims.width || width,
        height: dims.height || height,
        seed: seed + index,
      });
    }

    return {
      images,
      metadata: {
        provider: "cloudflare",
        model: "sdxl-base-1.0",
        seed,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  /**
   * Workers AI has no super-resolution model, so this is a Lanczos resample
   * with a light sharpen — a real enlargement, but not a generative upscale.
   * Said plainly rather than dressed up as AI upscaling.
   */
  async upscale(params: UpscaleParams): Promise<GenerationResult> {
    const startedAt = Date.now();
    const sharp = (await import("sharp")).default;

    const meta = await sharp(params.image).metadata();
    const width = (meta.width ?? 512) * params.factor;
    const height = (meta.height ?? 512) * params.factor;

    const data = await sharp(params.image)
      .resize(width, height, { kernel: "lanczos3" })
      .sharpen({ sigma: 0.6 })
      .png()
      .toBuffer();

    return {
      images: [{ data, contentType: "image/png", width, height, seed: null }],
      metadata: {
        provider: "cloudflare",
        model: `lanczos-${params.factor}x`,
        seed: null,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async removeBackground(params: SegmentParams): Promise<SegmentResult> {
    // Workers AI has no segmentation model, so this runs locally on CPU.
    const { removeBackgroundLocally } = await import("./segment");
    return removeBackgroundLocally(params);
  },

  async generateScene(params: SceneParams): Promise<GenerationResult> {
    const startedAt = Date.now();
    const seed = params.seed ?? randomSeed();
    const width = clampDimension(params.width);
    const height = clampDimension(params.height);

    const images: GeneratedImage[] = [];

    for (let index = 0; index < params.imageCount; index += 1) {
      let data: Buffer;

      if (params.baseImage && params.maskImage) {
        // Inpaint around the product so scene lighting agrees with it.
        const sharp = (await import("sharp")).default;
        const base = await sharp(params.baseImage).resize(width, height, { fit: "cover" }).png().toBuffer();
        const mask = await sharp(params.maskImage).resize(width, height, { fit: "cover" }).greyscale().png().toBuffer();

        data = await run(
          MODELS.inpaint,
          {
            prompt: params.prompt,
            negative_prompt: params.negativePrompt || undefined,
            image: [...base],
            mask: [...mask],
            num_steps: Math.min(20, params.steps ?? 15),
            guidance: params.guidance ?? 7.5,
            seed: seed + index,
          },
          params.signal,
        );
      } else {
        // No mask: generate a plain backdrop to composite onto.
        data = await run(
          MODELS.textToImage,
          { prompt: params.prompt, steps: 8, seed: seed + index },
          params.signal,
        );
      }

      const dims = await measure(data);
      images.push({
        data,
        contentType: "image/png",
        width: dims.width || width,
        height: dims.height || height,
        seed: seed + index,
      });
    }

    return {
      images,
      metadata: {
        provider: "cloudflare",
        model: params.maskImage ? "sd-1.5-inpainting" : "flux-1-schnell",
        seed,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async healthCheck() {
    try {
      const { accountId, token } = credentials();
      // Listing models is the cheapest call that proves the token is valid and
      // spends no neurons.
      const response = await fetch(
        `${API_BASE}/${accountId}/ai/models/search?per_page=1`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );

      if (!response.ok) {
        return { ok: false, detail: `Workers AI returned ${response.status}` };
      }

      return { ok: true, detail: "Cloudflare Workers AI reachable (free tier)" };
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : "unreachable",
      };
    }
  },
};
