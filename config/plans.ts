/**
 * Plan definitions.
 *
 * Pricing is anchored to the cost this product displaces — a product photo
 * shoot runs $500–5,000 — rather than to credits. Credits are the metering
 * mechanism, never the pitch.
 *
 * Every limit is env-configurable so plans can be tuned without code changes.
 */

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type PlanId = "FREE" | "STARTER" | "GROWTH" | "AGENCY";

export interface PlanFeatures {
  imageToImage: boolean;
  upscale: boolean;
  /** Pixel-identical product compositing — the core paid capability. */
  productScenes: boolean;
  /** Reusable brand definitions applied at generation time. */
  brandKits: boolean;
  /** CSV-driven bulk generation. */
  batchGeneration: boolean;
  /** Marketplace-ready export presets (Amazon, Shopify, Etsy, social). */
  marketplaceExport: boolean;
  /** Creative performance tracking. */
  performanceTracking: boolean;
  /** Multiple client workspaces. */
  multiClient: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
  priorityQueue: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  /** Who this tier is for — used verbatim on the pricing page. */
  audience: string;
  description: string;
  priceCents: number;
  monthlyCredits: number;
  maxResolution: number;
  maxImagesPerRequest: number;
  maxBrandKits: number;
  maxBatchRows: number;
  maxClients: number;
  features: PlanFeatures;
  highlights: string[];
}

const NO_FEATURES: PlanFeatures = {
  imageToImage: false,
  upscale: false,
  productScenes: false,
  brandKits: false,
  batchGeneration: false,
  marketplaceExport: false,
  performanceTracking: false,
  multiClient: false,
  whiteLabel: false,
  apiAccess: false,
  priorityQueue: false,
};

export const PLANS: Record<PlanId, Plan> = {
  FREE: {
    id: "FREE",
    name: "Free",
    audience: "Trying it out",
    description: "Enough to see whether your product survives the process.",
    priceCents: 0,
    monthlyCredits: envInt("FREE_MONTHLY_CREDITS", 30),
    maxResolution: envInt("MAX_FREE_RESOLUTION", 768),
    maxImagesPerRequest: envInt("FREE_MAX_IMAGES_PER_REQUEST", 2),
    maxBrandKits: 0,
    maxBatchRows: 0,
    maxClients: 1,
    features: { ...NO_FEATURES },
    highlights: [
      "30 credits every month",
      "Text-to-image generation",
      "All 12 style presets",
      "Up to 768px",
      "Gallery and prompt history",
    ],
  },

  STARTER: {
    id: "STARTER",
    name: "Starter",
    audience: "Solo sellers",
    description: "One catalogue, shot properly, without a studio.",
    priceCents: envInt("STARTER_PRICE_CENTS", 4900),
    monthlyCredits: envInt("STARTER_MONTHLY_CREDITS", 600),
    maxResolution: envInt("MAX_STARTER_RESOLUTION", 1536),
    maxImagesPerRequest: envInt("STARTER_MAX_IMAGES_PER_REQUEST", 4),
    maxBrandKits: envInt("STARTER_MAX_BRAND_KITS", 1),
    maxBatchRows: envInt("STARTER_MAX_BATCH_ROWS", 25),
    maxClients: 1,
    features: {
      ...NO_FEATURES,
      imageToImage: true,
      upscale: true,
      productScenes: true,
      brandKits: true,
      batchGeneration: true,
      marketplaceExport: true,
    },
    highlights: [
      "600 credits — roughly 120 product scenes",
      "Pixel-identical product scenes",
      "1 brand kit",
      "Marketplace export presets",
      "Batch up to 25 rows at a time",
      "2× and 4× upscaling",
    ],
  },

  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    audience: "Scaling stores",
    description: "A full catalogue refresh every month, on brand.",
    priceCents: envInt("GROWTH_PRICE_CENTS", 14900),
    monthlyCredits: envInt("GROWTH_MONTHLY_CREDITS", 2500),
    maxResolution: envInt("MAX_GROWTH_RESOLUTION", 2048),
    maxImagesPerRequest: envInt("GROWTH_MAX_IMAGES_PER_REQUEST", 8),
    maxBrandKits: envInt("GROWTH_MAX_BRAND_KITS", 5),
    maxBatchRows: envInt("GROWTH_MAX_BATCH_ROWS", 200),
    maxClients: 1,
    features: {
      ...NO_FEATURES,
      imageToImage: true,
      upscale: true,
      productScenes: true,
      brandKits: true,
      batchGeneration: true,
      marketplaceExport: true,
      performanceTracking: true,
      priorityQueue: true,
    },
    highlights: [
      "2,500 credits — roughly 500 product scenes",
      "Everything in Starter",
      "5 brand kits",
      "Batch up to 200 rows",
      "Creative performance tracking",
      "Priority queue",
      "Up to 2048px",
    ],
  },

  AGENCY: {
    id: "AGENCY",
    name: "Agency",
    audience: "Agencies & multi-brand",
    description: "Every client, separated, under your own name.",
    priceCents: envInt("AGENCY_PRICE_CENTS", 49900),
    monthlyCredits: envInt("AGENCY_MONTHLY_CREDITS", 10000),
    maxResolution: envInt("MAX_AGENCY_RESOLUTION", 2048),
    maxImagesPerRequest: envInt("AGENCY_MAX_IMAGES_PER_REQUEST", 8),
    maxBrandKits: envInt("AGENCY_MAX_BRAND_KITS", 50),
    maxBatchRows: envInt("AGENCY_MAX_BATCH_ROWS", 1000),
    maxClients: envInt("AGENCY_MAX_CLIENTS", 25),
    features: {
      imageToImage: true,
      upscale: true,
      productScenes: true,
      brandKits: true,
      batchGeneration: true,
      marketplaceExport: true,
      performanceTracking: true,
      multiClient: true,
      whiteLabel: true,
      apiAccess: true,
      priorityQueue: true,
    },
    highlights: [
      "10,000 credits — roughly 2,000 product scenes",
      "Everything in Growth",
      "Up to 25 client workspaces",
      "50 brand kits",
      "Batch up to 1,000 rows",
      "White-label exports",
      "API access",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["FREE", "STARTER", "GROWTH", "AGENCY"];
export const DEFAULT_PLAN: PlanId = "FREE";

/** Tiers that carry a Stripe price. Keyed to STRIPE_PRICE_ID_<PLAN>. */
export const PAID_PLANS: PlanId[] = ["STARTER", "GROWTH", "AGENCY"];

export function isPlanId(value: unknown): value is PlanId {
  return (
    value === "FREE" || value === "STARTER" || value === "GROWTH" || value === "AGENCY"
  );
}

export function getPlan(planId: string | null | undefined): Plan {
  return isPlanId(planId) ? PLANS[planId] : PLANS.FREE;
}

/** Stripe price ID for a paid tier, from env. */
export function stripePriceIdFor(planId: PlanId): string | undefined {
  if (planId === "FREE") return undefined;
  return process.env[`STRIPE_PRICE_ID_${planId}`] || undefined;
}

/** Maps a Stripe price back to our plan. Used by the webhook. */
export function planIdForStripePrice(priceId: string): PlanId | null {
  for (const planId of PAID_PLANS) {
    if (stripePriceIdFor(planId) === priceId) return planId;
  }
  return null;
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "$0";
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/** Ranks plans so upgrade/downgrade comparisons read clearly. */
export function planRank(planId: PlanId): number {
  return PLAN_ORDER.indexOf(planId);
}
