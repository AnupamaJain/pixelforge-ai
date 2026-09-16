import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthContext } from "@/lib/auth";
import { PAID_PLANS, planRank, stripePriceIdFor } from "@/config/plans";
import { appUrl, getOrCreateCustomer, getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { BadRequestError, errorResponse } from "@/lib/api/respond";

export const runtime = "nodejs";

const bodySchema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "AGENCY"]),
});

/**
 * POST /api/stripe/create-checkout — start a subscription checkout.
 *
 * The caller names a plan, never a price. We resolve the Stripe price ID
 * server-side so the browser can't select a cheaper price for a richer tier.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    const body = await request.json().catch(() => {
      throw new BadRequestError("Invalid request body.");
    });
    const { plan } = bodySchema.parse(body);

    const priceId = stripePriceIdFor(plan);
    if (!priceId) {
      throw new BadRequestError(
        `The ${plan} plan isn't configured. Set STRIPE_PRICE_ID_${plan}.`,
      );
    }

    const admin = createAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    const customerId = await getOrCreateCustomer({
      userId: auth.user.id,
      email: auth.user.email ?? "",
      existingCustomerId: subscription?.stripe_customer_id,
    });

    await admin
      .from("subscriptions")
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq("user_id", auth.user.id);

    const stripe = getStripe();

    // An existing subscriber changing tier belongs in the portal, where Stripe
    // handles proration — creating a second subscription would double-bill them.
    if (subscription?.stripe_subscription_id && planRank(auth.planId) > 0) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl()}/billing`,
      });
      return NextResponse.json({ url: portal.url, viaPortal: true });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/billing?checkout=success`,
      cancel_url: `${appUrl()}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { supabase_user_id: auth.user.id, plan },
      },
      metadata: { supabase_user_id: auth.user.id, plan },
    });

    if (!session.url) throw new Error("Stripe returned no checkout URL");

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return errorResponse(error);
  }
}
