"use client";

import * as React from "react";

import { GenerateButton } from "@/components/generation/generate-button";
import {
  ImageUploader,
  type UploadedImage,
} from "@/components/generation/image-uploader";
import { WorkspaceShell } from "@/components/generation/page-shell";
import { ResultPanel } from "@/components/generation/result-panel";
import { Button } from "@/components/ui/button";
import { useGeneration } from "@/hooks/use-generation";
import { calculateCreditCost } from "@/config/credits";
import { UPSCALE_FACTORS } from "@/config/generation";
import { cn } from "@/lib/utils";

interface Preselected {
  id: string;
  url: string | null;
  prompt: string;
}

export function UpscaleWorkspace({
  preselected,
  maxUploadMb,
}: {
  preselected: Preselected | null;
  maxUploadMb: number;
}) {
  const { submit, submitting, isRunning, generation, outputs, error } =
    useGeneration();

  const [existing, setExisting] = React.useState<Preselected | null>(preselected);
  const [upload, setUpload] = React.useState<UploadedImage | null>(null);
  const [factor, setFactor] = React.useState<2 | 4>(2);

  const cost = calculateCreditCost({ type: "UPSCALE", upscaleFactor: factor });
  const hasSource = Boolean(existing || upload);

  const sourcePreview = existing?.url ?? upload?.previewUrl ?? null;

  function handleUpscale() {
    if (existing) {
      void submit("/api/upscale", { outputId: existing.id, factor });
    } else if (upload) {
      void submit("/api/upscale", { sourcePath: upload.path, factor });
    }
  }

  return (
    <WorkspaceShell
      title="Upscale"
      description="Enlarge an image to 2× or 4× with a super-resolution model."
      controls={
        <>
          {existing ? (
            <div className="space-y-1.5">
              <span className="text-[13px] font-medium text-fg">Source image</span>
              <div className="relative overflow-hidden rounded-[--radius-sm] border border-border bg-bg-muted">
                {existing.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={existing.url}
                    alt={existing.prompt || "Selected image"}
                    className="max-h-48 w-full object-contain"
                  />
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={isRunning}
                onClick={() => setExisting(null)}
                className="w-full"
              >
                Choose a different image
              </Button>
            </div>
          ) : (
            <ImageUploader
              value={upload}
              onChange={setUpload}
              disabled={isRunning}
              maxSizeMb={maxUploadMb}
            />
          )}

          <fieldset disabled={isRunning} className="space-y-1.5">
            <legend className="text-[13px] font-medium text-fg">Scale</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {UPSCALE_FACTORS.map((option) => {
                const selected = option === factor;
                const optionCost = calculateCreditCost({
                  type: "UPSCALE",
                  upscaleFactor: option,
                });
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFactor(option)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-[--radius-sm] border px-3 py-2.5 text-center transition-colors",
                      selected
                        ? "border-accent bg-accent-soft"
                        : "border-border hover:border-border-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-sm font-semibold tabular-nums",
                        selected ? "text-accent" : "text-fg",
                      )}
                    >
                      {option}×
                    </span>
                    <span className="mt-0.5 block text-[11px] text-fg-subtle">
                      {optionCost} credits
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <GenerateButton
            cost={cost}
            loading={submitting || isRunning}
            disabled={!hasSource}
            label={`Upscale ${factor}×`}
            onClick={handleUpscale}
          />
        </>
      }
      output={
        <div className="space-y-4">
          {sourcePreview && outputs.length > 0 && !isRunning ? (
            <div>
              <h2 className="mb-2 text-xs font-medium text-fg-subtle">Original</h2>
              <div className="overflow-hidden rounded-[--radius-md] border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sourcePreview}
                  alt="The original image before upscaling"
                  className="max-h-40 w-full bg-bg-muted object-contain"
                />
              </div>
            </div>
          ) : null}

          {outputs.length > 0 && !isRunning ? (
            <h2 className="text-xs font-medium text-fg-subtle">
              Upscaled result
            </h2>
          ) : null}

          <ResultPanel
            generation={generation}
            outputs={outputs}
            error={error}
            isRunning={isRunning}
            expectedCount={1}
            emptyTitle="Nothing upscaled yet"
            emptyDescription="Pick an image from your gallery or upload one, choose a scale, then select Upscale."
          />
        </div>
      }
    />
  );
}
