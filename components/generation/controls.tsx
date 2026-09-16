"use client";

import * as React from "react";
import { Dices, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  ASPECT_RATIOS,
  BASE_SIZES,
  GUIDANCE_RANGE,
  IMAGE_COUNT_OPTIONS,
  STEPS_RANGE,
  resolveDimensions,
} from "@/config/generation";
import { STYLE_PRESETS } from "@/config/styles";

export function PromptInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="prompt" hint={`${value.length}/2000`}>
        Prompt
      </Label>
      <Textarea
        id="prompt"
        value={value}
        maxLength={2000}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Describe the image you want to create..."
        className="min-h-[7rem]"
      />
    </div>
  );
}

export function NegativePrompt({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="negativePrompt" hint="Optional">
        Negative prompt
      </Label>
      <Textarea
        id="negativePrompt"
        value={value}
        maxLength={2000}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="blurry, distorted, low quality"
        className="min-h-[4.5rem]"
      />
    </div>
  );
}

export function StyleSelector({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const active = STYLE_PRESETS.find((style) => style.id === value);

  return (
    <div className="space-y-1.5">
      <Label htmlFor="style">Style</Label>
      <Select
        id="style"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby="style-description"
      >
        {STYLE_PRESETS.map((style) => (
          <option key={style.id} value={style.id}>
            {style.name}
          </option>
        ))}
      </Select>
      <p id="style-description" className="text-xs text-fg-subtle">
        {active?.description}
      </p>
    </div>
  );
}

export function AspectRatioSelector({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-1.5">
      <legend className="text-[13px] font-medium text-fg">Aspect ratio</legend>
      <div className="grid grid-cols-3 gap-1.5">
        {ASPECT_RATIOS.map((option) => {
          const selected = option.id === value;
          const [w, h] = option.ratio;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              title={option.label}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-[--radius-sm] border px-2 py-2.5 transition-colors",
                selected
                  ? "border-accent bg-accent-soft"
                  : "border-border hover:border-border-strong",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block rounded-[3px] border",
                  selected ? "border-accent bg-accent/20" : "border-border-strong",
                )}
                style={{
                  width: `${(w / Math.max(w, h)) * 20}px`,
                  height: `${(h / Math.max(w, h)) * 20}px`,
                }}
              />
              <span
                className={cn(
                  "text-[11px] font-medium tabular-nums",
                  selected ? "text-accent" : "text-fg-muted",
                )}
              >
                {option.id}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SizeSelector({
  value,
  onChange,
  aspectRatio,
  maxResolution,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  aspectRatio: string;
  maxResolution: number;
  disabled?: boolean;
}) {
  // Only offer sizes the plan actually permits, so the UI can't propose
  // something the server would reject.
  const available = BASE_SIZES.filter((size) => {
    const { width, height } = resolveDimensions(aspectRatio, size);
    return Math.max(width, height) <= maxResolution;
  });

  const dimensions = resolveDimensions(aspectRatio, value);

  return (
    <div className="space-y-1.5">
      <Label htmlFor="size" hint={`${dimensions.width}×${dimensions.height}`}>
        Image size
      </Label>
      <Select
        id="size"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {available.map((size) => (
          <option key={size} value={size}>
            {size}px base
          </option>
        ))}
      </Select>
      {available.length < BASE_SIZES.length ? (
        <p className="text-xs text-fg-subtle">
          Larger sizes are available on the Pro plan.
        </p>
      ) : null}
    </div>
  );
}

export function ImageCountSelector({
  value,
  onChange,
  max,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  max: number;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-1.5">
      <legend className="text-[13px] font-medium text-fg">Number of images</legend>
      <div className="grid grid-cols-3 gap-1.5">
        {IMAGE_COUNT_OPTIONS.map((count) => {
          const locked = count > max;
          const selected = count === value;
          return (
            <button
              key={count}
              type="button"
              disabled={locked}
              onClick={() => onChange(count)}
              aria-pressed={selected}
              title={locked ? "Upgrade to Pro for more images per generation" : undefined}
              className={cn(
                "flex items-center justify-center gap-1 rounded-[--radius-sm] border py-2 text-sm font-medium tabular-nums transition-colors",
                selected
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-fg-muted hover:border-border-strong",
                locked && "cursor-not-allowed opacity-40",
              )}
            >
              {count}
              {locked ? <Lock aria-hidden="true" className="size-3" /> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SeedControl({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}) {
  const isRandom = value === null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="seed" hint={isRandom ? "Random" : "Fixed"}>
        Seed
      </Label>
      <div className="flex gap-1.5">
        <Input
          id="seed"
          type="number"
          min={0}
          max={2147483647}
          disabled={disabled}
          value={value ?? ""}
          placeholder="Random"
          onChange={(event) => {
            const raw = event.target.value;
            onChange(raw === "" ? null : Math.max(0, Number(raw)));
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          disabled={disabled}
          onClick={() => onChange(isRandom ? Math.floor(Math.random() * 2147483647) : null)}
          aria-label={isRandom ? "Use a fixed seed" : "Use a random seed"}
          title={isRandom ? "Lock a seed" : "Switch to random"}
          className="shrink-0"
        >
          <Dices aria-hidden="true" />
        </Button>
      </div>
      <p className="text-xs text-fg-subtle">
        {isRandom
          ? "A new seed each run gives you fresh variations."
          : "Reuse this seed to reproduce the same image."}
      </p>
    </div>
  );
}

/**
 * Advanced controls. Steps and guidance appear only when the active engine
 * reports that it honours them.
 */
export function GenerationSettings({
  steps,
  guidance,
  onStepsChange,
  onGuidanceChange,
  supportsSteps,
  supportsGuidance,
  disabled,
}: {
  steps: number;
  guidance: number;
  onStepsChange: (value: number) => void;
  onGuidanceChange: (value: number) => void;
  supportsSteps: boolean;
  supportsGuidance: boolean;
  disabled?: boolean;
}) {
  if (!supportsSteps && !supportsGuidance) return null;

  return (
    <details className="group rounded-[--radius-sm] border border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
        Advanced settings
        <span
          aria-hidden="true"
          className="grid size-5 place-items-center rounded-full border border-border text-fg-subtle transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="space-y-4 border-t border-border p-3">
        {supportsSteps ? (
          <Slider
            id="steps"
            label="Steps"
            value={steps}
            min={STEPS_RANGE.min}
            max={STEPS_RANGE.max}
            onChange={onStepsChange}
            disabled={disabled}
            description="More steps take longer and add detail."
          />
        ) : null}
        {supportsGuidance ? (
          <Slider
            id="guidance"
            label="Guidance"
            value={guidance}
            min={GUIDANCE_RANGE.min}
            max={GUIDANCE_RANGE.max}
            step={0.5}
            onChange={onGuidanceChange}
            disabled={disabled}
            description="How closely the result follows your prompt."
          />
        ) : null}
      </div>
    </details>
  );
}
