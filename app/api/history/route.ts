import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { historyQuerySchema } from "@/lib/validation/schemas";
import { errorResponse } from "@/lib/api/respond";

export const runtime = "nodejs";

/** GET /api/history — searchable prompt history for the caller. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    const query = historyQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const admin = createAdminClient();

    let builder = admin
      .from("prompt_history")
      .select("id, generation_id, type, prompt, negative_prompt, style_id, model, status, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    if (query.type) builder = builder.eq("type", query.type);
    if (query.styleId) builder = builder.eq("style_id", query.styleId);

    if (query.search) {
      // Strip LIKE wildcards rather than escaping them: backslash escapes are
      // not reliably preserved through PostgREST, and a literal search is what
      // users expect from a search box.
      const literal = query.search.replace(/[%_\\]/g, " ").trim();
      if (literal) builder = builder.ilike("prompt", `%${literal}%`);
    }

    const { data, error } = await builder;
    if (error) throw new Error(error.message);

    const items = data ?? [];
    return NextResponse.json({ items, hasMore: items.length === query.limit });
  } catch (error) {
    return errorResponse(error);
  }
}
