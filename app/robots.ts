import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/seo";

/**
 * robots.txt
 *
 * The app itself is disallowed: those routes require a session, so crawling
 * them yields redirects and burns crawl budget that should go to the
 * marketing and guide pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/app",
          "/generate",
          "/product-studio",
          "/image-to-image",
          "/upscale",
          "/batch",
          "/brand-kits",
          "/gallery",
          "/history",
          "/settings",
          "/billing",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/auth/",
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
