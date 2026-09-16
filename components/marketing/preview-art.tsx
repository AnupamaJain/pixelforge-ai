/**
 * Decorative artwork for the marketing page.
 *
 * These are hand-authored SVG compositions, deliberately abstract — they
 * illustrate the interface rather than posing as model output, so nothing on
 * the landing page misrepresents what the product produces.
 */

const PALETTES = [
  ["#f97316", "#fdba74", "#7c2d12"],
  ["#0ea5e9", "#7dd3fc", "#0c4a6e"],
  ["#8b5cf6", "#c4b5fd", "#4c1d95"],
  ["#10b981", "#6ee7b7", "#064e3b"],
  ["#f43f5e", "#fda4af", "#881337"],
  ["#eab308", "#fde047", "#713f12"],
];

export function AbstractTile({
  seed,
  className,
}: {
  seed: number;
  className?: string;
}) {
  const palette = PALETTES[seed % PALETTES.length];
  const gradientId = `tile-grad-${seed}`;
  const blurId = `tile-blur-${seed}`;

  // Deterministic pseudo-random placement keeps server and client markup identical.
  const rand = (n: number) => {
    const x = Math.sin(seed * 9973 + n * 7919) * 10000;
    return x - Math.floor(x);
  };

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="100%" stopColor={palette[2]} />
        </linearGradient>
        <filter id={blurId}>
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <rect width="100" height="100" fill={`url(#${gradientId})`} />
      <g filter={`url(#${blurId})`} opacity="0.75">
        <circle cx={rand(1) * 100} cy={rand(2) * 100} r={18 + rand(3) * 22} fill={palette[1]} />
        <circle cx={rand(4) * 100} cy={rand(5) * 100} r={12 + rand(6) * 18} fill={palette[0]} />
        <circle cx={rand(7) * 100} cy={rand(8) * 100} r={10 + rand(9) * 14} fill={palette[2]} />
      </g>
      <rect width="100" height="100" fill="url(#noise)" opacity="0.04" />
    </svg>
  );
}

/** A stylised mock of the generation workspace, used in the hero. */
export function WorkspacePreview() {
  return (
    <div className="overflow-hidden rounded-[--radius-lg] border border-border bg-surface shadow-2xl shadow-black/5">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-bg-subtle px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
        </div>
        <div className="mx-auto hidden rounded-full bg-bg-muted px-3 py-1 text-[11px] text-fg-subtle sm:block">
          pixelforge.ai/generate
        </div>
      </div>

      <div className="grid gap-0 sm:grid-cols-[minmax(0,15rem)_1fr]">
        {/* Controls */}
        <div className="space-y-4 border-b border-border p-4 sm:border-b-0 sm:border-r">
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-fg-muted">Prompt</div>
            <div className="rounded-[--radius-sm] border border-border bg-bg-subtle p-2.5 text-[11px] leading-relaxed text-fg-muted">
              A weathered brass astrolabe on linen, morning light
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-fg-muted">Style</div>
            <div className="flex flex-wrap gap-1.5">
              {["Cinematic", "Editorial", "3D"].map((style, index) => (
                <span
                  key={style}
                  className={
                    index === 0
                      ? "rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-fg"
                      : "rounded-full border border-border px-2 py-0.5 text-[10px] text-fg-subtle"
                  }
                >
                  {style}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-fg-muted">Aspect ratio</div>
            <div className="grid grid-cols-3 gap-1.5">
              {["1:1", "16:9", "4:5"].map((ratio, index) => (
                <span
                  key={ratio}
                  className={
                    index === 1
                      ? "rounded border border-accent bg-accent-soft py-1 text-center text-[10px] text-accent"
                      : "rounded border border-border py-1 text-center text-[10px] text-fg-subtle"
                  }
                >
                  {ratio}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-[--radius-sm] bg-accent py-2 text-center text-[11px] font-medium text-accent-fg">
            Generate · 2 credits
          </div>
        </div>

        {/* Output grid */}
        <div className="grid grid-cols-2 gap-2 bg-bg-subtle p-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="aspect-square overflow-hidden rounded-[--radius-sm] border border-border"
            >
              <AbstractTile seed={index + 3} className="size-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
