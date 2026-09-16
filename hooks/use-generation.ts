"use client";

import * as React from "react";
import { useCredits } from "@/components/credits-provider";
import { useToast } from "@/components/ui/toast";
import type { GenerationStatus } from "@/types";

export interface GenerationOutputView {
  id: string;
  url: string | null;
  width: number;
  height: number;
  seed: number | null;
  isFavorite: boolean;
  createdAt: string;
}

export interface GenerationView {
  id: string;
  type: string;
  status: GenerationStatus;
  prompt: string;
  negative_prompt: string | null;
  style_id: string | null;
  model: string;
  provider: string;
  width: number | null;
  height: number | null;
  seed: number | null;
  steps: number | null;
  guidance: number | null;
  strength: number | null;
  upscale_factor: number | null;
  credit_cost: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

const POLL_INTERVAL_MS = 1500;
// Generous ceiling: a 4-image SDXL batch on modest hardware can take minutes.
const MAX_POLL_MS = 300_000;

/**
 * Submits a generation request and polls until it settles.
 *
 * The server does the real work asynchronously; this hook only tracks status
 * and surfaces the result. Credit numbers always come from the server response.
 */
export function useGeneration() {
  const { setCredits, refresh } = useCredits();
  const { toast } = useToast();

  const [submitting, setSubmitting] = React.useState(false);
  const [generation, setGeneration] = React.useState<GenerationView | null>(null);
  const [outputs, setOutputs] = React.useState<GenerationOutputView[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const pollRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const isRunning =
    submitting ||
    generation?.status === "QUEUED" ||
    generation?.status === "PROCESSING";

  const poll = React.useCallback(
    (generationId: string, startedAt: number) => {
      pollRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;

        try {
          const response = await fetch(`/api/generations/${generationId}`, {
            cache: "no-store",
          });

          if (!response.ok) throw new Error("Lost track of that generation.");

          const data = (await response.json()) as {
            generation: GenerationView;
            outputs: GenerationOutputView[];
          };

          if (!mountedRef.current) return;

          setGeneration(data.generation);
          setOutputs(data.outputs);

          if (data.generation.status === "COMPLETED") {
            toast(
              `Generated ${data.outputs.length} image${data.outputs.length === 1 ? "" : "s"}.`,
              "success",
            );
            void refresh();
            return;
          }

          if (
            data.generation.status === "FAILED" ||
            data.generation.status === "CANCELLED"
          ) {
            const message =
              data.generation.error_message ??
              "Image generation failed. Your credits have been refunded.";
            setError(message);
            toast(message, "error");
            // The refund lands during failure handling, so re-read the balance.
            void refresh();
            return;
          }

          if (Date.now() - startedAt > MAX_POLL_MS) {
            setError("This is taking longer than expected. Check your gallery shortly.");
            return;
          }

          poll(generationId, startedAt);
        } catch (pollError) {
          if (!mountedRef.current) return;
          setError(
            pollError instanceof Error
              ? pollError.message
              : "Lost track of that generation.",
          );
        }
      }, POLL_INTERVAL_MS);
    },
    [refresh, toast],
  );

  const submit = React.useCallback(
    async (endpoint: string, payload: unknown) => {
      if (pollRef.current) clearTimeout(pollRef.current);

      setSubmitting(true);
      setError(null);
      setGeneration(null);
      setOutputs([]);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as {
          generationId?: string;
          creditsRemaining?: number;
          error?: string;
        };

        if (!response.ok || !data.generationId) {
          throw new Error(data.error ?? "Could not start that generation.");
        }

        // Authoritative post-spend balance from the server.
        if (typeof data.creditsRemaining === "number") {
          setCredits(data.creditsRemaining);
        }

        setGeneration({
          id: data.generationId,
          status: "QUEUED",
        } as GenerationView);

        poll(data.generationId, Date.now());
        return data.generationId;
      } catch (submitError) {
        const message =
          submitError instanceof Error
            ? submitError.message
            : "Could not start that generation.";
        setError(message);
        toast(message, "error");
        return null;
      } finally {
        if (mountedRef.current) setSubmitting(false);
      }
    },
    [poll, setCredits, toast],
  );

  const reset = React.useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setGeneration(null);
    setOutputs([]);
    setError(null);
  }, []);

  return { submit, reset, submitting, isRunning, generation, outputs, error };
}
