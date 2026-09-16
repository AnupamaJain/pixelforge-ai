import "server-only";

import { hostedProvider } from "@/providers/hosted";
import { invokeAIProvider } from "@/providers/invokeai";
import {
  ProviderError,
  type GenerationResult,
  type ImageGenerationProvider,
  type ImageToImageParams,
  type TextToImageParams,
  type UpscaleParams,
} from "./types";

export * from "./types";
export {
  generateProductScene,
  type ProductSceneParams,
  type ProductSceneResult,
} from "./product-scene";
export {
  DEFAULT_PLACEMENT,
  verifyProductPreserved,
  type Placement,
} from "./composite";

const PROVIDERS: Record<string, ImageGenerationProvider> = {
  hosted: hostedProvider,
  invokeai: invokeAIProvider,
};

/**
 * Resolves the configured engine. `IMAGE_PROVIDER` selects the implementation;
 * everything above this layer is provider-agnostic.
 */
export function getProvider(override?: string): ImageGenerationProvider {
  const id = (override || process.env.IMAGE_PROVIDER || "hosted").toLowerCase();
  const provider = PROVIDERS[id];

  if (!provider) {
    throw new ProviderError(`Unknown IMAGE_PROVIDER '${id}'`, {
      userMessage: "Image generation is misconfigured on this server.",
      retryable: false,
    });
  }

  return provider;
}

export function listProviders(): ImageGenerationProvider[] {
  return Object.values(PROVIDERS);
}

// --- Facade used by API routes and the job worker -------------------------
// Routes call these three functions and never touch a provider directly.

export async function generateImage(
  params: TextToImageParams,
  providerId?: string,
): Promise<GenerationResult> {
  return getProvider(providerId).generateTextToImage(params);
}

export async function imageToImage(
  params: ImageToImageParams,
  providerId?: string,
): Promise<GenerationResult> {
  return getProvider(providerId).generateImageToImage(params);
}

export async function upscaleImage(
  params: UpscaleParams,
  providerId?: string,
): Promise<GenerationResult> {
  return getProvider(providerId).upscale(params);
}

/** Runs the full product pipeline. See lib/generation-engine/product-scene.ts. */

/** Capabilities of the active engine, safe to expose to the client. */
export function getActiveCapabilities() {
  const provider = getProvider();
  return {
    providerId: provider.id,
    label: provider.label,
    ...provider.capabilities,
  };
}
