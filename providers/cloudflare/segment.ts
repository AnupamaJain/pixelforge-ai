import "server-only";

import {
  ProviderError,
  type SegmentParams,
  type SegmentResult,
} from "@/lib/generation-engine/types";

/**
 * Local background removal.
 *
 * Cloudflare Workers AI has no segmentation model, so this runs on CPU in the
 * Node process via transformers.js — no API key, no per-call cost, which keeps
 * the free stack genuinely free.
 *
 * ── MODEL LICENSING — read before changing the default ──────────────────────
 * The obvious choice, BriaAI's RMBG-1.4 / RMBG-2.0, is **non-commercial**:
 * commercial use requires an agreement with BRIA. It is the single most
 * common licensing mistake in this space precisely because it is the easiest
 * model to reach for.
 *
 * The default here is **BiRefNet**, whose original weights are MIT and safe to
 * charge for. If you override CLOUDFLARE_SEGMENT_MODEL, check the new model's
 * weight licence — not just the code licence. See THIRD_PARTY_LICENSES.md.
 *
 * First call downloads weights (~200MB) and caches them, so it is slow once
 * and fast afterwards. Set TRANSFORMERS_CACHE to control where.
 */

const SEGMENT_MODEL =
  process.env.CLOUDFLARE_SEGMENT_MODEL || "onnx-community/BiRefNet_lite";

/** Loaded once per process — the model is large and init is expensive. */
let segmenterPromise: Promise<unknown> | null = null;

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // Remote weights only; there are no local model files bundled here.
      env.allowLocalModels = false;
      return pipeline("background-removal", SEGMENT_MODEL);
    })().catch((error) => {
      // Do not cache a failed init, or every later call fails too.
      segmenterPromise = null;
      throw error;
    });
  }
  return segmenterPromise;
}

/**
 * Cuts the subject out, returning RGBA with a real alpha channel so the
 * compositing and pixel-verification steps downstream work unchanged.
 */
export async function removeBackgroundLocally(
  params: SegmentParams,
): Promise<SegmentResult> {
  const sharp = (await import("sharp")).default;

  try {
    const segmenter = (await getSegmenter()) as (
      input: string,
    ) => Promise<{ toBlob?: () => Blob }[] | { toBlob?: () => Blob }>;

    // transformers.js takes a data URI or URL rather than a Buffer.
    const dataUri = `data:${params.imageContentType};base64,${params.image.toString("base64")}`;
    const output = await segmenter(dataUri);
    const first = Array.isArray(output) ? output[0] : output;

    if (!first?.toBlob) {
      throw new ProviderError("Segmentation returned no image");
    }

    const blob = first.toBlob();
    const cutout = await sharp(Buffer.from(await blob.arrayBuffer()))
      .ensureAlpha()
      .png()
      .toBuffer();

    const meta = await sharp(cutout).metadata();

    // A result with no transparency means segmentation silently failed; the
    // pixel guarantee downstream would then be vacuous.
    const alpha = await sharp(cutout).extractChannel("alpha").stats();
    if (alpha.channels[0].min === 255) {
      throw new ProviderError("Segmentation produced no transparent region", {
        userMessage:
          "We couldn't separate your product from its background. Try a photo with more contrast behind the product.",
        retryable: false,
      });
    }

    return {
      cutout,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    };
  } catch (error) {
    if (error instanceof ProviderError) throw error;

    throw new ProviderError(
      `Local segmentation failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        userMessage:
          "Background removal is unavailable on this server. Your credits have been refunded.",
        retryable: true,
      },
    );
  }
}
