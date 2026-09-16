import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { INDUSTRIES } from "@/config/industries";
import { buildMetadata, seoTitle } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = buildMetadata({
  title: seoTitle("AI Product Photography by Category"),
  description:
    "How to photograph jewelry, skincare, furniture, apparel and more with AI — keeping your actual product pixel-identical in every generated scene.",
  path: "/product-photography",
});

export default function ProductPhotographyHubPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Product photography", path: "/product-photography" },
        ])}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI product photography, by category
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-fg-muted">
            Every category fails differently under generative tools. Jewelry
            loses its facets, skincare loses its label, electronics gain a port
            that doesn&apos;t exist. These guides cover what goes wrong and the
            approach that avoids it.
          </p>
        </header>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {INDUSTRIES.map((industry) => (
            <li key={industry.slug}>
              <Link
                href={`/product-photography/${industry.slug}`}
                className="group flex h-full flex-col rounded-[--radius-lg] border border-border bg-surface p-5 transition-colors hover:border-accent"
              >
                <h2 className="text-[15px] font-semibold">{industry.name}</h2>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  {industry.audience}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">
                  {industry.headline}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent">
                  Read the guide
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-12 rounded-[--radius-lg] border border-border bg-bg-subtle p-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Your product, pixel-identical, in any scene
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-fg-muted">
            Free credits every month. No card required.
          </p>
          <Link href="/signup" className="mt-5 inline-block">
            <Button size="lg">Start creating</Button>
          </Link>
        </section>
      </div>
    </>
  );
}
