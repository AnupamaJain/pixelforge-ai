import { NextResponse, type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { brandKitSchema } from "@/lib/validation/schemas";
import {
  BadRequestError,
  errorResponse,
  PlanRestrictionError,
} from "@/lib/api/respond";

export const runtime = "nodejs";

/** GET /api/brand-kits — the caller's brand kits. */
export async function GET() {
  try {
    const auth = await requireAuthContext();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("brand_kits")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      items: data ?? [],
      limit: auth.plan.maxBrandKits,
      canCreate: (data?.length ?? 0) < auth.plan.maxBrandKits,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/brand-kits — create a brand kit, subject to the plan's quota. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    if (!auth.plan.features.brandKits) {
      throw new PlanRestrictionError(
        "Brand kits are available on paid plans. Upgrade to lock every generation to your brand.",
      );
    }

    const body = await request.json().catch(() => {
      throw new BadRequestError("Invalid request body.");
    });
    const input = brandKitSchema.parse(body);

    const admin = createAdminClient();

    // Quota is enforced server-side; the client's count is never trusted.
    const { count } = await admin
      .from("brand_kits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id);

    if ((count ?? 0) >= auth.plan.maxBrandKits) {
      throw new PlanRestrictionError(
        `Your ${auth.plan.name} plan includes ${auth.plan.maxBrandKits} brand kit${
          auth.plan.maxBrandKits === 1 ? "" : "s"
        }. Upgrade for more.`,
      );
    }

    // A new default demotes the previous one.
    if (input.isDefault) {
      await admin
        .from("brand_kits")
        .update({ is_default: false })
        .eq("user_id", auth.user.id)
        .eq("is_default", true);
    }

    const { data, error } = await admin
      .from("brand_kits")
      .insert({
        user_id: auth.user.id,
        client_id: input.clientId ?? null,
        name: input.name,
        description: input.description ?? null,
        palette: input.palette,
        prompt_modifier: input.promptModifier ?? null,
        negative_modifier: input.negativeModifier ?? null,
        allowed_styles: input.allowedStyles,
        default_style_id: input.defaultStyleId ?? null,
        is_default: input.isDefault,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ brandKit: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
