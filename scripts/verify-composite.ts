/**
 * Proves the pixel-identical guarantee.
 *
 * Builds a synthetic product cutout with a real alpha channel, composites it
 * over a generated-looking scene, then checks every opaque product pixel byte
 * for byte. This is the claim the product is sold on, so it is tested rather
 * than asserted. Run with `npm run test:composite`.
 */

import sharp from "sharp";
import {
  buildSceneInputs,
  compositeProduct,
  trimCutout,
  verifyProductPreserved,
  DEFAULT_PLACEMENT,
} from "../lib/generation-engine/composite";

let pass = 0;
let fail = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** A distinctive product: coloured stripes so any resample shows up immediately. */
async function makeCutout(size = 400): Promise<Buffer> {
  const stripes = Array.from({ length: 8 }, (_, i) => {
    const y = Math.round((i * size) / 8);
    const h = Math.ceil(size / 8);
    const colours = ["#e23", "#2a7", "#37c", "#fc0", "#b4d", "#0cc", "#f70", "#333"];
    return `<rect x="0" y="${y}" width="${size}" height="${h}" fill="${colours[i]}"/>`;
  }).join("");

  // A circular product on a transparent field.
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="c"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 20}"/></clipPath>
    </defs>
    <g clip-path="url(#c)">${stripes}</g>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Stands in for model output. */
async function makeScene(w: number, h: number): Promise<Buffer> {
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8a7"/><stop offset="100%" stop-color="#233"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const W = 1024;
  const H = 1024;

  console.log("\n== Segmentation input ==");
  const raw = await makeCutout();
  const cutout = await trimCutout(raw);
  const cutMeta = await sharp(cutout).metadata();
  check("cutout has an alpha channel", (cutMeta.channels ?? 0) === 4, `channels=${cutMeta.channels}`);
  check("trim removed transparent margin", (cutMeta.width ?? 0) < 400, `w=${cutMeta.width}`);

  console.log("\n== Scene inputs (base + mask) ==");
  const { base, mask } = await buildSceneInputs({ cutout, width: W, height: H });
  const baseMeta = await sharp(base).metadata();
  const maskMeta = await sharp(mask).metadata();
  check("base matches canvas", baseMeta.width === W && baseMeta.height === H);
  check("mask matches canvas", maskMeta.width === W && maskMeta.height === H);

  // The mask must be mostly white (paintable) with a black hole over the product.
  const maskStats = await sharp(mask).greyscale().stats();
  const meanMask = maskStats.channels[0].mean;
  check("mask is mostly paintable", meanMask > 120, `mean=${meanMask.toFixed(1)}`);
  check("mask protects a region", maskStats.channels[0].min < 40, `min=${maskStats.channels[0].min}`);

  console.log("\n== Composite ==");
  const scene = await makeScene(W, H);
  const composite = await compositeProduct({ scene, cutout, width: W, height: H });
  const compMeta = await sharp(composite).metadata();
  check("composite matches canvas", compMeta.width === W && compMeta.height === H);

  console.log("\n== Pixel-identical guarantee ==");
  const result = await verifyProductPreserved({ composite, cutout, width: W, height: H });
  check(
    "every opaque product pixel is unchanged",
    result.preserved,
    `checked=${result.checkedPixels} mismatches=${result.mismatches}`,
  );
  check("a meaningful number of pixels was checked", result.checkedPixels > 10000, `checked=${result.checkedPixels}`);

  console.log("\n== Negative control (must be detected) ==");
  // Tint the composite; verification has to notice.
  const tampered = await sharp(composite).modulate({ saturation: 1.4 }).png().toBuffer();
  const tamperResult = await verifyProductPreserved({
    composite: tampered,
    cutout,
    width: W,
    height: H,
  });
  check(
    "a modified product IS detected",
    !tamperResult.preserved,
    `mismatches=${tamperResult.mismatches}`,
  );

  console.log("\n== Placement variations ==");
  for (const scale of [0.4, 0.6, 0.9]) {
    const placement = { ...DEFAULT_PLACEMENT, scale };
    const c = await compositeProduct({ scene, cutout, width: W, height: H, placement });
    const v = await verifyProductPreserved({ composite: c, cutout, width: W, height: H, placement });
    check(`preserved at scale ${scale}`, v.preserved, `mismatches=${v.mismatches}`);
  }

  console.log("\n== Non-square canvas ==");
  const wide = await makeScene(1344, 768);
  const wideComposite = await compositeProduct({ scene: wide, cutout, width: 1344, height: 768 });
  const wideCheck = await verifyProductPreserved({
    composite: wideComposite,
    cutout,
    width: 1344,
    height: 768,
  });
  check("preserved on 16:9", wideCheck.preserved, `mismatches=${wideCheck.mismatches}`);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
