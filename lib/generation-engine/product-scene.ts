import "server-only";

import {
  buildSceneInputs,
  compositeProduct,
  trimCutout,
  verifyProductPreserved,
  DEFAULT_PLACEMENT,
  type Placement,
} from "./composite";
import { getProvider } from "./index";
import { ProviderError, type GeneratedImage, type GenerationResult } from "./types";

/**
 * The product-scene pipeline.
 *
 *   1. Segment the product out of its original photograph (provider).
 *   2. Build a base image + mask so the model paints only *around* it.
 *   3. Generate the scene (provider).
 *   4. Composite the ORIGINAL product pixels back over the scene (ours).
 *   5. Verify that every opaque product pixel survived unchanged.
 *
 * Step 4 is why the product is never model output, and step 5 is why that is a
 * checkable claim rather than a marketing line. If verification fails the whole
 * generation fails — we would rather refund than ship a silently altered product.
 */

export interface ProductSceneParams {
  productImage: Buffer;
  productContentType: string;
  scenePrompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  imageCount: number;
  seed?: number | null;
  steps?: number;
  guidance?: number;
  placement?: Placement;
  shadow?: boolean;
  signal?: AbortSignal;
}

export interface ProductSceneResult extends GenerationResult {
  /** The cut-out product, stored so the guarantee can be re-checked later. */
  cutout: Buffer;
  productPreserved: boolean;
}

export async function generateProductScene(
  params: ProductSceneParams,
): Promise<ProductSceneResult> {
  const startedAt = Date.now();
  const provider = getProvider();

  if (!provider.capabilities.productScenes || !provider.removeBackground || !provider.generateScene) {
    throw new ProviderError(
      `Provider '${provider.id}' does not support product scenes`,
      {
        userMessage:
          "Product Studio isn't available on this server's image engine. Switch IMAGE_PROVIDER to a provider that supports it.",
        retryable: false,
      },
    );
  }

  // 1. Segment.
  const segmented = await provider.removeBackground({
    image: params.productImage,
    imageContentType: params.productContentType,
    signal: params.signal,
  });

  const cutout = await trimCutout(segmented.cutout);
  const placement = params.placement ?? DEFAULT_PLACEMENT;

  // 2. Base + mask so the scene is generated around the real silhouette.
  const { base, mask } = await buildSceneInputs({
    cutout,
    width: params.width,
    height: params.height,
    placement,
  });

  // 3. Scene.
  const scenes = await provider.generateScene({
    prompt: params.scenePrompt,
    negativePrompt: params.negativePrompt,
    width: params.width,
    height: params.height,
    imageCount: params.imageCount,
    seed: params.seed,
    steps: params.steps,
    guidance: params.guidance,
    baseImage: base,
    maskImage: mask,
    signal: params.signal,
  });

  if (scenes.images.length === 0) {
    throw new ProviderError("Scene generation returned no images");
  }

  // 4 + 5. Composite, then verify.
  const images: GeneratedImage[] = [];
  let allPreserved = true;

  for (const scene of scenes.images) {
    const composited = await compositeProduct({
      scene: scene.data,
      cutout,
      width: params.width,
      height: params.height,
      placement,
      shadow: params.shadow,
    });

    const check = await verifyProductPreserved({
      composite: composited,
      cutout,
      width: params.width,
      height: params.height,
      placement,
    });

    if (!check.preserved) {
      allPreserved = false;
      console.error("[product-scene] pixel verification failed", {
        checkedPixels: check.checkedPixels,
        mismatches: check.mismatches,
      });
    }

    images.push({
      data: composited,
      contentType: "image/png",
      width: params.width,
      height: params.height,
      seed: scene.seed,
    });
  }

  if (!allPreserved) {
    throw new ProviderError(
      "Product pixels were altered during compositing — refusing to return the result",
      {
        userMessage:
          "We couldn't guarantee your product stayed unchanged, so we stopped. Your credits have been refunded.",
        retryable: true,
      },
    );
  }

  return {
    images,
    cutout,
    productPreserved: true,
    metadata: {
      ...scenes.metadata,
      durationMs: Date.now() - startedAt,
    },
  };
}
