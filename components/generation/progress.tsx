"use client";

import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { GenerationStatus } from "@/types";

const STATUS_COPY: Record<string, string> = {
  QUEUED: "Queued — waiting for a slot…",
  PROCESSING: "Generating your image…",
};

/**
 * Progress placeholder shown while a job runs. The status is announced
 * politely so screen-reader users hear the transition without being interrupted.
 */
export function GenerationProgress({
  status,
  imageCount,
  aspectRatio = "1/1",
}: {
  status: GenerationStatus;
  imageCount: number;
  aspectRatio?: string;
}) {
  return (
    <div className="space-y-3">
      <p role="status" aria-live="polite" className="text-sm text-fg-muted">
        {STATUS_COPY[status] ?? "Working…"}
      </p>
      <div
        className={
          imageCount > 1
            ? "grid grid-cols-2 gap-3"
            : "grid grid-cols-1 gap-3"
        }
      >
        {Array.from({ length: imageCount }).map((_, index) => (
          <Skeleton key={index} className="w-full" style={{ aspectRatio }} />
        ))}
      </div>
    </div>
  );
}

export function GenerationError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[--radius-md] border border-danger/30 bg-danger/5 p-4"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
      <div>
        <p className="text-sm font-medium text-danger">Generation failed</p>
        <p className="mt-1 text-sm text-fg-muted">{message}</p>
      </div>
    </div>
  );
}
