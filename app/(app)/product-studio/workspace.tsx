"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  AspectRatioSelector,
  GenerationSettings,
  ImageCountSelector,
  SizeSelector,
} from "@/components/generation/controls";
import { GenerateButton } from "@/components/generation/generate-button";
import {
  ImageUploader,
  type UploadedImage,
} from "@/components/generation/image-uploader";
import { WorkspaceShell } from "@/components/generation/page-shell";
import { ResultPanel } from "@/components/generation/result-panel";
import { useGeneration } from "@/hooks/use-generation";
import { calculateCreditCost } from "@/config/credits";
import { GUIDANCE_RANGE, STEPS_RANGE, resolveDimensions } from "@/config/generation";
import { SCENE_CATEGORIES, SCENE_PRESETS, getScene } from "@/config/scenes";
import { cn } from "@/lib/utils";

interface BrandKitOption {
  id: string;
  name: string;
  is_default: boolean;
}

export function ProductStudio({
  maxImages,
  maxResolution,
  supportsSteps,
  supportsGuidance,
  engineSupportsScenes,
  brandKits,
  canUseBrandKits,
  maxUploadMb,
}: {
  maxImages: number;
  maxResolution: number;
  supportsSteps: boolean;
  supportsGuidance: boolean;
  engineSupportsScenes: boolean;
  brandKits: BrandKitOption[];
  canUseBrandKits: boolean;
  maxUploadMb: number;
}) {
  const { submit, submitting, isRunning, generation, outputs, error } =
    useGeneration();

  const [product, setProduct] = React.useState<UploadedImage | null>(null);
  const [description, setDescription] = React.useState("");
  const [sceneId, setSceneId] = React.useState("studio-white");
  const [category, setCategory] = React.useState<string>("studio");
  const [brandKitId, setBrandKitId] = React.useState<string>(
    brandKits.find((kit) => kit.is_default)?.id ?? "",
  );
  const [aspectRatio, setAspectRatio] = React.useState("1:1");
  const [baseSize, setBaseSize] = React.useState(Math.min(1024, maxResolution));
  const [imageCount, setImageCount] = React.useState(1);
  const [scale, setScale] = React.useState<number>(0.72);
  const [offsetY, setOffsetY] = React.useState<number>(0.54);
  const [shadow, setShadow] = React.useState(true);
  const [steps, setSteps] = React.useState<number>(STEPS_RANGE.default);
  const [guidance, setGuidance] = React.useState<number>(GUIDANCE_RANGE.default);

  const scene = getScene(sceneId);
  const cost = calculateCreditCost({ type: "PRODUCT_SCENE", imageCount });
  const dimensions = resolveDimensions(aspectRatio, baseSize);
  const visibleScenes = SCENE_PRESETS.filter((s) => s.category === category);

  function handleGenerate() {
    if (!product) return;
    void submit("/api/product-scene", {
      sourcePath: product.path,
      sceneId,
      productDescription: description || undefined,
      brandKitId: brandKitId || undefined,
      aspectRatio,
      baseSize,
      imageCount,
      placement: { scale, offsetX: 0.5, offsetY },
      shadow,
      steps: supportsSteps ? steps : undefined,
      guidance: supportsGuidance ? guidance : undefined,
    });
  }

  if (!engineSupportsScenes) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Product Studio is unavailable</h1>
        <p className="mt-2 text-sm text-fg-muted">
          This server&apos;s image engine doesn&apos;t support background removal.
          Set <code className="rounded bg-bg-muted px-1">IMAGE_PROVIDER=hosted</code>{" "}
          to enable it.
        </p>
      </div>
    );
  }

  return (
    <WorkspaceShell
      title="Product Studio"
      description="Your product, pixel-identical, in any scene. No photoshoot required."
      controls={
        <>
          <ImageUploader
            value={product}
            onChange={setProduct}
            disabled={isRunning}
            maxSizeMb={maxUploadMb}
          />

          <div className="space-y-1.5">
            <Label htmlFor="product-description" hint="Optional">
              What is it?
            </Label>
            <Input
              id="product-description"
              value={description}
              maxLength={300}
              disabled={isRunning}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="a matte black ceramic mug"
            />
            <p className="text-xs text-fg-subtle">
              Helps the scene match your product. It never redraws it.
            </p>
          </div>

          <fieldset disabled={isRunning} className="space-y-2">
            <legend className="text-[13px] font-medium text-fg">Scene</legend>
            <div className="flex flex-wrap gap-1.5">
              {SCENE_CATEGORIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCategory(option.id)}
                  aria-pressed={category === option.id}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    category === option.id
                      ? "bg-accent text-accent-fg"
                      : "border border-border text-fg-muted hover:border-border-strong",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {visibleScenes.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSceneId(option.id)}
                  aria-pressed={sceneId === option.id}
                  className={cn(
                    "rounded-[--radius-sm] border px-2.5 py-2 text-left transition-colors",
                    sceneId === option.id
                      ? "border-accent bg-accent-soft"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <span
                    className={cn(
                      "block text-[12px] font-medium",
                      sceneId === option.id ? "text-accent" : "text-fg",
                    )}
                  >
                    {option.name}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-fg-subtle">{scene.description}</p>
          </fieldset>

          {canUseBrandKits && brandKits.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="brand-kit" hint="Optional">
                Brand kit
              </Label>
              <Select
                id="brand-kit"
                value={brandKitId}
                disabled={isRunning}
                onChange={(event) => setBrandKitId(event.target.value)}
              >
                <option value="">No brand kit</option>
                {brandKits.map((kit) => (
                  <option key={kit.id} value={kit.id}>
                    {kit.name}
                    {kit.is_default ? " (default)" : ""}
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

          <details className="group rounded-[--radius-sm] border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
              Placement
              <span
                aria-hidden="true"
                className="grid size-5 place-items-center rounded-full border border-border text-fg-subtle transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="space-y-4 border-t border-border p-3">
              <Slider
                id="placement-scale"
                label="Product size"
                value={scale}
                min={0.2}
                max={0.95}
                step={0.01}
                onChange={setScale}
                disabled={isRunning}
                format={(v) => `${Math.round(v * 100)}% of frame`}
              />
              <Slider
                id="placement-offset"
                label="Vertical position"
                value={offsetY}
                min={0.2}
                max={0.8}
                step={0.01}
                onChange={setOffsetY}
                disabled={isRunning}
                format={(v) => (v < 0.45 ? "Higher" : v > 0.6 ? "Lower" : "Centred")}
              />
              <label className="flex items-center gap-2.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={shadow}
                  disabled={isRunning}
                  onChange={(event) => setShadow(event.target.checked)}
                  className="size-4 rounded border-border accent-[hsl(var(--accent))]"
                />
                Add a contact shadow
              </label>
            </div>
          </details>

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
            disabled={!product}
            label="Create scene"
            onClick={handleGenerate}
          />
        </>
      }
      output={
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-[--radius-md] border border-success/30 bg-success/5 p-3.5">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-success"
            />
            <div>
              <p className="text-[13px] font-medium text-fg">
                Your product is never redrawn
              </p>
              <p className="mt-0.5 text-xs text-fg-muted">
                Only the scene is generated. Your original product pixels are
                composited back on top and verified afterwards — if a single one
                changed, the generation fails and you aren&apos;t charged.
              </p>
            </div>
          </div>

          {product?.previewUrl && outputs.length > 0 && !isRunning ? (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-xs font-medium text-fg-subtle">Your original</h2>
                <Badge variant="outline">unchanged</Badge>
              </div>
              <div className="overflow-hidden rounded-[--radius-md] border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.previewUrl}
                  alt="The product photo you uploaded"
                  className="max-h-36 w-full bg-bg-muted object-contain"
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
            emptyTitle="No scenes yet"
            emptyDescription="Upload a product photo, pick a scene, and create. The product stays exactly as you shot it."
          />
        </div>
      }
    />
  );
}
