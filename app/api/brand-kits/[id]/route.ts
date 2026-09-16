import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { brandKitSchema } from "@/lib/validation/schemas";
import { BadRequestError, errorResponse, NotFoundError } from "@/lib/api/respond";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ id: string }>;
}

/** PATCH /api/brand-kits/:id */
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const auth = await requireAuthContext();
    const { id } = await context.params;

    const body = await request.json().catch(() => {
      throw new BadRequestError("Invalid request body.");
    });
    const input = brandKitSchema.parse(body);

    const admin = createAdminClient();

    if (input.isDefault) {
      await admin
        .from("brand_kits")
        .update({ is_default: false })
        .eq("user_id", auth.user.id)
        .eq("is_default", true);
    }

    const { data, error } = await admin
      .from("brand_kits")
      .update({
        name: input.name,
        description: input.description ?? null,
        palette: input.palette,
        prompt_modifier: input.promptModifier ?? null,
        negative_modifier: input.negativeModifier ?? null,
        allowed_styles: input.allowedStyles,
        default_style_id: input.defaultStyleId ?? null,
        client_id: input.clientId ?? null,
        is_default: input.isDefault,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("That brand kit could not be found.");

    return NextResponse.json({ brandKit: data });
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/brand-kits/:id */
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const auth = await requireAuthContext();
    const { id } = await context.params;

    const admin = createAdminClient();
    const { error } = await admin
      .from("brand_kits")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
