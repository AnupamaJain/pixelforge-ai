"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Images } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ImageCard, type GalleryItem } from "@/components/gallery/image-card";
import { ImageDetail } from "@/components/gallery/image-detail";
import { toggleFavorite } from "@/components/gallery/image-actions";
import { cn } from "@/lib/utils";
import type { GenerationType } from "@/types";

const PAGE_SIZE = 40;

interface ApiRow {
  id: string;
  generationId: string;
  url: string | null;
  width: number;
  height: number;
  seed: number | null;
  isFavorite: boolean;
  createdAt: string;
  generation: {
    type: GenerationType;
    prompt: string;
    negative_prompt: string | null;
    style_id: string | null;
    model: string;
    steps: number | null;
    guidance: number | null;
    upscale_factor: number | null;
  };
}

export function GalleryView() {
  const { toast } = useToast();

  const [items, setItems] = React.useState<GalleryItem[]>([]);
  const [meta, setMeta] = React.useState<Record<string, ApiRow["generation"]>>({});
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<"" | GenerationType>("");
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (offset: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (favoritesOnly) params.set("favoritesOnly", "true");
        if (typeFilter) params.set("type", typeFilter);

        const response = await fetch(`/api/generations?${params}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not load your gallery.");

        const data = (await response.json()) as {
          items: ApiRow[];
          hasMore: boolean;
        };

        const mapped: GalleryItem[] = data.items.map((row) => ({
          id: row.id,
          generationId: row.generationId,
          url: row.url,
          width: row.width,
          height: row.height,
          seed: row.seed,
          isFavorite: row.isFavorite,
          createdAt: row.createdAt,
          prompt: row.generation.prompt,
          styleId: row.generation.style_id,
          model: row.generation.model,
          type: row.generation.type,
        }));

        setMeta((current) => {
          const next = replace ? {} : { ...current };
          for (const row of data.items) next[row.id] = row.generation;
          return next;
        });

        setItems((current) => (replace ? mapped : [...current, ...mapped]));
        setHasMore(data.hasMore);
      } catch (error) {
        toast(
          error instanceof Error ? error.message : "Could not load your gallery.",
          "error",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [favoritesOnly, typeFilter, toast],
  );

  React.useEffect(() => {
    void load(0, true);
  }, [load]);

  async function handleToggleFavorite(item: GalleryItem) {
    const next = !item.isFavorite;
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, isFavorite: next } : entry,
      ),
    );

    try {
      await toggleFavorite(item.id, next);
      // Un-favouriting while filtered should remove the card from view.
      if (favoritesOnly && !next) {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      }
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
  const activeMeta = activeId ? meta[activeId] : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Gallery</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Every image you&apos;ve created, with its full metadata attached.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            aria-label="Filter by generation type"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as "" | GenerationType)
            }
            className="h-9 w-auto text-[13px]"
          >
            <option value="">All types</option>
            <option value="TEXT_TO_IMAGE">Text to image</option>
            <option value="IMAGE_TO_IMAGE">Image to image</option>
            <option value="UPSCALE">Upscale</option>
          </Select>

          <Button
            variant={favoritesOnly ? "primary" : "secondary"}
            size="sm"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((value) => !value)}
          >
            <Heart
              aria-hidden="true"
              className={cn(favoritesOnly && "fill-current")}
            />
            Favourites
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton
              key={index}
              className="w-full"
              style={{ aspectRatio: index % 3 === 1 ? "3/4" : "1/1" }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Images aria-hidden="true" className="size-5" />}
          title={favoritesOnly ? "No favourites yet" : "Your gallery is empty"}
          description={
            favoritesOnly
              ? "Favourite an image and it'll show up here for quick access."
              : "Images you generate will be collected here automatically."
          }
          action={
            <Link href="/generate">
              <Button>Generate an image</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Masonry on desktop, denser columns on mobile. */}
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
            {items.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <ImageCard
                  item={item}
                  onOpen={() => setActiveId(item.id)}
                  onToggleFavorite={() => handleToggleFavorite(item)}
                />
              </div>
            ))}
          </div>

          {hasMore ? (
            <div className="mt-8 flex justify-center">
              <Button
                variant="secondary"
                loading={loadingMore}
                onClick={() => void load(items.length, false)}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ImageDetail
        item={active}
        open={Boolean(active)}
        onClose={() => setActiveId(null)}
        onChanged={() => void load(0, true)}
        meta={
          activeMeta
            ? {
                negativePrompt: activeMeta.negative_prompt,
                steps: activeMeta.steps,
                guidance: activeMeta.guidance,
                upscaleFactor: activeMeta.upscale_factor,
              }
            : undefined
        }
      />
    </div>
  );
}
