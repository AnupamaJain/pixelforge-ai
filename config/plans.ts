/**
 * Plan definitions. Every limit is env-configurable so plans can be tuned
 * without touching application code.
 */

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type PlanId = "FREE" | "PRO";

export interface PlanFeatures {
  imageToImage: boolean;
  upscale: boolean;
  priorityQueue: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /** Display price in minor units (cents). Billing amount is owned by Stripe. */
  priceCents: number;
  monthlyCredits: number;
  maxResolution: number;
  maxImagesPerRequest: number;
  features: PlanFeatures;
  highlights: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  FREE: {
    id: "FREE",
    name: "Free",
    description: "Everything you need to explore the workspace.",
    priceCents: 0,
    monthlyCredits: envInt("FREE_MONTHLY_CREDITS", 50),
    maxResolution: envInt("MAX_FREE_RESOLUTION", 768),
    maxImagesPerRequest: envInt("FREE_MAX_IMAGES_PER_REQUEST", 2),
    features: { imageToImage: false, upscale: false, priorityQueue: false },
    highlights: [
      "50 credits every month",
      "Text-to-image generation",
      "All 12 style presets",
      "Up to 768×768 resolution",
      "Gallery and prompt history",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    description: "Full creative workspace with transforms and upscaling.",
    priceCents: envInt("PRO_PRICE_CENTS", 1500),
    monthlyCredits: envInt("PRO_MONTHLY_CREDITS", 1000),
    maxResolution: envInt("MAX_PRO_RESOLUTION", 1536),
    maxImagesPerRequest: envInt("PRO_MAX_IMAGES_PER_REQUEST", 4),
    features: { imageToImage: true, upscale: true, priorityQueue: true },
    highlights: [
      "1,000 credits every month",
      "Everything in Free",
      "Image-to-image transforms",
      "2× and 4× AI upscaling",
      "Up to 1536×1536 resolution",
      "Priority generation queue",
    ],
  },
};

export const DEFAULT_PLAN: PlanId = "FREE";

export function getPlan(planId: string | null | undefined): Plan {
  if (planId === "PRO") return PLANS.PRO;
  return PLANS.FREE;
}

export function isPlanId(value: unknown): value is PlanId {
  return value === "FREE" || value === "PRO";
}

/** Formats a minor-unit price for display, e.g. 1500 -> "$15". */
export function formatPrice(cents: number): string {
  if (cents === 0) return "$0";
  return cents % 100 === 0
    ? `$${cents / 100}`
    : `$${(cents / 100).toFixed(2)}`;
}
