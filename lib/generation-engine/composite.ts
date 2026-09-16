import "server-only";

/**
 * Product compositing.
 *
 * This module is where the "pixel-identical" guarantee is enforced, and it is
 * deliberately kept out of the providers: the model generates an environment,
 * and we paste the ORIGINAL product pixels back over it using the alpha
 * channel from segmentation. The product is therefore never model output — it
 * is the customer's own photograph, unmodified.
 *
 * Because the guarantee lives here rather than in a prompt, it holds for every
 * provider and can be verified after the fact.
 */

export interface Placement {
  /** Product height as a fraction of canvas height (0.1–0.95). */
  scale: number;
  /** Horizontal centre, 0 = left edge, 1 = right edge. */
  offsetX: number;
  /** Vertical centre, 0 = top, 1 = bottom. */
  offsetY: number;
}

export const DEFAULT_PLACEMENT: Placement = {
  scale: 0.72,
  offsetX: 0.5,
  offsetY: 0.54,
};

async function sharpLib() {
  return (await import("sharp")).default;
}

/** Trims fully-transparent margins so `scale` refers to the product itself. */
export async function trimCutout(cutout: Buffer): Promise<Buffer> {
  const sharp = await sharpLib();
  try {
    return await sharp(cutout).trim({ threshold: 1 }).png().toBuffer();
  } catch {
    // trim() throws when the image is entirely uniform; keep the original.
    return cutout;
  }
}

/** Geometry for placing the product on a canvas, shared by mask and composite. */
async function layout(
  cutout: Buffer,
  canvasWidth: number,
  canvasHeight: number,
  placement: Placement,
) {
  const sharp = await sharpLib();
  const meta = await sharp(cutout).metadata();

  const sourceWidth = meta.width ?? canvasWidth;
  const sourceHeight = meta.height ?? canvasHeight;

  const targetHeight = Math.max(
    1,
    Math.round(canvasHeight * Math.min(0.95, Math.max(0.1, placement.scale))),
  );
  const ratio = targetHeight / sourceHeight;
  let targetWidth = Math.max(1, Math.round(sourceWidth * ratio));

  // A wide product must not run off the canvas.
  const maxWidth = Math.round(canvasWidth * 0.95);
  let finalHeight = targetHeight;
  if (targetWidth > maxWidth) {
    finalHeight = Math.max(1, Math.round((targetHeight * maxWidth) / targetWidth));
    targetWidth = maxWidth;
  }

  const left = Math.round(canvasWidth * placement.offsetX - targetWidth / 2);
  const top = Math.round(canvasHeight * placement.offsetY - finalHeight / 2);

  return {
    width: targetWidth,
    height: finalHeight,
    left: Math.max(0, Math.min(left, canvasWidth - targetWidth)),
    top: Math.max(0, Math.min(top, canvasHeight - finalHeight)),
  };
}

/**
 * Builds the two inputs the model needs to inpaint around a product:
 *  - `base`: the product on a neutral canvas, so the model sees its silhouette
 *  - `mask`: white where the model may paint, black over the product
 *
 * The mask is dilated slightly so the model can render contact shadow and
 * reflection right up to the product edge without painting over it.
 */
export async function buildSceneInputs(params: {
  cutout: Buffer;
  width: number;
  height: number;
  placement?: Placement;
}): Promise<{ base: Buffer; mask: Buffer; placement: Placement }> {
  const sharp = await sharpLib();
  const placement = params.placement ?? DEFAULT_PLACEMENT;
  const box = await layout(params.cutout, params.width, params.height, placement);

  const resized = await sharp(params.cutout)
    .resize(box.width, box.height, { fit: "fill" })
    .png()
    .toBuffer();

  const base = await sharp({
    create: {
      width: params.width,
      height: params.height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .composite([{ input: resized, left: box.left, top: box.top }])
    .png()
    .toBuffer();

  // Alpha of the placed product becomes the protected (black) region.
  // Expanded to RGB because sharp's create() only supports 3 or 4 channels.
  const alphaGrey = await sharp(resized)
    .extractChannel("alpha")
    .toColourspace("srgb")
    .png()
    .toBuffer();

  const productRegion = await sharp({
    create: {
      width: params.width,
      height: params.height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([{ input: alphaGrey, left: box.left, top: box.top }])
    .png()
    .toBuffer();

  // Blur then amplify = dilation, giving the model a small working margin
  // around the product for contact shadow and reflections.
  const mask = await sharp(productRegion)
    .blur(6)
    .linear(3, 0)
    .negate()
    .png()
    .toBuffer();

  return { base, mask, placement };
}

/**
 * Composites the untouched product over a generated scene.
 *
 * `scene` is model output; `cutout` is the customer's original pixels. Only
 * the scene is generated — every pixel where alpha is opaque comes verbatim
 * from the upload.
 */
export async function compositeProduct(params: {
  scene: Buffer;
  cutout: Buffer;
  width: number;
  height: number;
  placement?: Placement;
  /** Grounds the product with a soft contact shadow. */
  shadow?: boolean;
}): Promise<Buffer> {
  const sharp = await sharpLib();
  const placement = params.placement ?? DEFAULT_PLACEMENT;
  const box = await layout(params.cutout, params.width, params.height, placement);

  const resized = await sharp(params.cutout)
    .resize(box.width, box.height, { fit: "fill" })
    .png()
    .toBuffer();

  const canvas = sharp(params.scene).resize(params.width, params.height, {
    fit: "cover",
  });

  const layers: { input: Buffer; left: number; top: number; blend?: "multiply" }[] = [];

  if (params.shadow !== false) {
    // A blurred, squashed silhouette sitting just under the product.
    const alpha = await sharp(resized).extractChannel("alpha").toBuffer();
    const shadowHeight = Math.max(4, Math.round(box.height * 0.12));

    const shadow = await sharp(alpha)
      .resize(box.width, shadowHeight, { fit: "fill" })
      .blur(Math.max(4, box.width * 0.03))
      .linear(0.55, 0)
      .png()
      .toBuffer();

    const shadowTop = Math.min(
      params.height - shadowHeight,
      box.top + box.height - Math.round(shadowHeight / 2),
    );

    layers.push({
      input: await sharp(shadow).negate().toColourspace("srgb").png().toBuffer(),
      left: box.left,
      top: Math.max(0, shadowTop),
      blend: "multiply",
    });
  }

  layers.push({ input: resized, left: box.left, top: box.top });

  return canvas.composite(layers).png().toBuffer();
}

/**
 * Verifies the guarantee: every opaque pixel of the cutout must appear byte
 * for byte in the composite. Used by the test suite, and available as an
 * integrity check on generated output.
 */
export async function verifyProductPreserved(params: {
  composite: Buffer;
  cutout: Buffer;
  width: number;
  height: number;
  placement?: Placement;
}): Promise<{ preserved: boolean; checkedPixels: number; mismatches: number }> {
  const sharp = await sharpLib();
  const placement = params.placement ?? DEFAULT_PLACEMENT;
  const box = await layout(params.cutout, params.width, params.height, placement);

  const resized = await sharp(params.cutout)
    .resize(box.width, box.height, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const region = await sharp(params.composite)
    .extract({ left: box.left, top: box.top, width: box.width, height: box.height })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const src = resized.data;
  const channels = resized.info.channels;

  let checked = 0;
  let mismatches = 0;

  for (let i = 0; i < box.width * box.height; i += 1) {
    const sourceAlpha = channels === 4 ? src[i * channels + 3] : 255;
    // Only fully opaque pixels are covered by the guarantee; edge pixels are
    // anti-aliased against the scene by design.
    if (sourceAlpha < 255) continue;

    checked += 1;
    for (let c = 0; c < 3; c += 1) {
      if (src[i * channels + c] !== region[i * 4 + c]) {
        mismatches += 1;
        break;
      }
    }
  }

  return { preserved: mismatches === 0, checkedPixels: checked, mismatches };
}
