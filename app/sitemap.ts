import type { MetadataRoute } from "next";

import { INDUSTRIES } from "@/config/industries";
import { MARKETPLACE_GUIDES } from "@/config/marketplace-guides";
import { siteUrl } from "@/config/seo";

/**
 * Sitemap.
 *
 * Only public, indexable pages appear here. Authenticated app screens, auth
 * flows and API routes are deliberately excluded — listing a page that returns
 * a redirect wastes crawl budget and can suppress the pages that matter.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/marketplace-image-requirements`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/product-photography`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const guides: MetadataRoute.Sitemap = MARKETPLACE_GUIDES.map((guide) => ({
    url: `${base}/marketplace-image-requirements/${guide.slug}`,
    lastModified: new Date(guide.lastVerified),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const industries: MetadataRoute.Sitemap = INDUSTRIES.map((industry) => ({
    url: `${base}/product-photography/${industry.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...core, ...guides, ...industries];
}
