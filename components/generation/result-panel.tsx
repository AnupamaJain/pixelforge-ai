"use client";

import * as React from "react";
import { ImageIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/skeleton";
import { ImageCard, type GalleryItem } from "@/components/gallery/image-card";
import { ImageDetail } from "@/components/gallery/image-detail";
import { useToast } from "@/components/ui/toast";
import { toggleFavorite } from "@/components/gallery/image-actions";
import { GenerationError, GenerationProgress } from "./progress";
import type { GenerationOutputView, GenerationView } from "@/hooks/use-generation";
import type { GenerationType } from "@/types";

/** Right-hand output column shared by generate, transform and upscale. */
export function ResultPanel({
  generation,
  outputs,
  error,
  isRunning,
  expectedCount,
  aspectRatio,
  emptyTitle,
  emptyDescription,
}: {
  generation: GenerationView | null;
  outputs: GenerationOutputView[];
  error: string | null;
  isRunning: boolean;
  expectedCount: number;
  aspectRatio?: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<GalleryItem[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!generation || outputs.length === 0) {
      setItems([]);
      return;
    }

    setItems(
      outputs.map((output) => ({
        id: output.id,
        generationId: generation.id,
        url: output.url,
        width: output.width,
        height: output.height,
        seed: output.seed,
        isFavorite: output.isFavorite,
        createdAt: output.createdAt,
        prompt: generation.prompt,
        styleId: generation.style_id,
        model: generation.model,
        type: generation.type as GenerationType,
      })),
    );
  }, [generation, outputs]);

  async function handleToggleFavorite(item: GalleryItem) {
    const next = !item.isFavorite;
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, isFavorite: next } : entry,
      ),
    );
    try {
      await toggleFavorite(item.id, next);
    } catch {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, isFavorite: !next } : entry,
        ),
      );
      toast("Could not update that image.", "error");
    }
  }

  const active = items.find((item) => item.id === activeId) ?? null;

  if (error) return <GenerationError message={error} />;

  if (isRunning) {
    return (
      <GenerationProgress
        status={generation?.status ?? "QUEUED"}
        imageCount={expectedCount}
        aspectRatio={aspectRatio}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon aria-hidden="true" className="size-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <>
      <div
        className={
          items.length > 1 ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"
        }
      >
        {items.map((item) => (
          <ImageCard
            key={item.id}
            item={item}
            onOpen={() => setActiveId(item.id)}
            onToggleFavorite={() => handleToggleFavorite(item)}
          />
        ))}
      </div>

      <ImageDetail
        item={active}
        open={Boolean(active)}
        onClose={() => setActiveId(null)}
        meta={{
          negativePrompt: generation?.negative_prompt,
          steps: generation?.steps,
          guidance: generation?.guidance,
          upscaleFactor: generation?.upscale_factor,
        }}
      />
    </>
  );
}
