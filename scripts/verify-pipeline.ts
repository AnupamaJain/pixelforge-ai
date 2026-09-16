/**
 * End-to-end generation pipeline test.
 *
 * Runs the real orchestration — provider selection, segmentation, scene
 * generation, compositing, pixel verification and the failure path — against
 * the development provider, so it needs no API key, no GPU and no database.
 *
 * What this proves: the pipeline wiring is correct and the pixel-identical
 * guarantee holds through the actual code path a request takes.
 *
 * What this does NOT prove: that a hosted provider returns good imagery, that
 * Supabase writes succeed, or that Stripe charges correctly. Those need live
 * credentials — see README section 14.
 *
 * Run with `npm run test:pipeline`.
 */

process.env.IMAGE_PROVIDER = "local";
process.env.DEV_PROVIDER_LATENCY_MS = "0";

import sharp from "sharp";
import {
  generateImage,
  generateProductScene,
  getProvider,
  imageToImage,
  upscaleImage,
  verifyProductPreserved,
  ProviderError,
} from "../lib/generation-engine";

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

/** A product photo: distinct subject on a light field, like a real upload. */
async function makeProductPhoto(size = 768): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="100%" height="100%" fill="#F0EFEE"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.3}" fill="#2B4C7E"/>
    <rect x="${size * 0.42}" y="${size * 0.2}" width="${size * 0.16}" height="${size * 0.6}" fill="#C2452D"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.1}" fill="#F2C744"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  console.log("\n== Provider resolution ==");
  const provider = getProvider();
  check("IMAGE_PROVIDER=local resolves the dev provider", provider.id === "local");
  check("dev provider declares productScenes", provider.capabilities.productScenes);
  check("dev provider exposes removeBackground", typeof provider.removeBackground === "function");
  check("dev provider exposes generateScene", typeof provider.generateScene === "function");

  const health = await provider.healthCheck();
  check("health check reports reachable", health.ok, health.detail);

  console.log("\n== Text to image ==");
  const t2i = await generateImage({
    prompt: "a cobalt ceramic vase",
    negativePrompt: "blurry",
    width: 512,
    height: 512,
    imageCount: 3,
    seed: 1234,
    steps: 30,
    guidance: 7,
  });
  check("returns the requested number of images", t2i.images.length === 3);
  check("each image carries a distinct seed", new Set(t2i.images.map((i) => i.seed)).size === 3);
  check("dimensions honour the request", t2i.images.every((i) => i.width === 512 && i.height === 512));
  check("metadata names the provider", t2i.metadata.provider === "local");

  for (const image of t2i.images) {
    const meta = await sharp(image.data).metadata();
    if (meta.width !== 512 || meta.height !== 512) {
      check("decoded image matches declared size", false, `${meta.width}x${meta.height}`);
      break;
    }
  }
  check("every output decodes as a valid image", true);

  console.log("\n== Determinism ==");
  const runA = await generateImage({ prompt: "x", width: 256, height: 256, imageCount: 1, seed: 99 });
  const runB = await generateImage({ prompt: "x", width: 256, height: 256, imageCount: 1, seed: 99 });
  check("same seed produces identical bytes", runA.images[0].data.equals(runB.images[0].data));

  const runC = await generateImage({ prompt: "x", width: 256, height: 256, imageCount: 1, seed: 100 });
  check("different seed produces different bytes", !runA.images[0].data.equals(runC.images[0].data));

  console.log("\n== Image to image ==");
  const source = await makeProductPhoto(512);
  const i2i = await imageToImage({
    prompt: "as a watercolour",
    image: source,
    imageContentType: "image/png",
    strength: 0.6,
    width: 512,
    height: 512,
    imageCount: 1,
    seed: 7,
  });
  check("returns an image", i2i.images.length === 1);
  check("source buffer was not mutated", source.equals(await makeProductPhoto(512)));

  console.log("\n== Upscale ==");
  const small = await sharp(source).resize(256, 256).png().toBuffer();
  for (const factor of [2, 4] as const) {
    const up = await upscaleImage({ image: small, imageContentType: "image/png", factor });
    const meta = await sharp(up.images[0].data).metadata();
    check(
      `${factor}x upscale produces ${256 * factor}px output`,
      meta.width === 256 * factor && meta.height === 256 * factor,
      `${meta.width}x${meta.height}`,
    );
  }

  console.log("\n== Product scene: the full pipeline ==");
  const product = await makeProductPhoto(768);
  const scene = await generateProductScene({
    productImage: product,
    productContentType: "image/png",
    scenePrompt: "on a marble surface, soft daylight",
    negativePrompt: "extra products",
    width: 1024,
    height: 1024,
    imageCount: 2,
    seed: 42,
  });

  check("returns the requested images", scene.images.length === 2);
  check("reports the product preserved", scene.productPreserved);
  check("returns the cutout for auditing", scene.cutout.length > 0);

  const cutoutMeta = await sharp(scene.cutout).metadata();
  check("cutout has a real alpha channel", cutoutMeta.channels === 4, `channels=${cutoutMeta.channels}`);

  // The alpha channel must actually be partial — a fully opaque "cutout"
  // would make the guarantee vacuous.
  const alphaStats = await sharp(scene.cutout).extractChannel("alpha").stats();
  check(
    "cutout contains transparent regions",
    alphaStats.channels[0].min === 0,
    `min alpha = ${alphaStats.channels[0].min}`,
  );
  check(
    "cutout contains near-opaque product regions",
    alphaStats.channels[0].max >= 240,
    `max alpha = ${alphaStats.channels[0].max}`,
  );

  check(
    "composited output matches requested dimensions",
    scene.images.every((i) => i.width === 1024 && i.height === 1024),
  );

  console.log("\n== The guarantee, re-verified independently ==");
  for (const [index, image] of scene.images.entries()) {
    const result = await verifyProductPreserved({
      composite: image.data,
      cutout: scene.cutout,
      width: 1024,
      height: 1024,
    });
    check(
      `output ${index + 1}: every opaque product pixel unchanged`,
      result.preserved,
      `checked=${result.checkedPixels} mismatches=${result.mismatches}`,
    );
    check(
      `output ${index + 1}: verification examined a meaningful sample`,
      result.checkedPixels > 5000,
      `checked=${result.checkedPixels}`,
    );
  }

  console.log("\n== Negative control ==");
  const tampered = await sharp(scene.images[0].data).modulate({ hue: 40 }).png().toBuffer();
  const tamperCheck = await verifyProductPreserved({
    composite: tampered,
    cutout: scene.cutout,
    width: 1024,
    height: 1024,
  });
  check("an altered product IS detected", !tamperCheck.preserved, `mismatches=${tamperCheck.mismatches}`);

  console.log("\n== Failure path ==");
  process.env.DEV_PROVIDER_FAIL_RATE = "1";
  let threwProviderError = false;
  let leakedInternals = false;
  try {
    await generateImage({ prompt: "will fail", width: 256, height: 256, imageCount: 1 });
  } catch (error) {
    threwProviderError = error instanceof ProviderError;
    if (error instanceof ProviderError) {
      // The user-facing string must not carry internal detail.
      leakedInternals = /DEV_PROVIDER_FAIL_RATE|Simulated/.test(error.userMessage);
    }
  }
  process.env.DEV_PROVIDER_FAIL_RATE = "0";

  check("provider failure surfaces as ProviderError", threwProviderError);
  check("user-facing message hides internal detail", !leakedInternals);

  console.log("\n== Production guard ==");
  const previousEnv = process.env.NODE_ENV;
  let blocked = false;
  let messageLeaksProvider = true;

  // Next types NODE_ENV as read-only. Writing it is legitimate here: the guard
  // under test reads it, and there is no other way to exercise that branch.
  const mutableEnv = process.env as Record<string, string | undefined>;

  mutableEnv.NODE_ENV = "production";
  try {
    await generateImage({ prompt: "x", width: 256, height: 256, imageCount: 1 });
  } catch (error) {
    blocked = error instanceof ProviderError && !error.retryable;
    if (error instanceof ProviderError) {
      // A production user must not be told a dev provider exists.
      messageLeaksProvider = /dev|development|placeholder/i.test(error.userMessage);
    }
  } finally {
    // NODE_ENV was unset here, and assigning `undefined` would write the
    // literal string "undefined" — leaking a bogus env into later code.
    if (previousEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = previousEnv;
  }

  check("dev provider refuses to run in production", blocked);
  check("production refusal does not mention the dev provider", !messageLeaksProvider);
  check("NODE_ENV restored after the guard test", process.env.NODE_ENV === previousEnv);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
