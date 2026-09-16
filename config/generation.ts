/** Generation input catalogues shared by the UI and server-side validation. */

export interface AspectRatioOption {
  id: string;
  label: string;
  /** Multipliers applied to a base edge length, then snapped to a multiple of 64. */
  ratio: [number, number];
}

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: "1:1", label: "Square", ratio: [1, 1] },
  { id: "16:9", label: "Widescreen", ratio: [16, 9] },
  { id: "4:5", label: "Portrait", ratio: [4, 5] },
  { id: "9:16", label: "Story", ratio: [9, 16] },
  { id: "3:2", label: "Landscape", ratio: [3, 2] },
  { id: "2:3", label: "Tall", ratio: [2, 3] },
];

export const ASPECT_RATIO_IDS = ASPECT_RATIOS.map((option) => option.id);

/** Base edge lengths offered in the UI. Filtered per-plan by max resolution. */
export const BASE_SIZES = [512, 768, 1024, 1280, 1536] as const;

export const IMAGE_COUNT_OPTIONS = [1, 2, 4] as const;

export const UPSCALE_FACTORS = [2, 4] as const;

export const STEPS_RANGE = { min: 10, max: 50, default: 30 } as const;
export const GUIDANCE_RANGE = { min: 1, max: 20, default: 7 } as const;
export const STRENGTH_RANGE = { min: 0.1, max: 1, default: 0.65 } as const;

/** Diffusion models require dimensions that are multiples of 64. */
export function snapTo64(value: number): number {
  return Math.max(64, Math.round(value / 64) * 64);
}

/**
 * Resolves an aspect ratio + base edge into concrete dimensions, preserving
 * total pixel area so that wide and tall images cost a comparable amount.
 */
export function resolveDimensions(
  aspectRatioId: string,
  baseSize: number,
): { width: number; height: number } {
  const option =
    ASPECT_RATIOS.find((item) => item.id === aspectRatioId) ?? ASPECT_RATIOS[0];
  const [w, h] = option.ratio;
  const scale = Math.sqrt((baseSize * baseSize) / (w * h));
  return { width: snapTo64(w * scale), height: snapTo64(h * scale) };
}

/** Largest edge permitted for a plan, used for server-side enforcement. */
export function withinResolutionLimit(
  width: number,
  height: number,
  maxResolution: number,
): boolean {
  return Math.max(width, height) <= maxResolution;
}
