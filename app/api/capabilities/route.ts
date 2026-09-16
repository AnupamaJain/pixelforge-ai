import { NextResponse } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { getActiveCapabilities } from "@/lib/generation-engine";
import { errorResponse } from "@/lib/api/respond";

export const runtime = "nodejs";

/**
 * GET /api/capabilities — what the active engine supports, so the workspace
 * never offers a control the engine would ignore.
 */
export async function GET() {
  try {
    const auth = await requireAuthContext();
    const capabilities = getActiveCapabilities();

    return NextResponse.json({
      ...capabilities,
      // The effective ceiling is the stricter of engine and plan.
      maxImagesPerRequest: Math.min(
        capabilities.maxImagesPerRequest,
        auth.plan.maxImagesPerRequest,
      ),
      maxResolution: auth.plan.maxResolution,
      plan: auth.planId,
      features: auth.plan.features,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
