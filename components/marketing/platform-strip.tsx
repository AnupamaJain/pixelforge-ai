import { EXPORT_PRESETS } from "@/config/marketplace";

/**
 * Platform strip.
 *
 * Serves the same visual role as a customer logo cloud, but states something
 * true from day one: these are the platforms we export to, encoded as presets
 * in config/marketplace.ts.
 *
 * A real logo cloud requires real customers who have agreed to be named.
 * Listing companies you don't have a relationship with is false association,
 * and it is the first thing a careful buyer checks.
 */

const PLATFORMS = [
  "Amazon",
  "Shopify",
  "Etsy",
  "eBay",
  "Instagram",
  "Pinterest",
  "TikTok Shop",
  "Faire",
] as const;

export function PlatformStrip() {
  const presetCount = EXPORT_PRESETS.length;

  return (
    <section
      aria-labelledby="platforms-heading"
      className="border-b border-border bg-bg-subtle py-12"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2
          id="platforms-heading"
          className="text-center text-[13px] font-medium text-fg-subtle"
        >
          Exports sized for every platform you sell on
        </h2>

        {/* Marquee on small screens where the full row won't fit; static grid
            above that, so nothing is animating unnecessarily. */}
        <div className="mt-6 overflow-hidden sm:hidden">
          <div className="marquee flex w-max gap-8">
            {[...PLATFORMS, ...PLATFORMS].map((platform, index) => (
              <span
                key={`${platform}-${index}`}
                aria-hidden={index >= PLATFORMS.length}
                className="whitespace-nowrap text-lg font-semibold tracking-tight text-fg-muted"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>

        <ul className="mt-6 hidden flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:flex">
          {PLATFORMS.map((platform) => (
            <li
              key={platform}
              className="text-lg font-semibold tracking-tight text-fg-muted transition-colors hover:text-fg"
            >
              {platform}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-xs text-fg-subtle">
          {presetCount} export presets, each matching the platform&apos;s
          published image requirements.
        </p>
      </div>
    </section>
  );
}
