"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_ORDER, formatPrice, type PlanId } from "@/config/plans";
import { CREDIT_COSTS, calculateCreditCost } from "@/config/credits";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Interactive pricing.
 *
 * Instead of asking someone to translate "2,500 credits" into their own
 * situation, this asks the question they can actually answer — how many
 * product photos do you need a month — and recommends the tier that covers it.
 *
 * All arithmetic runs through the real calculateCreditCost() and plan config,
 * so the number quoted here is the number they will be charged.
 */

type Workload = "product-scenes" | "images" | "mixed";

const WORKLOADS: { id: Workload; label: string; creditsEach: number; note: string }[] = [
  {
    id: "product-scenes",
    label: "Product scenes",
    creditsEach: CREDIT_COSTS.PRODUCT_SCENE,
    note: "Your product composited into a generated scene",
  },
  {
    id: "images",
    label: "Plain images",
    creditsEach: CREDIT_COSTS.TEXT_TO_IMAGE,
    note: "Text-to-image, no product compositing",
  },
  {
    id: "mixed",
    label: "A mix",
    // A realistic catalogue blend: mostly scenes, some upscales.
    creditsEach: Math.round(
      (CREDIT_COSTS.PRODUCT_SCENE * 3 + CREDIT_COSTS.UPSCALE_2X) / 4,
    ),
    note: "Roughly three scenes to one upscale",
  },
];

/** Non-linear steps so the low end, where most people sit, stays precise. */
const STEPS = [
  10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000,
];

function recommendPlan(creditsNeeded: number): PlanId {
  for (const planId of PLAN_ORDER) {
    if (PLANS[planId].monthlyCredits >= creditsNeeded) return planId;
  }
  return "AGENCY";
}

export function PricingCalculator() {
  const [stepIndex, setStepIndex] = React.useState(5); // 100/month
  const [workload, setWorkload] = React.useState<Workload>("product-scenes");

  const volume = STEPS[stepIndex];
  const selected = WORKLOADS.find((item) => item.id === workload)!;
  const creditsNeeded = volume * selected.creditsEach;

  const recommended = recommendPlan(creditsNeeded);
  const plan = PLANS[recommended];
  const covered = plan.monthlyCredits >= creditsNeeded;

  // What one image effectively costs at this tier — the number that beats a
  // photoshoot quote in a buyer's head.
  const perImageCents =
    volume > 0 && plan.priceCents > 0
      ? plan.priceCents / volume
      : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
      {/* Controls */}
      <div className="rounded-[--radius-xl] border border-border bg-surface p-6 sm:p-8">
        <h3 className="text-xl font-bold tracking-tight">
          How many images do you need?
        </h3>
        <p className="mt-1.5 text-sm text-fg-muted">
          Drag the slider. We&apos;ll work out which plan covers it.
        </p>

        <fieldset className="mt-6 space-y-2">
          <legend className="text-[13px] font-medium text-fg">
            What are you making?
          </legend>
          <div className="grid gap-1.5 sm:grid-cols-3">
            {WORKLOADS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setWorkload(item.id)}
                aria-pressed={workload === item.id}
                className={cn(
                  "rounded-[--radius-sm] border px-3 py-2.5 text-left transition-colors",
                  workload === item.id
                    ? "border-accent bg-accent-soft"
                    : "border-border hover:border-border-strong",
                )}
              >
                <span
                  className={cn(
                    "block text-[13px] font-medium",
                    workload === item.id ? "text-accent" : "text-fg",
                  )}
                >
                  {item.label}
                </span>
                <span className="mt-0.5 block text-[11px] tabular-nums text-fg-subtle">
                  {item.creditsEach} credit{item.creditsEach === 1 ? "" : "s"} each
                </span>
              </button>
            ))}
          </div>
          <p className="pt-1 text-xs text-fg-subtle">{selected.note}</p>
        </fieldset>

        <div className="mt-7">
          <div className="flex items-baseline justify-between">
            <label
              htmlFor="volume-slider"
              className="text-[13px] font-medium text-fg"
            >
              Images per month
            </label>
            <span className="text-2xl font-bold tabular-nums tracking-tight">
              {formatNumber(volume)}
              {stepIndex === STEPS.length - 1 ? "+" : ""}
            </span>
          </div>

          <input
            id="volume-slider"
            type="range"
            min={0}
            max={STEPS.length - 1}
            step={1}
            value={stepIndex}
            onChange={(event) => setStepIndex(Number(event.target.value))}
            aria-valuetext={`${volume} images per month`}
            className={cn(
              "mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-bg-muted",
              "[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none",
              "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent",
              "[&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-surface",
              "[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform",
              "[&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-95",
              "[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full",
              "[&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-surface",
              "[&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:shadow-md",
            )}
          />

          <div className="mt-2 flex justify-between text-[11px] tabular-nums text-fg-subtle">
            <span>{STEPS[0]}</span>
            <span>{STEPS[Math.floor(STEPS.length / 2)]}</span>
            <span>{STEPS[STEPS.length - 1]}+</span>
          </div>
        </div>

        <div className="mt-7 rounded-[--radius-md] bg-bg-subtle p-4">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-fg-subtle">Credits needed</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {formatNumber(creditsNeeded)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">Plan includes</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {formatNumber(plan.monthlyCredits)}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-xs text-fg-subtle">Effective cost</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {plan.priceCents === 0
                  ? "Free"
                  : `${(perImageCents / 100).toFixed(2)}/image`}
              </dd>
            </div>
          </dl>

          {!covered ? (
            <p className="mt-3 border-t border-border pt-3 text-xs text-fg-muted">
              That&apos;s above our largest published plan.{" "}
              <Link href="/pricing" className="font-medium text-accent hover:underline">
                Talk to us about volume pricing
              </Link>
              .
            </p>
          ) : null}
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-[--radius-xl] border-2 border-accent bg-surface p-6 sm:p-8 lg:sticky lg:top-24">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-fg-subtle">
            Recommended for you
          </span>
          <Badge variant="accent">
            <Sparkles aria-hidden="true" className="size-3" />
            Best fit
          </Badge>
        </div>

        <h3 className="mt-3 text-2xl font-bold tracking-tight">{plan.name}</h3>
        <p className="mt-0.5 text-sm text-fg-muted">{plan.audience}</p>

        <p className="mt-5 flex items-baseline gap-1.5">
          <span className="text-4xl font-bold tracking-tight">
            {formatPrice(plan.priceCents)}
          </span>
          <span className="text-sm text-fg-subtle">/month</span>
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          {formatNumber(plan.monthlyCredits)} credits ·{" "}
          {formatNumber(Math.floor(plan.monthlyCredits / selected.creditsEach))}{" "}
          {selected.label.toLowerCase()}
        </p>

        <Link href="/signup" className="mt-5 block">
          <Button size="lg" className="w-full">
            {plan.priceCents === 0 ? "Start for free" : `Start with ${plan.name}`}
          </Button>
        </Link>
        <p className="mt-2 text-center text-[11px] text-fg-subtle">
          No card required · Cancel any time
        </p>

        <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
          {plan.highlights.map((highlight: string) => (
            <li key={highlight} className="flex items-start gap-2.5 text-[13px]">
              <Check
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-accent"
              />
              <span className="text-fg-muted">{highlight}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-fg-subtle">
          A conventional product shoot runs $500–5,000 and takes a week.
          Failed generations are always refunded.
        </p>
      </div>
    </div>
  );
}
