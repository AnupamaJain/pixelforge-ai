/**
 * Marketing imagery manifest.
 *
 * IMPORTANT — read before launch:
 * The images shipped in /public/showcase are licensed stock photographs used
 * as *design placeholders*. They are NOT output from this application.
 *
 * While `NEXT_PUBLIC_SHOWCASE_PLACEHOLDER` is not set to "false", the landing
 * page renders a small "Sample imagery" disclosure so nothing on the page
 * misrepresents what the product produces.
 *
 * To go live honestly:
 *   1. Generate real images with your own deployment.
 *   2. Drop them into /public/showcase using the same filenames (or edit the
 *      paths below).
 *   3. Set NEXT_PUBLIC_SHOWCASE_PLACEHOLDER=false.
 *
 * Stock photography: Unsplash License (free for commercial use, no permission
 * required). See THIRD_PARTY_LICENSES.md.
 */

export interface ShowcaseImage {
  src: string;
  /** Describes the picture for screen readers and when images fail to load. */
  alt: string;
  /** Intrinsic aspect ratio, used to reserve layout space and avoid shift. */
  ratio?: number;
}

const base = "/showcase";

/** True while the page is still showing stock placeholders. */
export function isPlaceholderShowcase(): boolean {
  return process.env.NEXT_PUBLIC_SHOWCASE_PLACEHOLDER !== "false";
}

/** Per-style example imagery for the style-preset grid and playground. */
export const STYLE_SHOWCASE: Record<string, ShowcaseImage> = {
  photorealistic: {
    src: `${base}/portrait-woman.webp`,
    alt: "Natural-light portrait with shallow depth of field",
  },
  cinematic: {
    src: `${base}/cinematic-moody.webp`,
    alt: "Moody, film-graded scene with dramatic lighting",
  },
  anime: {
    src: `${base}/art-paint.webp`,
    alt: "Stylised illustrative artwork with bold colour",
  },
  "digital-art": {
    src: `${base}/abstract-fluid.webp`,
    alt: "Vivid flowing abstract forms in saturated colour",
  },
  editorial: {
    src: `${base}/fashion-model.webp`,
    alt: "Editorial fashion portrait with restrained styling",
  },
  product: {
    src: `${base}/product-watch.webp`,
    alt: "Studio product shot of a watch on a clean backdrop",
  },
  fashion: {
    src: `${base}/fashion-street.webp`,
    alt: "Street-style fashion photograph with strong silhouette",
  },
  architecture: {
    src: `${base}/architecture-modern.webp`,
    alt: "Modern building facade with clean geometric lines",
  },
  minimal: {
    src: `${base}/minimal-still.webp`,
    alt: "Minimal still life with generous negative space",
  },
  illustration: {
    src: `${base}/illustration-mood.webp`,
    alt: "Textured illustrative composition",
  },
  "3d-render": {
    src: `${base}/abstract-3d.webp`,
    alt: "Glossy three-dimensional render with soft lighting",
  },
  watercolour: {
    src: `${base}/art-watercolour.webp`,
    alt: "Loose watercolour washes with visible paper grain",
  },
};

/** Hero output grid — four images that read well together at small sizes. */
export const HERO_SHOWCASE: ShowcaseImage[] = [
  { src: `${base}/cinematic-moody.webp`, alt: "Moody cinematic scene" },
  { src: `${base}/product-watch.webp`, alt: "Studio product photograph of a watch" },
  { src: `${base}/architecture-modern.webp`, alt: "Modern architectural facade" },
  { src: `${base}/abstract-3d.webp`, alt: "Abstract three-dimensional render" },
];

/** Text-to-image feature section. */
export const TEXT_TO_IMAGE_SHOWCASE: ShowcaseImage[] = [
  { src: `${base}/portrait-woman.webp`, alt: "Natural-light studio portrait" },
  { src: `${base}/landscape-mountain.webp`, alt: "Mountain landscape at golden hour" },
  { src: `${base}/abstract-fluid.webp`, alt: "Flowing abstract colour composition" },
  { src: `${base}/night-mountain.webp`, alt: "Night sky above a mountain ridge" },
];

/** Before/after pair for the image-to-image section. */
export const TRANSFORM_SHOWCASE = {
  before: { src: `${base}/minimal-plant.webp`, alt: "Original photograph before transformation" },
  after: { src: `${base}/art-watercolour.webp`, alt: "The same subject reinterpreted as a watercolour" },
} satisfies Record<string, ShowcaseImage>;

/** Genuine low-res/high-res pair driving the upscale comparison slider. */
export const UPSCALE_SHOWCASE = {
  before: { src: `${base}/upscale-before.webp`, alt: "Low-resolution image before upscaling" },
  after: { src: `${base}/upscale-after.webp`, alt: "The same image after 4× upscaling" },
} satisfies Record<string, ShowcaseImage>;

/** Masonry gallery section. */
export const GALLERY_SHOWCASE: ShowcaseImage[] = [
  { src: `${base}/portrait-studio.webp`, alt: "Studio portrait with soft lighting" },
  { src: `${base}/architecture-white.webp`, alt: "White minimalist architecture" },
  { src: `${base}/product-headphones.webp`, alt: "Product photograph of headphones" },
  { src: `${base}/nature-forest.webp`, alt: "Sunlit forest scene" },
  { src: `${base}/fashion-shop.webp`, alt: "Fashion retail interior" },
  { src: `${base}/abstract-render.webp`, alt: "Abstract rendered shapes" },
  { src: `${base}/animal-cat.webp`, alt: "Close-up animal portrait" },
  { src: `${base}/minimal-desk.webp`, alt: "Minimal desk still life" },
  { src: `${base}/cinematic-fog.webp`, alt: "Foggy cinematic landscape" },
];
