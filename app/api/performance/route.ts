import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { performanceSchema } from "@/lib/validation/schemas";
import {
  BadRequestError,
  errorResponse,
  PlanRestrictionError,
} from "@/lib/api/respond";

export const runtime = "nodejs";

/**
 * Creative performance.
 *
 * Closes the loop between an asset and how it performed. Metrics arrive by
 * import today; an ad-platform connector can write to the same table later
 * without a schema change.
 */

/** GET /api/performance — per-creative metrics, best-performing first. */
export async function GET() {
  try {
    const auth = await requireAuthContext();

    if (!auth.plan.features.performanceTracking) {
      throw new PlanRestrictionError(
        "Performance tracking is available on the Growth plan and above.",
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("creative_performance")
      .select(
        "id, output_id, source, campaign, impressions, clicks, conversions, spend_cents, revenue_cents, recorded_for, generation_outputs!inner(storage_path, generation_id)",
      )
      .eq("user_id", auth.user.id)
      .order("recorded_for", { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);

    const rows = data ?? [];

    // Aggregate per creative so the same asset across campaigns reads as one row.
    const byOutput = new Map<
      string,
      {
        outputId: string;
        impressions: number;
        clicks: number;
        conversions: number;
        spendCents: number;
        revenueCents: number;
      }
    >();

    for (const row of rows) {
      const existing = byOutput.get(row.output_id) ?? {
        outputId: row.output_id,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spendCents: 0,
        revenueCents: 0,
      };

      existing.impressions += Number(row.impressions);
      existing.clicks += Number(row.clicks);
      existing.conversions += Number(row.conversions);
      existing.spendCents += Number(row.spend_cents);
      existing.revenueCents += Number(row.revenue_cents);
      byOutput.set(row.output_id, existing);
    }

    const creatives = [...byOutput.values()]
      .map((entry) => ({
        ...entry,
        ctr: entry.impressions > 0 ? entry.clicks / entry.impressions : 0,
        cvr: entry.clicks > 0 ? entry.conversions / entry.clicks : 0,
        roas: entry.spendCents > 0 ? entry.revenueCents / entry.spendCents : 0,
      }))
      .sort((a, b) => b.roas - a.roas);

    return NextResponse.json({ creatives, rowCount: rows.length });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/performance — import metrics for creatives the caller owns. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    if (!auth.plan.features.performanceTracking) {
      throw new PlanRestrictionError(
        "Performance tracking is available on the Growth plan and above.",
      );
    }

    const body = await request.json().catch(() => {
      throw new BadRequestError("Invalid request body.");
    });
    const input = performanceSchema.parse(body);

    const admin = createAdminClient();

    // Only accept metrics for outputs this user owns.
    const { data: owned } = await admin
      .from("generation_outputs")
      .select("id")
      .eq("user_id", auth.user.id)
      .in("id", input.entries.map((entry) => entry.outputId));

    const ownedIds = new Set((owned ?? []).map((row) => row.id));
    const accepted = input.entries.filter((entry) => ownedIds.has(entry.outputId));

    if (accepted.length === 0) {
      throw new BadRequestError("None of those images belong to your account.");
    }

    const { error } = await admin.from("creative_performance").upsert(
      accepted.map((entry) => ({
        user_id: auth.user.id,
        output_id: entry.outputId,
        source: entry.source,
        campaign: entry.campaign ?? null,
        impressions: entry.impressions,
        clicks: entry.clicks,
        conversions: entry.conversions,
        spend_cents: entry.spendCents,
        revenue_cents: entry.revenueCents,
        recorded_for: entry.recordedFor ?? new Date().toISOString().slice(0, 10),
      })),
      { onConflict: "output_id,source,campaign,recorded_for" },
    );

    if (error) throw new Error(error.message);

    return NextResponse.json({
      imported: accepted.length,
      skipped: input.entries.length - accepted.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
