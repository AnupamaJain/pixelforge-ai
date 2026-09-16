"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  path: string;
  previewUrl: string | null;
}

/**
 * Drag-and-drop uploader. The file is sent straight to /api/uploads, which
 * validates it server-side; nothing here is trusted as a security boundary.
 */
export function ImageUploader({
  value,
  onChange,
  disabled,
  maxSizeMb = 10,
}: {
  value: UploadedImage | null;
  onChange: (image: UploadedImage | null) => void;
  disabled?: boolean;
  maxSizeMb?: number;
}) {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const upload = React.useCallback(
    async (file: File) => {
      // Mirrors the server's checks to give immediate feedback.
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        toast("Upload a PNG, JPEG or WebP image.", "error");
        return;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        toast(`Images must be under ${maxSizeMb}MB.`, "error");
        return;
      }

      setUploading(true);
      try {
        const body = new FormData();
        body.append("file", file);

        const response = await fetch("/api/uploads", { method: "POST", body });
        const data = (await response.json()) as {
          path?: string;
          previewUrl?: string | null;
          error?: string;
        };

        if (!response.ok || !data.path) {
          throw new Error(data.error ?? "Upload failed.");
        }

        onChange({ path: data.path, previewUrl: data.previewUrl ?? null });
      } catch (error) {
        toast(error instanceof Error ? error.message : "Upload failed.", "error");
      } finally {
        setUploading(false);
      }
    },
    [maxSizeMb, onChange, toast],
  );

  if (value) {
    return (
      <div className="space-y-1.5">
        <span className="text-[13px] font-medium text-fg">Source image</span>
        <div className="relative overflow-hidden rounded-[--radius-sm] border border-border bg-bg-muted">
          {value.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.previewUrl}
              alt="Your uploaded source image"
              className="max-h-48 w-full object-contain"
            />
          ) : (
            <div className="grid h-32 place-items-center text-xs text-fg-subtle">
              Uploaded
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={disabled}
            onClick={() => onChange(null)}
            aria-label="Remove source image"
            className="absolute right-2 top-2"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <span className="text-[13px] font-medium text-fg">Source image</span>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          const file = event.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={cn(
          "rounded-[--radius-sm] border border-dashed p-6 text-center transition-colors",
          dragging ? "border-accent bg-accent-soft" : "border-border",
          disabled && "opacity-50",
        )}
      >
        <ImagePlus aria-hidden="true" className="mx-auto size-6 text-fg-subtle" />
        <p className="mt-2 text-sm text-fg-muted">
          Drag an image here, or
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          loading={uploading}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Choose a file
        </Button>
        <p className="mt-2 text-xs text-fg-subtle">
          PNG, JPEG or WebP · up to {maxSizeMb}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
