import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPlan,
  isPlanId,
  planRank,
  type Plan,
  type PlanFeatures,
  type PlanId,
} from "@/config/plans";
import type { User } from "@supabase/supabase-js";

export interface AuthContext {
  user: User;
  plan: Plan;
  planId: PlanId;
  credits: number;
  /** Active client workspace, for agency accounts. Null = personal workspace. */
  clientId: string | null;
}

/** Returns the signed-in user, or null. Never throws. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

/**
 * Resolves the caller's identity, plan and balance from the database.
 *
 * Plan and credits are read server-side on every request — the browser's copy
 * is display-only and is never trusted for authorisation.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const user = await getUser();
  if (!user) return null;

  const admin = createAdminClient();

  const [subscriptionResult, balanceResult] = await Promise.all([
    admin
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("credit_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const subscription = subscriptionResult.data;

  // A lapsed subscription silently falls back to Free — we never grant paid
  // capability off a stale row.
  const planId: PlanId =
    subscription &&
    isPlanId(subscription.plan) &&
    ACTIVE_STATUSES.has(subscription.status ?? "")
      ? subscription.plan
      : "FREE";

  return {
    user,
    planId,
    plan: getPlan(planId),
    credits: balanceResult.data?.balance ?? 0,
    clientId: null,
  };
}

/** Throws if unauthenticated. Use at the top of every protected API route. */
export async function requireAuthContext(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) throw new UnauthorizedError();
  return context;
}

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "You must be signed in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Server-side source of truth for any paid capability. */
export function hasFeature(
  context: AuthContext,
  feature: keyof PlanFeatures,
): boolean {
  return context.plan.features[feature];
}

/** True for any paying tier. Prefer hasFeature() for gating specific capability. */
export function isPaidUser(context: AuthContext): boolean {
  return planRank(context.planId) > 0;
}
