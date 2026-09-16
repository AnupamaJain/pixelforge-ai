/**
 * Keyword and SEO strategy.
 *
 * ── HONEST FRAMING ──────────────────────────────────────────────────────────
 * No one can guarantee a #1 Google ranking. Position depends on domain
 * authority, backlinks, competitor behaviour and algorithm updates — none of
 * which live in this repository. What code *can* control is: crawlability,
 * structured data, page speed, internal linking, and whether a page genuinely
 * answers the query better than the ones currently ranking.
 *
 * Volume and difficulty figures below are DIRECTIONAL ESTIMATES derived from
 * SERP inspection, not measurements from Ahrefs/SEMrush. Validate them in
 * Google Search Console and a real keyword tool before betting spend on them.
 *
 * ── STRATEGY ────────────────────────────────────────────────────────────────
 * Do not chase "ai image generator". That SERP is owned by companies with
 * eight-figure marketing budgets and years of domain authority; a new site
 * cannot win it, and the traffic converts badly anyway.
 *
 * Win the long tail instead. Three clusters, in priority order:
 *
 *   1. MARKETPLACE SPECS — "amazon product image requirements". Commercial
 *      intent, stable demand, and the current SERP is full of small AI-tool
 *      blogs, which means it is winnable with a genuinely better page.
 *   2. INDUSTRY + USE CASE — "product photography for jewelry". Lower volume,
 *      far higher intent, very little quality competition.
 *   3. COMPARISON / ALTERNATIVE — "photoroom alternative". High intent, but
 *      only attempt once you have something substantive to compare.
 *
 * Keyword stuffing is counter-productive: Google's spam policies treat it as a
 * ranking signal against you. Each term below maps to ONE page that earns it.
 */

export type SearchIntent = "informational" | "commercial" | "transactional";
export type Difficulty = "low" | "medium" | "high" | "very-high";

export interface Keyword {
  term: string;
  intent: SearchIntent;
  /** Directional estimate of competitiveness. See the note above. */
  difficulty: Difficulty;
  /** The single page that targets this term. */
  target: string;
  notes?: string;
}

/**
 * Cluster 1 — marketplace specifications.
 * Highest priority: proven demand, weak incumbents, and it puts us in front of
 * exactly the person who is about to need product images.
 */
export const MARKETPLACE_KEYWORDS: Keyword[] = [
  {
    term: "amazon product image requirements",
    intent: "informational",
    difficulty: "medium",
    target: "/marketplace-image-requirements/amazon",
    notes: "The anchor page. Current SERP is small AI-tool blogs — beatable with real depth.",
  },
  {
    term: "amazon main image white background",
    intent: "informational",
    difficulty: "low",
    target: "/marketplace-image-requirements/amazon",
    notes: "Exact-white RGB 255,255,255 is the detail most pages get wrong.",
  },
  {
    term: "amazon image size 2000x2000",
    intent: "informational",
    difficulty: "low",
    target: "/marketplace-image-requirements/amazon",
  },
  {
    term: "shopify product image size",
    intent: "informational",
    difficulty: "medium",
    target: "/marketplace-image-requirements/shopify",
  },
  {
    term: "etsy listing photo size",
    intent: "informational",
    difficulty: "low",
    target: "/marketplace-image-requirements/etsy",
  },
  {
    term: "ebay picture size requirements",
    intent: "informational",
    difficulty: "low",
    target: "/marketplace-image-requirements/ebay",
  },
  {
    term: "product image size guide ecommerce",
    intent: "informational",
    difficulty: "medium",
    target: "/marketplace-image-requirements",
    notes: "Hub page. Links to every platform page and captures the generic query.",
  },
];

/**
 * Cluster 2 — industry and use case.
 * Lower volume, much higher intent, and almost no well-made competing pages.
 */
export const INDUSTRY_KEYWORDS: Keyword[] = [
  {
    term: "ai product photography",
    intent: "commercial",
    difficulty: "high",
    target: "/",
    notes: "Head term. Realistic target is page 1 within 6-12 months, not week one.",
  },
  {
    term: "jewelry product photography ai",
    intent: "commercial",
    difficulty: "low",
    target: "/product-photography/jewelry",
    notes: "Best beachhead: reflective surfaces are where generic tools visibly fail.",
  },
  {
    term: "skincare product photography ai",
    intent: "commercial",
    difficulty: "low",
    target: "/product-photography/skincare",
  },
  {
    term: "furniture product photos ai",
    intent: "commercial",
    difficulty: "low",
    target: "/product-photography/furniture",
  },
  {
    term: "candle product photography",
    intent: "commercial",
    difficulty: "low",
    target: "/product-photography/candles",
  },
  {
    term: "food product photography ai",
    intent: "commercial",
    difficulty: "medium",
    target: "/product-photography/food-beverage",
  },
  {
    term: "apparel product photography ai",
    intent: "commercial",
    difficulty: "medium",
    target: "/product-photography/apparel",
  },
  {
    term: "electronics product photography",
    intent: "commercial",
    difficulty: "low",
    target: "/product-photography/electronics",
  },
  {
    term: "cosmetics product photography ai",
    intent: "commercial",
    difficulty: "low",
    target: "/product-photography/skincare",
    notes: "Served by the Skincare & Beauty page. Split into its own page only if Search Console shows the terms diverging.",
  },
  {
    term: "home goods product photography",
    intent: "commercial",
    difficulty: "low",
    target: "/product-photography/home-goods",
  },
];

/**
 * Cluster 3 — problem-aware and bottom-of-funnel.
 * These convert best; they are what someone types when they have the problem.
 */
export const PROBLEM_KEYWORDS: Keyword[] = [
  {
    term: "product photography cost alternative",
    intent: "commercial",
    difficulty: "low",
    target: "/product-photography-cost",
    notes: "Anchors the $200-5,000 per shoot comparison that justifies the price.",
  },
  {
    term: "ai product photos without photoshoot",
    intent: "commercial",
    difficulty: "low",
    target: "/",
  },
  {
    term: "bulk product image generation",
    intent: "transactional",
    difficulty: "low",
    target: "/batch-product-images",
  },
  {
    term: "product photo background generator",
    intent: "transactional",
    difficulty: "medium",
    target: "/",
  },
  {
    term: "keep product consistent ai images",
    intent: "commercial",
    difficulty: "low",
    target: "/pixel-identical",
    notes: "Our actual differentiator. Low volume, but it is the deciding question.",
  },
];

export const ALL_KEYWORDS: Keyword[] = [
  ...MARKETPLACE_KEYWORDS,
  ...INDUSTRY_KEYWORDS,
  ...PROBLEM_KEYWORDS,
];

/** Terms deliberately NOT targeted, and why. */
export const EXCLUDED_KEYWORDS: { term: string; reason: string }[] = [
  {
    term: "ai image generator",
    reason:
      "Owned by Midjourney, OpenAI, Canva and Adobe. Unwinnable for a new domain, and the traffic is hobbyists rather than buyers.",
  },
  {
    term: "free ai image generator",
    reason:
      "Attracts people who will never pay. High bounce, no revenue, and it dilutes topical relevance.",
  },
  {
    term: "midjourney alternative",
    reason:
      "Wrong audience — Midjourney users want art, not catalogue images. Poor fit converts badly.",
  },
  {
    term: "stable diffusion online",
    reason:
      "Technology-led rather than problem-led. Attracts tinkerers, not sellers with a budget.",
  },
];

/** Site-wide SEO constants. */
export const SITE = {
  name: "PixelForge AI",
  tagline: "Product photography without the photoshoot",
  description:
    "Turn one product photo into marketplace-ready scenes. Your product stays pixel-identical in every image — verified, not promised.",
  twitter: "@pixelforgeai",
  locale: "en_US",
} as const;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function canonical(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
