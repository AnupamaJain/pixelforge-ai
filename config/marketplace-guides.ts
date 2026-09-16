/**
 * Marketplace image specification guides.
 *
 * These drive /marketplace-image-requirements/[platform] — the highest-value
 * SEO cluster, because the person searching "amazon product image
 * requirements" is about to need product images.
 *
 * Specifications were taken from each platform's published seller
 * documentation. They change: re-verify before each release, and keep
 * `lastVerified` honest. A guide page that is wrong is worse than no page.
 */

export interface MarketplaceGuide {
  slug: string;
  platform: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  lastVerified: string;
  sourceUrl: string;
  specs: { label: string; value: string; note?: string }[];
  rules: { rule: string; detail: string }[];
  mistakes: { mistake: string; fix: string }[];
  exportPresetId: string;
  faqs: { q: string; a: string }[];
}

export const MARKETPLACE_GUIDES: MarketplaceGuide[] = [
  {
    slug: "amazon",
    platform: "Amazon",
    title: "Amazon product image requirements",
    metaTitle: "Amazon Product Image Requirements (2026)",
    metaDescription:
      "Amazon's exact image rules: 2000×2000px, pure white RGB 255,255,255 main image, 85% frame fill. Plus the transparent-PNG mistake that turns backgrounds black.",
    intro:
      "Amazon enforces its main-image rules with automated scanning, so a listing that breaks them gets suppressed rather than warned. These are the specifications that actually matter, and the one mistake that catches most sellers out.",
    lastVerified: "2026-09-16",
    sourceUrl: "https://sellercentral.amazon.com/help/hub/reference/G1881",
    specs: [
      { label: "Recommended size", value: "2000 × 2000 px", note: "Enables full zoom" },
      { label: "Minimum for zoom", value: "1000 × 1000 px" },
      { label: "Optimal for zoom", value: "1600 px on the longest side" },
      { label: "Main image background", value: "Pure white — RGB 255, 255, 255", note: "Not off-white, not light grey" },
      { label: "Frame fill", value: "Product occupies ~85% of the frame" },
      { label: "Accepted formats", value: "JPEG, PNG, TIFF", note: "JPEG is safest" },
      { label: "Colour profile", value: "sRGB or CMYK" },
    ],
    rules: [
      {
        rule: "The white rule applies only to the main image",
        detail:
          "Position 1 must be pure white. Positions 2–7 can use lifestyle scenes, coloured backgrounds or gradients — which is where scene imagery earns its place.",
      },
      {
        rule: "No text or promotional graphics on the main image",
        detail:
          "“Best Seller”, “50% Off”, feature callouts and badges all belong on secondary images. Amazon suppresses main images that carry them.",
      },
      {
        rule: "The product must be the entire product",
        detail:
          "No props that aren't included in the purchase, no cropped edges, and nothing that misrepresents what arrives in the box.",
      },
      {
        rule: "Exact white is checked automatically",
        detail:
          "RGB 250,250,250 reads as off-white to Amazon's scanner. Export to exactly 255,255,255 or the listing can be flagged.",
      },
    ],
    mistakes: [
      {
        mistake: "Uploading a transparent PNG",
        fix: "Amazon frequently converts transparent pixels to black, turning the background dark. Always flatten onto solid white and export as JPEG.",
      },
      {
        mistake: "Using “nearly white” from a photo studio",
        fix: "Studio white often lands around 248–252. Composite onto exact 255,255,255 rather than relying on the capture.",
      },
      {
        mistake: "Uploading below 1000px",
        fix: "Zoom is disabled below 1000px, and listings without zoom convert measurably worse. Use 2000×2000.",
      },
      {
        mistake: "Product too small in frame",
        fix: "Aim for roughly 85% fill. Excess white margin makes the thumbnail look empty in search results.",
      },
    ],
    exportPresetId: "amazon-main",
    faqs: [
      {
        q: "What size should an Amazon product image be?",
        a: "2000 × 2000 pixels is recommended. The minimum for zoom to work is 1000 × 1000, and 1600px on the longest side is considered optimal. Larger images give buyers a usable zoom, which correlates with higher conversion.",
      },
      {
        q: "Does the Amazon main image have to be white?",
        a: "Yes — pure white, RGB 255, 255, 255. Off-white and light grey are rejected by automated scanning. The requirement applies only to the main image; positions 2 to 7 can use any background.",
      },
      {
        q: "Can I use AI-generated images on Amazon?",
        a: "Amazon's policy is about accuracy, not how an image was made: it must show the actual product being sold, without misrepresentation. That is exactly why compositing your real product into a generated scene is safer than generating an approximation of it.",
      },
      {
        q: "Why did my Amazon image background turn black?",
        a: "You almost certainly uploaded a transparent PNG. Amazon's processing often renders transparency as black. Flatten onto solid white and re-upload as JPEG.",
      },
    ],
  },

  {
    slug: "shopify",
    platform: "Shopify",
    title: "Shopify product image requirements",
    metaTitle: "Shopify Product Image Size Guide (2026)",
    metaDescription:
      "Shopify product image specs: 2048×2048px recommended, up to 4472px, 20MB limit — and why keeping files under 500KB matters more than resolution.",
    intro:
      "Shopify is far more permissive than the marketplaces, which means the constraint isn't compliance — it's page speed. Oversized images are the most common cause of a slow product page, and slow product pages lose sales.",
    lastVerified: "2026-09-16",
    sourceUrl: "https://help.shopify.com/en/manual/products/product-media",
    specs: [
      { label: "Recommended size", value: "2048 × 2048 px", note: "Shopify's own guidance" },
      { label: "Maximum size", value: "4472 × 4472 px" },
      { label: "Maximum file size", value: "20 MB" },
      { label: "Practical file size", value: "Under 500 KB", note: "For page-speed reasons" },
      { label: "Accepted formats", value: "JPEG, PNG, GIF, WebP" },
      { label: "Aspect ratio", value: "Square (1:1) for consistent grids" },
    ],
    rules: [
      {
        rule: "Keep one aspect ratio across the catalogue",
        detail:
          "Shopify themes crop to a fixed ratio. Mixing square and portrait images makes collection grids look ragged, which reads as low quality.",
      },
      {
        rule: "File size beats resolution",
        detail:
          "The 20MB ceiling is not a target. Under 500KB per image keeps Largest Contentful Paint healthy, and LCP is a ranking factor as well as a conversion one.",
      },
      {
        rule: "WebP is supported",
        detail:
          "WebP typically saves 25–35% over JPEG at the same visual quality, with full support across current browsers.",
      },
    ],
    mistakes: [
      {
        mistake: "Uploading 4472px originals straight from a camera",
        fix: "Resize to 2048×2048 before uploading. Shopify serves responsive variants, but a huge original still inflates your storage and initial processing.",
      },
      {
        mistake: "Mixing aspect ratios in one collection",
        fix: "Pick square and stick to it. Consistency matters more than any individual crop.",
      },
      {
        mistake: "Ignoring alt text",
        fix: "Alt text drives Google Images traffic and accessibility. Describe the product plainly rather than stuffing keywords.",
      },
    ],
    exportPresetId: "shopify-square",
    faqs: [
      {
        q: "What is the best image size for Shopify?",
        a: "2048 × 2048 pixels, square. Shopify accepts up to 4472 × 4472 and 20MB, but 2048 square balances quality against page speed and matches how most themes crop.",
      },
      {
        q: "Should Shopify product images be JPEG or WebP?",
        a: "WebP if your theme supports it — typically 25–35% smaller at equivalent quality. JPEG remains the safe default and Shopify serves optimised variants either way.",
      },
      {
        q: "Do Shopify product images need a white background?",
        a: "No. Shopify imposes no background requirement. A consistent background across the catalogue still looks more professional, and white remains the convention for the primary image.",
      },
    ],
  },

  {
    slug: "etsy",
    platform: "Etsy",
    title: "Etsy listing photo requirements",
    metaTitle: "Etsy Listing Photo Size & Requirements (2026)",
    metaDescription:
      "Etsy photo specs: 2000px minimum on the longest side, 635px absolute floor for the first image, and the 1MB upload limit that quietly fails on slow connections.",
    intro:
      "Etsy ranks listings partly on photo quality signals, and the first image does most of the work in a crowded search grid. The specifications are loose; the practical constraints are tighter than they look.",
    lastVerified: "2026-09-16",
    sourceUrl:
      "https://help.etsy.com/hc/en-us/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop",
    specs: [
      { label: "Recommended", value: "2000 px or more on the shortest side" },
      { label: "First image minimum", value: "635 px wide", note: "Below this, listings rank lower" },
      { label: "Practical file size", value: "Under 1 MB", note: "Larger uploads can silently fail" },
      { label: "Accepted formats", value: "JPEG, PNG, GIF" },
      { label: "Images per listing", value: "Up to 10" },
      { label: "Display ratio", value: "4:3 landscape crops best" },
    ],
    rules: [
      {
        rule: "The first photo decides the click",
        detail:
          "It is the only image most buyers see in search. Etsy explicitly notes that listings whose first image is under 635px wide appear lower in results.",
      },
      {
        rule: "Use all ten slots",
        detail:
          "Scale, detail, packaging and in-use shots each answer a different objection. Listings with more photos convert better.",
      },
      {
        rule: "Show scale explicitly",
        detail:
          "Handmade buyers consistently misjudge size. One image with a familiar reference object prevents a large share of returns.",
      },
    ],
    mistakes: [
      {
        mistake: "Uploading files over 1MB on a slow connection",
        fix: "Uploads can fail part-way without a clear error. Compress to well under 1MB before uploading.",
      },
      {
        mistake: "A portrait first image",
        fix: "Etsy crops search thumbnails to landscape. A tall first image gets its top and bottom cut off.",
      },
      {
        mistake: "Busy props competing with the product",
        fix: "At thumbnail size, a cluttered scene becomes visual noise. Keep the first image clean and let later images add context.",
      },
    ],
    exportPresetId: "etsy-listing",
    faqs: [
      {
        q: "What size should Etsy listing photos be?",
        a: "At least 2000 pixels on the shortest side. The hard floor for the first photo is 635 pixels wide — below that, Etsy ranks the listing lower. Keep files under 1MB so uploads complete reliably.",
      },
      {
        q: "What aspect ratio does Etsy use?",
        a: "Etsy crops search thumbnails to landscape, so roughly 4:3 or 5:4 is safest for the first image. Later images can use any ratio.",
      },
      {
        q: "Are AI-generated photos allowed on Etsy?",
        a: "Etsy requires listing photos to accurately represent the actual item. Compositing your real product into a generated scene keeps the product itself truthful — but check Etsy's current handmade policy for your category before relying on it.",
      },
    ],
  },

  {
    slug: "ebay",
    platform: "eBay",
    title: "eBay picture requirements",
    metaTitle: "eBay Picture Size & Requirements (2026)",
    metaDescription:
      "eBay image specs: 1600px recommended on the longest side, 500px minimum, 12 free photos per listing, and no added borders or text.",
    intro:
      "eBay's rules are the most permissive of the major marketplaces, but it enforces one thing strictly: no added text, borders or watermarks on listing photos.",
    lastVerified: "2026-09-16",
    sourceUrl: "https://www.ebay.com/help/selling/listings/picture-video-options",
    specs: [
      { label: "Recommended", value: "1600 px on the longest side" },
      { label: "Minimum", value: "500 px on the longest side" },
      { label: "Maximum", value: "9000 px on the longest side" },
      { label: "Free photos per listing", value: "Up to 12" },
      { label: "Accepted formats", value: "JPEG, PNG, TIFF, BMP, GIF" },
      { label: "Zoom threshold", value: "800 px minimum" },
    ],
    rules: [
      {
        rule: "No borders, text or watermarks",
        detail:
          "eBay prohibits added graphics on listing photos. Seller-added borders and promotional text are the most common cause of a removed image.",
      },
      {
        rule: "1600px unlocks proper zoom",
        detail:
          "Zoom requires at least 800px, but 1600px gives buyers a genuinely useful close-up — which matters most for used and collectible items.",
      },
      {
        rule: "Photograph actual condition",
        detail:
          "For anything not new, buyers expect honest images of wear. Accurate condition photos are the cheapest defence against a not-as-described claim.",
      },
    ],
    mistakes: [
      {
        mistake: "Adding a watermark to prevent image theft",
        fix: "eBay removes watermarked images. Use its own photo hosting instead.",
      },
      {
        mistake: "Uploading tiny images from a phone message",
        fix: "Below 500px the image is rejected outright, and below 800px zoom is disabled.",
      },
      {
        mistake: "Using only stock manufacturer photos on a used item",
        fix: "eBay requires actual photos for used goods, and buyers open disputes when what arrives doesn't match.",
      },
    ],
    exportPresetId: "ebay-listing",
    faqs: [
      {
        q: "What size should eBay pictures be?",
        a: "1600 pixels on the longest side is recommended. The minimum accepted is 500px, and zoom requires at least 800px. eBay includes up to 12 photos per listing at no cost.",
      },
      {
        q: "Can I put text or a logo on eBay photos?",
        a: "No. eBay prohibits seller-added borders, text and watermarks on listing images, and removes images that carry them.",
      },
    ],
  },
];

export function getMarketplaceGuide(slug: string): MarketplaceGuide | undefined {
  return MARKETPLACE_GUIDES.find((guide) => guide.slug === slug);
}

export const MARKETPLACE_SLUGS = MARKETPLACE_GUIDES.map((guide) => guide.slug);
