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
 * Development provider.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  THIS IS NOT A GENERATION ENGINE. IT PRODUCES NO REAL IMAGERY.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * It exists so the full pipeline — job queue, credit reservation, storage,
 * segmentation, compositing, pixel verification, refund-on-failure — can be
 * exercised end to end without a provider API key or a GPU. That makes the
 * orchestration provable in CI and on a laptop.
 *
 * Every image it returns carries a baked-in "DEV PREVIEW" watermark, so its
 * output is self-evidently not a generation and cannot be mistaken for one if
 * it ever escapes into a gallery.
 *
 * It refuses to run in production unless the operator explicitly overrides the
 * guard, because silently serving placeholder images to a paying customer
 * would be the worst possible failure mode.
 */

function assertNotProduction(): void {
  const isProduction = process.env.NODE_ENV === "production";
  const override = process.env.ALLOW_DEV_PROVIDER_IN_PRODUCTION === "true";

  if (isProduction && !override) {
    throw new ProviderError(
      "Development provider blocked in production",
      {
        userMessage:
          "Image generation is not configured on this server. Set IMAGE_PROVIDER to a real provider.",
        retryable: false,
      },
    );
  }
}

async function sharpLib() {
  return (await import("sharp")).default;
}

/** Deterministic per-seed hue so repeated runs are reproducible. */
function hueFor(seed: number): number {
  return Math.abs(Math.sin(seed) * 360) % 360;
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${s}%, ${l}%)`;
}

/**
 * Renders a placeholder frame. The watermark is drawn into the pixels, not
 * overlaid at display time, so it survives download and export.
 */
async function renderFrame(params: {
  width: number;
  height: number;
  seed: number;
  label: string;
  caption?: string;
}): Promise<Buffer> {
  const sharp = await sharpLib();
  const hue = hueFor(params.seed);
  const short = Math.min(params.width, params.height);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${params.width}" height="${params.height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${hsl(hue, 45, 72)}"/>
      <stop offset="100%" stop-color="${hsl((hue + 45) % 360, 40, 42)}"/>
    </linearGradient>
    <pattern id="stripe" width="28" height="28" patternTransform="rotate(45)"
      patternUnits="userSpaceOnUse">
      <rect width="28" height="28" fill="none"/>
      <rect width="14" height="28" fill="rgba(255,255,255,0.10)"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect width="100%" height="100%" fill="url(#stripe)"/>
  <text x="50%" y="46%" text-anchor="middle"
    font-family="system-ui, sans-serif" font-size="${Math.round(short * 0.075)}"
    font-weight="700" fill="rgba(255,255,255,0.95)" letter-spacing="2">
    DEV PREVIEW
  </text>
  <text x="50%" y="55%" text-anchor="middle"
    font-family="system-ui, sans-serif" font-size="${Math.round(short * 0.036)}"
    fill="rgba(255,255,255,0.85)">
    ${params.label}
  </text>
  ${
    params.caption
      ? `<text x="50%" y="62%" text-anchor="middle"
    font-family="system-ui, sans-serif" font-size="${Math.round(short * 0.026)}"
    fill="rgba(255,255,255,0.7)">${params.caption}</text>`
      : ""
  }
  <text x="50%" y="93%" text-anchor="middle"
    font-family="system-ui, sans-serif" font-size="${Math.round(short * 0.022)}"
    fill="rgba(255,255,255,0.65)">
    not a real generation · seed ${params.seed}
  </text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Escapes text before it reaches the SVG string above. */
function safe(text: string, max = 48): string {
  return text
    .slice(0, max)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

/** Simulates engine latency so polling and progress UI are exercised. */
async function simulateLatency(): Promise<void> {
  const ms = Number.parseInt(process.env.DEV_PROVIDER_LATENCY_MS || "350", 10);
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Set DEV_PROVIDER_FAIL_RATE to exercise the refund path. */
function maybeFail(): void {
  const rate = Number.parseFloat(process.env.DEV_PROVIDER_FAIL_RATE || "0");
  if (rate > 0 && Math.random() < rate) {
    throw new ProviderError("Simulated provider failure (DEV_PROVIDER_FAIL_RATE)");
  }
}

const capabilities: ProviderCapabilities = {
  textToImage: true,
  imageToImage: true,
  upscale: true,
  productScenes: true,
  supportsSteps: true,
  supportsGuidance: true,
  supportsNegativePrompt: true,
  supportsSeed: true,
  supportsMultipleImages: true,
  maxImagesPerRequest: 8,
  availableModels: [{ id: "dev-preview", label: "Development preview (not real)" }],
};

export const localProvider: ImageGenerationProvider = {
  id: "local",
  label: "Development preview (generates no real imagery)",
  capabilities,

  async generateTextToImage(params: TextToImageParams): Promise<GenerationResult> {
    assertNotProduction();
    const startedAt = Date.now();
    await simulateLatency();
    maybeFail();

    const seed = params.seed ?? randomSeed();
    const images: GeneratedImage[] = [];

    for (let index = 0; index < params.imageCount; index += 1) {
      images.push({
        data: await renderFrame({
          width: params.width,
          height: params.height,
          seed: seed + index,
          label: "Text to image",
          caption: safe(params.prompt),
        }),
        contentType: "image/png",
        width: params.width,
        height: params.height,
        seed: seed + index,
      });
    }

    return {
      images,
      metadata: {
        provider: "local",
        model: "dev-preview",
        seed,
        steps: params.steps,
        guidance: params.guidance,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async generateImageToImage(params: ImageToImageParams): Promise<GenerationResult> {
    assertNotProduction();
    const startedAt = Date.now();
    await simulateLatency();
    maybeFail();

    const sharp = await sharpLib();
    const seed = params.seed ?? randomSeed();
    const images: GeneratedImage[] = [];

    for (let index = 0; index < params.imageCount; index += 1) {
      const frame = await renderFrame({
        width: params.width,
        height: params.height,
        seed: seed + index,
        label: "Image to image",
        caption: `strength ${params.strength.toFixed(2)}`,
      });

      // Blend the source through so the strength control is visibly wired up.
      const source = await sharp(params.image)
        .resize(params.width, params.height, { fit: "cover" })
        .ensureAlpha()
        .composite([
          {
            input: Buffer.from([255, 255, 255, Math.round(params.strength * 255)]),
            raw: { width: 1, height: 1, channels: 4 },
            tile: true,
            blend: "dest-in",
          },
        ])
        .png()
        .toBuffer();

      images.push({
        data: await sharp(frame)
          .composite([{ input: source, blend: "over" }])
          .png()
          .toBuffer(),
        contentType: "image/png",
        width: params.width,
        height: params.height,
        seed: seed + index,
      });
    }

    return {
      images,
      metadata: {
        provider: "local",
        model: "dev-preview",
        seed,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async upscale(params: UpscaleParams): Promise<GenerationResult> {
    assertNotProduction();
    const startedAt = Date.now();
    await simulateLatency();
    maybeFail();

    const sharp = await sharpLib();
    const meta = await sharp(params.image).metadata();
    const width = (meta.width ?? 512) * params.factor;
    const height = (meta.height ?? 512) * params.factor;

    // A real resample, so downstream size assertions hold.
    const data = await sharp(params.image)
      .resize(width, height, { kernel: "lanczos3" })
      .sharpen()
      .png()
      .toBuffer();

    return {
      images: [{ data, contentType: "image/png", width, height, seed: null }],
      metadata: {
        provider: "local",
        model: `dev-upscale-${params.factor}x`,
        seed: null,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  /**
   * Centre-ellipse cutout. Crude by design: it produces a genuine alpha
   * channel so the compositing and verification steps downstream are
   * exercised for real, without pretending to be segmentation.
   */
  async removeBackground(params: SegmentParams): Promise<SegmentResult> {
    assertNotProduction();
    await simulateLatency();

    const sharp = await sharpLib();
    const base = await sharp(params.image).ensureAlpha().png().toBuffer();
    const meta = await sharp(base).metadata();
    const width = meta.width ?? 512;
    const height = meta.height ?? 512;

    const mask = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
         <ellipse cx="${width / 2}" cy="${height / 2}"
           rx="${width * 0.38}" ry="${height * 0.38}" fill="#fff"/>
       </svg>`,
    );

    const cutout = await sharp(base)
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toBuffer();

    return { cutout, width, height };
  },

  async generateScene(params: SceneParams): Promise<GenerationResult> {
    assertNotProduction();
    const startedAt = Date.now();
    await simulateLatency();
    maybeFail();

    const seed = params.seed ?? randomSeed();
    const images: GeneratedImage[] = [];

    for (let index = 0; index < params.imageCount; index += 1) {
      images.push({
        data: await renderFrame({
          width: params.width,
          height: params.height,
          seed: seed + index,
          label: "Generated scene",
          caption: safe(params.prompt, 60),
        }),
        contentType: "image/png",
        width: params.width,
        height: params.height,
        seed: seed + index,
      });
    }

    return {
      images,
      metadata: {
        provider: "local",
        model: "dev-preview",
        seed,
        durationMs: Date.now() - startedAt,
      },
    };
  },

  async healthCheck() {
    try {
      assertNotProduction();
      return {
        ok: true,
        detail: "Development provider — generates placeholder imagery only",
      };
    } catch {
      return { ok: false, detail: "Blocked in production" };
    }
  },
};
