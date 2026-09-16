import type { Metadata } from "next";
import { SITE, canonical, siteUrl } from "@/config/seo";

/**
 * Metadata builder.
 *
 * Every page gets a canonical URL, an Open Graph card and a Twitter card.
 * Titles stay under ~60 characters and descriptions under ~155 so Google
 * doesn't truncate them in the SERP — a truncated description costs clicks
 * regardless of position.
 */

export interface PageSeo {
  title: string;
  description: string;
  path: string;
  /** Defaults to the generated OG image for the page. */
  image?: string;
  /** Marks a page as non-indexable (app screens, auth, billing). */
  noIndex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}

export function buildMetadata(seo: PageSeo): Metadata {
  const url = canonical(seo.path);
  const image = seo.image ?? `${siteUrl()}/opengraph-image`;

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: url },
    robots: seo.noIndex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      type: seo.type ?? "website",
      images: [{ url: image, width: 1200, height: 630, alt: seo.title }],
      ...(seo.publishedTime ? { publishedTime: seo.publishedTime } : {}),
      ...(seo.modifiedTime ? { modifiedTime: seo.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [image],
      creator: SITE.twitter,
    },
  };
}

/** Trims a title to the length Google actually displays. */
export function seoTitle(title: string): string {
  const suffix = ` · ${SITE.name}`;
  const budget = 60 - suffix.length;
  return title.length > budget
    ? `${title.slice(0, budget - 1).trimEnd()}…${suffix}`
    : `${title}${suffix}`;
}
