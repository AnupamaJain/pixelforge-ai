import { z } from "zod";
import {
  ASPECT_RATIO_IDS,
  BASE_SIZES,
  GUIDANCE_RANGE,
  IMAGE_COUNT_OPTIONS,
  STEPS_RANGE,
  STRENGTH_RANGE,
} from "@/config/generation";
import { STYLE_PRESETS } from "@/config/styles";
import { SCENE_PRESETS } from "@/config/scenes";
import { EXPORT_PRESET_IDS } from "@/config/marketplace";

/**
 * Server-side validation for every generation parameter.
 * Routes parse untrusted input through these before any credit is spent.
 */

const styleIds = STYLE_PRESETS.map((style) => style.id) as [string, ...string[]];

const promptSchema = z
  .string()
  .trim()
  .min(1, "Enter a prompt describing the image you want.")
  .max(2000, "Prompts are limited to 2000 characters.");

const negativePromptSchema = z
  .string()
  .trim()
  .max(2000, "Negative prompts are limited to 2000 characters.")
  .optional()
  .nullable();

const seedSchema = z
  .number()
  .int()
  .min(0)
  .max(2_147_483_647)
  .optional()
  .nullable();

export const textToImageSchema = z.object({
  prompt: promptSchema,
  negativePrompt: negativePromptSchema,
  styleId: z.enum(styleIds).default("photorealistic"),
  aspectRatio: z.enum(ASPECT_RATIO_IDS as [string, ...string[]]).default("1:1"),
  baseSize: z
    .number()
    .int()
    .refine(
      (value) => (BASE_SIZES as readonly number[]).includes(value),
      "Unsupported image size.",
    )
    .default(1024),
  imageCount: z
    .number()
    .int()
    .refine(
      (value) => (IMAGE_COUNT_OPTIONS as readonly number[]).includes(value),
      "You can generate 1, 2 or 4 images at a time.",
    )
    .default(1),
  seed: seedSchema,
  steps: z.number().int().min(STEPS_RANGE.min).max(STEPS_RANGE.max).optional(),
  guidance: z.number().min(GUIDANCE_RANGE.min).max(GUIDANCE_RANGE.max).optional(),
  model: z.string().trim().max(120).optional(),
});

export const imageToImageSchema = textToImageSchema.extend({
  sourcePath: z.string().trim().min(1, "Upload a source image first.").max(400),
  strength: z
    .number()
    .min(STRENGTH_RANGE.min)
    .max(STRENGTH_RANGE.max)
    .default(STRENGTH_RANGE.default),
});

export const upscaleSchema = z
  .object({
    factor: z.union([z.literal(2), z.literal(4)]).default(2),
    /** Upscale an existing output... */
    outputId: z.string().uuid().optional(),
    /** ...or a freshly uploaded image. Exactly one is required. */
    sourcePath: z.string().trim().min(1).max(400).optional(),
  })
  .refine(
    (value) => Boolean(value.outputId) !== Boolean(value.sourcePath),
    "Provide either an existing image or an uploaded one, not both.",
  );

export const variationSchema = z.object({
  seed: seedSchema,
});

export const historyQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  type: z.enum(["TEXT_TO_IMAGE", "IMAGE_TO_IMAGE", "UPSCALE"]).optional(),
  styleId: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const galleryQuerySchema = z.object({
  favoritesOnly: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "true"),
  type: z.enum(["TEXT_TO_IMAGE", "IMAGE_TO_IMAGE", "UPSCALE"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  offset: z.coerce.number().int().min(0).default(0),
});

export type TextToImageInput = z.infer<typeof textToImageSchema>;
export type ImageToImageInput = z.infer<typeof imageToImageSchema>;
export type UpscaleInput = z.infer<typeof upscaleSchema>;

/** Formats a Zod failure into a single user-facing sentence. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request.";
}


// --- Product Studio ---------------------------------------------------------

const sceneIds = SCENE_PRESETS.map((scene) => scene.id) as [string, ...string[]];

const placementSchema = z.object({
  scale: z.number().min(0.1).max(0.95).default(0.72),
  offsetX: z.number().min(0).max(1).default(0.5),
  offsetY: z.number().min(0).max(1).default(0.54),
});

export const productSceneSchema = z.object({
  sourcePath: z.string().trim().min(1, "Upload a product photo first.").max(400),
  sceneId: z.enum(sceneIds).default("studio-white"),
  productDescription: z.string().trim().max(300).optional().nullable(),
  extraPrompt: z.string().trim().max(500).optional().nullable(),
  brandKitId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  aspectRatio: z.enum(ASPECT_RATIO_IDS as [string, ...string[]]).default("1:1"),
  baseSize: z
    .number()
    .int()
    .refine((v) => (BASE_SIZES as readonly number[]).includes(v))
    .default(1024),
  imageCount: z
    .number()
    .int()
    .min(1)
    .max(8)
    .default(1),
  placement: placementSchema.default({ scale: 0.72, offsetX: 0.5, offsetY: 0.54 }),
  shadow: z.boolean().default(true),
  seed: seedSchema,
  steps: z.number().int().min(STEPS_RANGE.min).max(STEPS_RANGE.max).optional(),
  guidance: z.number().min(GUIDANCE_RANGE.min).max(GUIDANCE_RANGE.max).optional(),
});

// --- Brand kits -------------------------------------------------------------

const hexColour = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex colour like #1A2B3C.");

export const brandKitSchema = z.object({
  name: z.string().trim().min(1, "Give your brand kit a name.").max(80),
  description: z.string().trim().max(300).optional().nullable(),
  palette: z.array(hexColour).max(8).default([]),
  promptModifier: z.string().trim().max(600).optional().nullable(),
  negativeModifier: z.string().trim().max(600).optional().nullable(),
  allowedStyles: z.array(z.string().max(60)).max(20).default([]),
  defaultStyleId: z.string().trim().max(60).optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  isDefault: z.boolean().default(false),
});

// --- Clients ----------------------------------------------------------------

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Give this client a name.").max(80),
});

// --- Batch ------------------------------------------------------------------

export const batchSchema = z.object({
  name: z.string().trim().min(1, "Name this batch run.").max(120),
  type: z.enum(["TEXT_TO_IMAGE", "PRODUCT_SCENE"]).default("TEXT_TO_IMAGE"),
  /** Prompt template. `{column}` placeholders are filled from each row. */
  template: z.string().trim().min(1, "Add a prompt template.").max(2000),
  negativeTemplate: z.string().trim().max(2000).optional().nullable(),
  styleId: z.enum(styleIds).optional(),
  sceneId: z.enum(sceneIds).optional(),
  brandKitId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  aspectRatio: z.enum(ASPECT_RATIO_IDS as [string, ...string[]]).default("1:1"),
  baseSize: z
    .number()
    .int()
    .refine((v) => (BASE_SIZES as readonly number[]).includes(v))
    .default(1024),
  imagesPerRow: z.number().int().min(1).max(4).default(1),
  rows: z
    .array(z.record(z.string(), z.string().max(500)))
    .min(1, "Add at least one row.")
    .max(1000, "Batches are limited to 1000 rows."),
});

// --- Export -----------------------------------------------------------------

export const exportSchema = z.object({
  outputIds: z.array(z.string().uuid()).min(1).max(100),
  presetId: z.enum(EXPORT_PRESET_IDS as [string, ...string[]]),
});

// --- Performance ------------------------------------------------------------

export const performanceSchema = z.object({
  entries: z
    .array(
      z.object({
        outputId: z.string().uuid(),
        source: z.string().trim().max(40).default("manual"),
        campaign: z.string().trim().max(120).optional().nullable(),
        impressions: z.number().int().min(0).default(0),
        clicks: z.number().int().min(0).default(0),
        conversions: z.number().int().min(0).default(0),
        spendCents: z.number().int().min(0).default(0),
        revenueCents: z.number().int().min(0).default(0),
        recordedFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
    )
    .min(1)
    .max(500),
});

export type ProductSceneInput = z.infer<typeof productSceneSchema>;
export type BrandKitInput = z.infer<typeof brandKitSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
