import { cn } from "@/lib/utils";

/**
 * PixelForge AI mark — an original geometric glyph: a forged pixel resolving
 * from coarse to fine. No relationship to any third-party branding.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <rect x="7" y="7" width="8" height="8" rx="1.5" className="fill-accent-fg" opacity="0.95" />
      <rect x="17" y="7" width="8" height="8" rx="1.5" className="fill-accent-fg" opacity="0.55" />
      <rect x="7" y="17" width="8" height="8" rx="1.5" className="fill-accent-fg" opacity="0.55" />
      <rect x="17" y="17" width="4" height="4" rx="1" className="fill-accent-fg" opacity="0.95" />
      <rect x="22" y="17" width="3" height="3" rx="0.75" className="fill-accent-fg" opacity="0.7" />
      <rect x="17" y="22" width="3" height="3" rx="0.75" className="fill-accent-fg" opacity="0.7" />
      <rect x="21.5" y="21.5" width="2" height="2" rx="0.5" className="fill-accent-fg" opacity="0.45" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo />
      <span className="text-[15px] font-semibold tracking-tight text-fg">
        PixelForge<span className="text-accent"> AI</span>
      </span>
    </span>
  );
}
