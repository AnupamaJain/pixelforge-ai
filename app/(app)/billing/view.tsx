"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { formatPrice, planRank } from "@/config/plans";
import { formatDateTime, formatNumber, formatRelativeTime } from "@/lib/utils";
import type { CreditTransactionType } from "@/types";
import type { PlanId } from "@/config/plans";

interface SubscriptionRow {
  plan: string;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
}

interface TransactionRow {
  id: string;
  type: CreditTransactionType;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

const TX_LABEL: Record<CreditTransactionType, string> = {
  PURCHASE: "Purchase",
  SUBSCRIPTION: "Plan credits",
  GENERATION: "Generation",
  UPSCALE: "Upscale",
  REFUND: "Refund",
  ADMIN_ADJUSTMENT: "Adjustment",
};

interface PlanSummary {
  id: PlanId;
  name: string;
  audience: string;
  priceCents: number;
  monthlyCredits: number;
  highlights: string[];
}

export function BillingView({
  planId,
  planName,
  monthlyCredits,
  catalogue,
  credits,
  lifetimeGranted,
  lifetimeSpent,
  subscription,
  transactions,
  stripeConfigured,
}: {
  planId: PlanId;
  planName: string;
  monthlyCredits: number;
  catalogue: PlanSummary[];
  credits: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
  subscription: SubscriptionRow | null;
  transactions: TransactionRow[];
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState<"checkout" | "portal" | null>(null);

  const isPaid = planId !== "FREE";
  const notified = React.useRef(false);

  // Stripe redirects back here after checkout; the webhook does the real work,
  // so refresh to pick up the newly-synced subscription.
  React.useEffect(() => {
    if (notified.current) return;
    if (searchParams.get("checkout") === "success") {
      notified.current = true;
      toast("You\u2019re upgraded. Your credits are on the way.", "success");
      const timer = setTimeout(() => router.refresh(), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, toast, router]);

  async function startCheckout(plan: PlanId) {
    setLoading("checkout");
    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Checkout failed.");
      window.location.href = data.url;
    } catch (error) {
      toast(error instanceof Error ? error.message : "Checkout failed.", "error");
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not open the billing portal.");
      }
      window.location.href = data.url;
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not open the billing portal.",
        "error",
      );
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Billing</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Manage your plan and review how your credits have been spent.
        </p>
      </div>

      {!stripeConfigured ? (
        <div
          role="status"
          className="mb-5 rounded-[--radius-md] border border-warning/30 bg-warning/5 p-4 text-sm text-fg-muted"
        >
          <strong className="text-fg">Billing isn&apos;t configured.</strong> Set{" "}
          <code className="rounded bg-bg-muted px-1 py-0.5 text-xs">
            STRIPE_SECRET_KEY
          </code>{" "}
          and{" "}
          <code className="rounded bg-bg-muted px-1 py-0.5 text-xs">
            STRIPE_PRICE_ID
          </code>{" "}
          to enable upgrades. See the README for setup steps.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Current plan</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">
                {formatNumber(monthlyCredits)} credits per month
              </p>
            </div>
            <Badge variant={isPaid ? "accent" : "outline"}>{planName}</Badge>
          </CardHeader>

          <CardContent className="space-y-4">
            {subscription?.current_period_end ? (
              <p className="text-sm text-fg-muted">
                {subscription.cancel_at_period_end
                  ? `Your plan ends on ${formatDateTime(subscription.current_period_end)}. You'll keep Pro access until then.`
                  : `Renews on ${formatDateTime(subscription.current_period_end)}.`}
              </p>
            ) : null}

            {isPaid ? (
              <Button
                variant="secondary"
                loading={loading === "portal"}
                disabled={!stripeConfigured}
                onClick={openPortal}
              >
                <ExternalLink aria-hidden="true" />
                Manage subscription
              </Button>
            ) : null}

            <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
              {catalogue
                .filter((tier) => planRank(tier.id) > planRank(planId))
                .map((tier) => (
                  <div
                    key={tier.id}
                    className="rounded-[--radius-md] border border-border p-3.5"
                  >
                    <p className="text-[13px] font-semibold">{tier.name}</p>
                    <p className="text-xs text-fg-subtle">{tier.audience}</p>
                    <p className="mt-2 text-lg font-semibold tabular-nums">
                      {formatPrice(tier.priceCents)}
                      <span className="text-xs font-normal text-fg-subtle">/mo</span>
                    </p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {formatNumber(tier.monthlyCredits)} credits
                    </p>
                    <Button
                      size="sm"
                      className="mt-3 w-full"
                      loading={loading === "checkout"}
                      disabled={!stripeConfigured}
                      onClick={() => startCheckout(tier.id)}
                    >
                      <ArrowUpRight aria-hidden="true" />
                      Upgrade
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {formatNumber(credits)}
            </p>
            <p className="mt-0.5 text-xs text-fg-subtle">remaining</p>

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-muted">Granted</dt>
                <dd className="tabular-nums">{formatNumber(lifetimeGranted)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-muted">Spent</dt>
                <dd className="tabular-nums">{formatNumber(lifetimeSpent)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Credit activity</h2>
        {transactions.length === 0 ? (
          <p className="rounded-[--radius-md] border border-dashed border-border p-8 text-center text-sm text-fg-muted">
            No credit activity yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[--radius-md] border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Your most recent credit transactions
              </caption>
              <thead className="bg-bg-subtle text-left text-xs text-fg-subtle">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Activity</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    When
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Change
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-2.5">
                      <span className="block font-medium">{TX_LABEL[tx.type]}</span>
                      {tx.description ? (
                        <span className="block text-xs text-fg-subtle">
                          {tx.description}
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs text-fg-subtle sm:table-cell">
                      {formatRelativeTime(tx.created_at)}
                    </td>
                    <td
                      className={
                        tx.amount >= 0
                          ? "px-4 py-2.5 text-right tabular-nums text-success"
                          : "px-4 py-2.5 text-right tabular-nums text-fg-muted"
                      }
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {formatNumber(tx.amount)}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right tabular-nums text-fg-muted sm:table-cell">
                      {formatNumber(tx.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
