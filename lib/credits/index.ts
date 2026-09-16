import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CreditTransactionType } from "@/types";

/**
 * Credit operations.
 *
 * Every mutation delegates to a SECURITY DEFINER Postgres function that locks
 * the balance row, so concurrent requests cannot spend the same credits. The
 * browser has read-only access to balances via RLS.
 */

export class InsufficientCreditsError extends Error {
  readonly status = 402;
  constructor(
    readonly required: number,
    readonly available: number,
  ) {
    super(
      `This needs ${required} credit${required === 1 ? "" : "s"}, but you have ${available}.`,
    );
    this.name = "InsufficientCreditsError";
  }
}

export async function getBalance(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("credit_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to read credit balance: ${error.message}`);
  return data?.balance ?? 0;
}

/**
 * Atomically deducts credits. Throws InsufficientCreditsError if the balance
 * is too low — the check and the deduction happen inside one locked transaction.
 */
export async function spendCredits(params: {
  userId: string;
  amount: number;
  type: CreditTransactionType;
  generationId?: string;
  description?: string;
}): Promise<number> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("spend_credits", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_type: params.type,
    p_generation_id: params.generationId ?? null,
    p_description: params.description ?? null,
  });

  if (error) {
    if (error.message.includes("insufficient_credits")) {
      throw new InsufficientCreditsError(
        params.amount,
        await getBalance(params.userId),
      );
    }
    throw new Error(`Failed to spend credits: ${error.message}`);
  }

  return data as number;
}

/**
 * Returns credits after a failed generation. Idempotent per generation, so a
 * retried error handler cannot refund twice.
 */
export async function refundCredits(params: {
  userId: string;
  amount: number;
  generationId: string;
  description?: string;
}): Promise<number | null> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("refund_credits", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_generation_id: params.generationId,
    p_description: params.description ?? "Refund for failed generation",
  });

  if (error) {
    // A failed refund must never mask the original generation error.
    console.error("[credits] refund failed", {
      userId: params.userId,
      generationId: params.generationId,
      message: error.message,
    });
    return null;
  }

  return data as number;
}

/** Grants a plan's monthly allocation. Idempotent per billing period. */
export async function grantMonthlyCredits(params: {
  userId: string;
  amount: number;
  period: string;
  description?: string;
}): Promise<number | null> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("grant_monthly_credits", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_period: params.period,
    p_description: params.description ?? "Monthly plan credits",
  });

  if (error) throw new Error(`Failed to grant credits: ${error.message}`);
  return data as number;
}

/** Billing-period key used to make grants idempotent, e.g. "2026-09". */
export function periodKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
