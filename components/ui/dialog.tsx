"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * Accessible modal built on <dialog>, which gives us focus trapping, Escape
 * handling and inertness of the background for free.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);

  // `cancel` fires on Escape; keep React state as the source of truth.
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    element.addEventListener("cancel", handleCancel);
    return () => element.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  const widths = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-5xl",
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-[--radius-lg] border border-border bg-surface p-0 text-fg",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-fade",
        widths[size],
        className,
      )}
      // Clicking the backdrop (the dialog element itself) dismisses.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-sm text-fg-muted">
              {description}
            </p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close dialog"
          className="-mr-2 -mt-1 shrink-0"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

/** Confirmation prompt for destructive actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
