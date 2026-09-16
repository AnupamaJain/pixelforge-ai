"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { EXPORT_GROUPS, EXPORT_PRESETS } from "@/config/marketplace";
import { cn } from "@/lib/utils";

/**
 * Marketplace export.
 *
 * Posts to /api/export, which renders each image to the platform's published
 * spec and streams back a file (or a ZIP for several). The response is a blob
 * rather than JSON, so it's saved client-side.
 */
export function ExportDialog({
  open,
  onClose,
  outputIds,
}: {
  open: boolean;
  onClose: () => void;
  outputIds: string[];
}) {
  const { toast } = useToast();
  const [presetId, setPresetId] = React.useState("amazon-main");
  const [exporting, setExporting] = React.useState(false);

  const preset = EXPORT_PRESETS.find((item) => item.id === presetId);

  async function runExport() {
    if (outputIds.length === 0) return;

    setExporting(true);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputIds, presetId }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Export failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Filename comes from Content-Disposition; fall back to a sensible one.
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        match?.[1] ??
        `${presetId}-export.${outputIds.length > 1 ? "zip" : "jpg"}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast(
        `Exported ${outputIds.length} image${outputIds.length === 1 ? "" : "s"}.`,
        "success",
      );
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Export failed.", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Export ${outputIds.length} image${outputIds.length === 1 ? "" : "s"}`}
      description="Each preset matches the platform's published requirements, so the upload is accepted first time."
      size="lg"
    >
      <div className="space-y-4">
        {EXPORT_GROUPS.map((group) => (
          <fieldset key={group.id} className="space-y-2">
            <legend className="text-[13px] font-medium text-fg">
              {group.label}
            </legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {EXPORT_PRESETS.filter((item) => item.group === group.id).map(
                (item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPresetId(item.id)}
                    aria-pressed={presetId === item.id}
                    className={cn(
                      "rounded-[--radius-sm] border px-3 py-2.5 text-left transition-colors",
                      presetId === item.id
                        ? "border-accent bg-accent-soft"
                        : "border-border hover:border-border-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-[13px] font-medium",
                        presetId === item.id ? "text-accent" : "text-fg",
                      )}
                    >
                      {item.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] tabular-nums text-fg-subtle">
                      {item.width}×{item.height} · {item.format.toUpperCase()}
                    </span>
                  </button>
                ),
              )}
            </div>
          </fieldset>
        ))}

        {preset ? (
          <p className="rounded-[--radius-sm] bg-bg-subtle p-3 text-xs text-fg-muted">
            {preset.notes}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={runExport} loading={exporting}>
            <Download aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
