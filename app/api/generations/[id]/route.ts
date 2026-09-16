import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { GENERATIONS_BUCKET, createSignedUrls, deleteObjects } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, NotFoundError } from "@/lib/api/respond";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ id: string }>;
}

/** GET /api/generations/:id — status + outputs. Polled while a job runs. */
export async function GET(_request: NextRequest, context: Context) {
  try {
    const auth = await requireAuthContext();
    const { id } = await context.params;

    const admin = createAdminClient();

    const { data: generation } = await admin
      .from("generations")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!generation) throw new NotFoundError("That generation could not be found.");

    const { data: outputs } = await admin
      .from("generation_outputs")
      .select("id, storage_path, width, height, seed, is_favorite, created_at")
      .eq("generation_id", id)
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true });

    const rows = outputs ?? [];
    const signed = await createSignedUrls(
      GENERATIONS_BUCKET,
      rows.map((row) => row.storage_path),
    );

    return NextResponse.json({
      generation,
      outputs: rows.map((row) => ({
        id: row.id,
        url: signed.get(row.storage_path) ?? null,
        width: row.width,
        height: row.height,
        seed: row.seed,
        isFavorite: row.is_favorite,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/generations/:id — remove a generation, its outputs and the
 * underlying storage objects. Ownership is verified before anything is touched.
 */
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const auth = await requireAuthContext();
    const { id } = await context.params;

    const admin = createAdminClient();

    const { data: generation } = await admin
      .from("generations")
      .select("id, source_image_path")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!generation) throw new NotFoundError("That generation could not be found.");

    const { data: outputs } = await admin
      .from("generation_outputs")
      .select("storage_path")
      .eq("generation_id", id)
      .eq("user_id", auth.user.id);

    // Storage first: an orphaned row is recoverable, an orphaned object is not.
    await deleteObjects(
      GENERATIONS_BUCKET,
      (outputs ?? []).map((row) => row.storage_path),
    );

    // Cascades to generation_outputs, generation_jobs and prompt_history.
    const { error } = await admin
      .from("generations")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
