import type { Metadata } from "next";
import Link from "next/link";
import {
  Coins,
  Heart,
  Images,
  Package,
  Rows3,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GENERATIONS_BUCKET, createSignedUrls } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/skeleton";
import { formatNumber, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const QUICK_ACTIONS = [
  { href: "/product-studio", label: "Product Studio", Icon: Package, feature: "productScenes" },
  { href: "/generate", label: "Generate Image", Icon: Sparkles, feature: null },
  { href: "/batch", label: "Batch Run", Icon: Rows3, feature: "batchGeneration" },
  { href: "/gallery", label: "View Gallery", Icon: Images, feature: null },
] as const;

function StatCard({
  label,
  value,
  Icon,
  hint,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-fg-subtle">
        <Icon aria-hidden className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p> : null}
    </Card>
  );
}

export default async function DashboardPage() {
  const auth = await requireAuthContext();
  const admin = createAdminClient();

  const [balance, generationCount, imageCount, favoriteCount, recent] =
    await Promise.all([
      admin
        .from("credit_balances")
        .select("balance, lifetime_spent")
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      admin
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id)
        .eq("status", "COMPLETED"),
      admin
        .from("generation_outputs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id),
      admin
        .from("generation_outputs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id)
        .eq("is_favorite", true),
      admin
        .from("generation_outputs")
        .select("id, storage_path, width, height, created_at, generations!inner(prompt, status)")
        .eq("user_id", auth.user.id)
        .eq("generations.status", "COMPLETED")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const recentRows = recent.data ?? [];
  const signed = await createSignedUrls(
    GENERATIONS_BUCKET,
    recentRows.map((row) => row.storage_path),
  );

  const credits = balance.data?.balance ?? 0;
  const creditsUsed = balance.data?.lifetime_spent ?? 0;
  const displayName = auth.user.email?.split("@")[0] ?? "there";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Here&apos;s where your workspace stands today.
          </p>
        </div>
        <Badge variant={auth.planId === "FREE" ? "outline" : "accent"}>
          {auth.plan.name} plan
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Credits remaining"
          value={formatNumber(credits)}
          Icon={Coins}
          hint={`${formatNumber(auth.plan.monthlyCredits)} per month on ${auth.plan.name}`}
        />
        <StatCard
          label="Credits used"
          value={formatNumber(creditsUsed)}
          Icon={TrendingUp}
          hint="All time"
        />
        <StatCard
          label="Images generated"
          value={formatNumber(imageCount.count ?? 0)}
          Icon={Images}
          hint={`${formatNumber(generationCount.count ?? 0)} generations`}
        />
        <StatCard
          label="Favourites"
          value={formatNumber(favoriteCount.count ?? 0)}
          Icon={Heart}
          hint="Saved for quick access"
        />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Quick actions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ href, label, Icon, feature }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-[--radius-md] border border-border bg-surface p-4 transition-colors hover:border-accent"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[--radius-sm] bg-accent-soft text-accent">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {label}
                </span>
                {feature && !auth.plan.features[feature] ? (
                  <span className="text-xs text-fg-subtle">Upgrade to unlock</span>
                ) : null}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent generations</h2>
          {recentRows.length > 0 ? (
            <Link
              href="/gallery"
              className="text-[13px] text-accent hover:underline"
            >
              View all
            </Link>
          ) : null}
        </div>

        {recentRows.length === 0 ? (
          <EmptyState
            icon={<Sparkles aria-hidden="true" className="size-5" />}
            title="Nothing here yet"
            description="Generate your first image and it'll show up here."
            action={
              <Link href="/generate">
                <Button>Generate an image</Button>
              </Link>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {recentRows.map((row) => {
              const parent = row.generations as unknown as { prompt?: string };
              const url = signed.get(row.storage_path);
              return (
                <li key={row.id}>
                  <Link
                    href="/gallery"
                    className="block overflow-hidden rounded-[--radius-sm] border border-border bg-bg-muted"
                    title={parent?.prompt}
                  >
                    <div className="aspect-square">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={parent?.prompt ?? "Generated image"}
                          className="size-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : null}
                    </div>
                  </Link>
                  <p className="mt-1 text-[10px] text-fg-subtle">
                    {formatRelativeTime(row.created_at)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
