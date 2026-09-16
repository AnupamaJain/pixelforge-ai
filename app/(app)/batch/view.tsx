"use client";

import * as React from "react";
import Link from "next/link";
import { Rows3, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useCredits } from "@/components/credits-provider";
import { AspectRatioSelector, SizeSelector } from "@/components/generation/controls";
import { calculateBatchCost } from "@/config/credits";
import { SCENE_PRESETS } from "@/config/scenes";
import { STYLE_PRESETS, DEFAULT_STYLE_ID } from "@/config/styles";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import { parseDelimited, type ParsedTable } from "@/lib/csv";

interface BrandKitOption {
  id: string;
  name: string;
  is_default: boolean;
}

interface BatchRun {
  id: string;
  name: string;
  type: string;
  status: string;
  total_rows: number;
  completed_rows: number;
  failed_rows: number;
  credit_cost: number;
  created_at: string;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger"> = {
  COMPLETED: "success",
  PROCESSING: "warning",
  QUEUED: "warning",
  FAILED: "danger",
  CANCELLED: "default",
};

const SAMPLE = `product,scene_note
matte black ceramic mug,morning kitchen
walnut cutting board,rustic table
linen tote bag,sunlit shelf`;

export function BatchView({
  maxRows,
  maxImagesPerRow,
  maxResolution,
  planName,
  brandKits,
  canUseProductScenes,
}: {
  maxRows: number;
  maxImagesPerRow: number;
  maxResolution: number;
  planName: string;
  brandKits: BrandKitOption[];
  canUseProductScenes: boolean;
}) {
  const { toast } = useToast();
  const { credits, setCredits } = useCredits();

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"TEXT_TO_IMAGE" | "PRODUCT_SCENE">(
    "TEXT_TO_IMAGE",
  );
  const [template, setTemplate] = React.useState("{product} on a clean surface");
  const [styleId, setStyleId] = React.useState(DEFAULT_STYLE_ID);
  const [sceneId, setSceneId] = React.useState("studio-white");
  const [brandKitId, setBrandKitId] = React.useState(
    brandKits.find((k) => k.is_default)?.id ?? "",
  );
  const [aspectRatio, setAspectRatio] = React.useState("1:1");
  const [baseSize, setBaseSize] = React.useState(Math.min(1024, maxResolution));
  const [imagesPerRow, setImagesPerRow] = React.useState(1);
  const [raw, setRaw] = React.useState(SAMPLE);
  const [submitting, setSubmitting] = React.useState(false);
  const [runs, setRuns] = React.useState<BatchRun[]>([]);

  const parsed: ParsedTable = React.useMemo(() => parseDelimited(raw), [raw]);

  const cost = calculateBatchCost({
    type,
    rows: parsed.rows.length,
    imagesPerRow,
  });

  const loadRuns = React.useCallback(async () => {
    try {
      const response = await fetch("/api/batch", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { items: BatchRun[] };
      setRuns(data.items);
    } catch {
      // A failed refresh just leaves the list as it was.
    }
  }, []);

  React.useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  // Poll while anything is still running.
  React.useEffect(() => {
    const active = runs.some(
      (run) => run.status === "PROCESSING" || run.status === "QUEUED",
    );
    if (!active) return;
    const timer = setInterval(() => void loadRuns(), 3000);
    return () => clearInterval(timer);
  }, [runs, loadRuns]);

  const missingColumns = React.useMemo(() => {
    const referenced = [...template.matchAll(/\{([a-zA-Z0-9_ -]+)\}/g)].map((m) =>
      m[1].trim().toLowerCase(),
    );
    const available = parsed.columns.map((c) => c.trim().toLowerCase());
    return [...new Set(referenced.filter((c) => !available.includes(c)))];
  }, [template, parsed.columns]);

  async function run() {
    if (!name.trim()) {
      toast("Name this batch run.", "error");
      return;
    }
    if (parsed.rows.length === 0) {
      toast("Add at least one row of data.", "error");
      return;
    }
    if (missingColumns.length > 0) {
      toast(
        `Your template uses ${missingColumns.map((c) => `{${c}}`).join(", ")}, which isn't in your data.`,
        "error",
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          template,
          styleId: type === "TEXT_TO_IMAGE" ? styleId : undefined,
          sceneId: type === "PRODUCT_SCENE" ? sceneId : undefined,
          brandKitId: brandKitId || undefined,
          aspectRatio,
          baseSize,
          imagesPerRow,
          rows: parsed.rows,
        }),
      });

      const data = (await response.json()) as {
        creditsRemaining?: number;
        totalRows?: number;
        error?: string;
      };

      if (!response.ok) throw new Error(data.error ?? "Could not start that batch.");

      if (typeof data.creditsRemaining === "number") setCredits(data.creditsRemaining);
      toast(`Batch started — ${data.totalRows} rows queued.`, "success");
      void loadRuns();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Something went wrong.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Batch</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Paste a spreadsheet, write one template, and generate the whole
          catalogue in a single run.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="batch-name">Run name</Label>
                <Input
                  id="batch-name"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Spring catalogue — March"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="batch-data" hint="CSV or tab-separated">
                  Your data
                </Label>
                <Textarea
                  id="batch-data"
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  className="min-h-[9rem] font-mono text-[12px]"
                  placeholder="product,colour&#10;ceramic mug,black"
                />
                <p className="text-xs text-fg-subtle">
                  First row is the header. Paste straight from a spreadsheet.
                </p>
              </div>

              {parsed.columns.length > 0 ? (
                <div className="rounded-[--radius-sm] border border-border bg-bg-subtle p-3">
                  <p className="text-xs font-medium text-fg-subtle">
                    Detected {parsed.columns.length} column
                    {parsed.columns.length === 1 ? "" : "s"},{" "}
                    {formatNumber(parsed.rows.length)} row
                    {parsed.rows.length === 1 ? "" : "s"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {parsed.columns.map((column) => (
                      <button
                        key={column}
                        type="button"
                        onClick={() => setTemplate((t) => `${t} {${column}}`)}
                        className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-fg-muted transition-colors hover:border-accent hover:text-accent"
                        title={`Insert {${column}} into the template`}
                      >
                        {`{${column}}`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="batch-template">Prompt template</Label>
                <Textarea
                  id="batch-template"
                  value={template}
                  maxLength={2000}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="min-h-[4.5rem]"
                  placeholder="{product} on a clean marble surface"
                />
                {missingColumns.length > 0 ? (
                  <p role="alert" className="text-xs text-danger">
                    {missingColumns.map((c) => `{${c}}`).join(", ")} isn&apos;t in
                    your data.
                  </p>
                ) : parsed.rows[0] ? (
                  <p className="text-xs text-fg-subtle">
                    Row 1 becomes:{" "}
                    <span className="text-fg">
                      {template.replace(/\{([a-zA-Z0-9_ -]+)\}/g, (m, k: string) => {
                        const key = k.trim().toLowerCase();
                        const entry = Object.entries(parsed.rows[0]).find(
                          ([col]) => col.trim().toLowerCase() === key,
                        );
                        return entry ? entry[1] : m;
                      })}
                    </span>
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 text-[13px] font-semibold">Recent runs</h2>
              {runs.length === 0 ? (
                <EmptyState
                  icon={<Rows3 aria-hidden="true" className="size-5" />}
                  title="No batch runs yet"
                  description="Your runs will appear here with live progress."
                />
              ) : (
                <ul className="space-y-2">
                  {runs.map((batchRun) => {
                    const settled = batchRun.completed_rows + batchRun.failed_rows;
                    const percent =
                      batchRun.total_rows > 0
                        ? Math.round((settled / batchRun.total_rows) * 100)
                        : 0;
                    return (
                      <li
                        key={batchRun.id}
                        className="rounded-[--radius-sm] border border-border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium">
                            {batchRun.name}
                          </span>
                          <Badge variant={STATUS_VARIANT[batchRun.status] ?? "default"}>
                            {batchRun.status.toLowerCase()}
                          </Badge>
                          <span className="ml-auto text-xs text-fg-subtle">
                            {formatRelativeTime(batchRun.created_at)}
                          </span>
                        </div>
                        <div
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-muted"
                          role="progressbar"
                          aria-valuenow={percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${batchRun.name} progress`}
                        >
                          <div
                            className="h-full bg-accent transition-[width] duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-fg-subtle">
                          {batchRun.completed_rows} done
                          {batchRun.failed_rows > 0
                            ? `, ${batchRun.failed_rows} failed`
                            : ""}{" "}
                          of {batchRun.total_rows} ·{" "}
                          <Link href="/gallery" className="text-accent hover:underline">
                            View in gallery
                          </Link>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 rounded-[--radius-lg] border border-border bg-surface p-4 sm:p-5 lg:sticky lg:top-20">
          <div className="space-y-1.5">
            <Label htmlFor="batch-type">Generate</Label>
            <Select
              id="batch-type"
              value={type}
              onChange={(e) =>
                setType(e.target.value as "TEXT_TO_IMAGE" | "PRODUCT_SCENE")
              }
            >
              <option value="TEXT_TO_IMAGE">Text to image</option>
              {canUseProductScenes ? (
                <option value="PRODUCT_SCENE">Product scenes</option>
              ) : null}
            </Select>
          </div>

          {type === "TEXT_TO_IMAGE" ? (
            <div className="space-y-1.5">
              <Label htmlFor="batch-style">Style</Label>
              <Select
                id="batch-style"
                value={styleId}
                onChange={(e) => setStyleId(e.target.value)}
              >
                {STYLE_PRESETS.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="batch-scene">Scene</Label>
              <Select
                id="batch-scene"
                value={sceneId}
                onChange={(e) => setSceneId(e.target.value)}
              >
                {SCENE_PRESETS.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {brandKits.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="batch-kit" hint="Optional">
                Brand kit
              </Label>
              <Select
                id="batch-kit"
                value={brandKitId}
                onChange={(e) => setBrandKitId(e.target.value)}
              >
                <option value="">No brand kit</option>
                {brandKits.map((kit) => (
                  <option key={kit.id} value={kit.id}>
                    {kit.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
          <SizeSelector
            value={baseSize}
            onChange={setBaseSize}
            aspectRatio={aspectRatio}
            maxResolution={maxResolution}
          />

          <div className="space-y-1.5">
            <Label htmlFor="batch-per-row">Images per row</Label>
            <Select
              id="batch-per-row"
              value={imagesPerRow}
              onChange={(e) => setImagesPerRow(Number(e.target.value))}
            >
              {Array.from({ length: maxImagesPerRow }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>

          <div className="rounded-[--radius-sm] bg-bg-subtle p-3 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-fg-muted">
                {formatNumber(parsed.rows.length)} rows
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatNumber(cost)}
                <span className="ml-1 text-xs font-normal text-fg-subtle">
                  credits
                </span>
              </span>
            </div>
            {parsed.rows.length > maxRows ? (
              <p className="mt-2 text-xs text-danger">
                Your {planName} plan allows {formatNumber(maxRows)} rows per batch.
              </p>
            ) : cost > credits ? (
              <p className="mt-2 text-xs text-danger">
                You have {formatNumber(credits)} credits — {formatNumber(cost - credits)}{" "}
                short.
              </p>
            ) : null}
          </div>

          <Button
            className="w-full"
            size="lg"
            loading={submitting}
            disabled={
              parsed.rows.length === 0 ||
              parsed.rows.length > maxRows ||
              cost > credits ||
              missingColumns.length > 0
            }
            onClick={run}
          >
            <Play aria-hidden="true" />
            Run batch
          </Button>
        </div>
      </div>
    </div>
  );
}
