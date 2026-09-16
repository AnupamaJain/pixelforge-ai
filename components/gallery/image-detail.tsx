"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  Heart,
  Layers,
  Maximize2,
  Shuffle,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useCredits } from "@/components/credits-provider";
import { formatDateTime } from "@/lib/utils";
import { getStyle } from "@/config/styles";
import {
  copyPrompt,
  createVariation,
  deleteGeneration,
  downloadOutput,
  toggleFavorite,
} from "./image-actions";
import { TYPE_LABEL, type GalleryItem } from "./image-card";

interface DetailMeta {
  negativePrompt?: string | null;
  steps?: number | null;
  guidance?: number | null;
  upscaleFactor?: number | null;
  provider?: string;
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
      <dt className="shrink-0 text-xs text-fg-subtle">{label}</dt>
      <dd className="text-right text-[13px] text-fg">{value}</dd>
    </div>
  );
}

/** Full-size view with metadata and every action available for an image. */
export function ImageDetail({
  item,
  meta,
  open,
  onClose,
  onChanged,
}: {
  item: GalleryItem | null;
  meta?: DetailMeta;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { features, refresh } = useCredits();

  const [favorite, setFavorite] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (item) setFavorite(item.isFavorite);
  }, [item]);

  if (!item) return null;

  const style = item.styleId ? getStyle(item.styleId) : null;

  async function handleFavorite() {
    if (!item) return;
    const next = !favorite;
    setFavorite(next);
    try {
      await toggleFavorite(item.id, next);
      onChanged?.();
    } catch {
      setFavorite(!next);
      toast("Could not update that image.", "error");
    }
  }

  async function handleCopy() {
    if (!item) return;
    await copyPrompt(item.prompt);
    toast("Prompt copied to clipboard.", "success");
  }

  async function handleVariation() {
    if (!item) return;
    setBusy(true);
    try {
      await createVariation(item.generationId);
      toast("Variation queued — it'll appear in your gallery shortly.", "success");
      void refresh();
      onClose();
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not create a variation.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    setBusy(true);
    try {
      await deleteGeneration(item.generationId);
      toast("Generation deleted.", "success");
      setConfirmOpen(false);
      onClose();
      onChanged?.();
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not delete that generation.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Image detail"
        description={TYPE_LABEL[item.type]}
        size="xl"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[--radius-md] border border-border bg-bg-muted">
            {item.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt={item.prompt}
                className="max-h-[65vh] w-full object-contain"
              />
            ) : (
              <div className="grid aspect-square place-items-center text-sm text-fg-subtle">
                Preview unavailable
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xs font-medium text-fg-subtle">Prompt</h3>
                <p className="mt-1 break-words text-[13px] leading-relaxed text-fg">
                  {item.prompt}
                </p>
              </div>

              {meta?.negativePrompt ? (
                <div>
                  <h3 className="text-xs font-medium text-fg-subtle">
                    Negative prompt
                  </h3>
                  <p className="mt-1 break-words text-[13px] leading-relaxed text-fg-muted">
                    {meta.negativePrompt}
                  </p>
                </div>
              ) : null}

              <dl className="rounded-[--radius-sm] border border-border px-3">
                <MetaRow label="Type" value={TYPE_LABEL[item.type]} />
                <MetaRow
                  label="Style"
                  value={style ? <Badge variant="outline">{style.name}</Badge> : null}
                />
                <MetaRow label="Model" value={item.model} />
                <MetaRow
                  label="Dimensions"
                  value={item.width && item.height ? `${item.width} × ${item.height}` : null}
                />
                <MetaRow
                  label="Seed"
                  value={
                    item.seed !== null ? (
                      <span className="tabular-nums">{item.seed}</span>
                    ) : null
                  }
                />
                <MetaRow label="Steps" value={meta?.steps ?? null} />
                <MetaRow label="Guidance" value={meta?.guidance ?? null} />
                <MetaRow
                  label="Upscale"
                  value={meta?.upscaleFactor ? `${meta.upscaleFactor}×` : null}
                />
                <MetaRow label="Created" value={formatDateTime(item.createdAt)} />
              </dl>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => downloadOutput(item.id, "png")}>
                <Download aria-hidden="true" />
                PNG
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => downloadOutput(item.id, "jpeg")}
              >
                <Download aria-hidden="true" />
                JPEG
              </Button>

              <Button size="sm" variant="secondary" onClick={handleCopy}>
                <Copy aria-hidden="true" />
                Copy prompt
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleFavorite}
                aria-pressed={favorite}
              >
                <Heart
                  aria-hidden="true"
                  className={favorite ? "fill-current text-red-500" : undefined}
                />
                {favorite ? "Favourited" : "Favourite"}
              </Button>

              {item.type !== "UPSCALE" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleVariation}
                  loading={busy}
                >
                  <Shuffle aria-hidden="true" />
                  Variation
                </Button>
              ) : null}

              {features.imageToImage || features.upscale ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      router.push(`/image-to-image?from=${item.id}`)
                    }
                  >
                    <Layers aria-hidden="true" />
                    Transform
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push(`/upscale?output=${item.id}`)}
                  >
                    <Maximize2 aria-hidden="true" />
                    Upscale
                  </Button>
                </>
              ) : null}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmOpen(true)}
                className="col-span-2 text-danger hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 aria-hidden="true" />
                Delete generation
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={busy}
        title="Delete this generation?"
        description="The image and its metadata will be permanently removed. This can't be undone."
        confirmLabel="Delete"
      />
    </>
  );
}
