import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { createBatchRun, templateColumns } from "@/lib/jobs/batch";
import { limitGeneration, RateLimitError } from "@/lib/rate-limit";
import { assertPromptAllowed } from "@/lib/safety";
import { createAdminClient } from "@/lib/supabase/admin";
import { batchSchema } from "@/lib/validation/schemas";
import {
  BadRequestError,
  errorResponse,
  PlanRestrictionError,
} from "@/lib/api/respond";

export const runtime = "nodejs";
export const maxDuration = 300;

/** GET /api/batch — the caller's batch runs. */
export async function GET() {
  try {
    const auth = await requireAuthContext();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("batch_runs")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/batch — start a batch run from a set of rows. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    if (!auth.plan.features.batchGeneration) {
      throw new PlanRestrictionError(
        "Batch generation is available on paid plans. Upgrade to run a whole catalogue at once.",
      );
    }

    const limit = limitGeneration(auth.user.id);
    if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);

    const body = await request.json().catch(() => {
      throw new BadRequestError("Invalid request body.");
    });
    const input = batchSchema.parse(body);

    if (input.rows.length > auth.plan.maxBatchRows) {
      throw new PlanRestrictionError(
        `Your ${auth.plan.name} plan allows ${auth.plan.maxBatchRows} rows per batch. This run has ${input.rows.length}.`,
      );
    }

    if (input.imagesPerRow > auth.plan.maxImagesPerRequest) {
      throw new PlanRestrictionError(
        `Your ${auth.plan.name} plan allows up to ${auth.plan.maxImagesPerRequest} images per row.`,
      );
    }

    // Every column the template references must exist in the first row.
    const required = templateColumns(input.template);
    const available = Object.keys(input.rows[0] ?? {}).map((key) =>
      key.trim().toLowerCase(),
    );
    const missing = required.filter(
      (column) => !available.includes(column.trim().toLowerCase()),
    );

    if (missing.length > 0) {
      throw new BadRequestError(
        `Your template references ${missing.map((m) => `{${m}}`).join(", ")}, which ${
          missing.length === 1 ? "isn't a column" : "aren't columns"
        } in your data.`,
      );
    }

    // Screen the template itself rather than every rendered row.
    assertPromptAllowed(input.template, input.negativeTemplate);

    const result = await createBatchRun({ auth, input });

    return NextResponse.json(
      {
        batchRunId: result.batchRunId,
        totalRows: result.totalRows,
        creditCost: result.creditCost,
        creditsRemaining: result.creditsRemaining,
      },
      { status: 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
