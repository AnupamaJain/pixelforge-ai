import { NextResponse } from "next/server";
import { getProvider } from "@/lib/generation-engine";
import { isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * GET /api/health — configuration and connectivity check used during setup.
 * Reports only booleans and provider labels; never echoes secrets.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    stripe: isStripeConfigured(),
  };

  try {
    const provider = getProvider();
    const health = await provider.healthCheck();
    checks.provider = {
      id: provider.id,
      label: provider.label,
      reachable: health.ok,
      // Safe: healthCheck() returns a short status string, not a payload.
      detail: health.detail,
    };
  } catch (error) {
    checks.provider = {
      configured: false,
      detail: error instanceof Error ? error.message : "not configured",
    };
  }

  return NextResponse.json(checks);
}
