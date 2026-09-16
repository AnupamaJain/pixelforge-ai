"use client";

import * as React from "react";
import { Calculator } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";
import { CREDIT_COSTS, calculateCreditCost } from "@/config/credits";
import { PLANS } from "@/config/plans";

/**
 * Cost calculator driven by the real `calculateCreditCost()` from
 * config/credits.ts — the numbers a visitor sees here are the numbers they
 * will actually be charged.
 */

type Mode = "TEXT_TO_IMAGE" | "IMAGE_TO_IMAGE" | "PRODUCT_SCENE" | "UPSCALE";

const MODES: { id: Mode; label: string; cost: number }[] = [
  { id: "TEXT_TO_IMAGE", label: "Text to image", cost: CREDIT_COSTS.TEXT_TO_IMAGE },
  { id: "IMAGE_TO_IMAGE", label: "Image to image", cost: CREDIT_COSTS.IMAGE_TO_IMAGE },
  { id: "PRODUCT_SCENE", label: "Product scene", cost: CREDIT_COSTS.PRODUCT_SCENE },
  { id: "UPSCALE", label: "Upscale", cost: CREDIT_COSTS.UPSCALE_2X },
];

export function CostCalculator() {
  const [mode, setMode] = React.useState<Mode>("PRODUCT_SCENE");
  const [count, setCount] = React.useState(20);
  const [factor, setFactor] = React.useState<2 | 4>(2);

  const isUpscale = mode === "UPSCALE";

  const perUnit = calculateCreditCost({
    type: mode,
    imageCount: 1,
    upscaleFactor: factor,
  });
  const total = isUpscale ? perUnit * count : calculateCreditCost({ type: mode, imageCount: count });

  // How far each plan's monthly allocation stretches at this workload.
  const plans = [PLANS.FREE, PLANS.STARTER, PLANS.GROWTH, PLANS.AGENCY];

  return (
    <div className="rounded-[--radius-lg] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Calculator aria-hidden="true" className="size-4 text-accent" />
        <h3 className="text-[15px] font-semibold">What will it cost me?</h3>
      </div>
      <p className="mt-1 text-sm text-fg-muted">
        These are the live pricing rules from the application, not an estimate.
      </p>

      <fieldset className="mt-5 space-y-2">
        <legend className="text-[13px] font-medium text-fg">I want to create</legend>
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              aria-pressed={mode === option.id}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                mode === option.id
                  ? "bg-accent text-accent-fg"
                  : "border border-border text-fg-muted hover:border-border-strong hover:text-fg",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {isUpscale ? (
        <fieldset className="mt-4 space-y-2">
          <legend className="text-[13px] font-medium text-fg">Scale</legend>
          <div className="flex gap-1.5">
            {([2, 4] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFactor(option)}
                aria-pressed={factor === option}
                className={cn(
                  "rounded-[--radius-xs] border px-3 py-1.5 text-[12px] tabular-nums transition-colors",
                  factor === option
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-fg-muted hover:border-border-strong",
                )}
              >
                {option}×
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="cost-count" className="text-[13px] font-medium text-fg">
            How many per month
          </label>
          <span className="tabular-nums text-sm font-medium text-fg">
            {formatNumber(count)}
          </span>
        </div>
        <input
          id="cost-count"
          type="range"
          min={1}
          max={500}
          step={1}
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
          className={cn(
            "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-bg-muted",
            "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent",
            "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface",
            "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface",
            "[&::-moz-range-thumb]:bg-accent",
          )}
        />
      </div>

      <div className="mt-5 rounded-[--radius-md] bg-bg-subtle p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-fg-muted">
            {formatNumber(count)} × {perUnit} credit{perUnit === 1 ? "" : "s"}
          </span>
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {formatNumber(total)}
            <span className="ml-1 text-sm font-normal text-fg-subtle">credits</span>
          </span>
        </div>

        <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
          {plans.map((plan) => {
            const covered = plan.monthlyCredits >= total;
            return (
              <li
                key={plan.id}
                className="flex items-center justify-between gap-3 text-[13px]"
              >
                <span className="text-fg-muted">{plan.name}</span>
                <span
                  className={cn(
                    "tabular-nums",
                    covered ? "text-success" : "text-fg-subtle",
                  )}
                >
                  {covered
                    ? `covers it (${formatNumber(plan.monthlyCredits)})`
                    : `${formatNumber(plan.monthlyCredits)} — not enough`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
