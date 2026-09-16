import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, NotFoundError } from "@/lib/api/respond";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ id: string }>;
}

/** GET /api/batch/:id — run progress. Polled while a batch is in flight. */
export async function GET(_request: NextRequest, context: Context) {
  try {
    const auth = await requireAuthContext();
    const { id } = await context.params;

    const admin = createAdminClient();

    const { data: run } = await admin
      .from("batch_runs")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!run) throw new NotFoundError("That batch run could not be found.");

    const { data: items } = await admin
      .from("batch_items")
      .select("id, row_index, variables, status, generation_id, error")
      .eq("batch_run_id", id)
      .eq("user_id", auth.user.id)
      .order("row_index", { ascending: true });

    return NextResponse.json({ run, items: items ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/batch/:id */
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const auth = await requireAuthContext();
    const { id } = await context.params;

    const admin = createAdminClient();
    const { error } = await admin
      .from("batch_runs")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
