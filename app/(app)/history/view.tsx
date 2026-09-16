"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, History as HistoryIcon, RotateCw, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { copyPrompt } from "@/components/gallery/image-actions";
import { getStyle } from "@/config/styles";
import { formatRelativeTime, truncate } from "@/lib/utils";
import type { GenerationStatus, GenerationType } from "@/types";

interface HistoryEntry {
  id: string;
  generation_id: string | null;
  type: GenerationType;
  prompt: string;
  negative_prompt: string | null;
  style_id: string | null;
  model: string | null;
  status: GenerationStatus;
  created_at: string;
}

const TYPE_LABEL: Record<GenerationType, string> = {
  TEXT_TO_IMAGE: "Text to image",
  IMAGE_TO_IMAGE: "Image to image",
  PRODUCT_SCENE: "Product scene",
  UPSCALE: "Upscale",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "success" | "warning" | "danger"
> = {
  COMPLETED: "success",
  QUEUED: "warning",
  PROCESSING: "warning",
  FAILED: "danger",
  CANCELLED: "default",
};

const PAGE_SIZE = 50;

export function HistoryView() {
  const router = useRouter();
  const { toast } = useToast();

  const [entries, setEntries] = React.useState<HistoryEntry[]>([]);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"" | GenerationType>("");
  const [loading, setLoading] = React.useState(true);

  // Debounced so typing doesn't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (typeFilter) params.set("type", typeFilter);

      const response = await fetch(`/api/history?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load your history.");

      const data = (await response.json()) as { items: HistoryEntry[] };
      setEntries(data.items);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not load your history.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function reusePrompt(entry: HistoryEntry) {
    const params = new URLSearchParams({ prompt: entry.prompt });
    if (entry.style_id) params.set("style", entry.style_id);
    if (entry.negative_prompt) params.set("negative", entry.negative_prompt);

    const target =
      entry.type === "IMAGE_TO_IMAGE" ? "/image-to-image" : "/generate";
    router.push(`${target}?${params}`);
  }

  async function handleDelete(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    const response = await fetch(`/api/history/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast("Could not delete that entry.", "error");
      void load();
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">History</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Every prompt you&apos;ve run. Search it, reuse it, or run it again.
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your prompts…"
            aria-label="Search prompt history"
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Filter by generation type"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as "" | GenerationType)}
          className="sm:w-48"
        >
          <option value="">All types</option>
          <option value="TEXT_TO_IMAGE">Text to image</option>
          <option value="IMAGE_TO_IMAGE">Image to image</option>
          <option value="UPSCALE">Upscale</option>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon aria-hidden="true" className="size-5" />}
          title={debouncedSearch ? "No matching prompts" : "No history yet"}
          description={
            debouncedSearch
              ? "Try a different search term."
              : "Prompts you run will be recorded here so you can reuse them later."
          }
        />
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const style = entry.style_id ? getStyle(entry.style_id) : null;
            return (
              <li
                key={entry.id}
                className="rounded-[--radius-md] border border-border bg-surface p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{TYPE_LABEL[entry.type]}</Badge>
                  {style && style.id !== "none" ? (
                    <Badge variant="default">{style.name}</Badge>
                  ) : null}
                  <Badge variant={STATUS_VARIANT[entry.status] ?? "default"}>
                    {entry.status.toLowerCase()}
                  </Badge>
                  <span className="ml-auto text-xs text-fg-subtle">
                    {formatRelativeTime(entry.created_at)}
                  </span>
                </div>

                <p className="mt-2.5 text-sm leading-relaxed text-fg">
                  {truncate(entry.prompt, 220)}
                </p>

                {entry.negative_prompt ? (
                  <p className="mt-1 text-xs text-fg-subtle">
                    Negative: {truncate(entry.negative_prompt, 120)}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => reusePrompt(entry)}>
                    <RotateCw aria-hidden="true" />
                    Reuse
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await copyPrompt(entry.prompt);
                      toast("Prompt copied to clipboard.", "success");
                    }}
                  >
                    <Copy aria-hidden="true" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDelete(entry.id)}
                    className="ml-auto text-fg-subtle hover:text-danger"
                    aria-label="Delete this history entry"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
