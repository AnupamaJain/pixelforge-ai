"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Download,
  Maximize2,
  Package,
  Play,
  RotateCcw,
  Rows3,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import { CREDIT_COSTS, calculateBatchCost, calculateCreditCost } from "@/config/credits";
import { EXPORT_PRESETS } from "@/config/marketplace";
import { SCENE_PRESETS, composeScenePrompt } from "@/config/scenes";
import { STYLE_SHOWCASE, isPlaceholderShowcase, sceneTexture } from "@/config/showcase";
import { CountUp, ScrambleText, SplitReveal } from "./kinetic-type";
import { WebglStage } from "./webgl-stage";

/**
 * Runtime showcase.
 *
 * Steps through each feature using the application's own configuration and
 * pricing functions, so every number on screen is the number the product would
 * actually charge or produce.
 *
 * It is a *simulation of the workflow*, not a live generation — there is no
 * model call here. The imagery is the same stock placeholder set the rest of
 * the page uses, and it is labelled as such. Overstating this would undercut
 * the one claim the product is sold on.
 */

type TabId = "studio" | "batch" | "upscale" | "export";

const TABS: { id: TabId; label: string; Icon: typeof Package }[] = [
  { id: "studio", label: "Product Studio", Icon: Package },
  { id: "batch", label: "Batch run", Icon: Rows3 },
  { id: "upscale", label: "Upscale", Icon: Maximize2 },
  { id: "export", label: "Export", Icon: Download },
];

/** Drives a stepped simulation and reports which step is active. */
function useSteps(count: number, msPerStep: number) {
  const [step, setStep] = React.useState(-1);
  const [running, setRunning] = React.useState(false);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = React.useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const run = React.useCallback(() => {
    clear();
    setRunning(true);
    setStep(0);
    for (let i = 1; i <= count; i += 1) {
      timers.current.push(
        setTimeout(() => {
          setStep(i);
          if (i === count) setRunning(false);
        }, i * msPerStep),
      );
    }
  }, [clear, count, msPerStep]);

  const reset = React.useCallback(() => {
    clear();
    setStep(-1);
    setRunning(false);
  }, [clear]);

  React.useEffect(() => clear, [clear]);

  return { step, running, run, reset };
}

function StepRow({
  index,
  current,
  label,
  detail,
}: {
  index: number;
  current: number;
  label: string;
  detail: string;
}) {
  const done = current > index;
  const active = current === index;

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-[--radius-sm] border px-3 py-2.5 transition-colors duration-300",
        done
          ? "border-success/30 bg-success/5"
          : active
            ? "border-accent bg-accent-soft"
            : "border-border",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors",
          done
            ? "bg-success text-white"
            : active
              ? "bg-accent text-accent-fg"
              : "bg-bg-muted text-fg-subtle",
        )}
      >
        {done ? "✓" : index + 1}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[13px] font-medium",
            done || active ? "text-fg" : "text-fg-subtle",
          )}
        >
          {label}
        </span>
        <span className="block text-xs text-fg-muted">{detail}</span>
      </span>
    </li>
  );
}

// --- Product Studio -------------------------------------------------------

function StudioSim() {
  const [sceneId, setSceneId] = React.useState("marble");
  const scene = SCENE_PRESETS.find((s) => s.id === sceneId) ?? SCENE_PRESETS[0];
  const { step, running, run, reset } = useSteps(5, 900);

  const cost = calculateCreditCost({ type: "PRODUCT_SCENE", imageCount: 1 });
  const composed = composeScenePrompt({
    sceneId,
    productDescription: "a brushed steel watch",
  });

  const steps = [
    { label: "Upload", detail: "Your photo, on any background" },
    { label: "Segment", detail: "The product is cut out with a real alpha channel" },
    { label: "Generate scene", detail: "Only the environment — never the product" },
    { label: "Composite", detail: "Your original pixels placed back on top" },
    { label: "Verify", detail: "Every opaque pixel compared byte for byte" },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <div>
        <WebglStage
          sceneSrc={sceneTexture(sceneId)}
          productSrc="/showcase/product-cutout.png"
          fallbackSrc={STYLE_SHOWCASE.product.src}
          className="aspect-[4/3] w-full"
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SCENE_PRESETS.slice(0, 6).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSceneId(option.id)}
              aria-pressed={sceneId === option.id}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                sceneId === option.id
                  ? "bg-accent text-accent-fg"
                  : "border border-border text-fg-muted hover:border-border-strong hover:text-fg",
              )}
            >
              {option.name}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-[--radius-sm] border border-border bg-bg-subtle p-3">
          <p className="text-[11px] font-medium text-fg-subtle">
            Scene prompt the engine would receive
          </p>
          <p className="mt-1.5 break-words font-mono text-[11px] leading-relaxed text-fg-muted">
            <ScrambleText text={composed.prompt.slice(0, 150)} playKey={sceneId} />
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <StepRow key={s.label} index={i} current={step} label={s.label} detail={s.detail} />
          ))}
        </ol>

        {step >= 5 ? (
          <div className="mt-3 rounded-[--radius-sm] border border-success/30 bg-success/5 p-3">
            <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
              <ShieldCheck aria-hidden="true" className="size-4 text-success" />
              Verified
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              <CountUp to={184320} /> pixels checked, <strong className="text-success">0</strong>{" "}
              changed.
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={run} loading={running} className="flex-1">
            {!running ? <Play aria-hidden="true" /> : null}
            {step >= 5 ? "Run again" : `Run — ${cost} credits`}
          </Button>
          {step >= 0 ? (
            <Button size="sm" variant="secondary" onClick={reset} aria-label="Reset">
              <RotateCcw aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// --- Batch ----------------------------------------------------------------

const BATCH_ROWS = [
  "Brushed steel watch",
  "Walnut cutting board",
  "Linen tote bag",
  "Ceramic pour-over",
  "Leather card holder",
  "Amber glass diffuser",
];

function BatchSim() {
  const { step, running, run, reset } = useSteps(BATCH_ROWS.length, 520);
  const cost = calculateBatchCost({
    type: "PRODUCT_SCENE",
    rows: BATCH_ROWS.length,
    imagesPerRow: 1,
  });
  const done = Math.max(0, step);
  const percent = Math.round((done / BATCH_ROWS.length) * 100);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <div className="rounded-[--radius-lg] border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium">Spring catalogue</p>
          <Badge variant={percent === 100 ? "success" : "accent"}>
            {done}/{BATCH_ROWS.length}
          </Badge>
        </div>

        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Batch progress"
        >
          <div
            className="h-full bg-accent transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="mt-4 space-y-1.5">
          {BATCH_ROWS.map((row, i) => {
            const rowDone = done > i;
            const rowActive = done === i && running;
            return (
              <li
                key={row}
                className={cn(
                  "flex items-center gap-2.5 rounded-[--radius-xs] px-2.5 py-2 text-[13px] transition-colors",
                  rowDone ? "bg-success/5" : rowActive ? "bg-accent-soft" : "bg-bg-subtle",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-bold",
                    rowDone
                      ? "bg-success text-white"
                      : rowActive
                        ? "bg-accent text-accent-fg"
                        : "bg-bg-muted text-fg-subtle",
                  )}
                >
                  {rowDone ? "✓" : i + 1}
                </span>
                <span className={rowDone ? "text-fg" : "text-fg-muted"}>{row}</span>
                <span className="ml-auto text-[11px] tabular-nums text-fg-subtle">
                  {rowDone ? `${CREDIT_COSTS.PRODUCT_SCENE} cr` : rowActive ? "…" : "queued"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col">
        <div className="rounded-[--radius-md] border border-border bg-bg-subtle p-4">
          <p className="text-xs text-fg-subtle">Total for this run</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            <CountUp to={cost} /> <span className="text-sm font-normal text-fg-subtle">credits</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-fg-muted">
            Each row is billed and refunded on its own. If row 4 fails, only row
            4 is refunded — the rest of the run is unaffected.
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={run} loading={running} className="flex-1">
            {!running ? <Play aria-hidden="true" /> : null}
            {percent === 100 ? "Run again" : "Run batch"}
          </Button>
          {step >= 0 ? (
            <Button size="sm" variant="secondary" onClick={reset} aria-label="Reset">
              <RotateCcw aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// --- Upscale --------------------------------------------------------------

function UpscaleSim() {
  const [factor, setFactor] = React.useState<2 | 4>(4);
  const [reveal, setReveal] = React.useState(52);
  const cost = calculateCreditCost({ type: "UPSCALE", upscaleFactor: factor });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <div
        className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-[--radius-lg] border border-border"
        onPointerMove={(event) => {
          if (event.buttons !== 1) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setReveal(Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)));
        }}
      >
        <Image
          src="/showcase/upscale-after.webp"
          alt="After upscaling"
          fill
          sizes="(max-width: 1024px) 100vw, 40rem"
          className="object-cover"
        />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}>
          <Image
            src="/showcase/upscale-before.webp"
            alt="Before upscaling"
            fill
            sizes="(max-width: 1024px) 100vw, 40rem"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${reveal}%` }}>
          <input
            type="range"
            min={0}
            max={100}
            value={reveal}
            onChange={(e) => setReveal(Number(e.target.value))}
            aria-label="Reveal upscaled result"
            className="absolute left-1/2 top-1/2 h-9 w-40 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize opacity-0"
          />
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-black/45 text-[11px] font-bold text-white backdrop-blur"
          >
            ⟺
          </span>
        </div>
        <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white">
          Original
        </span>
        <span className="absolute bottom-3 right-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-fg">
          {factor}× upscaled
        </span>
      </div>

      <div className="flex flex-col">
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-medium text-fg">Scale</legend>
          <div className="grid grid-cols-2 gap-2">
            {([2, 4] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFactor(option)}
                aria-pressed={factor === option}
                className={cn(
                  "rounded-[--radius-sm] border px-3 py-3 transition-colors",
                  factor === option ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong",
                )}
              >
                <span className={cn("block text-lg font-semibold tabular-nums", factor === option ? "text-accent" : "text-fg")}>
                  {option}×
                </span>
                <span className="mt-0.5 block text-[11px] text-fg-subtle">
                  {calculateCreditCost({ type: "UPSCALE", upscaleFactor: option })} credits
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 rounded-[--radius-md] border border-border bg-bg-subtle p-4">
          <p className="text-xs text-fg-subtle">This upscale</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            <ScrambleText text={String(cost)} playKey={factor} />{" "}
            <span className="text-sm font-normal text-fg-subtle">credits</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-fg-muted">
            Real super-resolution, not a resample. Drag the divider to compare.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Export ---------------------------------------------------------------

function ExportSim() {
  const [presetId, setPresetId] = React.useState("amazon-main");
  const preset = EXPORT_PRESETS.find((p) => p.id === presetId)!;
  const ratio = preset.width / preset.height;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <div className="flex min-h-[20rem] items-center justify-center rounded-[--radius-lg] border border-border bg-bg-subtle p-6">
        <div
          className="relative overflow-hidden rounded-[--radius-sm] border-2 border-accent shadow-lg transition-all duration-500"
          style={{
            width: ratio >= 1 ? "min(100%, 22rem)" : `calc(min(100%, 22rem) * ${ratio})`,
            aspectRatio: `${preset.width} / ${preset.height}`,
            background: preset.background,
          }}
        >
          <Image
            src="/showcase/product-cutout.png"
            alt="Product rendered to the selected export preset"
            fill
            sizes="22rem"
            className="object-contain p-[8%]"
          />
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] tabular-nums text-white">
            {preset.width}×{preset.height}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <p className="text-[13px] font-medium text-fg">Export preset</p>
        <div className="mt-2 grid gap-1.5">
          {EXPORT_PRESETS.slice(0, 6).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPresetId(option.id)}
              aria-pressed={presetId === option.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-[--radius-sm] border px-3 py-2 text-left transition-colors",
                presetId === option.id ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong",
              )}
            >
              <span className={cn("truncate text-[13px]", presetId === option.id ? "font-medium text-accent" : "text-fg-muted")}>
                {option.name}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-fg-subtle">
                {option.width}×{option.height}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-3 rounded-[--radius-sm] bg-bg-subtle p-3 text-xs leading-relaxed text-fg-muted">
          {preset.notes}
        </p>
      </div>
    </div>
  );
}

// --- Section --------------------------------------------------------------

export function RuntimeShowcase() {
  const [tab, setTab] = React.useState<TabId>("studio");

  return (
    <section
      id="see-it-work"
      aria-labelledby="runtime-heading"
      className="border-b border-border py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-medium text-accent">See it work</span>
          <SplitReveal
            as="h2"
            id="runtime-heading"
            text="Every feature, running right here"
            className="mt-2 block text-3xl font-bold tracking-tight sm:text-4xl"
          />
          <p className="mt-4 leading-relaxed text-fg-muted">
            Click through the workspace. Every credit cost, scene prompt and
            export dimension below is read from the same configuration the
            product runs on — change a tab and watch the real numbers change.
          </p>
        </div>

        {/* Clickable frames */}
        <div
          role="tablist"
          aria-label="Feature simulations"
          className="mt-10 flex flex-wrap justify-center gap-2"
          onKeyDown={(event) => {
            const i = TABS.findIndex((t) => t.id === tab);
            if (event.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length].id);
            if (event.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
          }}
        >
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium transition-all",
                tab === id
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "border border-border text-fg-muted hover:border-border-strong hover:text-fg",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="mt-8 animate-fade rounded-[--radius-xl] border border-border bg-surface p-4 sm:p-6"
        >
          {tab === "studio" ? <StudioSim /> : null}
          {tab === "batch" ? <BatchSim /> : null}
          {tab === "upscale" ? <UpscaleSim /> : null}
          {tab === "export" ? <ExportSim /> : null}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          {isPlaceholderShowcase() ? (
            <p className="text-[11px] text-fg-subtle">
              A simulation of the workflow using the product&apos;s real
              configuration. The imagery is sample stock, not model output.
            </p>
          ) : null}
          <Link href="/signup">
            <Button size="lg">
              <Check aria-hidden="true" />
              Run it for real — free
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
