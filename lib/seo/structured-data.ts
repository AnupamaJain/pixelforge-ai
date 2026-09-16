import { PLANS, PLAN_ORDER, formatPrice } from "@/config/plans";
import { SITE, canonical, siteUrl } from "@/config/seo";

/**
 * JSON-LD structured data.
 *
 * Structured data doesn't lift rankings directly, but it decides whether you
 * get rich results — FAQ accordions, breadcrumbs, price and rating chips — and
 * those materially change click-through at the same position.
 *
 * Every helper returns a plain object; render it with
 * <script type="application/ld+json"> via <JsonLd />.
 */

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: siteUrl(),
    logo: `${siteUrl()}/icon.png`,
    description: SITE.description,
    sameAs: [] as string[],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: siteUrl(),
    description: SITE.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl()}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** SoftwareApplication with the full pricing ladder as offers. */
export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "DesignApplication",
    applicationSubCategory: "Product Photography",
    operatingSystem: "Web",
    url: siteUrl(),
    description: SITE.description,
    offers: PLAN_ORDER.map((planId) => {
      const plan = PLANS[planId];
      return {
        "@type": "Offer",
        name: plan.name,
        price: (plan.priceCents / 100).toFixed(2),
        priceCurrency: "USD",
        description: plan.description,
        url: canonical("/pricing"),
        availability: "https://schema.org/InStock",
      };
    }),
    featureList: [
      "Pixel-identical product compositing",
      "AI product scene generation",
      "Background removal",
      "Brand kits",
      "Batch generation from CSV",
      "Marketplace export presets",
      "AI upscaling",
    ],
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export function breadcrumbSchema(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: canonical(crumb.path),
    })),
  };
}

/** HowTo markup for the marketplace guides — eligible for rich results. */
export function howToSchema(params: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: params.name,
    description: params.description,
    step: params.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function articleSchema(params: {
  headline: string;
  description: string;
  path: string;
  published: string;
  modified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.headline,
    description: params.description,
    url: canonical(params.path),
    datePublished: params.published,
    dateModified: params.modified ?? params.published,
    author: { "@type": "Organization", name: SITE.name, url: siteUrl() },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: `${siteUrl()}/icon.png` },
    },
  };
}
