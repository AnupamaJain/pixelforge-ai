import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, NotFoundError } from "@/lib/api/respond";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ id: string }>;
}

/** POST /api/outputs/:id/favorite — toggle the favourite flag. */
export async function POST(request: NextRequest, context: Context) {
  try {
    const auth = await requireAuthContext();
    const { id } = await context.params;

    const body = (await request.json().catch(() => ({}))) as {
      isFavorite?: boolean;
    };

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("generation_outputs")
      .select("id, is_favorite")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!existing) throw new NotFoundError("That image could not be found.");

    const next =
      typeof body.isFavorite === "boolean" ? body.isFavorite : !existing.is_favorite;

    const { error } = await admin
      .from("generation_outputs")
      .update({ is_favorite: next })
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ isFavorite: next });
  } catch (error) {
    return errorResponse(error);
  }
}
