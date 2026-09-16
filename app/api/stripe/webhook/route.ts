import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { PLANS, isPlanId, planIdForStripePrice, type PlanId } from "@/config/plans";
import { grantMonthlyCredits } from "@/lib/credits";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 *
 * The only writer of subscription state. Three invariants:
 *  1. Every request is signature-verified against STRIPE_WEBHOOK_SECRET.
 *  2. Event ids are recorded, so Stripe's at-least-once delivery cannot grant
 *     the same credits twice.
 *  3. The raw body is read verbatim — any parsing before verification would
 *     invalidate the signature.
 */

const RELEVANT_EVENTS = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
]);

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    console.error("[stripe] signature verification failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const admin = createAdminClient();

  // Idempotency gate: the primary key makes a duplicate insert fail, which
  // tells us this event was already applied.
  const { error: dedupeError } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (dedupeError) {
    if (dedupeError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[stripe] failed to record event", { message: dedupeError.message });
    // Returning 500 asks Stripe to retry rather than silently dropping it.
    return NextResponse.json({ error: "Storage error." }, { status: 500 });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe] handler failed", {
      eventId: event.id,
      type: event.type,
      message: error instanceof Error ? error.message : String(error),
    });

    // Allow a retry to reprocess this event.
    await admin.from("stripe_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) return;

      const subscription = await getStripe().subscriptions.retrieve(
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id,
      );

      await syncSubscription(subscription, session.metadata?.supabase_user_id);
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      return;
    }

    case "invoice.paid": {
      // Each paid invoice starts a new billing period, so this is where the
      // monthly allocation is topped up.
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

      if (!subscriptionId) return;

      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription);
      return;
    }

    default:
      return;
  }
}

/** Resolves our user id from the subscription, its customer, or the session. */
async function resolveUserId(
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null,
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.supabase_user_id;
  if (fromMetadata) return fromMetadata;
  if (fallbackUserId) return fallbackUserId;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (data?.user_id) return data.user_id;

  // Last resort: the customer record we stamped at creation time.
  const customer = await getStripe().customers.retrieve(customerId);
  if (!customer.deleted && customer.metadata?.supabase_user_id) {
    return customer.metadata.supabase_user_id;
  }

  return null;
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

async function syncSubscription(
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null,
): Promise<void> {
  const userId = await resolveUserId(subscription, fallbackUserId);

  if (!userId) {
    console.error("[stripe] could not map subscription to a user", {
      subscriptionId: subscription.id,
    });
    return;
  }

  const isActive = ACTIVE_STATUSES.has(subscription.status);

  // Resolve the tier from the price actually being billed. Metadata is only a
  // fallback — the price is what Stripe is charging, so it is the truth.
  const billedPriceId = subscription.items?.data?.[0]?.price?.id;
  const fromPrice = billedPriceId ? planIdForStripePrice(billedPriceId) : null;
  const fromMetadata = subscription.metadata?.plan;

  const resolvedPlan: PlanId =
    fromPrice ?? (isPlanId(fromMetadata) ? fromMetadata : "STARTER");

  const plan: PlanId = isActive ? resolvedPlan : "FREE";

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  const admin = createAdminClient();

  await admin
    .from("subscriptions")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan,
      status: subscription.status,
      current_period_end: periodEnd?.toISOString() ?? null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Keeps the denormalised copy on profiles in step.
  await admin.from("profiles").update({ plan }).eq("id", userId);

  if (!isActive) return;

  // Keyed to the period start, so repeated webhooks for the same period are
  // a no-op inside grant_monthly_credits.
  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : new Date();

  const period = `${subscription.id}:${periodStart.toISOString().slice(0, 10)}`;

  await grantMonthlyCredits({
    userId,
    amount: PLANS[plan].monthlyCredits,
    period,
    description: `${PLANS[plan].name} plan monthly credits`,
  });
}
