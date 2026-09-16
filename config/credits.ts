/**
 * Deterministic credit pricing. All costs are env-configurable.
 * Credit math lives here only — never duplicated in routes or components.
 */

import type { GenerationType, UpscaleFactor } from "@/types";

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const CREDIT_COSTS = {
  TEXT_TO_IMAGE: envInt("TEXT_TO_IMAGE_CREDIT_COST", 1),
  IMAGE_TO_IMAGE: envInt("IMAGE_TO_IMAGE_CREDIT_COST", 2),
  UPSCALE_2X: envInt("UPSCALE_2X_CREDIT_COST", 3),
  UPSCALE_4X: envInt("UPSCALE_4X_CREDIT_COST", 6),
} as const;

/**
 * Computes the total credit cost for a request.
 * Cost scales linearly with the number of requested images.
 */
export function calculateCreditCost(params: {
  type: GenerationType;
  imageCount?: number;
  upscaleFactor?: UpscaleFactor;
}): number {
  const count = Math.max(1, params.imageCount ?? 1);

  switch (params.type) {
    case "TEXT_TO_IMAGE":
      return CREDIT_COSTS.TEXT_TO_IMAGE * count;
    case "IMAGE_TO_IMAGE":
      return CREDIT_COSTS.IMAGE_TO_IMAGE * count;
    case "UPSCALE":
      return params.upscaleFactor === 4
        ? CREDIT_COSTS.UPSCALE_4X
        : CREDIT_COSTS.UPSCALE_2X;
    default: {
      const exhaustive: never = params.type;
      throw new Error(`Unhandled generation type: ${String(exhaustive)}`);
    }
  }
}

/** Human-readable cost summary used by the UI before a user commits. */
export function describeCost(credits: number): string {
  return `${credits} credit${credits === 1 ? "" : "s"}`;
}
