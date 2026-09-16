import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { MARKETPLACE_GUIDES } from "@/config/marketplace-guides";
import { buildMetadata, seoTitle } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = buildMetadata({
  title: seoTitle("Product Image Size Guide for Every Marketplace"),
  description:
    "Exact image specifications for Amazon, Shopify, Etsy and eBay — sizes, backgrounds, formats, and the mistakes that get listings suppressed.",
  path: "/marketplace-image-requirements",
});

export default function MarketplaceHubPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Image requirements", path: "/marketplace-image-requirements" },
        ])}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Product image requirements, by marketplace
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-fg-muted">
            Every platform enforces different rules, and a listing that breaks
            them is usually suppressed rather than flagged. These guides cover
            the exact specifications, verified against each platform&apos;s own
            documentation.
          </p>
        </header>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {MARKETPLACE_GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/marketplace-image-requirements/${guide.slug}`}
                className="group flex h-full flex-col rounded-[--radius-lg] border border-border bg-surface p-5 transition-colors hover:border-accent"
              >
                <h2 className="text-[15px] font-semibold">{guide.title}</h2>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-fg-muted">
                  {guide.metaDescription}
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
            Export to any of these automatically
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-fg-muted">
            PixelForge AI ships presets for every platform on this page, so the
            image you upload already matches the spec.
          </p>
          <Link href="/signup" className="mt-5 inline-block">
            <Button size="lg">Start creating</Button>
          </Link>
        </section>
      </div>
    </>
  );
}
