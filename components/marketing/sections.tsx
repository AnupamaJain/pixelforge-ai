import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Images,
  Layers,
  Maximize2,
  Palette,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, PLANS } from "@/config/plans";
import { CREDIT_COSTS } from "@/config/credits";
import { STYLE_PRESETS } from "@/config/styles";
import { AbstractTile, WorkspacePreview } from "./preview-art";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 mask-fade-b" />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="accent" className="animate-fade">
            <Sparkles aria-hidden="true" className="size-3" />
            Text-to-image, transforms and upscaling in one place
          </Badge>

          <h1 className="mt-6 animate-in-up text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Create stunning images with AI
          </h1>

          <p
            className="mx-auto mt-5 max-w-xl animate-in-up text-base leading-relaxed text-fg-muted sm:text-lg"
            style={{ animationDelay: "80ms" }}
          >
            Generate, transform, upscale and organize your AI images from one
            simple creative workspace.
          </p>

          <div
            className="mt-8 flex animate-in-up flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "160ms" }}
          >
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Start creating
              </Button>
            </Link>
            <Link href="#features" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Explore features
              </Button>
            </Link>
          </div>

          <p
            className="mt-4 animate-in-up text-xs text-fg-subtle"
            style={{ animationDelay: "240ms" }}
          >
            {PLANS.FREE.monthlyCredits} free credits every month · No card required
          </p>
        </div>

        <div
          className="mt-14 animate-in-up sm:mt-20"
          style={{ animationDelay: "320ms" }}
        >
          <WorkspacePreview />
        </div>
      </div>
    </section>
  );
}

function FeatureSection({
  id,
  eyebrow,
  title,
  description,
  points,
  visual,
  reversed,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  visual: React.ReactNode;
  reversed?: boolean;
}) {
  return (
    <section id={id} className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className={reversed ? "lg:order-2" : undefined}>
            <span className="text-[13px] font-medium text-accent">{eyebrow}</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h2>
            <p className="mt-3 leading-relaxed text-fg-muted">{description}</p>
            <ul className="mt-6 space-y-3">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-accent"
                  />
                  <span className="text-fg-muted">{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={reversed ? "lg:order-1" : undefined}>{visual}</div>
        </div>
      </div>
    </section>
  );
}

export function TextToImage() {
  return (
    <FeatureSection
      id="features"
      eyebrow="Text to image"
      title="Describe it. Watch it take shape."
      description="Write a prompt, pick a look, and generate up to four variations at once. Every control that matters is one click away — and nothing that doesn't apply is shown."
      points={[
        "Six aspect ratios from square to story",
        "Negative prompts to steer away from what you don't want",
        "Seed control for reproducible results",
        "Steps and guidance exposed only when the engine supports them",
      ]}
      visual={
        <div className="grid grid-cols-2 gap-3">
          {[11, 12, 13, 14].map((seed, index) => (
            <div
              key={seed}
              className="overflow-hidden rounded-[--radius-md] border border-border"
              style={{ aspectRatio: index % 3 === 0 ? "3/4" : "1/1" }}
            >
              <AbstractTile seed={seed} className="size-full" />
            </div>
          ))}
        </div>
      }
    />
  );
}

export function ImageToImage() {
  return (
    <FeatureSection
      eyebrow="Image to image"
      title="Start from an image you already have"
      description="Upload a sketch, a photo or an earlier generation and redirect it with a prompt. A strength dial controls how far the result may travel from your source."
      points={[
        "Your original upload is never modified",
        "Strength control from subtle retouch to full reinterpretation",
        "Chain outputs back in as new inputs",
        "Every transform keeps its own metadata and seed",
      ]}
      reversed
      visual={
        <div className="flex items-center gap-3">
          <div className="flex-1 overflow-hidden rounded-[--radius-md] border border-border">
            <AbstractTile seed={21} className="aspect-square size-full" />
          </div>
          <ArrowUpRight
            aria-hidden="true"
            className="size-5 shrink-0 rotate-45 text-fg-subtle"
          />
          <div className="flex-1 overflow-hidden rounded-[--radius-md] border-2 border-accent">
            <AbstractTile seed={22} className="aspect-square size-full" />
          </div>
        </div>
      }
    />
  );
}

export function Upscaling() {
  return (
    <FeatureSection
      eyebrow="AI upscaling"
      title="Print-ready at 2× or 4×"
      description="Enlarge any generation — or any image you upload — with a real super-resolution model. Detail is reconstructed, not just interpolated."
      points={[
        "2× and 4× backed by Real-ESRGAN",
        "Upscale straight from the gallery in one click",
        "Download as PNG or JPEG",
        "Results are saved alongside the original",
      ]}
      visual={
        <div className="relative overflow-hidden rounded-[--radius-md] border border-border">
          <AbstractTile seed={31} className="aspect-[4/3] size-full" />
          <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden border-r-2 border-accent">
            <div
              className="size-full"
              style={{ filter: "blur(3px) saturate(0.85)", transform: "scale(1.02)" }}
            >
              <AbstractTile seed={31} className="aspect-[4/3] size-full" />
            </div>
            <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
              Original
            </span>
          </div>
          <span className="absolute bottom-3 right-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-fg">
            4× upscaled
          </span>
        </div>
      }
    />
  );
}

export function StylePresetsSection() {
  const showcase = STYLE_PRESETS.filter((style) => style.id !== "none");

  return (
    <section className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-[13px] font-medium text-accent">Style presets</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            A consistent look, without the prompt engineering
          </h2>
          <p className="mt-3 leading-relaxed text-fg-muted">
            Each preset carries its own prompt and negative-prompt modifiers plus
            tuned defaults, so switching styles genuinely changes the output
            rather than just the label.
          </p>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {showcase.map((style, index) => (
            <li
              key={style.id}
              className="group overflow-hidden rounded-[--radius-md] border border-border bg-surface transition-colors hover:border-border-strong"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <AbstractTile
                  seed={index + 41}
                  className="size-full transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <p className="text-[13px] font-medium text-fg">{style.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-fg-subtle">
                  {style.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function GallerySection() {
  return (
    <FeatureSection
      eyebrow="Gallery & history"
      title="Everything you make, kept in order"
      description="Every generation lands in a gallery with its full metadata attached. Favourite the keepers, filter down to them, and pull any prompt back into the workspace."
      points={[
        "Prompt, style, model, seed and dimensions on every image",
        "Favourite and filter",
        "Searchable prompt history you can re-run",
        "One-click variations from any past generation",
      ]}
      reversed
      visual={
        <div className="columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
          {[51, 52, 53, 54, 55, 56].map((seed, index) => (
            <div
              key={seed}
              className="overflow-hidden rounded-[--radius-md] border border-border"
              style={{ aspectRatio: index % 3 === 1 ? "3/4" : index % 3 === 2 ? "4/3" : "1/1" }}
            >
              <AbstractTile seed={seed} className="size-full" />
            </div>
          ))}
        </div>
      }
    />
  );
}

const STEPS = [
  {
    Icon: Wand2,
    title: "Describe your image",
    body: "Write a prompt, add a negative prompt if you want to rule things out, and choose an aspect ratio.",
  },
  {
    Icon: Palette,
    title: "Pick a style",
    body: "Twelve presets shape the result — from photorealistic through editorial to watercolour.",
  },
  {
    Icon: Layers,
    title: "Generate and refine",
    body: "Produce up to four variations, then transform or upscale the ones worth keeping.",
  },
  {
    Icon: Images,
    title: "Save and reuse",
    body: "Everything is stored with its metadata, ready to download, favourite or re-run.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-[13px] font-medium text-accent">How it works</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            From blank prompt to finished image
          </h2>
        </div>

        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative">
              <div className="flex size-9 items-center justify-center rounded-[--radius-sm] border border-border bg-surface text-accent">
                <step.Icon aria-hidden="true" className="size-4" />
              </div>
              <p className="mt-4 text-xs font-medium tabular-nums text-fg-subtle">
                Step {index + 1}
              </p>
              <h3 className="mt-1 text-[15px] font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PricingSection({ compact = false }: { compact?: boolean }) {
  const plans = [PLANS.FREE, PLANS.PRO];

  return (
    <section id="pricing" className={compact ? "py-4" : "border-b border-border py-16 sm:py-24"}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {!compact ? (
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[13px] font-medium text-accent">Pricing</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Straightforward, credit-based pricing
            </h2>
            <p className="mt-3 leading-relaxed text-fg-muted">
              One image costs {CREDIT_COSTS.TEXT_TO_IMAGE} credit. Transforms cost{" "}
              {CREDIT_COSTS.IMAGE_TO_IMAGE}. Upscales cost {CREDIT_COSTS.UPSCALE_2X} at
              2× and {CREDIT_COSTS.UPSCALE_4X} at 4×. No surprises.
            </p>
          </div>
        ) : null}

        <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
          {plans.map((plan) => {
            const isPro = plan.id === "PRO";
            return (
              <div
                key={plan.id}
                className={
                  isPro
                    ? "relative rounded-[--radius-lg] border-2 border-accent bg-surface p-6"
                    : "rounded-[--radius-lg] border border-border bg-surface p-6"
                }
              >
                {isPro ? (
                  <Badge variant="accent" className="absolute -top-2.5 right-6">
                    Most popular
                  </Badge>
                ) : null}

                <h3 className="text-[15px] font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-fg-muted">{plan.description}</p>

                <p className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">
                    {formatPrice(plan.priceCents)}
                  </span>
                  <span className="text-sm text-fg-subtle">/month</span>
                </p>

                <Link href="/signup" className="mt-5 block">
                  <Button
                    variant={isPro ? "primary" : "secondary"}
                    className="w-full"
                  >
                    {isPro ? "Upgrade to Pro" : "Start for free"}
                  </Button>
                </Link>

                <ul className="mt-6 space-y-2.5">
                  {plan.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2.5 text-sm">
                      <Check
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-accent"
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

const FAQS = [
  {
    q: "What exactly is a credit?",
    a: `A credit is one unit of generation. One text-to-image output costs ${CREDIT_COSTS.TEXT_TO_IMAGE} credit, an image-to-image transform costs ${CREDIT_COSTS.IMAGE_TO_IMAGE}, a 2× upscale costs ${CREDIT_COSTS.UPSCALE_2X} and a 4× upscale costs ${CREDIT_COSTS.UPSCALE_4X}. Asking for four images costs four times the per-image price.`,
  },
  {
    q: "What happens if a generation fails?",
    a: "Your credits are returned automatically. Credits are reserved when a job starts and refunded in full if the engine errors or times out, so a failed run never costs you anything.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Your allocation is topped up at the start of each billing period. Credits you've already been granted stay on your balance — a new month adds to what you have rather than resetting it to zero.",
  },
  {
    q: "Who owns the images I generate?",
    a: "You do. Images are stored privately in your account and are only ever served to you through short-lived signed links. Nothing is published or shared unless you download and share it yourself.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes. Cancel from the billing page and you keep Pro access until the end of the period you've already paid for, after which the account returns to the Free plan.",
  },
  {
    q: "Which models power the generations?",
    a: "PixelForge AI runs on open-source diffusion models — SDXL for generation and transforms, Real-ESRGAN for upscaling. The platform is engine-agnostic and can run against a hosted provider or a self-hosted generation server.",
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
          {FAQS.map((faq) => (
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
            <Maximize2 aria-hidden="true" className="mx-auto size-6 text-accent" />
            <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
              Your next image is one prompt away
            </h2>
            <p className="mt-3 leading-relaxed text-fg-muted">
              Start with {PLANS.FREE.monthlyCredits} free credits. Upgrade when you
              need transforms, upscaling and higher resolutions.
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
