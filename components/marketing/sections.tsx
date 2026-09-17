import Link from "next/link";
import {
  Check,
  Package,
  Palette,
  Rows3,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_ORDER, PLANS, formatPrice } from "@/config/plans";
import { CREDIT_COSTS } from "@/config/credits";
import {
  APP_SCREENS,
  GALLERY_SHOWCASE,
  HERO_SHOWCASE,
  STYLE_SHOWCASE,
  TRANSFORM_SHOWCASE,
  UPSCALE_SHOWCASE,
  isPlaceholderShowcase,
} from "@/config/showcase";
import { ClickableImage } from "./lightbox";
import { SCENE_PRESETS } from "@/config/scenes";
import { EXPORT_PRESETS } from "@/config/marketplace";
import { CompareSlider } from "./simulators/compare-slider";
import { StylePlayground } from "./simulators/style-playground";
import { PricingCalculator } from "./pricing-calculator";

/** Shown while the page still uses stock placeholders. See config/showcase.ts. */
function SampleImageryNote({ className }: { className?: string }) {
  if (!isPlaceholderShowcase()) return null;
  return (
    <p className={className ?? "mt-3 text-center text-[11px] text-fg-subtle"}>
      Sample imagery for layout purposes — not output from this application.
    </p>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 mask-fade-b" />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          {/* Trust row. Every claim here is verifiable in the codebase —
              no review-platform badge until we have real reviews. */}
          <div className="flex animate-fade flex-wrap items-center justify-center gap-2">
            <Badge variant="accent">
              <ShieldCheck aria-hidden="true" className="size-3" />
              Pixel-identical, verified on every generation
            </Badge>
            <Badge variant="outline">
              {SCENE_PRESETS.length} scenes · {EXPORT_PRESETS.length} export presets
            </Badge>
          </div>

          <h1 className="mt-6 animate-in-up text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Product photography without the photoshoot
          </h1>

          <p
            className="mx-auto mt-5 max-w-xl animate-in-up text-base leading-relaxed text-fg-muted sm:text-lg"
            style={{ animationDelay: "80ms" }}
          >
            Upload one product photo. Get fifty scenes back — marketplace-ready,
            on brand, and with your product never redrawn.
          </p>

          <div
            className="mt-8 flex animate-in-up flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "160ms" }}
          >
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Start creating free
              </Button>
            </Link>
            <Link href="#playground" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Try it without signing up
              </Button>
            </Link>
          </div>

          <ul
            className="mt-5 flex animate-in-up flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-fg-subtle"
            style={{ animationDelay: "240ms" }}
          >
            <li className="flex items-center gap-1.5">
              <Check aria-hidden="true" className="size-3 text-accent" />
              {PLANS.FREE.monthlyCredits} free credits monthly
            </li>
            <li className="flex items-center gap-1.5">
              <Check aria-hidden="true" className="size-3 text-accent" />
              No card required
            </li>
            <li className="flex items-center gap-1.5">
              <Check aria-hidden="true" className="size-3 text-accent" />
              Failed runs always refunded
            </li>
          </ul>
        </div>

        <div
          className="mt-14 animate-in-up sm:mt-20"
          style={{ animationDelay: "320ms" }}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {HERO_SHOWCASE.map((image, index) => (
              <ClickableImage
                key={image.src}
                src={image.src}
                alt={image.alt}
                priority={index < 2}
                sizes="(max-width: 640px) 50vw, 25vw"
                className="aspect-[4/5]"
                imgClassName="size-full object-cover"
              />
            ))}
          </div>
          <SampleImageryNote />
        </div>
      </div>
    </section>
  );
}

/** The pixel-identical claim, demonstrated rather than asserted. */
export function PixelIdentical() {
  return (
    <section className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="text-[13px] font-medium text-accent">
              The difference
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Every other tool redraws your product. We don&apos;t.
            </h2>
            <p className="mt-3 leading-relaxed text-fg-muted">
              Generic AI tools generate a picture that <em>resembles</em> your
              product — a warped label, a shifted colour, a logo that&apos;s
              almost right. That&apos;s unusable on a product page.
            </p>
            <p className="mt-3 leading-relaxed text-fg-muted">
              We generate only the scene. Your product is cut out of your
              original photograph and composited back on top, so those pixels
              are yours, untouched. Then we check every one of them.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "Your product is segmented from your own photo",
                "The scene is generated around its real silhouette",
                "Your original pixels are composited back on top",
                "Every opaque pixel is verified byte for byte",
                "If one changed, the run fails and you aren't charged",
              ].map((point, index) => (
                <li key={point} className="flex items-start gap-3 text-sm">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[10px] font-semibold tabular-nums text-accent"
                  >
                    {index + 1}
                  </span>
                  <span className="text-fg-muted">{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-[--radius-md] border border-success/30 bg-success/5 p-4">
              <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
                <ShieldCheck aria-hidden="true" className="size-4 text-success" />
                This is a tested guarantee, not a claim
              </p>
              <p className="mt-1.5 text-sm text-fg-muted">
                The verification runs on every generation, and the check itself
                is covered by our test suite — including a control that proves a
                modified product is detected.
              </p>
            </div>
          </div>

          <div>
            <CompareSlider
              before={UPSCALE_SHOWCASE.before}
              after={UPSCALE_SHOWCASE.after}
              beforeLabel="Low-res original"
              afterLabel="4× upscaled"
            />
            <p className="mt-3 text-center text-xs text-fg-subtle">
              Drag to compare. Arrow keys work too.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Scenes() {
  const featured = SCENE_PRESETS.slice(0, 8);
  const styleImages = Object.values(STYLE_SHOWCASE);

  return (
    <section id="scenes" className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-[13px] font-medium text-accent">Scenes</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {SCENE_PRESETS.length} scenes, from seamless white to festive
          </h2>
          <p className="mt-3 leading-relaxed text-fg-muted">
            Studio backdrops for marketplace listings. Marble, linen and concrete
            for lifestyle shots. Seasonal sets for campaigns you&apos;d otherwise
            reshoot four times a year.
          </p>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {featured.map((scene, index) => (
            <li
              key={scene.id}
              className="group overflow-hidden rounded-[--radius-md] border border-border bg-surface transition-colors hover:border-accent"
            >
              <ClickableImage
                src={styleImages[index % styleImages.length].src}
                alt={`${scene.name} — ${styleImages[index % styleImages.length].alt}`}
                caption={scene.description}
                sizes="(max-width: 640px) 50vw, 25vw"
                className="aspect-[4/3] rounded-none border-0"
                imgClassName="size-full object-cover"
              />
              <div className="p-3">
                <p className="text-[13px] font-medium text-fg">{scene.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-fg-subtle">
                  {scene.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <SampleImageryNote />
      </div>
    </section>
  );
}

/** The interactive demo — runs the product's real prompt logic. */
export function Playground() {
  return (
    <section id="playground" className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-medium text-accent">Try it now</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            See exactly what the engine receives
          </h2>
          <p className="mt-3 leading-relaxed text-fg-muted">
            No sign-up, no mock-up. This runs the same prompt-composition code
            the product uses — change a style and watch the real instruction
            change with it.
          </p>
        </div>

        <div className="mt-10">
          <StylePlayground />
        </div>
      </div>
    </section>
  );
}

const CAPABILITIES = [
  {
    Icon: Package,
    title: "Product Studio",
    body: "Segment, place and light your product in any scene. It is never redrawn — only the world around it is.",
  },
  {
    Icon: Palette,
    title: "Brand kits",
    body: "Your palette, your language, your rules — attached to every generation so output stops arriving off-brand.",
  },
  {
    Icon: Rows3,
    title: "Batch runs",
    body: "Paste a spreadsheet, write one template, generate the whole catalogue. Each row is billed and refunded on its own.",
  },
  {
    Icon: TrendingUp,
    title: "Performance tracking",
    body: "Import how each creative actually performed and sort by ROAS, so the next batch is informed by the last one.",
  },
];

export function Capabilities() {
  return (
    <section id="features" className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-[13px] font-medium text-accent">Capabilities</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Built for catalogues, not one-off images
          </h2>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((item) => (
            <li
              key={item.title}
              className="rounded-[--radius-lg] border border-border bg-surface p-5"
            >
              <span className="grid size-9 place-items-center rounded-[--radius-sm] bg-accent-soft text-accent">
                <item.Icon aria-hidden="true" className="size-4" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function MarketplaceExport() {
  return (
    <section className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="lg:order-2">
            <span className="text-[13px] font-medium text-accent">Export</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Sized for the platform before you upload
            </h2>
            <p className="mt-3 leading-relaxed text-fg-muted">
              Amazon wants 2000×2000 on pure white. Etsy wants 5:4. Instagram
              wants 4:5. Every preset here encodes the platform&apos;s published
              rules, so the upload is accepted first time.
            </p>

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {EXPORT_PRESETS.slice(0, 8).map((preset) => (
                <li
                  key={preset.id}
                  className="flex items-center justify-between gap-2 rounded-[--radius-sm] border border-border px-3 py-2 text-[13px]"
                >
                  <span className="truncate text-fg-muted">{preset.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-fg-subtle">
                    {preset.width}×{preset.height}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:order-1">
            <ClickableImage
              src={TRANSFORM_SHOWCASE.after.src}
              alt={TRANSFORM_SHOWCASE.after.alt}
              sizes="(max-width: 1024px) 100vw, 32rem"
              className="aspect-square"
              imgClassName="size-full object-cover"
            />
            <SampleImageryNote />
          </div>
        </div>
      </div>
    </section>
  );
}

export function GallerySection() {
  return (
    <section className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-[13px] font-medium text-accent">
            Gallery &amp; history
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you make, kept in order
          </h2>
          <p className="mt-3 leading-relaxed text-fg-muted">
            Every generation lands with its full metadata attached — prompt,
            scene, brand kit, seed, dimensions. Favourite the keepers, re-run any
            prompt, export a whole selection at once.
          </p>
        </div>

        <div className="mt-10 columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
          {GALLERY_SHOWCASE.map((image, index) => (
            <div key={image.src} className="break-inside-avoid">
              <ClickableImage
                src={image.src}
                alt={image.alt}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                imgClassName="w-full object-cover"
                className=""
              />
            </div>
          ))}
        </div>
        <SampleImageryNote />
      </div>
    </section>
  );
}

const STEPS = [
  {
    Icon: Package,
    title: "Upload your product",
    body: "One photo on any background. It is segmented automatically, and the panel on the right states the guarantee before you spend anything.",
    screen: "studio" as const,
  },
  {
    Icon: ShieldCheck,
    title: "We build around it",
    body: "The scene is generated, your original pixels are composited back on top, and every opaque pixel is compared against your upload.",
    screen: "pipeline" as const,
  },
  {
    Icon: Rows3,
    title: "Run the whole catalogue",
    body: "Paste a spreadsheet. Columns are detected, the template is previewed against row one, and the cost is priced before the run starts.",
    screen: "batch" as const,
  },
  {
    Icon: Sparkles,
    title: "Track what you've made",
    body: "Credits, usage and every generation in one place, with the full metadata attached to each image.",
    screen: "dashboard" as const,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-medium text-accent">How it works</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            One photo in, a catalogue out
          </h2>
          <p className="mt-4 leading-relaxed text-fg-muted">
            These are screenshots of the actual application — real interface,
            real credit balances, real parsed input. Click any of them to look
            closer.
          </p>
        </div>

        <ol className="mt-12 space-y-14">
          {STEPS.map((step, index) => {
            const screen = APP_SCREENS[step.screen];
            const reversed = index % 2 === 1;
            return (
              <li
                key={step.title}
                className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
              >
                <div className={reversed ? "lg:order-2" : undefined}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-[--radius-sm] bg-accent-soft text-accent">
                      <step.Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="text-xs font-medium tabular-nums text-fg-subtle">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 leading-relaxed text-fg-muted">{step.body}</p>
                </div>

                <div className={reversed ? "lg:order-1" : undefined}>
                  <ClickableImage
                    src={screen.src}
                    alt={screen.alt}
                    caption={`${step.title} — captured from the running application`}
                    sizes="(max-width: 1024px) 100vw, 32rem"
                  />
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-10 text-center text-[11px] text-fg-subtle">
          Screenshots are from a real session. Generated output shown inside the
          app carries a development watermark until an image provider is
          configured.
        </p>
      </div>
    </section>
  );
}

export function PricingSection({ compact = false }: { compact?: boolean }) {
  return (
    <section
      id="pricing"
      className={compact ? "py-4" : "border-b border-border py-16 sm:py-24"}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {!compact ? (
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[13px] font-medium text-accent">Pricing</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              A photoshoot costs $2,000. This starts at{" "}
              {formatPrice(PLANS.STARTER.priceCents)}.
            </h2>
            <p className="mt-3 leading-relaxed text-fg-muted">
              Credits meter what you make: {CREDIT_COSTS.PRODUCT_SCENE} per
              product scene, {CREDIT_COSTS.TEXT_TO_IMAGE} per image,{" "}
              {CREDIT_COSTS.UPSCALE_4X} for a 4× upscale. Failed runs are always
              refunded.
            </p>
          </div>
        ) : null}

        <div className="mt-12">
          <PricingCalculator />
        </div>

        <h3 className="mt-16 text-center text-sm font-semibold text-fg-subtle">
          All plans
        </h3>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const featured = planId === "GROWTH";
            return (
              <div
                key={plan.id}
                className={
                  featured
                    ? "relative flex flex-col rounded-[--radius-lg] border-2 border-accent bg-surface p-5"
                    : "flex flex-col rounded-[--radius-lg] border border-border bg-surface p-5"
                }
              >
                {featured ? (
                  <Badge variant="accent" className="absolute -top-2.5 right-5">
                    Most popular
                  </Badge>
                ) : null}

                <h3 className="text-[15px] font-semibold">{plan.name}</h3>
                <p className="mt-0.5 text-xs text-fg-subtle">{plan.audience}</p>

                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">
                    {formatPrice(plan.priceCents)}
                  </span>
                  <span className="text-sm text-fg-subtle">/mo</span>
                </p>
                <p className="mt-1 text-sm text-fg-muted">{plan.description}</p>

                <Link href="/signup" className="mt-5 block">
                  <Button
                    variant={featured ? "primary" : "secondary"}
                    className="w-full"
                  >
                    {plan.priceCents === 0 ? "Start for free" : `Choose ${plan.name}`}
                  </Button>
                </Link>

                <ul className="mt-5 flex-1 space-y-2">
                  {plan.highlights.map((highlight: string) => (
                    <li key={highlight} className="flex items-start gap-2 text-[13px]">
                      <Check
                        aria-hidden="true"
                        className="mt-0.5 size-3.5 shrink-0 text-accent"
                      />
                      <span className="text-fg-muted">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

export const HOME_FAQS = [
  {
    q: "What does “pixel-identical” actually mean?",
    a: "Your product is cut out of the photo you uploaded and composited back over the generated scene, so those pixels come from your own file rather than from a model. After compositing we compare every fully-opaque product pixel against the original; if any differ, the generation fails and your credits are returned. It's a check the software runs, not a promise we make.",
  },
  {
    q: "How is this different from ChatGPT or Midjourney?",
    a: "Those generate an image that resembles your product — close, but with a warped label or a shifted colour, which is unusable on a product page. They also have no concept of a brand kit, a catalogue batch, or Amazon's image requirements. This is built for listing a hundred SKUs, not for making one nice picture.",
  },
  {
    q: "What's a credit worth?",
    a: `A product scene costs ${CREDIT_COSTS.PRODUCT_SCENE} credits, a plain generated image ${CREDIT_COSTS.TEXT_TO_IMAGE}, an image-to-image transform ${CREDIT_COSTS.IMAGE_TO_IMAGE}, and upscales ${CREDIT_COSTS.UPSCALE_2X} at 2× or ${CREDIT_COSTS.UPSCALE_4X} at 4×. Asking for four images costs four times the per-image price. Starter includes ${PLANS.STARTER.monthlyCredits} credits, roughly 120 product scenes a month.`,
  },
  {
    q: "What happens when a generation fails?",
    a: "Your credits come back automatically. They're reserved when a job starts and refunded in full if anything goes wrong — including when our own pixel check fails. Every movement is recorded in a ledger you can read on the billing page.",
  },
  {
    q: "Can I run a whole catalogue at once?",
    a: "Yes — that's what Batch is for. Paste your spreadsheet, write one prompt template using your column names, and every row becomes its own generation with its own credit transaction. If row 40 fails, only row 40 is refunded.",
  },
  {
    q: "Do you train on my images?",
    a: "No. Your uploads and generations sit in private storage and are served only to you through short-lived signed links. They aren't public, aren't shared, and aren't used to train anything.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Cancel from the billing page and you keep your plan until the end of the period you've already paid for, after which the account returns to Free. Your images stay in your gallery.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <span className="text-[13px] font-medium text-accent">FAQ</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Questions, answered
          </h2>
        </div>

        <div className="mt-10 divide-y divide-border border-y border-border">
          {HOME_FAQS.map((faq) => (
            <details key={faq.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-fg [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span
                  aria-hidden="true"
                  className="grid size-5 shrink-0 place-items-center rounded-full border border-border text-fg-subtle transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 pr-9 text-sm leading-relaxed text-fg-muted">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[--radius-xl] border border-border bg-bg-subtle px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
          <div className="relative mx-auto max-w-xl">
            <Package aria-hidden="true" className="mx-auto size-6 text-accent" />
            <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
              Your next catalogue shoot is one upload away
            </h2>
            <p className="mt-3 leading-relaxed text-fg-muted">
              Start with {PLANS.FREE.monthlyCredits} free credits. Upgrade when
              you need product scenes, brand kits and batch runs.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  Start creating
                </Button>
              </Link>
              <Link href="/pricing" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  See pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
