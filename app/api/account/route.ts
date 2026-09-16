import { NextResponse } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { GENERATIONS_BUCKET, UPLOADS_BUCKET, deleteObjects } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse } from "@/lib/api/respond";

export const runtime = "nodejs";

/**
 * DELETE /api/account — erase the caller's account and everything it owns.
 *
 * Order matters: cancel billing first (so a deleted user is never charged
 * again), then remove storage objects, then delete the auth user, which
 * cascades every database row via ON DELETE CASCADE.
 */
export async function DELETE() {
  try {
    const auth = await requireAuthContext();
    const admin = createAdminClient();
    const userId = auth.user.id;

    // 1. Stop billing.
    if (isStripeConfigured()) {
      const { data: subscription } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (subscription?.stripe_subscription_id) {
        try {
          await getStripe().subscriptions.cancel(subscription.stripe_subscription_id);
        } catch (error) {
          // A subscription already cancelled in Stripe must not block deletion.
          console.error("[account] could not cancel subscription", {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // 2. Remove stored images. Scoped by user_id, so only this user's objects
    //    are ever collected.
    const [{ data: outputs }, { data: generations }] = await Promise.all([
      admin.from("generation_outputs").select("storage_path").eq("user_id", userId),
      admin
        .from("generations")
        .select("source_image_path")
        .eq("user_id", userId)
        .not("source_image_path", "is", null),
    ]);

    await deleteObjects(
      GENERATIONS_BUCKET,
      (outputs ?? []).map((row) => row.storage_path),
    );
    await deleteObjects(
      UPLOADS_BUCKET,
      (generations ?? [])
        .map((row) => row.source_image_path)
        .filter((path): path is string => Boolean(path)),
    );

    // 3. Delete the auth user; every table cascades from auth.users.
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Failed to delete account: ${error.message}`);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
