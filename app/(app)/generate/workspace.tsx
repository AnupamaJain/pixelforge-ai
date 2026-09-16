"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { Select, Label } from "@/components/ui/input";
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
import { WorkspaceShell } from "@/components/generation/page-shell";
import { ResultPanel } from "@/components/generation/result-panel";
import { useGeneration } from "@/hooks/use-generation";
import { calculateCreditCost } from "@/config/credits";
import { GUIDANCE_RANGE, STEPS_RANGE, resolveDimensions } from "@/config/generation";
import { DEFAULT_STYLE_ID } from "@/config/styles";

export function GenerateWorkspace({
  maxImages,
  maxResolution,
  supportsSteps,
  supportsGuidance,
  supportsSeed,
  models,
}: {
  maxImages: number;
  maxResolution: number;
  supportsSteps: boolean;
  supportsGuidance: boolean;
  supportsSeed: boolean;
  models: { id: string; label: string }[];
}) {
  const searchParams = useSearchParams();
  const { submit, submitting, isRunning, generation, outputs, error } =
    useGeneration();

  const [prompt, setPrompt] = React.useState("");
  const [negativePrompt, setNegativePrompt] = React.useState("");
  const [styleId, setStyleId] = React.useState(DEFAULT_STYLE_ID);
  const [aspectRatio, setAspectRatio] = React.useState("1:1");
  const [baseSize, setBaseSize] = React.useState(Math.min(1024, maxResolution));
  const [imageCount, setImageCount] = React.useState(1);
  const [seed, setSeed] = React.useState<number | null>(null);
  const [steps, setSteps] = React.useState<number>(STEPS_RANGE.default);
  const [guidance, setGuidance] = React.useState<number>(GUIDANCE_RANGE.default);
  const [model, setModel] = React.useState(models[0]?.id ?? "");

  // Lets History and Gallery hand a prompt back to the workspace.
  React.useEffect(() => {
    const incoming = searchParams.get("prompt");
    if (incoming) setPrompt(incoming);
    const incomingStyle = searchParams.get("style");
    if (incomingStyle) setStyleId(incomingStyle);
    const incomingNegative = searchParams.get("negative");
    if (incomingNegative) setNegativePrompt(incomingNegative);
  }, [searchParams]);

  // Keep the chosen size within what the current ratio and plan allow.
  React.useEffect(() => {
    const { width, height } = resolveDimensions(aspectRatio, baseSize);
    if (Math.max(width, height) > maxResolution) {
      setBaseSize((current) => Math.max(512, current - 256));
    }
  }, [aspectRatio, baseSize, maxResolution]);

  const cost = calculateCreditCost({ type: "TEXT_TO_IMAGE", imageCount });
  const dimensions = resolveDimensions(aspectRatio, baseSize);

  function handleGenerate() {
    void submit("/api/generate", {
      prompt,
      negativePrompt: negativePrompt || undefined,
      styleId,
      aspectRatio,
      baseSize,
      imageCount,
      seed: seed ?? undefined,
      steps: supportsSteps ? steps : undefined,
      guidance: supportsGuidance ? guidance : undefined,
      model: model || undefined,
    });
  }

  return (
    <WorkspaceShell
      title="Generate"
      description="Describe an image, choose a style, and create up to four variations."
      controls={
        <>
          <PromptInput value={prompt} onChange={setPrompt} disabled={isRunning} />
          <NegativePrompt
            value={negativePrompt}
            onChange={setNegativePrompt}
            disabled={isRunning}
          />
          <StyleSelector value={styleId} onChange={setStyleId} disabled={isRunning} />

          {models.length > 1 ? (
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Select
                id="model"
                value={model}
                disabled={isRunning}
                onChange={(event) => setModel(event.target.value)}
              >
                {models.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

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
            disabled={prompt.trim().length === 0}
            onClick={handleGenerate}
          />
        </>
      }
      output={
        <ResultPanel
          generation={generation}
          outputs={outputs}
          error={error}
          isRunning={isRunning}
          expectedCount={imageCount}
          aspectRatio={`${dimensions.width} / ${dimensions.height}`}
          emptyTitle="Nothing generated yet"
          emptyDescription="Describe the image you want on the left, then select Generate. Your results will appear here."
        />
      }
    />
  );
}
