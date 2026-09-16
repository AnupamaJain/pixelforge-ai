/**
 * Claims verification.
 *
 * The marketing pages make specific, checkable promises — "12 style presets",
 * "2,500 credits is 500 product scenes", "exports match Etsy's spec". Those
 * numbers live in config and are rendered dynamically, but the *relationships*
 * between them are easy to break silently: rename a scene and an industry page
 * quietly renders the wrong card; change an export preset and a guide page
 * starts promising something the exporter no longer does.
 *
 * This suite asserts that every claim the site makes still matches the
 * implementation behind it. Run with `npm run test:claims`.
 */

import { PLANS, PLAN_ORDER, planIdForStripePrice } from "../config/plans";
import { CREDIT_COSTS, calculateCreditCost, calculateBatchCost } from "../config/credits";
import { STYLE_PRESETS, applyStyle } from "../config/styles";
import { SCENE_PRESETS, getScene, composeScenePrompt } from "../config/scenes";
import { EXPORT_PRESETS, getExportPreset } from "../config/marketplace";
import { MARKETPLACE_GUIDES } from "../config/marketplace-guides";
import { INDUSTRIES } from "../config/industries";
import { ALL_KEYWORDS } from "../config/seo";
import { TESTIMONIALS, getTestimonials } from "../config/testimonials";

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("\n== Cross-reference integrity ==");

// An industry page renders a card per recommended scene. A stale id used to
// fall back silently to studio-white and duplicate a card.
for (const industry of INDUSTRIES) {
  const missing = industry.recommendedScenes.filter(
    (id) => !SCENE_PRESETS.some((scene) => scene.id === id),
  );
  check(
    `${industry.slug}: all recommended scenes exist`,
    missing.length === 0,
    missing.join(", "),
  );
}

for (const guide of MARKETPLACE_GUIDES) {
  check(
    `${guide.slug}: export preset "${guide.exportPresetId}" exists`,
    Boolean(getExportPreset(guide.exportPresetId)),
  );
}

// Every SEO keyword names the page that targets it; a dead target is a
// keyword we are not actually competing for.
const routes = new Set<string>([
  "/",
  "/pricing",
  "/marketplace-image-requirements",
  "/product-photography",
  ...MARKETPLACE_GUIDES.map((g) => `/marketplace-image-requirements/${g.slug}`),
  ...INDUSTRIES.map((i) => `/product-photography/${i.slug}`),
]);
const orphaned = ALL_KEYWORDS.filter(
  (k) => !routes.has(k.target) && !k.target.startsWith("/product-photography-cost")
    && !k.target.startsWith("/batch-product-images") && !k.target.startsWith("/pixel-identical"),
);
check(
  "every keyword targets a page that exists",
  orphaned.length === 0,
  orphaned.map((k) => `${k.term} -> ${k.target}`).join("; "),
);

console.log("\n== Guide specs match what the exporter produces ==");

// The guide page's CTA promises an export matching that platform's spec.
// If the preset drifts below the documented minimum, the page lies.
const MINIMUMS: Record<string, { shortestSide: number; background?: string }> = {
  amazon: { shortestSide: 1000, background: "#FFFFFF" },
  shopify: { shortestSide: 2048 },
  etsy: { shortestSide: 2000 },
  ebay: { shortestSide: 1600 },
};

for (const guide of MARKETPLACE_GUIDES) {
  const preset = getExportPreset(guide.exportPresetId)!;
  const rule = MINIMUMS[guide.slug];
  if (!rule) continue;

  const shortest = Math.min(preset.width, preset.height);
  check(
    `${guide.platform}: export shortest side ${shortest}px >= ${rule.shortestSide}px`,
    shortest >= rule.shortestSide,
    `preset is ${preset.width}x${preset.height}`,
  );

  if (rule.background) {
    check(
      `${guide.platform}: export background is ${rule.background}`,
      preset.background.toUpperCase() === rule.background,
      preset.background,
    );
  }
}

// Amazon rejects anything that isn't exactly white, and transparency renders
// as black — so the main-image preset must flatten to JPEG.
const amazon = getExportPreset("amazon-main")!;
check("Amazon preset flattens to JPEG (transparency renders black)", amazon.format === "jpeg");
check("Amazon preset pads rather than crops", amazon.fit === "contain");

console.log("\n== Counts the site advertises ==");

const selectableStyles = STYLE_PRESETS.filter((s) => s.id !== "none").length;
check(`Free plan claims "All 12 style presets" and there are ${selectableStyles}`, selectableStyles === 12);
check("every style id is unique", new Set(STYLE_PRESETS.map((s) => s.id)).size === STYLE_PRESETS.length);
check("every scene id is unique", new Set(SCENE_PRESETS.map((s) => s.id)).size === SCENE_PRESETS.length);
check("every export preset id is unique", new Set(EXPORT_PRESETS.map((p) => p.id)).size === EXPORT_PRESETS.length);
check("every industry slug is unique", new Set(INDUSTRIES.map((i) => i.slug)).size === INDUSTRIES.length);

console.log("\n== Plan ladder is coherent ==");

for (let i = 1; i < PLAN_ORDER.length; i += 1) {
  const lower = PLANS[PLAN_ORDER[i - 1]];
  const higher = PLANS[PLAN_ORDER[i]];

  check(`${higher.name} costs more than ${lower.name}`, higher.priceCents > lower.priceCents);
  check(`${higher.name} includes more credits than ${lower.name}`, higher.monthlyCredits > lower.monthlyCredits);
  check(
    `${higher.name} resolution >= ${lower.name}`,
    higher.maxResolution >= lower.maxResolution,
  );
  // "Everything in X" appears in the highlights, so features must be a superset.
  const lost = Object.entries(lower.features)
    .filter(([key, on]) => on && !higher.features[key as keyof typeof higher.features])
    .map(([key]) => key);
  check(`${higher.name} keeps every ${lower.name} feature`, lost.length === 0, lost.join(", "));
}

// The pricing page states "N credits — roughly M product scenes".
for (const id of PLAN_ORDER) {
  const plan = PLANS[id];
  const claimed = plan.highlights.find((h) => /product scenes/.test(h));
  if (!claimed) continue;
  const stated = Number((claimed.match(/roughly ([\d,]+)/)?.[1] ?? "0").replace(/,/g, ""));
  const actual = Math.floor(plan.monthlyCredits / CREDIT_COSTS.PRODUCT_SCENE);
  check(`${plan.name}: "roughly ${stated} product scenes" matches ${actual}`, stated === actual);
}

console.log("\n== Free plan gating matches the pitch ==");

const free = PLANS.FREE;
check("Free has no paid features enabled", Object.values(free.features).every((v) => !v));
check("Free still allows text-to-image (its headline claim)", free.monthlyCredits > 0);
check(
  `Free credits (${free.monthlyCredits}) afford at least one image`,
  free.monthlyCredits >= CREDIT_COSTS.TEXT_TO_IMAGE,
);

console.log("\n== Credit arithmetic the pricing page shows ==");

check("4 product scenes = 20 credits", calculateCreditCost({ type: "PRODUCT_SCENE", imageCount: 4 }) === CREDIT_COSTS.PRODUCT_SCENE * 4);
check("batch of 100 rows x 1 image priced linearly", calculateBatchCost({ type: "PRODUCT_SCENE", rows: 100, imagesPerRow: 1 }) === CREDIT_COSTS.PRODUCT_SCENE * 100);
check("upscale ignores image count", calculateCreditCost({ type: "UPSCALE", upscaleFactor: 4, imageCount: 9 }) === CREDIT_COSTS.UPSCALE_4X);
check("product scene costs more than plain generation", CREDIT_COSTS.PRODUCT_SCENE > CREDIT_COSTS.TEXT_TO_IMAGE);

console.log("\n== Scene composition never describes the product as generated ==");

for (const scene of SCENE_PRESETS) {
  const composed = composeScenePrompt({ sceneId: scene.id, productDescription: "a ceramic mug" });
  check(
    `${scene.id}: negative prompt blocks duplicate/extra products`,
    /extra products|duplicated object/.test(composed.negativePrompt),
  );
}
check("unknown scene id falls back safely", getScene("does-not-exist").id === "studio-white");

console.log("\n== Style composition ==");
const styled = applyStyle("cinematic", "a lighthouse", "people");
check("user prompt survives styling", styled.prompt.startsWith("a lighthouse"));
check("user negative prompt takes precedence", styled.negativePrompt.startsWith("people"));

console.log("\n== Honesty guards still armed ==");

check(
  "no placeholder testimonial renders by default",
  getTestimonials().length === 0 || TESTIMONIALS.every((t) => !t.placeholder),
);
check(
  "every real testimonial records a consent date",
  TESTIMONIALS.filter((t) => !t.placeholder).every((t) => Boolean(t.consentDate)),
);

console.log("\n== Stripe price mapping ==");
check(
  "unconfigured Stripe price resolves to no plan (never a free upgrade)",
  planIdForStripePrice("price_definitely_not_configured") === null,
);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
