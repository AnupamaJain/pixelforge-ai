import { NextResponse } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse } from "@/lib/api/respond";

export const runtime = "nodejs";

/** GET /api/usage — credit balance, plan and lifetime usage statistics. */
export async function GET() {
  try {
    const auth = await requireAuthContext();
    const admin = createAdminClient();

    const [balance, generations, images, favorites, subscription] = await Promise.all([
      admin
        .from("credit_balances")
        .select("balance, lifetime_granted, lifetime_spent")
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      admin
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id)
        .eq("status", "COMPLETED"),
      admin
        .from("generation_outputs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id),
      admin
        .from("generation_outputs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id)
        .eq("is_favorite", true),
      admin
        .from("subscriptions")
        .select("plan, status, current_period_end, cancel_at_period_end")
        .eq("user_id", auth.user.id)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      plan: auth.planId,
      planName: auth.plan.name,
      monthlyCredits: auth.plan.monthlyCredits,
      credits: balance.data?.balance ?? 0,
      lifetimeGranted: balance.data?.lifetime_granted ?? 0,
      lifetimeSpent: balance.data?.lifetime_spent ?? 0,
      generationCount: generations.count ?? 0,
      imageCount: images.count ?? 0,
      favoriteCount: favorites.count ?? 0,
      subscription: subscription.data ?? null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
