import { NextResponse } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { appUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { BadRequestError, errorResponse } from "@/lib/api/respond";

export const runtime = "nodejs";

/**
 * POST /api/stripe/portal — open the Stripe billing portal, where a user can
 * update payment details or cancel. Cancellation flows back via the webhook.
 */
export async function POST() {
  try {
    const auth = await requireAuthContext();

    if (!isStripeConfigured()) {
      throw new BadRequestError("Billing is not configured on this server.");
    }

    const admin = createAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      throw new BadRequestError("You don't have a billing account yet.");
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl()}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return errorResponse(error);
  }
}
