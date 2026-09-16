import "server-only";

import Stripe from "stripe";

/**
 * Stripe client (test mode by default — the key you supply decides).
 * Subscription state is never read from the browser; the webhook is the only
 * writer, and `subscriptions` is the server-side source of truth.
 */

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new StripeNotConfiguredError();
  }

  cached = new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });

  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

export class StripeNotConfiguredError extends Error {
  readonly status = 503;
  constructor() {
    super("Billing is not configured on this server.");
    this.name = "StripeNotConfiguredError";
  }
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Finds an existing Stripe customer for a user, or creates one. */
export async function getOrCreateCustomer(params: {
  userId: string;
  email: string;
  existingCustomerId?: string | null;
}): Promise<string> {
  const stripe = getStripe();

  if (params.existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(params.existingCustomerId);
      if (!customer.deleted) return customer.id;
    } catch {
      // Falls through and creates a fresh customer — e.g. after the Stripe
      // test data was reset while our row survived.
    }
  }

  const created = await stripe.customers.create({
    email: params.email,
    // Lets the webhook map a Stripe event back to our user without a lookup.
    metadata: { supabase_user_id: params.userId },
  });

  return created.id;
}
