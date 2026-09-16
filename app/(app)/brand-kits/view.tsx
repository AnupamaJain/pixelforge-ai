"use client";

import * as React from "react";
import { Palette, Plus, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface BrandKit {
  id: string;
  name: string;
  description: string | null;
  palette: string[];
  prompt_modifier: string | null;
  negative_modifier: string | null;
  is_default: boolean;
}

const EMPTY_DRAFT = {
  name: "",
  description: "",
  palette: [] as string[],
  promptModifier: "",
  negativeModifier: "",
  isDefault: false,
};

export function BrandKitsView({
  limit,
  planName,
}: {
  limit: number;
  planName: string;
}) {
  const { toast } = useToast();

  const [kits, setKits] = React.useState<BrandKit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({ ...EMPTY_DRAFT });
  const [colourInput, setColourInput] = React.useState("#1A2B3C");
  const [saving, setSaving] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/brand-kits", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load your brand kits.");
      const data = (await response.json()) as { items: BrandKit[] };
      setKits(data.items);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT });
    setEditorOpen(true);
  }

  function openEdit(kit: BrandKit) {
    setEditingId(kit.id);
    setDraft({
      name: kit.name,
      description: kit.description ?? "",
      palette: kit.palette ?? [],
      promptModifier: kit.prompt_modifier ?? "",
      negativeModifier: kit.negative_modifier ?? "",
      isDefault: kit.is_default,
    });
    setEditorOpen(true);
  }

  async function save() {
    if (!draft.name.trim()) {
      toast("Give your brand kit a name.", "error");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/brand-kits/${editingId}` : "/api/brand-kits",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            description: draft.description || undefined,
            palette: draft.palette,
            promptModifier: draft.promptModifier || undefined,
            negativeModifier: draft.negativeModifier || undefined,
            allowedStyles: [],
            isDefault: draft.isDefault,
          }),
        },
      );

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not save that kit.");

      toast(editingId ? "Brand kit updated." : "Brand kit created.", "success");
      setEditorOpen(false);
      void load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/brand-kits/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete that kit.");
      toast("Brand kit deleted.", "success");
      setDeleteId(null);
      void load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  }

  function addColour() {
    if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colourInput)) {
      toast("Enter a hex colour like #1A2B3C.", "error");
      return;
    }
    if (draft.palette.length >= 8) {
      toast("A palette holds up to 8 colours.", "error");
      return;
    }
    setDraft((d) => ({ ...d, palette: [...d.palette, colourInput.toUpperCase()] }));
  }

  const atLimit = kits.length >= limit;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Brand Kits
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Lock generations to your palette and language so output stops coming
            back off-brand.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-fg-subtle">
            {kits.length} of {limit} used
          </span>
          <Button onClick={openCreate} disabled={atLimit}>
            <Plus aria-hidden="true" />
            New kit
          </Button>
        </div>
      </div>

      {atLimit ? (
        <p className="mb-4 rounded-[--radius-md] border border-warning/30 bg-warning/5 p-3 text-sm text-fg-muted">
          Your {planName} plan includes {limit} brand kit{limit === 1 ? "" : "s"}.
          Upgrade for more.
        </p>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      ) : kits.length === 0 ? (
        <EmptyState
          icon={<Palette aria-hidden="true" className="size-5" />}
          title="No brand kits yet"
          description="A brand kit carries your palette, your prompt language and the things you never want to see. Every generation can then inherit it."
          action={<Button onClick={openCreate}>Create your first kit</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {kits.map((kit) => (
            <Card key={kit.id} className="transition-colors hover:border-border-strong">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[15px] font-semibold">{kit.name}</h2>
                      {kit.is_default ? (
                        <Badge variant="accent">
                          <Star aria-hidden="true" className="size-2.5" />
                          Default
                        </Badge>
                      ) : null}
                    </div>
                    {kit.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
                        {kit.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                {kit.palette?.length ? (
                  <div className="mt-3 flex gap-1.5">
                    {kit.palette.map((colour) => (
                      <span
                        key={colour}
                        title={colour}
                        className="size-6 rounded-full border border-border"
                        style={{ backgroundColor: colour }}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(kit)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteId(kit.id)}
                    className="ml-auto text-fg-subtle hover:text-danger"
                    aria-label={`Delete ${kit.name}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? "Edit brand kit" : "New brand kit"}
        description="These settings are merged into every generation that uses this kit."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="kit-name">Name</Label>
            <Input
              id="kit-name"
              value={draft.name}
              maxLength={80}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Northwind — core"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kit-description" hint="Optional">
              Description
            </Label>
            <Input
              id="kit-description"
              value={draft.description}
              maxLength={300}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Warm, editorial, natural light"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kit-colour" hint={`${draft.palette.length}/8`}>
              Palette
            </Label>
            <div className="flex gap-1.5">
              <input
                id="kit-colour"
                type="color"
                value={colourInput}
                onChange={(e) => setColourInput(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-[--radius-sm] border border-border bg-surface p-1"
                aria-label="Pick a colour"
              />
              <Input
                value={colourInput}
                onChange={(e) => setColourInput(e.target.value)}
                placeholder="#1A2B3C"
                aria-label="Hex colour"
              />
              <Button type="button" variant="secondary" onClick={addColour}>
                Add
              </Button>
            </div>
            {draft.palette.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {draft.palette.map((colour, index) => (
                  <button
                    key={`${colour}-${index}`}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        palette: d.palette.filter((_, i) => i !== index),
                      }))
                    }
                    className="group flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-1 pr-2 text-[11px]"
                    aria-label={`Remove ${colour}`}
                  >
                    <span
                      className="size-4 rounded-full"
                      style={{ backgroundColor: colour }}
                    />
                    {colour}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kit-modifier" hint="Optional">
              Always include
            </Label>
            <Textarea
              id="kit-modifier"
              value={draft.promptModifier}
              maxLength={600}
              onChange={(e) =>
                setDraft((d) => ({ ...d, promptModifier: e.target.value }))
              }
              placeholder="warm natural light, soft shadows, understated styling"
              className="min-h-[4rem]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kit-negative" hint="Optional">
              Never include
            </Label>
            <Textarea
              id="kit-negative"
              value={draft.negativeModifier}
              maxLength={600}
              onChange={(e) =>
                setDraft((d) => ({ ...d, negativeModifier: e.target.value }))
              }
              placeholder="neon colours, harsh flash, cluttered backgrounds"
              className="min-h-[4rem]"
            />
          </div>

          <label className="flex items-center gap-2.5 text-[13px]">
            <input
              type="checkbox"
              checked={draft.isDefault}
              onChange={(e) => setDraft((d) => ({ ...d, isDefault: e.target.checked }))}
              className={cn("size-4 rounded border-border accent-[hsl(var(--accent))]")}
            />
            Use this kit by default
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {editingId ? "Save changes" : "Create kit"}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove(deleteId)}
        loading={saving}
        title="Delete this brand kit?"
        description="Generations already made with it keep their settings. This only removes the kit."
        confirmLabel="Delete"
      />
    </div>
  );
}
