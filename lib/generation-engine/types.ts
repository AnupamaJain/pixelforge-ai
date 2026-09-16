/**
 * Provider-agnostic generation contract.
 *
 * Nothing outside `providers/` may reference a provider's own request or
 * response shape. Swapping the engine means adding a file in `providers/` and
 * registering it — no changes to routes, components or the database.
 */

export interface GeneratedImage {
  /** Raw image bytes. Persisted to our own storage, never hot-linked. */
  data: Buffer;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  seed: number | null;
}

/** The normalised result every provider must return. */
export interface GenerationResult {
  images: GeneratedImage[];
  metadata: {
    provider: string;
    model: string;
    seed: number | null;
    steps?: number;
    guidance?: number;
    durationMs: number;
  };
}

export interface TextToImageParams {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  imageCount: number;
  seed?: number | null;
  steps?: number;
  guidance?: number;
  model?: string;
  signal?: AbortSignal;
}

export interface ImageToImageParams extends TextToImageParams {
  /** Source image bytes. Providers must not mutate this buffer. */
  image: Buffer;
  imageContentType: string;
  /** 0..1 — how far from the source the result may drift. */
  strength: number;
}

/** Cut a product out of its background, returning RGBA with a real alpha channel. */
export interface SegmentParams {
  image: Buffer;
  imageContentType: string;
  signal?: AbortSignal;
}

export interface SegmentResult {
  /** RGBA PNG. Transparent everywhere except the product. */
  cutout: Buffer;
  width: number;
  height: number;
}

/**
 * Scene generation for the product pipeline.
 *
 * The provider generates the *environment*. It never draws the product — the
 * original product pixels are composited back afterwards, which is what makes
 * the pixel-identical guarantee hold.
 */
export interface SceneParams {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  imageCount: number;
  seed?: number | null;
  steps?: number;
  guidance?: number;
  /**
   * Composite of the product over a neutral canvas, plus a mask marking the
   * region the model may paint. Supplying both lets the engine inpaint around
   * the product so lighting and shadow agree with it.
   */
  baseImage?: Buffer;
  /** White = repaint, black = preserve. */
  maskImage?: Buffer;
  signal?: AbortSignal;
}

export interface UpscaleParams {
  image: Buffer;
  imageContentType: string;
  factor: 2 | 4;
  model?: string;
  signal?: AbortSignal;
}

/** Declares what a provider can actually do, so the UI never offers a no-op. */
export interface ProviderCapabilities {
  textToImage: boolean;
  imageToImage: boolean;
  upscale: boolean;
  /** Product-scene pipeline: background removal plus scene inpainting. */
  productScenes: boolean;
  /** Expose the steps slider only when the engine honours it. */
  supportsSteps: boolean;
  supportsGuidance: boolean;
  supportsNegativePrompt: boolean;
  supportsSeed: boolean;
  supportsMultipleImages: boolean;
  maxImagesPerRequest: number;
  availableModels: { id: string; label: string }[];
}

export interface ImageGenerationProvider {
  readonly id: string;
  readonly label: string;
  readonly capabilities: ProviderCapabilities;

  generateTextToImage(params: TextToImageParams): Promise<GenerationResult>;
  generateImageToImage(params: ImageToImageParams): Promise<GenerationResult>;
  upscale(params: UpscaleParams): Promise<GenerationResult>;

  /**
   * Optional product-pipeline capability. Providers that cannot segment or
   * inpaint simply omit these and report productScenes: false.
   */
  removeBackground?(params: SegmentParams): Promise<SegmentResult>;
  generateScene?(params: SceneParams): Promise<GenerationResult>;

  /** Cheap reachability probe used by the health endpoint and setup docs. */
  healthCheck(): Promise<{ ok: boolean; detail?: string }>;
}

/**
 * Errors a provider raises. `userMessage` is the only part ever shown to a
 * user — provider payloads may contain keys, URLs or internal hostnames.
 */
export class ProviderError extends Error {
  readonly userMessage: string;
  readonly retryable: boolean;

  constructor(
    internalMessage: string,
    options: { userMessage?: string; retryable?: boolean } = {},
  ) {
    super(internalMessage);
    this.name = "ProviderError";
    this.userMessage =
      options.userMessage ??
      "Image generation failed. Your credits have been refunded. Please try again.";
    this.retryable = options.retryable ?? true;
  }
}
