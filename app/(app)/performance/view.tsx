"use client";

import * as React from "react";
import { TrendingUp, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Label, Textarea } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { parseDelimited } from "@/lib/csv";
import { formatNumber } from "@/lib/utils";

interface Creative {
  outputId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spendCents: number;
  revenueCents: number;
  ctr: number;
  cvr: number;
  roas: number;
}

const SAMPLE = `output_id,campaign,impressions,clicks,conversions,spend,revenue
00000000-0000-0000-0000-000000000000,spring-launch,12500,430,28,210.50,1840.00`;

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en", { maximumFractionDigits: 0 })}`;
}

export function PerformanceView() {
  const { toast } = useToast();
  const [creatives, setCreatives] = React.useState<Creative[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [importOpen, setImportOpen] = React.useState(false);
  const [raw, setRaw] = React.useState(SAMPLE);
  const [importing, setImporting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/performance", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load performance data.");
      const data = (await response.json()) as { creatives: Creative[] };
      setCreatives(data.creatives);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function runImport() {
    const parsed = parseDelimited(raw);
    if (parsed.rows.length === 0) {
      toast("Add at least one row of data.", "error");
      return;
    }

    // Map loose column names onto the API's shape so a real ad-platform export
    // can be pasted with minimal editing.
    const pick = (row: Record<string, string>, ...names: string[]) => {
      for (const name of names) {
        for (const [key, value] of Object.entries(row)) {
          if (key.trim().toLowerCase() === name) return value;
        }
      }
      return "";
    };

    const entries = parsed.rows
      .map((row) => {
        const outputId = pick(row, "output_id", "outputid", "image_id");
        if (!outputId) return null;

        const toCents = (value: string) =>
          Math.round((Number.parseFloat(value || "0") || 0) * 100);
        const toInt = (value: string) =>
          Math.max(0, Math.round(Number.parseFloat(value || "0") || 0));

        return {
          outputId,
          source: pick(row, "source", "platform") || "manual",
          campaign: pick(row, "campaign", "campaign_name") || undefined,
          impressions: toInt(pick(row, "impressions", "impr")),
          clicks: toInt(pick(row, "clicks")),
          conversions: toInt(pick(row, "conversions", "purchases", "orders")),
          spendCents: toCents(pick(row, "spend", "cost", "amount_spent")),
          revenueCents: toCents(pick(row, "revenue", "sales", "conversion_value")),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (entries.length === 0) {
      toast("No rows had an output_id column.", "error");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = (await response.json()) as {
        imported?: number;
        skipped?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Import failed.");

      toast(
        `Imported ${data.imported} row${data.imported === 1 ? "" : "s"}${
          data.skipped ? `, skipped ${data.skipped} not belonging to you` : ""
        }.`,
        "success",
      );
      setImportOpen(false);
      void load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Import failed.", "error");
    } finally {
      setImporting(false);
    }
  }

  const totals = creatives.reduce(
    (acc, c) => ({
      spend: acc.spend + c.spendCents,
      revenue: acc.revenue + c.revenueCents,
      conversions: acc.conversions + c.conversions,
    }),
    { spend: 0, revenue: 0, conversions: 0 },
  );

  const blendedRoas = totals.spend > 0 ? totals.revenue / totals.spend : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Performance
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Which creatives actually earned their spend — so the next batch
            isn&apos;t a guess.
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <Upload aria-hidden="true" />
          Import data
        </Button>
      </div>

      <div className="mb-6 rounded-[--radius-md] border border-border bg-bg-subtle p-4 text-sm text-fg-muted">
        <strong className="text-fg">How this works today:</strong> export your
        campaign report from Meta, Google Ads or Shopify, add an{" "}
        <code className="rounded bg-bg-muted px-1 text-xs">output_id</code>{" "}
        column identifying which image each row refers to, and paste it in. A
        direct ad-platform connector is not built yet — it needs your ad account
        credentials and OAuth review.
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : creatives.length === 0 ? (
        <EmptyState
          icon={<TrendingUp aria-hidden="true" className="size-5" />}
          title="No performance data yet"
          description="Import a campaign export to see which creatives are carrying your spend."
          action={<Button onClick={() => setImportOpen(true)}>Import data</Button>}
        />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-fg-subtle">Total spend</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {money(totals.spend)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-fg-subtle">Total revenue</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {money(totals.revenue)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-fg-subtle">Blended ROAS</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {blendedRoas.toFixed(2)}×
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-[--radius-md] border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Creative performance, best ROAS first
              </caption>
              <thead className="bg-bg-subtle text-left text-xs text-fg-subtle">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Creative</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Impr.</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">CTR</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Conv.</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Spend</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {creatives.map((creative) => (
                  <tr key={creative.outputId}>
                    <td className="px-4 py-2.5 font-mono text-xs text-fg-muted">
                      {creative.outputId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatNumber(creative.impressions)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {(creative.ctr * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatNumber(creative.conversions)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {money(creative.spendCents)}
                    </td>
                    <td
                      className={
                        creative.roas >= 1
                          ? "px-4 py-2.5 text-right font-medium tabular-nums text-success"
                          : "px-4 py-2.5 text-right tabular-nums text-fg-muted"
                      }
                    >
                      {creative.roas.toFixed(2)}×
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import campaign data"
        description="Paste a CSV export. An output_id column is required; everything else is optional."
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="perf-data" hint="CSV or tab-separated">
              Campaign export
            </Label>
            <Textarea
              id="perf-data"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="min-h-[10rem] font-mono text-[12px]"
            />
            <p className="text-xs text-fg-subtle">
              Recognised columns: output_id, campaign, source, impressions,
              clicks, conversions, spend, revenue. Common aliases (cost,
              amount_spent, purchases, conversion_value) are matched too.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={runImport} loading={importing}>
              Import
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
