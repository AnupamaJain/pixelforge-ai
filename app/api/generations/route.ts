import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { GENERATIONS_BUCKET, createSignedUrls } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { galleryQuerySchema } from "@/lib/validation/schemas";
import { errorResponse } from "@/lib/api/respond";

export const runtime = "nodejs";

/** GET /api/generations — the caller's gallery, newest first. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    const query = galleryQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const admin = createAdminClient();

    let builder = admin
      .from("generation_outputs")
      .select(
        "id, generation_id, storage_path, width, height, seed, is_favorite, created_at, generations!inner(id, type, prompt, negative_prompt, style_id, model, provider, status, seed, steps, guidance, upscale_factor, created_at)",
      )
      // Scoped to the caller — never trust an id from the query string.
      .eq("user_id", auth.user.id)
      .eq("generations.status", "COMPLETED")
      .order("created_at", { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    if (query.favoritesOnly) builder = builder.eq("is_favorite", true);
    if (query.type) builder = builder.eq("generations.type", query.type);

    const { data, error } = await builder;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const signed = await createSignedUrls(
      GENERATIONS_BUCKET,
      rows.map((row) => row.storage_path),
    );

    const items = rows.map((row) => {
      const generation = row.generations as unknown as Record<string, unknown>;
      return {
        id: row.id,
        generationId: row.generation_id,
        url: signed.get(row.storage_path) ?? null,
        width: row.width,
        height: row.height,
        seed: row.seed,
        isFavorite: row.is_favorite,
        createdAt: row.created_at,
        generation,
      };
    });

    return NextResponse.json({ items, hasMore: items.length === query.limit });
  } catch (error) {
    return errorResponse(error);
  }
}
