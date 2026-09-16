"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerationType } from "@/types";

export interface GalleryItem {
  id: string;
  generationId: string;
  url: string | null;
  width: number;
  height: number;
  seed: number | null;
  isFavorite: boolean;
  createdAt: string;
  prompt: string;
  styleId: string | null;
  model: string;
  type: GenerationType;
}

const TYPE_LABEL: Record<GenerationType, string> = {
  TEXT_TO_IMAGE: "Text to image",
  IMAGE_TO_IMAGE: "Image to image",
  UPSCALE: "Upscale",
};

export function ImageCard({
  item,
  onOpen,
  onToggleFavorite,
}: {
  item: GalleryItem;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const ratio =
    item.width && item.height ? `${item.width} / ${item.height}` : "1 / 1";

  return (
    <figure className="group relative overflow-hidden rounded-[--radius-md] border border-border bg-bg-muted">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full"
        aria-label={`Open image: ${item.prompt.slice(0, 80)}`}
      >
        <div style={{ aspectRatio: ratio }} className="w-full">
          {item.url ? (
            // Signed URLs are short-lived and host-varied, so a plain <img>
            // avoids the optimizer refetching an expired link.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt={item.prompt}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid size-full place-items-center text-xs text-fg-subtle">
              Preview unavailable
            </div>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={item.isFavorite}
        aria-label={item.isFavorite ? "Remove from favourites" : "Add to favourites"}
        className={cn(
          "absolute right-2 top-2 grid size-8 place-items-center rounded-full backdrop-blur transition-all",
          item.isFavorite
            ? "bg-black/50 text-red-400 opacity-100"
            : "bg-black/40 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        <Heart
          aria-hidden="true"
          className={cn("size-4", item.isFavorite && "fill-current")}
        />
      </button>

      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="line-clamp-2 text-xs leading-snug text-white">{item.prompt}</p>
        <p className="mt-1 text-[10px] text-white/70">{TYPE_LABEL[item.type]}</p>
      </figcaption>
    </figure>
  );
}

export { TYPE_LABEL };
