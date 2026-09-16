import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse } from "@/lib/api/respond";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ id: string }>;
}

/** DELETE /api/history/:id — remove a single history entry. */
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const auth = await requireAuthContext();
    const { id } = await context.params;

    const admin = createAdminClient();
    const { error } = await admin
      .from("prompt_history")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
