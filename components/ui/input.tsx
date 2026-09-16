import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-[--radius-sm] border border-border bg-surface px-3 py-2 text-sm",
      "placeholder:text-fg-subtle transition-colors",
      "hover:border-border-strong focus:border-accent focus:outline-none focus-visible:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-[invalid=true]:border-danger",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex w-full rounded-[--radius-sm] border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed",
      "placeholder:text-fg-subtle transition-colors resize-y min-h-[92px]",
      "hover:border-border-strong focus:border-accent focus:outline-none focus-visible:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full appearance-none rounded-[--radius-sm] border border-border bg-surface px-3 py-2 text-sm",
      "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9",
      "transition-colors hover:border-border-strong focus:border-accent focus:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({
  className,
  children,
  hint,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { hint?: React.ReactNode }) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-2 text-[13px] font-medium text-fg",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {hint ? <span className="text-xs font-normal text-fg-subtle">{hint}</span> : null}
    </label>
  );
}

/** Field-level error text, wired to inputs via aria-describedby. */
export function FieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-xs text-danger">
      {children}
    </p>
  );
}
