import { cn } from "@/lib/utils";

/** Two-column workspace: controls on the left, output on the right. */
export function WorkspaceShell({
  title,
  description,
  controls,
  output,
  className,
}: {
  title: string;
  description: string;
  controls: React.ReactNode;
  output: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8", className)}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{description}</p>
      </div>

      {/* Controls come first in the DOM so mobile users reach them without
          scrolling past an empty output area. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4 rounded-[--radius-lg] border border-border bg-surface p-4 sm:p-5 lg:sticky lg:top-20">
          {controls}
        </div>
        <div className="min-w-0">{output}</div>
      </div>
    </div>
  );
}
