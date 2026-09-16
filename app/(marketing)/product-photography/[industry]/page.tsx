import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { INDUSTRIES, getIndustry } from "@/config/industries";
import { getScene } from "@/config/scenes";
import { STYLE_SHOWCASE, isPlaceholderShowcase } from "@/config/showcase";
import { buildMetadata, seoTitle } from "@/lib/seo/metadata";
import { breadcrumbSchema, faqSchema } from "@/lib/seo/structured-data";
import Image from "next/image";

export function generateStaticParams() {
  return INDUSTRIES.map((industry) => ({ industry: industry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string }>;
}): Promise<Metadata> {
  const { industry: slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return {};

  return buildMetadata({
    title: seoTitle(industry.metaTitle),
    description: industry.metaDescription,
    path: `/product-photography/${industry.slug}`,
  });
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ industry: string }>;
}) {
  const { industry: slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  const scenes = industry.recommendedScenes.map((id) => getScene(id));
  const images = Object.values(STYLE_SHOWCASE);

  return (
    <>
      <JsonLd
        data={[
          faqSchema(industry.faqs),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Product photography", path: "/product-photography" },
            { name: industry.name, path: `/product-photography/${industry.slug}` },
          ]),
        ]}
      />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-fg-subtle">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-fg">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/product-photography" className="hover:text-fg">
                Product photography
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-fg">{industry.name}</li>
          </ol>
        </nav>

        <header>
          <Badge variant="accent">{industry.name}</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {industry.headline}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-fg-muted">
            {industry.intro}
          </p>
        </header>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Why {industry.name.toLowerCase()} is hard to photograph
          </h2>
          <ul className="mt-4 space-y-4">
            {industry.challenges.map((challenge) => (
              <li
                key={challenge.title}
                className="rounded-[--radius-md] border border-border p-4"
              >
                <h3 className="text-[15px] font-semibold">{challenge.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                  {challenge.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-fg-subtle">
            Typical cost of a conventional shoot:{" "}
            <strong className="text-fg">{industry.traditionalCost}</strong>.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            The approach that works
          </h2>
          <p className="mt-3 leading-relaxed text-fg-muted">
            Photograph each item once on a plain background. From that single
            shot, generate the scene around it — your product is cut out and
            composited back, so its pixels are never model output. Every opaque
            pixel is then verified against your original; if any changed, the
            run fails and your credits are returned.
          </p>
          <ul className="mt-4 space-y-2.5">
            {[
              "Your product is never redrawn, only its surroundings",
              "Labels, finishes and details stay exactly as photographed",
              "One shoot covers every seasonal refresh",
              "Batch the whole catalogue from a spreadsheet",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm">
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-accent"
                />
                <span className="text-fg-muted">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Scenes that suit {industry.name.toLowerCase()}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {scenes.map((scene, index) => (
              <li
                key={scene.id}
                className="overflow-hidden rounded-[--radius-md] border border-border"
              >
                <div className="relative aspect-square">
                  <Image
                    src={images[index % images.length].src}
                    alt={images[index % images.length].alt}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <p className="p-2.5 text-[13px] font-medium">{scene.name}</p>
              </li>
            ))}
          </ul>
          {isPlaceholderShowcase() ? (
            <p className="mt-3 text-[11px] text-fg-subtle">
              Sample imagery for layout purposes — not output from this
              application.
            </p>
          ) : null}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Prompts to start with
          </h2>
          <ul className="mt-4 space-y-2">
            {industry.promptExamples.map((example) => (
              <li
                key={example}
                className="rounded-[--radius-sm] border border-border bg-bg-subtle px-3.5 py-2.5 font-mono text-[13px] text-fg-muted"
              >
                {example}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mt-4 divide-y divide-border border-y border-border">
            {industry.faqs.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
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
        </section>

        <section className="mt-10 rounded-[--radius-lg] border border-border bg-bg-subtle p-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Try it on your own {industry.name.toLowerCase()}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
            Free credits every month, no card required.
          </p>
          <Link href="/signup" className="mt-5 inline-block">
            <Button size="lg">
              Start creating
              <ArrowRight aria-hidden="true" />
            </Button>
          </Link>
        </section>

        <nav aria-label="Other categories" className="mt-10">
          <h2 className="text-sm font-semibold">Other categories</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {INDUSTRIES.filter((other) => other.slug !== industry.slug).map(
              (other) => (
                <li key={other.slug}>
                  <Link
                    href={`/product-photography/${other.slug}`}
                    className="inline-block rounded-full border border-border px-3 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    {other.name}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
      </article>
    </>
  );
}
