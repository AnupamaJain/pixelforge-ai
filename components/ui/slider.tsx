"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Range input with a live value readout, labelled for assistive tech. */
export function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  description,
  disabled,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  description?: string;
  disabled?: boolean;
}) {
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        <span className="tabular-nums text-xs text-fg-muted">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-describedby={descriptionId}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-bg-muted",
          "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent",
          "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface",
          "[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform",
          "[&::-webkit-slider-thumb]:hover:scale-110",
          "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface",
          "[&::-moz-range-thumb]:bg-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />
      {description ? (
        <p id={descriptionId} className="text-xs text-fg-subtle">
          {description}
        </p>
      ) : null}
    </div>
  );
}
