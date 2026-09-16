import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, type Plan, type PlanId } from "@/config/plans";
import type { User } from "@supabase/supabase-js";

export interface AuthContext {
  user: User;
  plan: Plan;
  planId: PlanId;
  credits: number;
}

/** Returns the signed-in user, or null. Never throws. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

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
  const activeStatuses = ["active", "trialing"];
  const isActivePro =
    subscription?.plan === "PRO" &&
    activeStatuses.includes(subscription?.status ?? "");

  const planId: PlanId = isActivePro ? "PRO" : "FREE";

  return {
    user,
    planId,
    plan: getPlan(planId),
    credits: balanceResult.data?.balance ?? 0,
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

/** Server-side source of truth for Pro gating. */
export function isProUser(context: AuthContext): boolean {
  return context.planId === "PRO";
}
