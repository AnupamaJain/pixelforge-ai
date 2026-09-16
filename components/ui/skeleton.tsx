import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("shimmer rounded-[--radius-sm] bg-bg-muted", className)}
      {...props}
    />
  );
}

/** Empty-state block used across gallery, history and dashboard. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[--radius-lg] border border-dashed border-border px-6 py-16 text-center">
      {icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-bg-muted text-fg-subtle">
          {icon}
        </div>
      ) : null}
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
