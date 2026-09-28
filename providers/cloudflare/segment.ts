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

/** What the background-removal pipeline actually returns in Node. */
interface RawImageLike {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  channels: number;
}

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
 * transformers.js reads images from a URL, a file path or a Blob — but not
 * from a data URI in Node, which fails with "Unable to read image from". A
 * Blob keeps the bytes in memory, so no temp file is written per request.
 */
async function toRawImage(image: Buffer, contentType: string) {
  const { RawImage } = await import("@huggingface/transformers");
  const blob = new Blob([new Uint8Array(image)], { type: contentType });
  return (RawImage as unknown as { fromBlob(b: Blob): Promise<unknown> }).fromBlob(blob);
}

/**
 * Rebuilds the cutout from the ORIGINAL upload, with a hardened alpha channel.
 *
 * Two things matter here, and getting either wrong quietly guts the
 * pixel-identical guarantee:
 *
 *  1. **Colour comes from the original file**, never the model's output. The
 *     pipeline returns re-encoded RGB; compositing that would make "your
 *     original pixels" an approximation of them.
 *
 *  2. **Alpha is thresholded.** BiRefNet emits a soft confidence mask — the
 *     product interior lands around 234-254, with only ~0.2% at exactly 255.
 *     Verification counts only fully-opaque pixels, so without this the check
 *     silently shrinks to a few hundred pixels while still reporting success.
 *     Measured on a real product photo: 1,831 pixels checked before, ~168,000
 *     after.
 *
 * Anything at or above `ALPHA_SOLID` is the product and becomes fully opaque.
 * Anything at or below `ALPHA_CLEAR` is background and becomes fully
 * transparent. The band between is a genuine anti-aliased edge and is left
 * alone, so edges still blend into the generated scene.
 */
const ALPHA_SOLID = 220;
const ALPHA_CLEAR = 20;

async function buildCutout(
  original: Buffer,
  segmented: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;

  const alpha = await sharp(segmented)
    .resize(width, height, { fit: "fill", kernel: "lanczos3" })
    .extractChannel("alpha")
    .raw()
    .toBuffer();

  const rgb = await sharp(original)
    .resize(width, height, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

  // Interleaved explicitly rather than via joinChannel(), which silently
  // dropped the mask here and returned a 3-channel image — the background
  // then survived and the "cutout" was the whole photo.
  const rgba = Buffer.allocUnsafe(width * height * 4);

  for (let i = 0; i < width * height; i += 1) {
    rgba[i * 4] = rgb[i * 3];
    rgba[i * 4 + 1] = rgb[i * 3 + 1];
    rgba[i * 4 + 2] = rgb[i * 3 + 2];

    const a = alpha[i];
    rgba[i * 4 + 3] = a >= ALPHA_SOLID ? 255 : a <= ALPHA_CLEAR ? 0 : a;
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
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
      input: unknown,
    ) => Promise<RawImageLike[] | RawImageLike>;

    const source = await sharp(params.image).metadata();
    const raw = await toRawImage(params.image, params.imageContentType);
    const output = await segmenter(raw);
    const first = Array.isArray(output) ? output[0] : output;

    if (!first?.data || first.channels !== 4) {
      throw new ProviderError(
        `Segmentation returned ${first?.channels ?? 0} channels; expected RGBA`,
      );
    }

    // The pipeline returns raw RGBA rather than an encoded image. Building the
    // PNG straight from those bytes avoids toBlob(), which is not usable in
    // Node, and skips an encode/decode round trip.
    const segmented = await sharp(Buffer.from(first.data), {
      raw: { width: first.width, height: first.height, channels: 4 },
    })
      .png()
      .toBuffer();

    // The model works at its own resolution, so scale the mask back up to the
    // photo the customer actually uploaded — the pixel guarantee downstream
    // compares against those original pixels.
    // Always rebuild: the alpha needs thresholding whether or not the model
    // worked at the source resolution.
    const cutout = await buildCutout(
      params.image,
      segmented,
      source.width ?? first.width,
      source.height ?? first.height,
    );

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
