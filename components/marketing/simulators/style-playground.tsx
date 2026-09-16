"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { applyStyle, getStyle, STYLE_PRESETS } from "@/config/styles";
import { ASPECT_RATIOS, resolveDimensions } from "@/config/generation";
import { STYLE_SHOWCASE } from "@/config/showcase";

/**
 * Interactive style playground.
 *
 * This runs the application's real `applyStyle()` against the visitor's input —
 * the prompt shown is exactly what the engine would receive. Nothing here is
 * mocked, which is the point: it lets someone inspect how the product works
 * before creating an account.
 */

const EXAMPLE_PROMPTS = [
  "A weathered brass astrolabe on linen, morning light",
  "A lone cabin under the northern lights",
  "A ceramic coffee cup on a concrete table",
  "A red fox stepping through tall autumn grass",
];

const SELECTABLE_STYLES = STYLE_PRESETS.filter((style) => style.id !== "none");

export function StylePlayground() {
  const [prompt, setPrompt] = React.useState(EXAMPLE_PROMPTS[0]);
  const [styleId, setStyleId] = React.useState("cinematic");
  const [aspectRatio, setAspectRatio] = React.useState("1:1");
  const [copied, setCopied] = React.useState(false);

  const style = getStyle(styleId);
  // The real transformation, from config/styles.ts.
  const composed = applyStyle(styleId, prompt || "your prompt", null);
  const dimensions = resolveDimensions(aspectRatio, 1024);
  const preview = STYLE_SHOWCASE[styleId];

  async function copyComposed() {
    await navigator.clipboard.writeText(composed.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="overflow-hidden rounded-[--radius-lg] border border-border bg-surface">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        {/* Controls + composed output */}
        <div className="border-b border-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="space-y-1.5">
            <label
              htmlFor="playground-prompt"
              className="text-[13px] font-medium text-fg"
            >
              Your prompt
            </label>
            <Textarea
              id="playground-prompt"
              value={prompt}
              maxLength={300}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the image you want to create..."
              className="min-h-[4.5rem]"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] text-fg-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {example.split(",")[0]}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="mt-5 space-y-2">
            <legend className="text-[13px] font-medium text-fg">Style</legend>
            <div className="flex flex-wrap gap-1.5">
              {SELECTABLE_STYLES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStyleId(option.id)}
                  aria-pressed={styleId === option.id}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                    styleId === option.id
                      ? "bg-accent text-accent-fg"
                      : "border border-border text-fg-muted hover:border-border-strong hover:text-fg",
                  )}
                >
                  {option.name}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5 space-y-2">
            <legend className="text-[13px] font-medium text-fg">Aspect ratio</legend>
            <div className="flex flex-wrap gap-1.5">
              {ASPECT_RATIOS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAspectRatio(option.id)}
                  aria-pressed={aspectRatio === option.id}
                  className={cn(
                    "rounded-[--radius-xs] border px-2.5 py-1 text-[12px] tabular-nums transition-colors",
                    aspectRatio === option.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-fg-muted hover:border-border-strong",
                  )}
                >
                  {option.id}
                </button>
              ))}
            </div>
          </fieldset>

          {/* The genuine engine input */}
          <div className="mt-6 rounded-[--radius-md] border border-border bg-bg-subtle p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-medium text-fg-subtle">
                What the engine actually receives
              </h3>
              <Button variant="ghost" size="sm" onClick={copyComposed}>
                {copied ? (
                  <Check aria-hidden="true" className="text-success" />
                ) : (
                  <Copy aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <p className="mt-2.5 break-words font-mono text-[12px] leading-relaxed text-fg">
              {composed.prompt}
            </p>

            <div className="mt-3 border-t border-border pt-3">
              <h4 className="text-xs font-medium text-fg-subtle">Negative prompt</h4>
              <p className="mt-1 break-words font-mono text-[12px] leading-relaxed text-fg-muted">
                {composed.negativePrompt || "—"}
              </p>
            </div>

            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-[11px]">
              <div className="flex gap-1.5">
                <dt className="text-fg-subtle">Output</dt>
                <dd className="tabular-nums text-fg">
                  {dimensions.width}×{dimensions.height}
                </dd>
              </div>
              {style.defaults?.steps ? (
                <div className="flex gap-1.5">
                  <dt className="text-fg-subtle">Steps</dt>
                  <dd className="tabular-nums text-fg">{style.defaults.steps}</dd>
                </div>
              ) : null}
              {style.defaults?.guidance ? (
                <div className="flex gap-1.5">
                  <dt className="text-fg-subtle">Guidance</dt>
                  <dd className="tabular-nums text-fg">{style.defaults.guidance}</dd>
                </div>
              ) : null}
              <div className="flex gap-1.5">
                <dt className="text-fg-subtle">Cost</dt>
                <dd className="text-fg">1 credit</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Style preview */}
        <div className="flex flex-col bg-bg-subtle p-5 sm:p-6">
          <h3 className="text-xs font-medium text-fg-subtle">{style.name}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
            {style.description}
          </p>

          {preview ? (
            <div className="relative mt-4 aspect-square overflow-hidden rounded-[--radius-md] border border-border">
              <Image
                src={preview.src}
                alt={preview.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 20rem"
                className="object-cover"
              />
            </div>
          ) : null}

          <Link href="/signup" className="mt-4 block">
            <Button className="w-full">
              Try it for real
              <ArrowRight aria-hidden="true" />
            </Button>
          </Link>
          <p className="mt-2 text-center text-[11px] text-fg-subtle">
            No card required
          </p>
        </div>
      </div>
    </div>
  );
}
