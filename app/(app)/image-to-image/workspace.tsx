"use client";

import * as React from "react";

import {
  AspectRatioSelector,
  GenerationSettings,
  ImageCountSelector,
  NegativePrompt,
  PromptInput,
  SeedControl,
  SizeSelector,
  StyleSelector,
} from "@/components/generation/controls";
import { GenerateButton } from "@/components/generation/generate-button";
import {
  ImageUploader,
  type UploadedImage,
} from "@/components/generation/image-uploader";
import { WorkspaceShell } from "@/components/generation/page-shell";
import { ResultPanel } from "@/components/generation/result-panel";
import { Slider } from "@/components/ui/slider";
import { useGeneration } from "@/hooks/use-generation";
import { calculateCreditCost } from "@/config/credits";
import {
  GUIDANCE_RANGE,
  STEPS_RANGE,
  STRENGTH_RANGE,
  resolveDimensions,
} from "@/config/generation";
import { DEFAULT_STYLE_ID } from "@/config/styles";

export function ImageToImageWorkspace({
  maxImages,
  maxResolution,
  supportsSteps,
  supportsGuidance,
  supportsSeed,
  maxUploadMb,
}: {
  maxImages: number;
  maxResolution: number;
  supportsSteps: boolean;
  supportsGuidance: boolean;
  supportsSeed: boolean;
  maxUploadMb: number;
}) {
  const { submit, submitting, isRunning, generation, outputs, error } =
    useGeneration();

  const [source, setSource] = React.useState<UploadedImage | null>(null);
  const [prompt, setPrompt] = React.useState("");
  const [negativePrompt, setNegativePrompt] = React.useState("");
  const [styleId, setStyleId] = React.useState(DEFAULT_STYLE_ID);
  const [aspectRatio, setAspectRatio] = React.useState("1:1");
  const [baseSize, setBaseSize] = React.useState(Math.min(1024, maxResolution));
  const [imageCount, setImageCount] = React.useState(1);
  const [strength, setStrength] = React.useState<number>(STRENGTH_RANGE.default);
  const [seed, setSeed] = React.useState<number | null>(null);
  const [steps, setSteps] = React.useState<number>(STEPS_RANGE.default);
  const [guidance, setGuidance] = React.useState<number>(GUIDANCE_RANGE.default);

  const cost = calculateCreditCost({ type: "IMAGE_TO_IMAGE", imageCount });
  const dimensions = resolveDimensions(aspectRatio, baseSize);

  function handleGenerate() {
    if (!source) return;
    void submit("/api/image-to-image", {
      sourcePath: source.path,
      prompt,
      negativePrompt: negativePrompt || undefined,
      styleId,
      aspectRatio,
      baseSize,
      imageCount,
      strength,
      seed: seed ?? undefined,
      steps: supportsSteps ? steps : undefined,
      guidance: supportsGuidance ? guidance : undefined,
    });
  }

  return (
    <WorkspaceShell
      title="Image to Image"
      description="Start from an image you already have and redirect it with a prompt."
      controls={
        <>
          <ImageUploader
            value={source}
            onChange={setSource}
            disabled={isRunning}
            maxSizeMb={maxUploadMb}
          />
          <PromptInput value={prompt} onChange={setPrompt} disabled={isRunning} />
          <NegativePrompt
            value={negativePrompt}
            onChange={setNegativePrompt}
            disabled={isRunning}
          />
          <StyleSelector value={styleId} onChange={setStyleId} disabled={isRunning} />

          <Slider
            id="strength"
            label="Strength"
            value={strength}
            min={STRENGTH_RANGE.min}
            max={STRENGTH_RANGE.max}
            step={0.05}
            onChange={setStrength}
            disabled={isRunning}
            format={(value) => `${Math.round(value * 100)}%`}
            description="Lower keeps more of your source image; higher follows the prompt."
          />

          <AspectRatioSelector
            value={aspectRatio}
            onChange={setAspectRatio}
            disabled={isRunning}
          />
          <SizeSelector
            value={baseSize}
            onChange={setBaseSize}
            aspectRatio={aspectRatio}
            maxResolution={maxResolution}
            disabled={isRunning}
          />
          <ImageCountSelector
            value={imageCount}
            onChange={setImageCount}
            max={maxImages}
            disabled={isRunning}
          />

          {supportsSeed ? (
            <SeedControl value={seed} onChange={setSeed} disabled={isRunning} />
          ) : null}

          <GenerationSettings
            steps={steps}
            guidance={guidance}
            onStepsChange={setSteps}
            onGuidanceChange={setGuidance}
            supportsSteps={supportsSteps}
            supportsGuidance={supportsGuidance}
            disabled={isRunning}
          />

          <GenerateButton
            cost={cost}
            loading={submitting || isRunning}
            disabled={!source || prompt.trim().length === 0}
            label="Transform"
            onClick={handleGenerate}
          />
        </>
      }
      output={
        <div className="space-y-4">
          {source?.previewUrl && !isRunning && outputs.length > 0 ? (
            <div>
              <h2 className="mb-2 text-xs font-medium text-fg-subtle">
                Source image
              </h2>
              <div className="overflow-hidden rounded-[--radius-md] border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={source.previewUrl}
                  alt="The source image you uploaded"
                  className="max-h-40 w-full object-contain bg-bg-muted"
                />
              </div>
            </div>
          ) : null}

          <ResultPanel
            generation={generation}
            outputs={outputs}
            error={error}
            isRunning={isRunning}
            expectedCount={imageCount}
            aspectRatio={`${dimensions.width} / ${dimensions.height}`}
            emptyTitle="No transforms yet"
            emptyDescription="Upload a source image and describe how you'd like it changed. The original is never modified."
          />
        </div>
      }
    />
  );
}
