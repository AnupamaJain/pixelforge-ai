import { NextResponse } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { appUrl, getOrCreateCustomer, getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { BadRequestError, errorResponse } from "@/lib/api/respond";

export const runtime = "nodejs";

/** POST /api/stripe/create-checkout — start a Pro subscription checkout. */
export async function POST() {
  try {
    const auth = await requireAuthContext();

    if (!isStripeConfigured()) {
      throw new BadRequestError(
        "Billing is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.",
      );
    }

    if (auth.planId === "PRO") {
      throw new BadRequestError("You're already on the Pro plan.");
    }

    const admin = createAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    const customerId = await getOrCreateCustomer({
      userId: auth.user.id,
      email: auth.user.email ?? "",
      existingCustomerId: subscription?.stripe_customer_id,
    });

    // Persist immediately so the webhook can resolve the user even if the
    // customer was just created.
    await admin
      .from("subscriptions")
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq("user_id", auth.user.id);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${appUrl()}/billing?checkout=success`,
      cancel_url: `${appUrl()}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
      // Mirrored onto the subscription so every later webhook can identify us.
      subscription_data: { metadata: { supabase_user_id: auth.user.id } },
      metadata: { supabase_user_id: auth.user.id },
    });

    if (!session.url) throw new Error("Stripe returned no checkout URL");

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return errorResponse(error);
  }
}
