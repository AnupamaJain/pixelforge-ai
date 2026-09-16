/**
 * Product scene catalogue.
 *
 * A "scene" is the environment generated *around* a product. The product
 * pixels themselves are never generated — they are composited back from the
 * original upload, which is what makes the pixel-identical guarantee hold.
 *
 * Adding a scene is appending an entry here; no UI changes required.
 */

export interface ScenePreset {
  id: string;
  name: string;
  category: "studio" | "lifestyle" | "seasonal" | "surface" | "outdoor";
  description: string;
  /** Describes the environment only — never the product. */
  scenePrompt: string;
  negativePrompt: string;
  /** Keeps generated lighting consistent with how the product was lit. */
  lighting: string;
  suggestedFor?: string[];
}

const SHARED_NEGATIVE =
  "text, watermark, logo, extra products, duplicated object, distorted proportions, cluttered, low quality";

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: "studio-white",
    name: "Studio White",
    category: "studio",
    description: "Clean seamless white — the marketplace default.",
    scenePrompt:
      "seamless pure white studio backdrop, soft even box lighting, subtle contact shadow beneath, professional e-commerce product photography",
    negativePrompt: `${SHARED_NEGATIVE}, harsh shadows, coloured background, gradient`,
    lighting: "soft, even, shadowless",
    suggestedFor: ["Amazon", "eBay", "catalogue"],
  },
  {
    id: "studio-gradient",
    name: "Studio Gradient",
    category: "studio",
    description: "Soft tonal gradient that lifts the product off the page.",
    scenePrompt:
      "smooth neutral gradient studio backdrop, gentle falloff, soft directional key light, refined contact shadow",
    negativePrompt: `${SHARED_NEGATIVE}, busy background, texture`,
    lighting: "directional key with soft fill",
  },
  {
    id: "marble",
    name: "Marble Surface",
    category: "surface",
    description: "Polished marble with natural window light.",
    scenePrompt:
      "polished white carrara marble surface, soft natural window light from the left, delicate reflections, minimal styling, shallow depth of field",
    negativePrompt: `${SHARED_NEGATIVE}, dark, heavy shadows`,
    lighting: "soft natural window light",
    suggestedFor: ["jewelry", "cosmetics", "watches"],
  },
  {
    id: "linen",
    name: "Natural Linen",
    category: "surface",
    description: "Textured oatmeal linen, warm and tactile.",
    scenePrompt:
      "natural oatmeal linen fabric surface with gentle folds, warm diffused daylight, soft organic shadows, artisanal styling",
    negativePrompt: `${SHARED_NEGATIVE}, synthetic, shiny, cold tones`,
    lighting: "warm diffused daylight",
    suggestedFor: ["skincare", "candles", "home goods"],
  },
  {
    id: "concrete",
    name: "Concrete & Shadow",
    category: "surface",
    description: "Raw concrete with hard architectural light.",
    scenePrompt:
      "raw polished concrete surface, hard directional sunlight casting a crisp geometric shadow, brutalist minimal styling, cool neutral palette",
    negativePrompt: `${SHARED_NEGATIVE}, warm tones, soft lighting, floral`,
    lighting: "hard directional sun",
    suggestedFor: ["streetwear", "tech", "eyewear"],
  },
  {
    id: "kitchen-counter",
    name: "Kitchen Counter",
    category: "lifestyle",
    description: "Bright modern kitchen, lived-in but tidy.",
    scenePrompt:
      "bright modern kitchen countertop, out-of-focus kitchen background, morning daylight through a window, subtle everyday styling, warm and inviting",
    negativePrompt: `${SHARED_NEGATIVE}, messy, dirty, people, hands`,
    lighting: "morning window daylight",
    suggestedFor: ["food", "beverage", "kitchenware"],
  },
  {
    id: "bathroom-shelf",
    name: "Bathroom Shelf",
    category: "lifestyle",
    description: "Spa-like tiled bathroom with soft steam.",
    scenePrompt:
      "minimal spa bathroom shelf, matte ceramic tiles, soft diffused light, faint steam, eucalyptus sprig, calm neutral palette",
    negativePrompt: `${SHARED_NEGATIVE}, cluttered, mirror reflections, people`,
    lighting: "soft diffused",
    suggestedFor: ["skincare", "haircare", "wellness"],
  },
  {
    id: "desk-workspace",
    name: "Desk Workspace",
    category: "lifestyle",
    description: "Considered desk setup with depth behind.",
    scenePrompt:
      "clean modern wooden desk workspace, blurred laptop and notebook in the background, soft side daylight, calm productive atmosphere",
    negativePrompt: `${SHARED_NEGATIVE}, messy cables, people, hands`,
    lighting: "soft side daylight",
    suggestedFor: ["tech", "stationery", "accessories"],
  },
  {
    id: "outdoor-nature",
    name: "Outdoor Nature",
    category: "outdoor",
    description: "Mossy stone and dappled forest light.",
    scenePrompt:
      "mossy stone in a forest clearing, dappled golden sunlight through leaves, shallow depth of field, organic natural styling",
    negativePrompt: `${SHARED_NEGATIVE}, people, animals, rain`,
    lighting: "dappled golden hour",
    suggestedFor: ["outdoor gear", "natural products"],
  },
  {
    id: "beach-summer",
    name: "Beach & Summer",
    category: "seasonal",
    description: "Sun-bleached sand and bright coastal light.",
    scenePrompt:
      "fine sun-bleached beach sand, bright coastal daylight, soft shell and pebble details, breezy summer atmosphere, pale blue and warm sand palette",
    negativePrompt: `${SHARED_NEGATIVE}, people, dark, overcast`,
    lighting: "bright coastal sun",
    suggestedFor: ["summer", "swimwear", "sunscreen"],
  },
  {
    id: "festive-winter",
    name: "Festive Winter",
    category: "seasonal",
    description: "Warm holiday scene with bokeh lights.",
    scenePrompt:
      "cosy winter holiday scene, warm bokeh fairy lights in the background, pine sprigs and soft knit texture, candlelit warmth, festive but restrained",
    negativePrompt: `${SHARED_NEGATIVE}, garish, cartoonish, people`,
    lighting: "warm candlelit with bokeh",
    suggestedFor: ["Q4", "gifting", "holiday campaigns"],
  },
  {
    id: "autumn-warm",
    name: "Autumn Warmth",
    category: "seasonal",
    description: "Dry leaves and low amber light.",
    scenePrompt:
      "dry autumn leaves on weathered wood, low amber afternoon sunlight, long soft shadows, rich ochre and rust palette",
    negativePrompt: `${SHARED_NEGATIVE}, green foliage, cold tones, people`,
    lighting: "low amber afternoon sun",
    suggestedFor: ["autumn", "seasonal campaigns"],
  },
];

export const SCENE_CATEGORIES = [
  { id: "studio", label: "Studio" },
  { id: "surface", label: "Surfaces" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "seasonal", label: "Seasonal" },
  { id: "outdoor", label: "Outdoor" },
] as const;

export const DEFAULT_SCENE_ID = "studio-white";

export function getScene(sceneId: string | null | undefined): ScenePreset {
  return (
    SCENE_PRESETS.find((scene) => scene.id === sceneId) ??
    SCENE_PRESETS.find((scene) => scene.id === DEFAULT_SCENE_ID)!
  );
}

/**
 * Builds the scene prompt. The product is described only as "the product" so
 * the model renders an environment around it rather than trying to redraw it.
 */
export function composeScenePrompt(params: {
  sceneId: string;
  productDescription?: string | null;
  brandModifier?: string | null;
  extraPrompt?: string | null;
}): { prompt: string; negativePrompt: string } {
  const scene = getScene(params.sceneId);

  const parts = [
    params.productDescription?.trim()
      ? `product photograph of ${params.productDescription.trim()}`
      : "professional product photograph",
    scene.scenePrompt,
    params.extraPrompt?.trim() || null,
    params.brandModifier?.trim() || null,
  ].filter(Boolean);

  return {
    prompt: parts.join(", "),
    negativePrompt: scene.negativePrompt,
  };
}
