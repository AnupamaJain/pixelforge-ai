import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStripeConfigured } from "@/lib/stripe";
import { PLANS, PLAN_ORDER } from "@/config/plans";
import { Skeleton } from "@/components/ui/skeleton";
import { BillingView } from "./view";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const auth = await requireAuthContext();
  const admin = createAdminClient();

  const [subscription, balance, transactions] = await Promise.all([
    admin
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end, stripe_customer_id")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    admin
      .from("credit_balances")
      .select("balance, lifetime_granted, lifetime_spent")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    admin
      .from("credit_transactions")
      .select("id, type, amount, balance_after, description, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  return (
    <Suspense fallback={<Skeleton className="m-6 h-96" />}>
      <BillingView
        planId={auth.planId}
        planName={auth.plan.name}
        monthlyCredits={auth.plan.monthlyCredits}
        catalogue={PLAN_ORDER.map((id) => ({
          id: PLANS[id].id,
          name: PLANS[id].name,
          audience: PLANS[id].audience,
          priceCents: PLANS[id].priceCents,
          monthlyCredits: PLANS[id].monthlyCredits,
          highlights: PLANS[id].highlights,
        }))}
        credits={balance.data?.balance ?? 0}
        lifetimeGranted={balance.data?.lifetime_granted ?? 0}
        lifetimeSpent={balance.data?.lifetime_spent ?? 0}
        subscription={subscription.data ?? null}
        transactions={transactions.data ?? []}
        stripeConfigured={isStripeConfigured()}
      />
    </Suspense>
  );
}
