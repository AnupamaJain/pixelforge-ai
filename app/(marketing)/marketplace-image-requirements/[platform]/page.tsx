import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import {
  MARKETPLACE_GUIDES,
  getMarketplaceGuide,
} from "@/config/marketplace-guides";
import { getExportPreset } from "@/config/marketplace";
import { buildMetadata, seoTitle } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  faqSchema,
  howToSchema,
} from "@/lib/seo/structured-data";
import { formatDateTime } from "@/lib/utils";

export function generateStaticParams() {
  return MARKETPLACE_GUIDES.map((guide) => ({ platform: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string }>;
}): Promise<Metadata> {
  const { platform } = await params;
  const guide = getMarketplaceGuide(platform);
  if (!guide) return {};

  return buildMetadata({
    title: seoTitle(guide.metaTitle),
    description: guide.metaDescription,
    path: `/marketplace-image-requirements/${guide.slug}`,
    type: "article",
    modifiedTime: guide.lastVerified,
  });
}

export default async function MarketplaceGuidePage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  const guide = getMarketplaceGuide(platform);
  if (!guide) notFound();

  const preset = getExportPreset(guide.exportPresetId);

  return (
    <>
      <JsonLd
        data={[
          faqSchema(guide.faqs),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Image requirements", path: "/marketplace-image-requirements" },
            {
              name: guide.platform,
              path: `/marketplace-image-requirements/${guide.slug}`,
            },
          ]),
          howToSchema({
            name: `How to prepare images for ${guide.platform}`,
            description: guide.metaDescription,
            steps: guide.rules.map((rule) => ({
              name: rule.rule,
              text: rule.detail,
            })),
          }),
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
              <Link
                href="/marketplace-image-requirements"
                className="hover:text-fg"
              >
                Image requirements
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-fg">{guide.platform}</li>
          </ol>
        </nav>

        <header>
          <Badge variant="accent">{guide.platform}</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {guide.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-fg-muted">
            {guide.intro}
          </p>
          <p className="mt-4 text-xs text-fg-subtle">
            Specifications verified {formatDateTime(guide.lastVerified)} ·{" "}
            <a
              href={guide.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              Official documentation
              <ExternalLink aria-hidden="true" className="size-3" />
            </a>
          </p>
        </header>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            {guide.platform} image specifications
          </h2>
          <div className="mt-4 overflow-hidden rounded-[--radius-md] border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                {guide.platform} product image specifications
              </caption>
              <tbody className="divide-y divide-border">
                {guide.specs.map((spec) => (
                  <tr key={spec.label}>
                    <th
                      scope="row"
                      className="w-2/5 bg-bg-subtle px-4 py-3 text-left font-medium text-fg-muted"
                    >
                      {spec.label}
                    </th>
                    <td className="px-4 py-3">
                      <span className="font-medium text-fg">{spec.value}</span>
                      {spec.note ? (
                        <span className="block text-xs text-fg-subtle">
                          {spec.note}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Rules that actually get enforced
          </h2>
          <ul className="mt-4 space-y-4">
            {guide.rules.map((rule) => (
              <li
                key={rule.rule}
                className="rounded-[--radius-md] border border-border p-4"
              >
                <h3 className="flex items-start gap-2.5 text-[15px] font-semibold">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-accent"
                  />
                  {rule.rule}
                </h3>
                <p className="mt-1.5 pl-6 text-sm leading-relaxed text-fg-muted">
                  {rule.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Mistakes that get listings suppressed
          </h2>
          <ul className="mt-4 space-y-4">
            {guide.mistakes.map((item) => (
              <li
                key={item.mistake}
                className="rounded-[--radius-md] border border-warning/30 bg-warning/5 p-4"
              >
                <h3 className="flex items-start gap-2.5 text-[15px] font-semibold">
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-warning"
                  />
                  {item.mistake}
                </h3>
                <p className="mt-1.5 pl-6 text-sm leading-relaxed text-fg-muted">
                  {item.fix}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {preset ? (
          <section className="mt-10 rounded-[--radius-lg] border border-border bg-bg-subtle p-6">
            <h2 className="text-xl font-semibold tracking-tight">
              Export to {guide.platform} spec automatically
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              PixelForge AI ships a{" "}
              <strong className="text-fg">{preset.name}</strong> preset that
              renders at {preset.width}×{preset.height} with a{" "}
              {preset.fit === "contain" ? "padded" : "cropped"} fit on{" "}
              {preset.background === "#FFFFFF" ? "pure white" : preset.background},
              exported as {preset.format.toUpperCase()}. {preset.notes}
            </p>
            <Link href="/signup" className="mt-4 inline-block">
              <Button>
                Try it free
                <ArrowRight aria-hidden="true" />
              </Button>
            </Link>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mt-4 divide-y divide-border border-y border-border">
            {guide.faqs.map((faq) => (
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

        <nav aria-label="Other platforms" className="mt-10">
          <h2 className="text-sm font-semibold">Other marketplaces</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {MARKETPLACE_GUIDES.filter((other) => other.slug !== guide.slug).map(
              (other) => (
                <li key={other.slug}>
                  <Link
                    href={`/marketplace-image-requirements/${other.slug}`}
                    className="inline-block rounded-full border border-border px-3 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    {other.platform} image requirements
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
