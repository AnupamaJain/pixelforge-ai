/**
 * Style preset catalogue.
 *
 * Presets are structured data, never inlined into components. Adding a style
 * is a matter of appending an entry here — the UI reads this list at runtime.
 */

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  /** Appended to the user prompt. `{prompt}` is substituted if present. */
  promptModifier: string;
  /** Merged into the user's negative prompt. */
  negativePromptModifier: string;
  /** Optional per-style generation hints applied when the user hasn't overridden them. */
  defaults?: {
    guidance?: number;
    steps?: number;
  };
  /** Restricts the preset to specific models. Empty/undefined = all models. */
  supportedModels?: string[];
}

const SHARED_NEGATIVE = "blurry, low quality, watermark, signature, jpeg artifacts";

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "none",
    name: "No style",
    description: "Your prompt, passed through untouched.",
    promptModifier: "{prompt}",
    negativePromptModifier: "",
  },
  {
    id: "photorealistic",
    name: "Photorealistic",
    description: "Natural light, true-to-life detail and depth of field.",
    promptModifier:
      "{prompt}, photorealistic, ultra detailed, natural lighting, shallow depth of field, 50mm lens, high dynamic range",
    negativePromptModifier: `${SHARED_NEGATIVE}, illustration, cartoon, painting, cgi, plastic skin`,
    defaults: { guidance: 6, steps: 32 },
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Filmic colour grading with dramatic, motivated lighting.",
    promptModifier:
      "{prompt}, cinematic still, anamorphic lens flare, dramatic rim lighting, film grain, teal and orange grade, 2.39:1 composition",
    negativePromptModifier: `${SHARED_NEGATIVE}, flat lighting, snapshot, amateur`,
    defaults: { guidance: 7, steps: 36 },
  },
  {
    id: "anime",
    name: "Anime",
    description: "Clean cel shading with expressive linework.",
    promptModifier:
      "{prompt}, anime key visual, cel shaded, crisp linework, vibrant palette, studio production quality",
    negativePromptModifier: `${SHARED_NEGATIVE}, photorealistic, 3d render, western comic, sketchy lines`,
    defaults: { guidance: 8, steps: 30 },
  },
  {
    id: "digital-art",
    name: "Digital Art",
    description: "Polished concept art with bold shapes and colour.",
    promptModifier:
      "{prompt}, digital painting, concept art, dynamic composition, bold colour palette, intricate detail, trending illustration",
    negativePromptModifier: `${SHARED_NEGATIVE}, photograph, low contrast`,
    defaults: { guidance: 7, steps: 32 },
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Magazine-grade portraiture with restrained styling.",
    promptModifier:
      "{prompt}, editorial photography, magazine spread, controlled studio lighting, refined styling, muted sophisticated palette",
    negativePromptModifier: `${SHARED_NEGATIVE}, oversaturated, cluttered background, harsh flash`,
    defaults: { guidance: 6, steps: 32 },
  },
  {
    id: "product",
    name: "Product Photography",
    description: "Clean commercial product shots on seamless backdrops.",
    promptModifier:
      "{prompt}, professional product photography, seamless studio backdrop, soft box lighting, sharp focus, subtle reflections, commercial catalogue quality",
    negativePromptModifier: `${SHARED_NEGATIVE}, cluttered, messy background, harsh shadows, distorted proportions`,
    defaults: { guidance: 6, steps: 34 },
  },
  {
    id: "fashion",
    name: "Fashion",
    description: "High-fashion campaign imagery with strong silhouettes.",
    promptModifier:
      "{prompt}, high fashion editorial, couture styling, striking silhouette, runway lighting, luxury campaign aesthetic",
    negativePromptModifier: `${SHARED_NEGATIVE}, casual clothing, poorly fitted garments, deformed hands`,
    defaults: { guidance: 7, steps: 34 },
  },
  {
    id: "architecture",
    name: "Architecture",
    description: "Precise architectural visualisation with clean geometry.",
    promptModifier:
      "{prompt}, architectural visualisation, precise geometry, golden hour daylight, wide angle, tilt-shift correction, material realism",
    negativePromptModifier: `${SHARED_NEGATIVE}, warped perspective, crooked lines, people in frame`,
    defaults: { guidance: 6, steps: 34 },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Generous negative space and a restrained palette.",
    promptModifier:
      "{prompt}, minimalist composition, generous negative space, limited palette, clean geometry, soft even lighting",
    negativePromptModifier: `${SHARED_NEGATIVE}, busy, cluttered, ornate, maximalist`,
    defaults: { guidance: 5, steps: 28 },
  },
  {
    id: "illustration",
    name: "Illustration",
    description: "Editorial illustration with confident, textured strokes.",
    promptModifier:
      "{prompt}, editorial illustration, textured brush strokes, confident shapes, harmonious limited palette, print quality",
    negativePromptModifier: `${SHARED_NEGATIVE}, photographic, 3d render`,
    defaults: { guidance: 7, steps: 30 },
  },
  {
    id: "3d-render",
    name: "3D Render",
    description: "Physically based rendering with soft global illumination.",
    promptModifier:
      "{prompt}, octane render, physically based materials, soft global illumination, subsurface scattering, 8k render, ray traced reflections",
    negativePromptModifier: `${SHARED_NEGATIVE}, flat shading, 2d illustration, hand drawn`,
    defaults: { guidance: 7, steps: 36 },
  },
  {
    id: "watercolour",
    name: "Watercolour",
    description: "Loose washes with visible paper grain and bleed.",
    promptModifier:
      "{prompt}, watercolour painting, loose wet-on-wet washes, visible paper grain, soft pigment bleed, delicate edges",
    negativePromptModifier: `${SHARED_NEGATIVE}, digital, sharp vector edges, 3d render`,
    defaults: { guidance: 7, steps: 28 },
  },
];

export const DEFAULT_STYLE_ID = "photorealistic";

export function getStyle(styleId: string | null | undefined): StylePreset {
  return (
    STYLE_PRESETS.find((style) => style.id === styleId) ??
    STYLE_PRESETS.find((style) => style.id === DEFAULT_STYLE_ID)!
  );
}

/** Applies a preset's modifiers to the raw user input. */
export function applyStyle(
  styleId: string | null | undefined,
  prompt: string,
  negativePrompt?: string | null,
): { prompt: string; negativePrompt: string } {
  const style = getStyle(styleId);
  const trimmed = prompt.trim();

  const styled = style.promptModifier.includes("{prompt}")
    ? style.promptModifier.replace("{prompt}", trimmed)
    : `${trimmed}, ${style.promptModifier}`;

  const negatives = [negativePrompt?.trim(), style.negativePromptModifier.trim()]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  return { prompt: styled, negativePrompt: negatives };
}
